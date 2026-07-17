/**
 * IEC 61131-3 Structured Text Parser
 * Parses .st files to extract POU metadata for PLCopen XML generation.
 */

import type { VarDeclaration, PouDefinition, DataTypeDefinition, GvlDefinition } from './xml-builder.js';

export type ParsedFile = {
  kind: 'pou';
  pou: PouDefinition;
} | {
  kind: 'dataType';
  dataType: DataTypeDefinition;
} | {
  kind: 'gvl';
  gvl: GvlDefinition;
};

/**
 * Remove block comments `(* ... *)` correctly, supporting nesting.
 * F3-046: lazy regex `/\\(\\*[\\s\\S]*?\\*\\)/g` breaks with `(* outer (* inner *) *)`
 * because it matches up to the first `*)`. This implementation uses a depth
 * counter — IEC 61131-3 and CODESYS V3.5 allow nesting.
 */
export function stripBlockComments(text: string): string {
  let result = '';
  let i = 0;
  let depth = 0;
  while (i < text.length) {
    const isOpen = text[i] === '(' && text[i + 1] === '*';
    const isClose = text[i] === '*' && text[i + 1] === ')';
    if (isOpen) {
      depth++;
      i += 2;
      continue;
    }
    if (isClose && depth > 0) {
      depth--;
      i += 2;
      continue;
    }
    if (depth === 0) {
      result += text[i];
    }
    i++;
  }
  return result;
}

/**
 * Replaces comments `(* ... *)` with spaces/newlines of the same length.
 * Keeps the original OFFSETS — used to detect block boundaries via
 * regex on "clean" content and map back to slicing the original
 * content (preserving inline comments for parsing declarations).
 *
 * Bug C fix #2: without this, "VAR_GLOBAL" mentioned in a header
 * comment confused the block regex; but plain stripBlockComments
 * shifts the offsets and prevented precise extraction of the real block.
 */
export function maskBlockComments(text: string): string {
  const chars = text.split('');
  let i = 0;
  let depth = 0;
  while (i < text.length) {
    const isOpen = text[i] === '(' && text[i + 1] === '*';
    const isClose = text[i] === '*' && text[i + 1] === ')';
    if (isOpen) {
      depth++;
      chars[i] = chars[i + 1] = ' ';
      i += 2;
      continue;
    }
    if (isClose && depth > 0) {
      depth--;
      chars[i] = chars[i + 1] = ' ';
      i += 2;
      continue;
    }
    if (depth > 0 && chars[i] !== '\n' && chars[i] !== '\r') {
      chars[i] = ' ';
    }
    i++;
  }
  return chars.join('');
}

/**
 * P2.0/A4: Remove ONE leading `(* ... *)` block comment (nesting-aware).
 * IEC 61131-3 block comments nest; a lazy regex stops at the first `*)` and
 * leaves the comment tail glued to the next declaration, which then silently
 * fails declRe — the variable disappears from the XML with no warning.
 * An unterminated comment is left untouched (declRe will not match, same
 * failure mode as before — never worse).
 */
function stripLeadingBlockComment(s: string): string {
  const t = s.replace(/^\s+/, '');
  if (!t.startsWith('(*')) return s;
  let depth = 0;
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i] === '(' && t[i + 1] === '*') {
      depth++;
      i++;
    } else if (t[i] === '*' && t[i + 1] === ')') {
      depth--;
      i++;
      if (depth === 0) return t.slice(i + 1);
    }
  }
  return s;
}

