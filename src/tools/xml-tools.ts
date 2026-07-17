/**
 * PLCopen XML Tools
 * Tools for generating, validating, and converting PLCopen XML.
 */

import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { XMLValidator } from 'fast-xml-parser';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildProjectXml, type PouDefinition, type DataTypeDefinition, type GvlDefinition } from '../utils/xml-builder.js';
import { parseStFile } from '../utils/st-parser.js';
import { validatePath, ensureDir } from '../utils/path-validation.js';
import { successResponse, errorResponse, getErrorMessage, structuredResponse } from '../utils/mcp-helpers.js';
import { pathExists, scanStFiles } from '../utils/fs-scan.js';
import { runPythonWrapper } from '../services/python-runner.js';
import { appendNextStep } from '../utils/next-steps.js';
import { log } from '../utils/logger.js';

export function registerXmlTools(server: McpServer) {

  // ── generate_plcopen_xml ────────────────────────────────────────────
  server.registerTool(
    'generate_plcopen_xml',
    {
      title: 'Generate PLCopen XML (batch)',
      description: `Batch-convert a directory of .st files into a single PLCopen TC6 0200 XML for CODESYS import.
USE WHEN: .st sources are final and reviewed, and the user wants a CODESYS-importable file.
ALWAYS BEFORE: plc_knowledge topic 'ground-truth' (anti-hallucination XML rules) if you have not loaded it this session.
ALWAYS AFTER: validate_plcopen_xml -> validate_plcopen_xsd -> validate_plcopen_semantic. Never hand the XML to the user before the chain passes.
DO NOT: hand-write PLCopen XML — always generate it from .st sources with this tool.`,
      inputSchema: {
        sourceDir: z.string().min(1).describe('Directory containing .st files'),
        outputFile: z.string().min(1).describe('Output XML file path'),
        projectName: z.string().default('PLCProject'),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: false },
    },
    async ({ sourceDir, outputFile, projectName }) => {
      try {
        const srcErr = validatePath(sourceDir);
        if (srcErr) return errorResponse(`Error: ${srcErr}`);
        const outErr = validatePath(outputFile);
        if (outErr) return errorResponse(`Error: ${outErr}`);
        if (!(await pathExists(sourceDir))) return errorResponse(`Error: Directory not found: ${sourceDir}`);

        const stFiles = await scanStFiles(sourceDir);

        if (stFiles.length === 0) {
          return successResponse(`No .st files found in: ${sourceDir}`);
        }

        const pous: PouDefinition[] = [];
        const dataTypes: DataTypeDefinition[] = [];
        const gvls: GvlDefinition[] = [];
        const errors: string[] = [];

        for (const file of stFiles) {
          try {
            const content = await readFile(file, 'utf-8');
            const parsed = parseStFile(content, basename(file));
            if (parsed.kind === 'pou') pous.push(parsed.pou);
            else if (parsed.kind === 'dataType') dataTypes.push(parsed.dataType);
            else if (parsed.kind === 'gvl') gvls.push(parsed.gvl);
          } catch (err) {
            errors.push(`${basename(file)}: ${err}`);
          }
        }

        await ensureDir(dirname(outputFile));

        const xml = buildProjectXml(projectName, pous, dataTypes, gvls);
        await writeFile(outputFile, xml, 'utf-8');

        log('info', 'generate_plcopen_xml', `Generated ${outputFile} from ${stFiles.length} files`);

        const lines = [
          `PLCopen XML generated: ${outputFile}`,
          `Parsed ${stFiles.length} files:`,
          `  POUs: ${pous.length}  |  Data Types: ${dataTypes.length}  |  GVLs: ${gvls.length}`,
        ];
        if (errors.length > 0) lines.push('', 'Warnings:', ...errors.map(e => `  ${e}`));
        lines.push('', 'Import: CODESYS → Project → Import PLCopen XML...');

        return successResponse(appendNextStep(lines.join('\n'), 'generate_plcopen_xml'));
      } catch (err) {
        return errorResponse(`Error generating PLCopen XML: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── validate_plcopen_xml ────────────────────────────────────────────
  server.registerTool(
    'validate_plcopen_xml',
    {
      title: 'Validate PLCopen XML (fast sanity check)',
      description: `Fast smoke check for PLCopen XML — XML well-formedness + 13 structural regex heuristics.
USE WHEN: immediately after generate_plcopen_xml, as the fast first gate before the XSD/semantic validators.
Use AFTER generate_plcopen_xml as a quick gate before the heavier validators.
Checks: XML well-formedness, PLCopen namespace, XHTML namespace, fileHeader, contentHeader,
coordinateInfo (fbd/ld/sfc), mandatory instances footer, zero-ID rule on connectionPoints,
ST code wrapping in xhtml, inOutVariables on blocks, structural hierarchy.
Returns: PASSED/ISSUES counts and VALID/FIX verdict.

NOTE: this is a sanity check only. For full validation use:
  - validate_plcopen_xsd      — XSD official PLCopen TC6 v2.00 (catches structural issues)
  - validate_plcopen_semantic — count vars/inits source ST vs XML (catches Bugs A/B/E/F: missing vars/inits)`,
      inputSchema: {
        filePath: z.string().min(1).describe('Path to PLCopen XML file'),
      },
      outputSchema: {
        filePath: z.string(),
        valid: z.boolean(),
        passed: z.number(),
        failed: z.number(),
        passedChecks: z.array(z.string()),
        failedChecks: z.array(z.string()),
        counts: z.object({
          pou: z.number(),
          dataType: z.number(),
          gvl: z.number(),
        }),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ filePath }) => {
      try {
        const pathErr = validatePath(filePath);
        if (pathErr) return errorResponse(`Error: ${pathErr}`);
        if (!(await pathExists(filePath))) return errorResponse(`File not found: ${filePath}`);

        const content = await readFile(filePath, 'utf-8');
        const pass: string[] = [];
        const fail: string[] = [];

        // 1. XML declaration
        content.startsWith('<?xml')
          ? pass.push('XML declaration')
          : fail.push('Missing <?xml?> declaration');

        // 2. Well-formedness: real XML parser (fast-xml-parser)
        // Addresses F3-008/F3-043: replaces .includes() with real validation.
        // D5-016: top-level import (was a dynamic import inside the handler).
        const xmlValid = XMLValidator.validate(content);
        if (xmlValid === true) {
          pass.push('XML well-formed');
        } else {
          fail.push(`XML malformed: ${xmlValid.err.msg} at line ${xmlValid.err.line}`);
        }
        // 2b. Has <project> root (PLCopen-specific marker)
        if (content.includes('<project ') || content.includes('<project>')) {
          pass.push('Has <project> root');
        } else {
          fail.push('Missing <project> root element');
        }

        // 3. PLCopen namespace
        content.includes('http://www.plcopen.org/xml/tc6_0200')
          ? pass.push('PLCopen TC6 0200 namespace')
          : fail.push('Missing PLCopen namespace');

        // 4. XHTML namespace
        content.includes('http://www.w3.org/1999/xhtml')
          ? pass.push('XHTML namespace')
          : fail.push('Missing XHTML namespace');

        // 5. fileHeader
        content.includes('<fileHeader')
          ? pass.push('fileHeader present')
          : fail.push('Missing <fileHeader>');

        // 6. contentHeader not self-closing
        if (content.includes('<contentHeader') && content.includes('</contentHeader>')) {
          pass.push('contentHeader properly opened/closed');
        } else if (content.includes('<contentHeader')) {
          fail.push('contentHeader appears self-closing');
        } else {
          fail.push('Missing <contentHeader>');
        }

        // 7. coordinateInfo — D5-005: accepts self-closing `<fbd />` or
        // open-close `<fbd>...</fbd>`. PLCopen allows both for elements
        // with default scaling; previously it used .includes('<fbd>') and gave a false
        // negative on legitimate XML emitted with self-closing.
        if (content.includes('<coordinateInfo>')) {
          pass.push('coordinateInfo present');
          const hasFbd = /<fbd[\s/>]/.test(content);
          const hasLd  = /<ld[\s/>]/.test(content);
          const hasSfc = /<sfc[\s/>]/.test(content);
          if (hasFbd && hasLd && hasSfc) {
            pass.push('coordinateInfo has fbd/ld/sfc children');
          } else {
            fail.push('coordinateInfo missing fbd/ld/sfc children');
          }
        } else {
          fail.push('Missing <coordinateInfo>');
        }

        // 8. instances/configurations footer
        content.includes('<instances>') && content.includes('<configurations')
          ? pass.push('Mandatory footer present')
          : fail.push('Missing <instances><configurations/></instances> footer');

        // 9. Zero-ID rule
        const idViolations = (content.match(/<connectionPoint(?:In|Out)\s+id=/g) || []).length;
        idViolations === 0
          ? pass.push('Zero-ID rule OK')
          : fail.push(`Zero-ID violated: ${idViolations} connection points with id=`);

        // 10. ST code wrapping
        if (content.includes('<ST>')) {
          content.includes('<xhtml') || content.includes('<html:')
            ? pass.push('ST code wrapped in xhtml')
            : fail.push('ST code not wrapped in xhtml/html tags');
        }

        // 11. inOutVariables in blocks
        if (content.includes('<block ')) {
          content.includes('<inOutVariables')
            ? pass.push('Blocks have inOutVariables')
            : fail.push('Blocks missing <inOutVariables/> (mandatory)');
        }

        // 12. Structural hierarchy: types > pous, types > dataTypes
        const hasTypes = content.includes('<types>') || content.includes('<types ');
        const hasPous = content.includes('<pous>') || content.includes('<pous ') || content.includes('<pous/>') || content.includes('<pous />');
        if (hasTypes && hasPous) {
          pass.push('Structural hierarchy: <types> contains <pous>');
        } else if (!hasTypes) {
          fail.push('Missing <types> element');
        }

        // 13. Count POUs, data types, GVLs for info
        const pouCount = (content.match(/<pou\s+name=/g) || []).length;
        const dtCount = (content.match(/<dataType\s+name=/g) || []).length;
        const gvlCount = (content.match(/<globalVars\s+name=/g) || []).length;

        const report = [
          'PLCopen XML Validation Report',
          `File: ${filePath}`,
          '═'.repeat(50),
          '',
          `Contents: ${pouCount} POU(s), ${dtCount} data type(s), ${gvlCount} GVL(s)`,
          '',
          `PASSED (${pass.length}):`,
          ...pass.map(p => `  [OK] ${p}`),
        ];

        if (fail.length > 0) {
          report.push('', `ISSUES (${fail.length}):`, ...fail.map(f => `  [!!] ${f}`));
        }

        report.push('', fail.length === 0 ? 'VERDICT: VALID' : 'VERDICT: FIX ISSUES BEFORE IMPORT');

        const hintKey = fail.length === 0 ? 'validate_plcopen_xml:valid' : 'validate_plcopen_xml:fix';
        return structuredResponse(appendNextStep(report.join('\n'), hintKey), {
          filePath,
          valid: fail.length === 0,
          passed: pass.length,
          failed: fail.length,
          passedChecks: pass,
          failedChecks: fail,
          counts: { pou: pouCount, dataType: dtCount, gvl: gvlCount },
        });
      } catch (err) {
        return errorResponse(`Error validating PLCopen XML: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── validate_plcopen_xsd ────────────────────────────────────────────
  // Gate 1: structural validation via the official PLCopen TC6 v2.00 XSD.
  // Delegates to a Python wrapper (lib.plcopen_validation.xsd_gate).
  server.registerTool(
    'validate_plcopen_xsd',
    {
      title: 'Validate PLCopen XML against official TC6 v2.00 XSD',
      description: `Strict schema validation against the official PLCopen TC6 v2.00 XSD (embedded).
USE WHEN: after validate_plcopen_xml passes and you need strict schema conformance before import.
Catches structural issues that the fast sanity check misses: malformed elements,
required attributes missing, type mismatches, etc.
Use AFTER generate_plcopen_xml for full structural validation before CODESYS import.

Output: { gate, valid, summary, errors[{line, location, code, message}], counts }
Codes: FILE_NOT_FOUND, XSD_NOT_FOUND, XSD_PARSE_ERROR, XML_PARSE_ERROR, XSD_VIOLATION.

NOTE: requires lxml in the MCP python venv. Pair with validate_plcopen_semantic
for end-to-end coverage (XSD catches structure, semantic catches missing vars/inits).`,
      inputSchema: {
        filePath: z.string().min(1).describe('Path to PLCopen XML file'),
        xsdPath: z.string().optional().describe('Optional custom XSD path. Default: bundled tc6_xml_v200_patched.xsd'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ filePath, xsdPath }) => {
      try {
        const args: Record<string, unknown> = { filePath };
        if (xsdPath) args.xsdPath = xsdPath;
        const result = await runPythonWrapper('validate_plcopen_xsd', args);
        if (!result.success) return errorResponse(result.stderr);
        log('info', 'validate_plcopen_xsd', JSON.stringify(result.data).slice(0, 200));
        const xsdValid = (result.data as { valid?: boolean } | null)?.valid === true;
        return successResponse(appendNextStep(
          JSON.stringify(result.data, null, 2),
          xsdValid ? 'validate_plcopen_xsd:valid' : 'validate_plcopen_xsd',
        ));
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── validate_plcopen_semantic ───────────────────────────────────────
  // Gate 2: semantic validation — count vars/inits source ST vs XML.
  // Catches generator Bugs A/B/E/F that the XSD does not detect.
  server.registerTool(
    'validate_plcopen_semantic',
    {
      title: 'Validate PLCopen XML semantically against source ST',
      description: `Compares variable/initializer counts between source .st files and generated PLCopen XML.
USE WHEN: after validate_plcopen_xsd passes, to confirm no variables/initializers were silently dropped vs the .st sources.
Detects bugs where the generator silently drops variables or initializers:
  - VARS_MISSING        — ST has more vars than XML (Bugs A/B/F)
  - INITS_MISSING       — ST has more initializers than XML (Bug E)
  - AT_ADDR_LOST        — ST has vars with AT %IX/QX, XML has 0 <address> tags (Bug A)
  - POU_MISSING_IN_XML  — POU declared in .st but absent in XML

Use AFTER validate_plcopen_xsd. If XSD passes but semantic fails, the XML is
structurally valid but missing content — exactly the silent-failure scenario
that caused the 2026-05-22 incident (203 CODESYS errors).

Tolerances are configurable; defaults are permissive (-25% vars, -30% inits).

Output: { gate, valid, summary, errors[{line, location, code, message}], counts }`,
      inputSchema: {
        filePath: z.string().min(1).describe('Path to PLCopen XML file (e.g. master-final.xml)'),
        sourceDir: z.string().min(1).describe('Directory containing source .st files (recursive scan)'),
        varsTolerance: z.number().min(0).max(1).optional().describe('XML/ST var ratio threshold (default 0.75)'),
        initsTolerance: z.number().min(0).max(1).optional().describe('XML/ST init ratio threshold (default 0.70)'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ filePath, sourceDir, varsTolerance, initsTolerance }) => {
      try {
        const args: Record<string, unknown> = { filePath, sourceDir };
        if (varsTolerance !== undefined) args.varsTolerance = varsTolerance;
        if (initsTolerance !== undefined) args.initsTolerance = initsTolerance;
        const result = await runPythonWrapper('validate_plcopen_semantic', args);
        if (!result.success) return errorResponse(result.stderr);
        log('info', 'validate_plcopen_semantic', JSON.stringify(result.data).slice(0, 200));
        const semanticValid = (result.data as { valid?: boolean } | null)?.valid === true;
        return successResponse(appendNextStep(
          JSON.stringify(result.data, null, 2),
          semanticValid ? 'validate_plcopen_semantic:valid' : 'validate_plcopen_semantic',
        ));
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── create_project_structure ────────────────────────────────────────
  server.registerTool(
    'create_project_structure',
    {
      title: 'Create CODESYS Project Structure',
      description: `Scaffold a standard CODESYS project directory for Festo CPX-E.
USE WHEN: starting a new CODESYS project and you need the standard folder scaffold before creating POUs.
Creates: src/0_Types, src/1_Globals, src/2_Programs, src/3_FunctionBlocks,
src/4_Functions, src/5_Library, export/xml, docs.
Set includeExamples=true to pre-populate with E_MachState, GVL_Sys, and PRG_Main stubs.
After scaffolding, create files in order: Types → GVLs → FBs → Programs → generate XML.`,
      inputSchema: {
        projectDir: z.string().min(1).describe('Root directory'),
        projectName: z.string().min(1).describe('Project name'),
        includeExamples: z.boolean().default(false),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: false },
    },
    async ({ projectDir, projectName, includeExamples }) => {
      try {
        const pathErr = validatePath(projectDir);
        if (pathErr) return errorResponse(`Error: ${pathErr}`);

        const dirs = [
          'src/0_Types', 'src/1_Globals', 'src/2_Programs',
          'src/3_FunctionBlocks', 'src/4_Functions', 'src/5_Library',
          'export/xml', 'docs',
        ];
        for (const d of dirs) await mkdir(join(projectDir, d), { recursive: true });

        if (includeExamples) {
          // Addresses F3-041: refuse to overwrite existing example files.
          // CODESYS engineers may have already populated 0_Types/, 1_Globals/,
          // 2_Programs/ — overwriting silently destroys work.
          const examples = [
            {
              path: 'src/0_Types/E_MachState.st',
              content: 'TYPE E_MachState :\n(\n    IDLE := 0,\n    INIT := 10,\n    READY := 20,\n    RUNNING := 30,\n    STOPPING := 50,\n    ERROR := 99\n);\nEND_TYPE',
            },
            {
              path: 'src/1_Globals/GVL_Sys.st',
              content: '{attribute \'qualified_only\'}\nVAR_GLOBAL\n    bSysRdy     : BOOL;\n    eMchState   : E_MachState;\n    nErrCode    : DINT;\nEND_VAR',
            },
            {
              path: 'src/2_Programs/PRG_Main.st',
              content: '// PRG_Main — Main program\n\nPROGRAM PRG_Main\nVAR\n    nState : INT := 0;\nEND_VAR\n\nCASE nState OF\n    0: // IDLE\n        ;\nEND_CASE',
            },
          ];

          const conflicts: string[] = [];
          for (const ex of examples) {
            if (await pathExists(join(projectDir, ex.path))) {
              conflicts.push(ex.path);
            }
          }
          if (conflicts.length > 0) {
            return errorResponse(
              `Refusing to overwrite existing example file(s):\n${conflicts.map(c => '  ' + c).join('\n')}\nMove or delete them first, or call without includeExamples=true.`,
            );
          }

          for (const ex of examples) {
            await writeFile(join(projectDir, ex.path), ex.content);
          }
        }

        log('info', 'create_project_structure', `Scaffolded "${projectName}" at ${projectDir}`);

        return successResponse(appendNextStep([
          `Project "${projectName}" created at: ${projectDir}`,
          '', ...dirs.map(d => `  ${d}/`),
          '', 'Target: Festo CPX-E (CODESYS V3.5)',
        ].join('\n'), 'create_project_structure'));
      } catch (err) {
        return errorResponse(`Error creating project structure: ${getErrorMessage(err)}`);
      }
    }
  );
}
