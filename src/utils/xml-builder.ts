/**
 * PLCopen XML Builder
 * Generates valid PLCopen TC6 0200 XML for CODESYS import.
 *
 * Architecture: Fragment builders (buildPouElement, buildDataTypeElement, buildGvlAddData)
 * are composed by envelope wrappers (buildPouXml, buildDataTypeXml, buildGvlXml, buildProjectXml).
 */

const XMLNS = 'http://www.plcopen.org/xml/tc6_0200';
const XMLNS_XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * D5-008: productVersion in the fileHeader is parameterizable via env.
 * Default keeps the historical behavior ("CODESYS V3.5 SP21"). Set
 * CODESYS_PRODUCT_VERSION to align with the real version of the installed CODESYS
 * (SP22+) and avoid cosmetic warnings in the import log.
 */
const PRODUCT_VERSION = process.env.CODESYS_PRODUCT_VERSION ?? 'CODESYS V3.5 SP21';

export interface VarDeclaration {
  name: string;
  type: string;
  initialValue?: string;
  comment?: string;
  address?: string;
}

export interface PouDefinition {
  name: string;
  pouType: 'functionBlock' | 'program' | 'function';
  inputVars?: VarDeclaration[];
  outputVars?: VarDeclaration[];
  inOutVars?: VarDeclaration[];
  localVars?: VarDeclaration[];
  /**
   * Bug D fix: vars declared in `VAR CONSTANT ... END_VAR` in the source .st.
   * Emitted as a separate `<localVars constant="true">` so CODESYS accepts
   * the name as a literal/symbolic integer constant in CASE labels (avoids
   * C0218 "CASE label requires literal or symbolic integer constant").
   */
  localConstantVars?: VarDeclaration[];
  body: string; // ST code
  returnType?: string; // for functions
}

export interface DataTypeDefinition {
  name: string;
  kind: 'enum' | 'struct';
  members: Array<{ name: string; type?: string; value?: string; comment?: string }>;
  /** True when the source carries `{attribute 'qualified_only'}` — emitted as a CODESYS addData attribute. */
  qualifiedOnly?: boolean;
}

export interface GvlDefinition {
  name: string;
  variables: VarDeclaration[];
  isConstant?: boolean;
  /** VAR_GLOBAL RETAIN — emitted as retain="true" on <globalVars>. */
  isRetain?: boolean;
  /** VAR_GLOBAL PERSISTENT — emitted as persistent="true" on <globalVars>. */
  isPersistent?: boolean;
}

// ── Internal Helpers ──────────────────────────────────────────────────

/**
 * Escape special characters for XML text content and attribute values.
 * Strips chars invalid in XML 1.0 (control chars except tab/newline/CR + lone
 * surrogates), then escapes &<>"'. Addresses F3-004 (CWE-116) — CODESYS rejects
 * import with invalid chars.
 */
function escapeXml(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDateTime(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '');
}

/**
 * Wrap ST code in CDATA section, escaping nested ]]> sequences.
 * Addresses F3-014: strip chars invalid in XML 1.0 (control chars except
 * tab/newline/CR + lone surrogates) before wrapping CDATA. CDATA does not escape
 * those chars — they go raw to the CODESYS parser, which rejects them.
 */
function wrapCdata(code: string): string {
  const stripped = code.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF]/g, '');
  const safe = stripped.replace(/\]\]>/g, ']]]]><![CDATA[>');
  return `<![CDATA[${safe}]]>`;
}