function parseVarBlock(block: string): VarDeclaration[] {
  const vars: VarDeclaration[] = [];

  // Strip BOM
  const original = block.startsWith('﻿') ? block.slice(1) : block;

  // Bug C fix #4: uses MASKED (comments → spaces with offsets preserved)
  // to detect declaration boundaries via splitStatements and regex,
  // then extracts content from the ORIGINAL at the same offsets. This preserves
  // trailing inline comments `(* ... *)` for capturing the comment field,
  // without comments inside the block (e.g. `(* Current counts ... *)`)
  // confusing splitStatements or the standalone keyword strip.
  const masked = maskBlockComments(original);

  // Strip keywords VAR_*/END_VAR + pragmas. Applied to the masked (offsets
  // preserved) — strip never catches a keyword inside a comment.
  const stripPattern = /\{attribute[^}]*\}|\b(?:VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR_GLOBAL|VAR_EXTERNAL|VAR_TEMP|VAR_STAT|VAR_PERSISTENT|VAR_RETAIN|VAR_NON_RETAIN|VAR\s+CONSTANT|VAR|END_VAR|PERSISTENT|RETAIN|CONSTANT)\b/gi;
  const maskedStripped = masked.replace(stripPattern, (m) => ' '.repeat(m.length));

  // splitStatements on the masked — boundaries at depth 0 (masked comments
  // do not confuse the depth counter).
  const ranges = splitStatementRanges(maskedStripped);

  for (const [start, end] of ranges) {
    // Slice from the ORIGINAL to preserve trailing inline comments after the `;`.
    let stmt = original.slice(start, end).trim();
    // Remove residual keywords/pragmas at the start/end of the stmt (the slice
    // comes from the original, only the maskedStripped had keywords removed).
    const kwRe = /(?:\{attribute[^}]*\}|\b(?:VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR_GLOBAL|VAR_EXTERNAL|VAR_TEMP|VAR_STAT|VAR_PERSISTENT|VAR_RETAIN|VAR_NON_RETAIN|VAR|END_VAR|PERSISTENT|RETAIN|CONSTANT)\b)/gi;
    // Bug F fix: also removes LEADING comments `(* ... *)` at the start of the
    // stmt. The slice comes from the ORIGINAL (comments preserved so trailing inline
    // ones become the comment field), so a comment on its OWN LINE before the
    // declaration gets stuck at the start (`(* ... *)\n bFirst : BOOL`) and the
    // declRe `^(\w+)` does not match → the 1st var was discarded. We remove only the
    // leading one; the trailing one (after the `;`) is still captured by declRe.
    // P2.0/A4: the strip must be DEPTH-AWARE — IEC block comments nest, and a
    // lazy /\(\*[\s\S]*?\*\)/ stops at the first `*)`, leaving `still *)` glued
    // to the next declaration, which then silently fails declRe (variable lost).
    // Strip keyword + leading comment sequences at the start (with whitespace).
    let prev;
    do {
      prev = stmt;
      stmt = stmt.replace(new RegExp('^\\s*' + kwRe.source, 'i'), '').trim();
      stmt = stripLeadingBlockComment(stmt).trim();
    } while (stmt !== prev);
    if (!stmt) continue;

    // Regex for an individual declaration.
    // Bug A fix: captures optional `AT %X.Y` between the name and `:` (preserved in .address).
    const declRe = /^(\w+)\s*(AT\s+%[A-Za-z]+[\d.]+)?\s*:\s*([\s\S]+?)(?:\s*:=\s*([\s\S]+?))?\s*;?\s*(?:\/\/[ \t]*(.*?)|\(\*[ \t]*([\s\S]*?)[ \t]*\*\))?\s*$/;
    const m = stmt.match(declRe);
    if (!m) continue;

    const name = m[1];
    if (/^(IF|THEN|ELSE|END_IF|CASE|OF|END_CASE|WHILE|FOR|TO|DO|END_FOR|END_WHILE|RETURN)$/i.test(name)) {
      continue;
    }
    vars.push({
      name,
      address: m[2]?.replace(/^AT\s+/i, '').trim(),
      type: m[3].trim().replace(/\s+/g, ' '),
      initialValue: m[4]?.trim().replace(/\s+/g, ' '),
      comment: (m[5] ?? m[6])?.trim(),
    });
  }

  return vars;
}

