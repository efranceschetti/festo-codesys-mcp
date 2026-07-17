/**
 * ST Lexer — positional, comment/string-aware IDENTIFIER tokenizer.
 *
 * Fundamental piece of the code intelligence: unlike grep, it ignores identifiers
 * inside `(* *)` comments (with nesting), `//` and string literals `'...'` (with
 * `$` escape), and ignores typed/based literals (`T#10MS`, `16#FF`). Each token carries
 * its position (1-based line/column) and, if there is a `.` immediately before it, the `qualified` flag
 * + the `qualifier` (the identifier before the dot — e.g. in `E_MachineMode.OFF`, the token
 * `OFF` has qualifier `E_MachineMode`).
 */

export interface Position {
  offset: number; // 0-based in the content
  line: number;   // 1-based
  column: number; // 1-based
}

export interface Token {
  value: string;
  start: Position;
  end: Position;        // position right after the last char
  qualified: boolean;   // immediately preceded by '.'
  qualifier?: string;   // identifier before the '.', if qualified
}

/** Keywords/builtins IEC 61131-3 — not user symbols. */
export const ST_KEYWORDS: ReadonlySet<string> = new Set([
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF', 'CASE', 'OF', 'END_CASE',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR', 'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT',
  'RETURN', 'EXIT', 'CONTINUE',
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_GLOBAL', 'VAR_EXTERNAL', 'VAR_TEMP',
  'VAR_STAT', 'VAR_PERSISTENT', 'VAR_RETAIN', 'VAR_NON_RETAIN', 'END_VAR',
  'CONSTANT', 'PERSISTENT', 'RETAIN',
  'FUNCTION', 'END_FUNCTION', 'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK', 'PROGRAM', 'END_PROGRAM',
  'METHOD', 'END_METHOD', 'PROPERTY', 'END_PROPERTY', 'INTERFACE', 'END_INTERFACE',
  'TYPE', 'END_TYPE', 'STRUCT', 'END_STRUCT', 'UNION', 'END_UNION', 'EXTENDS', 'IMPLEMENTS',
  'TRUE', 'FALSE', 'NOT', 'AND', 'OR', 'XOR', 'MOD', 'DIV',
  'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD', 'SINT', 'USINT', 'INT', 'UINT', 'DINT', 'UDINT',
  'LINT', 'ULINT', 'REAL', 'LREAL', 'TIME', 'LTIME', 'DATE', 'TIME_OF_DAY', 'TOD',
  'DATE_AND_TIME', 'DT', 'STRING', 'WSTRING', 'CHAR', 'WCHAR',
  'POINTER', 'ARRAY', 'REF_TO', 'THIS', 'SUPER', 'AT',
]);

function isIdentStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_';
}
function isIdentCont(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}
function isLiteralBody(ch: string): boolean {
  return isIdentCont(ch) || ch === '.' || ch === ':' || ch === '+' || ch === '-';
}

/**
 * Tokenizes the identifiers of an ST content, with position, ignoring
 * comments/strings/typed literals.
 */
export function tokenizeIdentifiers(content: string): Token[] {
  const tokens: Token[] = [];
  const n = content.length;

  let i = 0;
  let line = 1;
  let col = 1;

  // Advances 1 char updating line/column. `\n` breaks the line; `\r` only resets the column
  // (CRLF counts as 1 break via the following `\n`).
  const step = (): void => {
    const ch = content[i];
    if (ch === '\n') { line++; col = 1; }
    else if (ch === '\r') { col = 1; }
    else { col++; }
    i++;
  };

  // Adjacency state for qualified/qualifier.
  let lastIdent: string | undefined;
  let sawDot = false;

  const resetAdjacency = (): void => { lastIdent = undefined; sawDot = false; };

  while (i < n) {
    const ch = content[i];
    const next = i + 1 < n ? content[i + 1] : '';

    // Block comment (* ... *) with nesting.
    if (ch === '(' && next === '*') {
      let depth = 1;
      step(); step();
      while (i < n && depth > 0) {
        if (content[i] === '(' && content[i + 1] === '*') { depth++; step(); step(); }
        else if (content[i] === '*' && content[i + 1] === ')') { depth--; step(); step(); }
        else step();
      }
      resetAdjacency();
      continue;
    }

    // Line comment // ... until EOL.
    if (ch === '/' && next === '/') {
      while (i < n && content[i] !== '\n') step();
      resetAdjacency();
      continue;
    }

    // String '...' with `$` escape (consumes the char after `$`).
    if (ch === "'") {
      step(); // open
      while (i < n) {
        if (content[i] === '$') { step(); if (i < n) step(); continue; }
        if (content[i] === "'") { step(); break; }
        step();
      }
      resetAdjacency();
      continue;
    }

    // Typed/based literal: `#` + body. Skips without emitting a token.
    if (ch === '#') {
      step();
      while (i < n && isLiteralBody(content[i])) step();
      resetAdjacency();
      continue;
    }

    // Identifier.
    if (isIdentStart(ch)) {
      const start: Position = { offset: i, line, column: col };
      let value = '';
      while (i < n && isIdentCont(content[i])) { value += content[i]; step(); }
      const end: Position = { offset: i, line, column: col };

      // Typed literal prefix (e.g. `T#10MS`, `TIME#...`): do not emit, skip the literal.
      if (i < n && content[i] === '#') {
        step();
        while (i < n && isLiteralBody(content[i])) step();
        resetAdjacency();
        continue;
      }

      tokens.push({
        value,
        start,
        end,
        qualified: sawDot,
        qualifier: sawDot ? lastIdent : undefined,
      });
      lastIdent = value;
      sawDot = false;
      continue;
    }

    // Dot: marks qualified access for the next identifier.
    if (ch === '.') {
      sawDot = true;
      step();
      continue;
    }

    // Whitespace: preserves adjacency (lastIdent/sawDot).
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      step();
      continue;
    }

    // Any other significant char (`:`, `=`, `(`, `)`, `;`, `,`, operators):
    // breaks the adjacency.
    resetAdjacency();
    step();
  }

  return tokens;
}

/**
 * Returns the tokens whose identifier matches `name` (whole token), outside of
 * a comment/string. Case-insensitive by default (IEC is case-insensitive).
 */
export function findIdentifierTokens(content: string, name: string, caseInsensitive = true): Token[] {
  const target = caseInsensitive ? name.toUpperCase() : name;
  return tokenizeIdentifiers(content).filter(t =>
    (caseInsensitive ? t.value.toUpperCase() : t.value) === target,
  );
}