function mapTypeToXml(type: string): string {
  const simpleTypes: Record<string, string> = {
    'BOOL': '<BOOL />', 'INT': '<INT />', 'DINT': '<DINT />',
    'UINT': '<UINT />', 'UDINT': '<UDINT />', 'SINT': '<SINT />',
    'USINT': '<USINT />', 'LINT': '<LINT />', 'ULINT': '<ULINT />',
    'REAL': '<REAL />', 'LREAL': '<LREAL />', 'WORD': '<WORD />',
    'DWORD': '<DWORD />', 'LWORD': '<LWORD />', 'BYTE': '<BYTE />',
    'TIME': '<TIME />', 'STRING': '<string />', 'WSTRING': '<wstring />',
  };

  const upper = type.toUpperCase();
  if (simpleTypes[upper]) return simpleTypes[upper];

  // Array type: ARRAY[0..9] OF REAL  or  ARRAY[0..9, 0..9] OF INT (multi-dim)
  // F3-023: accepts N dimensions separated by a comma.
  const arrayMatch = type.match(/^ARRAY\s*\[(.+?)\]\s*OF\s+(.+)$/i);
  if (arrayMatch) {
    const dimSpec = arrayMatch[1];
    const baseType = arrayMatch[2].trim();
    const dims: string[] = [];
    let malformed = false;
    for (const d of dimSpec.split(',')) {
      const m = d.trim().match(/^(-?\d+)\s*\.\.\s*(-?\d+)$/);
      if (!m) { dims.length = 0; malformed = true; break; }
      dims.push(`<dimension lower="${m[1]}" upper="${m[2]}" />`);
    }
    if (dims.length > 0) {
      const innerType = mapTypeToXml(baseType);
      return `<array>${dims.join('')}<baseType>${innerType}</baseType></array>`;
    }
    // D5-021: warns when a type looks like ARRAY but the dims are malformed — before
    // it silently fell into <derived name="ARRAY[..." /> which is valid XML
    // but semantically broken for the CODESYS importer. Stderr-only because
    // xml-builder is pure (no dependency on the structured logger).
    if (malformed) {
      console.error(`[xml-builder] Malformed ARRAY type "${type}" — falling back to <derived>. Check parser output.`);
    }
  }

  // STRING with length: STRING(255)
  const stringMatch = type.match(/^STRING\s*\(\s*(\d+)\s*\)$/i);
  if (stringMatch) return `<string length="${stringMatch[1]}" />`;

  // Everything else is a derived type (FB instances, STRUCTs, ENUMs)
  return `<derived name="${escapeXml(type)}" />`;
}

function buildVarSection(tag: string, vars: VarDeclaration[], extraAttrs: string = ''): string {
  if (!vars || vars.length === 0) return '';

  const varLines = vars.map(v => {
    const addr = v.address ? ` address="${escapeXml(v.address)}"` : '';
    let xml = `          <variable name="${escapeXml(v.name)}"${addr}>\n`;
    xml += `            <type>${mapTypeToXml(v.type)}</type>\n`;
    if (v.initialValue !== undefined) {
      xml += `            <initialValue><simpleValue value="${escapeXml(v.initialValue)}" /></initialValue>\n`;
    }
    if (v.comment) {
      xml += `            <documentation><xhtml xmlns="${XMLNS_XHTML}">${escapeXml(v.comment)}</xhtml></documentation>\n`;
    }
    xml += '          </variable>';
    return xml;
  }).join('\n');

  return `        <${tag}${extraAttrs}>\n${varLines}\n        </${tag}>`;
}