/**
 * Version of splitStatements that returns ranges (start, end) instead of the content.
 * Lets the caller slice the ORIGINAL (preserving comments) using the
 * same offsets — because the `masked` has the same offsets as the original.
 */
function splitStatementRanges(block: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let depth = 0;
  let inString = false;
  let inLineComment = false;
  let stmtStart = 0;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    const next = block[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inString) {
      if (ch === "'" && block[i - 1] !== '$') inString = false;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; continue; }
    if (ch === "'") { inString = true; continue; }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;

    if (ch === ';' && depth === 0) {
      // Greedy: advances the lookahead to include the trailing comment after `;`
      let end = i + 1;
      while (end < block.length && (block[end] === ' ' || block[end] === '\t')) end++;
      if (block[end] === '/' && block[end + 1] === '/') {
        const eol = block.indexOf('\n', end);
        end = eol === -1 ? block.length : eol;
      } else if (block[end] === '(' && block[end + 1] === '*') {
        const close = block.indexOf('*)', end + 2);
        if (close !== -1) end = close + 2;
      }
      ranges.push([stmtStart, end]);
      stmtStart = end;
      i = end - 1; // -1 because the for loop will i++
    }
  }
  return ranges;
}

/**
 * Helper: finds `KEYWORD ... END_VAR` blocks in `masked` (comments
 * replaced with spaces) and returns the SAME ranges extracted from
 * `original` (comments preserved for trailing inline comments).
 *
 * Bug C fix #3: regex applied on masked does not match VAR_INPUT etc inside
 * header/body comments. Slicing the original preserves declaration
 * comments for parseVarBlock to pick up.
 */
function findBlocksOriginal(masked: string, original: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(masked)) !== null) {
    results.push(original.slice(m.index, m.index + m[0].length));
  }
  return results;
}

function extractVarSections(content: string): {
  inputVars: VarDeclaration[];
  outputVars: VarDeclaration[];
  inOutVars: VarDeclaration[];
  localVars: VarDeclaration[];
  localConstantVars: VarDeclaration[];
} {
  const result = {
    inputVars: [] as VarDeclaration[],
    outputVars: [] as VarDeclaration[],
    inOutVars: [] as VarDeclaration[],
    localVars: [] as VarDeclaration[],
    localConstantVars: [] as VarDeclaration[],
  };

  // Masks comments to detect boundaries without false positives, but
  // preserves comments in the slicing for parseVarBlock to pick up trailing inline ones.
  const masked = maskBlockComments(content);

  for (const blk of findBlocksOriginal(masked, content, /VAR_INPUT\b([\s\S]*?)END_VAR/gi)) {
    result.inputVars.push(...parseVarBlock(blk));
  }
  for (const blk of findBlocksOriginal(masked, content, /VAR_OUTPUT\b([\s\S]*?)END_VAR/gi)) {
    result.outputVars.push(...parseVarBlock(blk));
  }
  for (const blk of findBlocksOriginal(masked, content, /VAR_IN_OUT\b([\s\S]*?)END_VAR/gi)) {
    result.inOutVars.push(...parseVarBlock(blk));
  }

  // Bug D fix: VAR CONSTANT separated to emit <localVars constant="true">.
  for (const blk of findBlocksOriginal(masked, content, /(?<!\w)VAR\s+CONSTANT\b([\s\S]*?)END_VAR/gi)) {
    result.localConstantVars.push(...parseVarBlock(blk));
  }

  // VAR (local) — excludes specialized categories + CONSTANT (handled above).
  for (const blk of findBlocksOriginal(masked, content, /(?<!\w)VAR(?!_INPUT|_OUTPUT|_IN_OUT|_GLOBAL|_EXTERNAL|_TEMP|_STAT|_PERSISTENT|_RETAIN|_NON_RETAIN)(?!\s+CONSTANT)\b([\s\S]*?)END_VAR/gi)) {
    result.localVars.push(...parseVarBlock(blk));
  }

  return result;
}

