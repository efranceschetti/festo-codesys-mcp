/**
 * ST Project Index — cross-file code-intelligence layer for Structured Text.
 *
 * Stage 1: aggregates DEFINITIONS from multiple .st files into an index by name.
 * The definitions come from parseStFile (the dialect-correct source — handles
 * pragmas, AT %, nested comments, VAR CONSTANT), never from fresh regex. The
 * indexSources() engine is source-agnostic (disk today; ide_get_pou_code/exports
 * later — just pass {path, content}[]).
 *
 * Limits of this stage (addressed in Stage 2, with the positional lexer):
 *  - no position (line/column) on the definitions;
 *  - no find-references (usage search);
 *  - VAR_STAT/VAR_TEMP are not emitted (the current parser does not extract them).
 */

import { readFile } from 'fs/promises';
import { basename } from 'path';
import { parseStFile, type ParsedFile } from '../utils/st-parser.js';
import type { VarDeclaration } from '../utils/xml-builder.js';
import { scanStFiles } from '../utils/fs-scan.js';
import { tokenizeIdentifiers, ST_KEYWORDS, type Token } from '../utils/st-lexer.js';

export interface Position {
  offset: number; // 0-based no conteudo original
  line: number;   // 1-based
  column: number; // 1-based
}

export type SymbolKind =
  | 'functionBlock' | 'program' | 'function'
  | 'enum' | 'struct' | 'gvl'
  | 'inputVar' | 'outputVar' | 'inOutVar' | 'localVar' | 'localConstVar'
  | 'statVar' | 'tempVar' | 'globalVar' | 'enumMember' | 'structMember' | 'returnType';

/** Kinds que sao containers top-level (POU/type/GVL) — entram em topLevelByName. */
export const TOP_LEVEL_KINDS: ReadonlySet<SymbolKind> = new Set<SymbolKind>([
  'functionBlock', 'program', 'function', 'enum', 'struct', 'gvl',
]);

export interface SymbolDefinition {
  name: string;
  kind: SymbolKind;
  type?: string;        // tipo IEC da var; returnType p/ function
  container?: string;   // POU/GVL/dataType dono (undefined p/ top-level)
  filePath: string;
  position?: Position;   // Etapa 2 (lexer)
  comment?: string;
  initialValue?: string;
  address?: string;
}

export interface IndexedFile {
  filePath: string;
  fileName: string;
  parsed: ParsedFile;
  content: string;       // conteudo cru
  symbols: SymbolDefinition[];
  tokens: Token[];       // identificadores ja tokenizados (reuso p/ findReferences)
}

export interface ProjectIndex {
  files: IndexedFile[];
  byName: Map<string, SymbolDefinition[]>;        // UPPERCASE key (IEC is case-insensitive)
  topLevelByName: Map<string, SymbolDefinition>;  // UPPERCASE key
}

/** Abstract source of ST code — decouples disk from the indexer. */
export interface IndexSource {
  path: string;
  content: string;
}

/** Extract SymbolDefinitions from an already-parsed file. Pure function. */
export function extractSymbols(parsed: ParsedFile, filePath: string): SymbolDefinition[] {
  const symbols: SymbolDefinition[] = [];

  if (parsed.kind === 'pou') {
    const pou = parsed.pou;
    symbols.push({ name: pou.name, kind: pou.pouType, type: pou.returnType, filePath });

    const pushVars = (vars: VarDeclaration[] | undefined, kind: SymbolKind): void => {
      for (const v of vars ?? []) {
        symbols.push({
          name: v.name, kind, type: v.type, container: pou.name, filePath,
          comment: v.comment, initialValue: v.initialValue, address: v.address,
        });
      }
    };
    pushVars(pou.inputVars, 'inputVar');
    pushVars(pou.outputVars, 'outputVar');
    pushVars(pou.inOutVars, 'inOutVar');
    pushVars(pou.localVars, 'localVar');
    pushVars(pou.localConstantVars, 'localConstVar');
  } else if (parsed.kind === 'gvl') {
    const gvl = parsed.gvl;
    symbols.push({ name: gvl.name, kind: 'gvl', filePath });
    for (const v of gvl.variables) {
      symbols.push({
        name: v.name, kind: 'globalVar', type: v.type, container: gvl.name, filePath,
        comment: v.comment, initialValue: v.initialValue, address: v.address,
      });
    }
  } else {
    const dt = parsed.dataType;
    symbols.push({ name: dt.name, kind: dt.kind, filePath });
    for (const m of dt.members) {
      symbols.push({
        name: m.name,
        kind: dt.kind === 'enum' ? 'enumMember' : 'structMember',
        type: m.type, container: dt.name, filePath,
        comment: m.comment, initialValue: m.value,
      });
    }
  }

  return symbols;
}