/** Build the standard PLCopen project XML envelope */
function projectEnvelope(name: string, dateTime: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<project xmlns="${XMLNS}" xmlns:xhtml="${XMLNS_XHTML}">
  <fileHeader companyName="" productName="CODESYS" productVersion="${PRODUCT_VERSION}" creationDateTime="${dateTime}" />
  <contentHeader name="${escapeXml(name)}" modificationDateTime="${dateTime}">
    <coordinateInfo>
      <fbd><scaling x="1" y="1" /></fbd>
      <ld><scaling x="1" y="1" /></ld>
      <sfc><scaling x="1" y="1" /></sfc>
    </coordinateInfo>
  </contentHeader>
${body}
</project>`;
}

// ── Fragment Builders (reusable across single + batch modes) ──────────

/** Build the POU interface XML (var sections + return type) */
function buildPouInterface(pou: PouDefinition): string {
  const sections: string[] = [];
  if (pou.returnType) {
    sections.push(`        <returnType>${mapTypeToXml(pou.returnType)}</returnType>`);
  }
  if (pou.inputVars && pou.inputVars.length > 0) sections.push(buildVarSection('inputVars', pou.inputVars));
  if (pou.outputVars && pou.outputVars.length > 0) sections.push(buildVarSection('outputVars', pou.outputVars));
  if (pou.inOutVars && pou.inOutVars.length > 0) sections.push(buildVarSection('inOutVars', pou.inOutVars));
  if (pou.localVars && pou.localVars.length > 0) sections.push(buildVarSection('localVars', pou.localVars));
  // Bug D fix: emits VAR CONSTANT as a separate <localVars constant="true">
  if (pou.localConstantVars && pou.localConstantVars.length > 0) {
    sections.push(buildVarSection('localVars', pou.localConstantVars, ' constant="true"'));
  }
  return sections.length > 0 ? `\n${sections.join('\n')}\n      ` : '';
}

/** Build a <pou> XML element (without project envelope) */
function buildPouElement(pou: PouDefinition, indent: string = '    '): string {
  const interfaceContent = buildPouInterface(pou);
  return `${indent}<pou name="${escapeXml(pou.name)}" pouType="${pou.pouType}">
${indent}  <interface>${interfaceContent}</interface>
${indent}  <body>
${indent}    <ST>
${indent}      <xhtml xmlns="${XMLNS_XHTML}">${wrapCdata(pou.body)}</xhtml>
${indent}    </ST>
${indent}  </body>
${indent}</pou>`;
}

/** Build a <dataType> XML element (without project envelope) */
function buildDataTypeElement(dt: DataTypeDefinition, indent: string = '    '): string {
  let baseTypeContent: string;

  if (dt.kind === 'enum') {
    const values = dt.members.map(m => {
      const val = m.value !== undefined ? ` value="${escapeXml(m.value)}"` : '';
      return `${indent}      <value name="${escapeXml(m.name)}"${val} />`;
    }).join('\n');
    baseTypeContent = `<enum>\n${indent}    <values>\n${values}\n${indent}    </values>\n${indent}  </enum>`;
  } else {
    const members = dt.members.map(m => {
      let xml = `${indent}      <variable name="${escapeXml(m.name)}">\n`;
      xml += `${indent}        <type>${mapTypeToXml(m.type || 'INT')}</type>\n`;
      if (m.comment) {
        xml += `${indent}        <documentation><xhtml xmlns="${XMLNS_XHTML}">${escapeXml(m.comment)}</xhtml></documentation>\n`;
      }
      xml += `${indent}      </variable>`;
      return xml;
    }).join('\n');
    baseTypeContent = `<struct>\n${members}\n${indent}  </struct>`;
  }

  // P2.0/A3: emit the {attribute 'qualified_only'} pragma as the CODESYS-native
  // addData attribute block. Without it CODESYS imports the type unqualified and
  // reports "ambiguous use" for same-named enum members across types.
  const qualifiedOnlyAddData = dt.qualifiedOnly
    ? `\n${indent}  <addData>
${indent}    <data name="http://www.3s-software.com/plcopenxml/attributes" handleUnknown="implementation">
${indent}      <Attributes>
${indent}        <Attribute Name="qualified_only" Value="" />
${indent}      </Attributes>
${indent}    </data>
${indent}  </addData>`
    : '';

  return `${indent}<dataType name="${escapeXml(dt.name)}">
${indent}  <baseType>
${indent}    ${baseTypeContent}
${indent}  </baseType>${qualifiedOnlyAddData}
${indent}</dataType>`;
}

/**
 * Build the ST representation of a GVL (single source of truth).
 * Used by both .st file generation and XML addData embedding.
 */
export function buildGvlStCode(gvl: GvlDefinition): string {
  // P2.0/A1: reflect all block modifiers so the ST round-trips faithfully.
  // Canonical CODESYS order: VAR_GLOBAL [CONSTANT] [PERSISTENT] [RETAIN].
  let varKeyword = 'VAR_GLOBAL';
  if (gvl.isConstant) varKeyword += ' CONSTANT';
  if (gvl.isPersistent) varKeyword += ' PERSISTENT';
  if (gvl.isRetain) varKeyword += ' RETAIN';
  const lines: string[] = [varKeyword];
  for (const v of gvl.variables) {
    let line = `    ${v.name} : ${v.type}`;
    if (v.initialValue !== undefined) line += ` := ${v.initialValue}`;
    line += ';';
    if (v.comment) line += ` // ${v.comment}`;
    lines.push(line);
  }
  lines.push('END_VAR');
  return lines.join('\n');
}