function extractBody(content: string): string {
  // Extract the logic body: everything after the last END_VAR
  // until END_FUNCTION_BLOCK, END_PROGRAM, or END_FUNCTION
  const endVarPattern = /\bEND_VAR\b/gi;
  let lastEndVarIndex = -1;
  let match;
  while ((match = endVarPattern.exec(content)) !== null) {
    lastEndVarIndex = match.index + match[0].length;
  }

  if (lastEndVarIndex === -1) {
    // No END_VAR found — return full content (simple file or no vars)
    return content;
  }

  // Find the closing keyword
  const closingPattern = /\b(END_FUNCTION_BLOCK|END_PROGRAM|END_FUNCTION)\b/i;
  const closingMatch = content.slice(lastEndVarIndex).match(closingPattern);

  if (closingMatch) {
    return content.slice(lastEndVarIndex, lastEndVarIndex + closingMatch.index!).trim();
  }

  // No closing keyword found — return everything after last END_VAR
  return content.slice(lastEndVarIndex).trim();
}

export function parseStFile(content: string, fileName: string): ParsedFile {
  const trimmed = content.trim();
  // Bug C fix: masked preserves offsets (comments → spaces), allowing
  // boundary detection without being confused by "VAR_GLOBAL"/"PROGRAM"/etc
  // mentioned in the header comment.
  const masked = maskBlockComments(trimmed);

  // Detect GVL — may have leading (* block comments *).
  // Bug fix: `{attribute 'qualified_only'}` also prefixes ENUM/STRUCT in the project
  // style (e.g. E_MachineMode.st). Without excluding TYPE, every enum/struct with that
  // pragma landed here and was classified as GVL (and emitted as GlobalVars in the XML).
  // Only enters the GVL branch if there is NO TYPE in the file.
  const isTypeDecl = /(?:^|\n)\s*TYPE\b/i.test(masked);
  if (!isTypeDecl && (/(?:^|\n)\s*\{attribute\s+'qualified_only'\}/i.test(masked) || /(?:^|\n)\s*VAR_GLOBAL\b/i.test(masked))) {
    const name = fileName.replace(/\.st$/i, '');
    // Bug B fix: loops over ALL VAR_GLOBAL/VAR_GLOBAL CONSTANT/
    // VAR_GLOBAL PERSISTENT RETAIN blocks. Before it was `.match(/.../i)` (without the g flag).
    const vars: VarDeclaration[] = [];
    const blockPattern = /VAR_GLOBAL\b[^\n]*\n([\s\S]*?)END_VAR/gi;
    for (const blk of findBlocksOriginal(masked, trimmed, blockPattern)) {
      vars.push(...parseVarBlock(blk));
    }
    if (vars.length === 0) {
      vars.push(...parseVarBlock(trimmed));
    }
    const isConstant = /VAR_GLOBAL\s+CONSTANT/i.test(masked);
    // P2.0/A1: RETAIN/PERSISTENT were silently dropped — CODESYS then imported
    // the GVL as a plain VAR_GLOBAL and persistence was lost. Mirror the
    // isConstant handling: derive from the (comment-masked) header line.
    const isRetain = /VAR_GLOBAL[^\n]*\bRETAIN\b/i.test(masked);
    const isPersistent = /VAR_GLOBAL[^\n]*\bPERSISTENT\b/i.test(masked);
    return {
      kind: 'gvl',
      gvl: { name, variables: vars, isConstant, isRetain, isPersistent },
    };
  }

  // Detect TYPE (ENUM or STRUCT) — uses masked to avoid matching in comments
  if (/(?:^|\n)\s*TYPE\b/i.test(masked)) {
    const nameMatch = masked.match(/(?:^|\n)\s*TYPE\s+(\w+)\s*:/i);
    const name = nameMatch ? nameMatch[1] : fileName.replace(/\.st$/i, '');
    // P2.0/A3: the {attribute 'qualified_only'} pragma was silently dropped —
    // CODESYS then flagged same-named enum members across types as ambiguous.
    // Capture it here (masked → a pragma inside a comment does not count) and
    // let the XML builder emit it as a CODESYS addData attribute.
    const qualifiedOnly = /\{attribute\s+'qualified_only'\}/i.test(masked);

    if (/\bSTRUCT\b/i.test(trimmed)) {
      const structBody = trimmed.match(/STRUCT\s*([\s\S]*?)\s*END_STRUCT/i);
      const members: Array<{ name: string; type: string; comment?: string }> = [];
      if (structBody) {
        const lines = structBody[1].split('\n');
        for (const line of lines) {
          const m = line.trim().match(/^(\w+)\s*:\s*([^;:=]+?)(?:\s*:=\s*[^;]+?)?\s*;\s*(?:\/\/\s*(.*?)|\(\*\s*(.*?)\s*\*\))?\s*$/);
          if (m) {
            members.push({ name: m[1], type: m[2].trim(), comment: (m[3] ?? m[4])?.trim() });
          }
        }
      }
      return { kind: 'dataType', dataType: { name, kind: 'struct', members, qualifiedOnly } };
    }

    // Assume enum — strip block comments (handles nesting per F3-046)
    const members: Array<{ name: string; value?: string }> = [];
    const stripped = stripBlockComments(trimmed);
    // Bug fix: accepts an optional base type after the `)` — e.g. `) INT := OFF;` (typed
    // enum with default), `) INT;`, `);` or `) := OFF;`. Before it only covered
    // `) := word;`, so every typed enum (the project style) came out with no members.
    const enumBody = stripped.match(/:\s*\(\s*([\s\S]*?)\s*\)\s*(?:\w+\s*)?(?::=\s*\w+\s*)?;/);
    if (enumBody) {
      const entries = enumBody[1].split(',');
      for (const entry of entries) {
        const m = entry.trim().match(/^(\w+)(?:\s*:=\s*(\d+))?/);
        if (m) {
          members.push({ name: m[1], value: m[2] });
        }
      }
    }
    return { kind: 'dataType', dataType: { name, kind: 'enum', members, qualifiedOnly } };
  }

  // Detect POU type — uses masked to avoid false positives when the
  // .st header mentions "PROGRAM"/"FUNCTION_BLOCK" in a comment.
  let pouType: PouDefinition['pouType'] = 'functionBlock';
  if (/(?:^|\n)\s*PROGRAM\b/i.test(masked)) {
    pouType = 'program';
  } else if (/(?:^|\n)\s*FUNCTION\b/i.test(masked) && !/(?:^|\n)\s*FUNCTION_BLOCK\b/i.test(masked)) {
    pouType = 'function';
  }

  const nameMatch = masked.match(
    /(?:^|\n)\s*(?:FUNCTION_BLOCK|PROGRAM|FUNCTION)\s+(\w+)/
  );
  const name = nameMatch ? nameMatch[1] : fileName.replace(/\.st$/i, '');

  // varSections receives trimmed — internally uses masked for boundaries +
  // original for parseVarBlock (preserves trailing inline comments).
  const varSections = extractVarSections(trimmed);

  // Extract return type for functions (F3-024: accepts complex types)
  let returnType: string | undefined;
  if (pouType === 'function') {
    // Uses masked so as not to confuse with `FUNCTION xxx` in comments.
    const rtMatch = masked.match(/(?:^|\n)\s*FUNCTION\s+\w+\s*:\s*([^\n;]+)/i);
    if (rtMatch) {
      returnType = rtMatch[1].trim();
    }
  }

  return {
    kind: 'pou',
    pou: {
      name,
      pouType,
      ...varSections,
      body: extractBody(trimmed),
      returnType,
    },
  };
}