/** Index a set of ST sources (origin-agnostic engine). */
export function indexSources(sources: IndexSource[]): ProjectIndex {
  const files: IndexedFile[] = [];
  const byName = new Map<string, SymbolDefinition[]>();
  const topLevelByName = new Map<string, SymbolDefinition>();

  for (const src of sources) {
    let parsed: ParsedFile;
    try {
      parsed = parseStFile(src.content, basename(src.path));
    } catch {
      // A malformed file becomes a no-op — it does not bring down the whole index.
      continue;
    }
    const symbols = extractSymbols(parsed, src.path);

    // Locator: the 1st NON-qualified occurrence of a name is its declaration
    // (in this dialect, 1 POU/file and declarations before the body). Assigns
    // a position (line/column) to each definition without modifying the parser.
    const tokens = tokenizeIdentifiers(src.content);
    const firstPos = new Map<string, Position>();
    for (const t of tokens) {
      if (t.qualified) continue;
      const k = t.value.toUpperCase();
      if (!firstPos.has(k)) firstPos.set(k, t.start);
    }
    for (const sym of symbols) {
      const p = firstPos.get(sym.name.toUpperCase());
      if (p) sym.position = p;
    }

    files.push({ filePath: src.path, fileName: basename(src.path), parsed, content: src.content, symbols, tokens });

    for (const sym of symbols) {
      const key = sym.name.toUpperCase();
      const list = byName.get(key);
      if (list) list.push(sym);
      else byName.set(key, [sym]);
      if (TOP_LEVEL_KINDS.has(sym.kind) && !topLevelByName.has(key)) {
        topLevelByName.set(key, sym);
      }
    }
  }

  return { files, byName, topLevelByName };
}

/** Read a directory of .st files (recursive) and build the index. Stateless per call. */
export async function buildProjectIndex(sourceDir: string): Promise<ProjectIndex> {
  const stFiles = await scanStFiles(sourceDir);
  const sources: IndexSource[] = [];
  for (const file of stFiles) {
    const content = await readFile(file, 'utf-8');
    sources.push({ path: file, content });
  }
  return indexSources(sources);
}

/** Resolve a name (case-insensitive) to its definitions. */
export function getDefinitions(index: ProjectIndex, name: string): SymbolDefinition[] {
  return index.byName.get(name.toUpperCase()) ?? [];
}

export interface Reference {
  name: string;
  filePath: string;
  position: Position;
  lineText: string;          // the whole line (trimmed), for context
  containerPou?: string;     // POU/GVL/type that contains this occurrence
  isDefinitionSite: boolean; // true if this occurrence IS the declaration
  disambiguation: string[];  // hints (see buildBaseDisambiguation + qualifier)
}

export interface FindReferencesOptions {
  includeDeclaration?: boolean; // include the declaration site (default false)
  caseInsensitive?: boolean;    // default true (IEC is case-insensitive)
}

/** Occurrence-independent disambiguation hints (what the name IS in the project). */
function buildBaseDisambiguation(index: ProjectIndex, name: string): string[] {
  const hints: string[] = [];
  const defs = getDefinitions(index, name);
  const kinds = new Set(defs.map(d => d.kind));

  for (const d of defs) {
    if (TOP_LEVEL_KINDS.has(d.kind)) { hints.push(`matches ${d.kind} '${d.name}'`); break; }
  }
  if (kinds.has('globalVar')) {
    const g = defs.find(d => d.kind === 'globalVar');
    hints.push(`global var${g?.container ? ` in ${g.container}` : ''}`);
  }
  if ([...kinds].some(k => k.endsWith('Var') && k !== 'globalVar')) hints.push('POU local var');
  if (kinds.has('enumMember') || kinds.has('structMember')) hints.push('enum/struct member');
  if (ST_KEYWORDS.has(name.toUpperCase())) hints.push('IEC keyword/builtin');
  if (defs.length === 0 && !ST_KEYWORDS.has(name.toUpperCase())) hints.push('unresolved (external/lib)');

  return hints;
}

/** Token-aware search for references to `name` across the whole index (outside comments/strings). */
export function findReferences(
  index: ProjectIndex,
  name: string,
  opts: FindReferencesOptions = {},
): Reference[] {
  const ci = opts.caseInsensitive ?? true;
  const includeDecl = opts.includeDeclaration ?? false;
  const target = ci ? name.toUpperCase() : name;
  const base = buildBaseDisambiguation(index, name);
  const refs: Reference[] = [];

  for (const f of index.files) {
    const container = f.symbols.find(s => TOP_LEVEL_KINDS.has(s.kind))?.name;
    // declaration offsets of this name in this file
    const defOffsets = new Set<number>();
    for (const s of f.symbols) {
      if ((ci ? s.name.toUpperCase() : s.name) === target && s.position) defOffsets.add(s.position.offset);
    }
    const lines = f.content.split(/\r?\n/);

    for (const t of f.tokens) {
      if ((ci ? t.value.toUpperCase() : t.value) !== target) continue;
      const isDef = defOffsets.has(t.start.offset);
      if (isDef && !includeDecl) continue;

      const disambiguation = [...base];
      if (t.qualified) {
        const resolved = t.qualifier && index.topLevelByName.has(t.qualifier.toUpperCase());
        disambiguation.unshift(resolved
          ? `member of ${t.qualifier}`
          : `member access (qualified${t.qualifier ? ` via ${t.qualifier}` : ''})`);
      }

      refs.push({
        name: t.value,
        filePath: f.filePath,
        position: t.start,
        lineText: (lines[t.start.line - 1] ?? '').trim(),
        containerPou: container,
        isDefinitionSite: isDef,
        disambiguation,
      });
    }
  }

  return refs;
}