/** Build a GVL <data> addData XML element (without project envelope) */
function buildGvlAddData(gvl: GvlDefinition, indent: string = '    '): string {
  const varLines = gvl.variables.map(v => {
    const addr = v.address ? ` address="${escapeXml(v.address)}"` : '';
    let xml = `${indent}      <variable name="${escapeXml(v.name)}"${addr}>\n`;
    xml += `${indent}        <type>${mapTypeToXml(v.type)}</type>\n`;
    if (v.initialValue !== undefined) {
      xml += `${indent}        <initialValue><simpleValue value="${escapeXml(v.initialValue)}" /></initialValue>\n`;
    }
    if (v.comment) {
      xml += `${indent}        <documentation><xhtml xmlns="${XMLNS_XHTML}">${escapeXml(v.comment)}</xhtml></documentation>\n`;
    }
    xml += `${indent}      </variable>`;
    return xml;
  }).join('\n');

  // P2.0/A1: retain/persistent were silently dropped here — CODESYS then
  // imported the GVL as a plain VAR_GLOBAL and persistence was lost on import.
  const gvlAttrs =
    (gvl.isConstant ? ' constant="true"' : '') +
    (gvl.isRetain ? ' retain="true"' : '') +
    (gvl.isPersistent ? ' persistent="true"' : '');
  return `${indent}<data name="http://www.3s-software.com/plcopenxml/globalvars" handleUnknown="implementation">
${indent}  <globalVars name="${escapeXml(gvl.name)}"${gvlAttrs}>
${varLines}
${indent}  </globalVars>
${indent}</data>`;
}

// ── Public Builders (compose fragments into complete XML documents) ────

/** Build a complete PLCopen XML for a single POU */
export function buildPouXml(pou: PouDefinition): string {
  const dt = getDateTime();
  const pouElement = buildPouElement(pou, '      ');
  const body = `  <types>
    <dataTypes />
    <pous>
${pouElement}
    </pous>
  </types>
  <instances>
    <configurations />
  </instances>`;
  return projectEnvelope(pou.name, dt, body);
}

/** Build a complete PLCopen XML for a single data type */
export function buildDataTypeXml(dt: DataTypeDefinition): string {
  const dateTime = getDateTime();
  const dtElement = buildDataTypeElement(dt, '      ');
  const body = `  <types>
    <dataTypes>
${dtElement}
    </dataTypes>
    <pous />
  </types>
  <instances>
    <configurations />
  </instances>`;
  return projectEnvelope(dt.name, dateTime, body);
}

/** Build a complete PLCopen XML for a single GVL */
export function buildGvlXml(gvl: GvlDefinition): string {
  const dateTime = getDateTime();
  const gvlData = buildGvlAddData(gvl, '    ');
  const body = `  <types>
    <dataTypes />
    <pous />
  </types>
  <instances>
    <configurations />
  </instances>
  <addData>
${gvlData}
  </addData>`;
  return projectEnvelope(gvl.name, dateTime, body);
}

/** Build a complete PLCopen XML project containing multiple POUs, data types, and GVLs */
export function buildProjectXml(
  projectName: string,
  pous: PouDefinition[],
  dataTypes?: DataTypeDefinition[],
  gvls?: GvlDefinition[]
): string {
  const dateTime = getDateTime();

  // Data types fragment
  const dataTypesXml = (dataTypes && dataTypes.length > 0)
    ? dataTypes.map(dt => buildDataTypeElement(dt, '    ')).join('\n')
    : '';

  // POUs fragment
  const pousXml = pous.map(pou => buildPouElement(pou, '    ')).join('\n');

  // GVL addData fragments
  const gvlAddData = (gvls && gvls.length > 0)
    ? gvls.map(gvl => buildGvlAddData(gvl, '    ')).join('\n')
    : '';

  // Project structure
  const pouStructure = pous.map(p => `      <Object Name="${escapeXml(p.name)}" />`).join('\n');
  const gvlStructure = (gvls || []).map(g => `      <Object Name="${escapeXml(g.name)}" />`).join('\n');
  const projectStructure = [pouStructure, gvlStructure].filter(Boolean).join('\n');

  const body = `  <types>
    <dataTypes>
${dataTypesXml}
    </dataTypes>
    <pous>
${pousXml}
    </pous>
  </types>
  <instances>
    <configurations />
  </instances>
  <addData>
${gvlAddData}
    <data name="http://www.3s-software.com/plcopenxml/projectstructure" handleUnknown="discard">
      <ProjectStructure>
${projectStructure}
      </ProjectStructure>
    </data>
  </addData>`;

  return projectEnvelope(projectName, dateTime, body);
}
