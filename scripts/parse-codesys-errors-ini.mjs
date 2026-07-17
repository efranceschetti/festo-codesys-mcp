#!/usr/bin/env node
// Parser for the legacy CPX-CEC errors.ini (CODESYS V2 era) → structured markdown
// for knowledge/external/festo-private/codesys-runtime-errors.md.
//
// Usage:
//   node scripts/parse-codesys-errors-ini.mjs <input-ini> [<output-md>]
//
//   <input-ini>  = path to the CPX-CEC package errors.ini (required)
//   <output-md>  = default knowledge/external/festo-private/codesys-runtime-errors.md
//
// Encoding: errors.ini is Latin-1 (Windows-1252). We read it as a buffer and decode.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const DEFAULT_OUTPUT = resolve(REPO_ROOT, 'knowledge/external/festo-private/codesys-runtime-errors.md');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/parse-codesys-errors-ini.mjs <input-ini> [<output-md>]');
  console.error('  <input-ini> = path to the CPX-CEC errors.ini file to parse.');
  process.exit(1);
}
const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

const buf = await readFile(inputPath);
const text = new TextDecoder('windows-1252').decode(buf);

const sections = [];
let current = null;
const defineRe = /;#define\s+(\w+)\s+(0x[0-9A-Fa-f]+)/;

for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;

  const sectionMatch = line.match(/^\[Error(\d+)\]$/);
  if (sectionMatch) {
    if (current) sections.push(current);
    current = { decimal: Number(sectionMatch[1]) };
    continue;
  }
  if (!current) continue;

  if (line.startsWith('Type=')) current.type = line.slice('Type='.length);
  else if (line.startsWith('English=')) current.english = line.slice('English='.length);
  else if (line.startsWith('German=')) current.german = line.slice('German='.length);
  else {
    const def = line.match(defineRe);
    if (def) {
      current.symbol = def[1];
      current.hex = def[2].toUpperCase().replace('0X', '0x');
    }
  }
}
if (current) sections.push(current);

const ranges = {
  generic: { label: 'Generic CODESYS runtime errors (1–1023)', min: 1, max: 1023, items: [] },
  target:  { label: 'Target-specific errors — CPX-CEC (1025–4095)', min: 1025, max: 4095, items: [] },
  status:  { label: 'Status messages (4096–8191)', min: 4096, max: 8191, items: [] },
};
for (const s of sections) {
  if (s.decimal >= ranges.generic.min && s.decimal <= ranges.generic.max) ranges.generic.items.push(s);
  else if (s.decimal >= ranges.target.min && s.decimal <= ranges.target.max) ranges.target.items.push(s);
  else if (s.decimal >= ranges.status.min && s.decimal <= ranges.status.max) ranges.status.items.push(s);
}

const today = new Date().toISOString().slice(0, 10);

const lines = [];
lines.push('---');
lines.push('id: codesys-runtime-errors');
lines.push('title: CODESYS Runtime Error Codes — RTSEXCPT_* canonical reference');
lines.push('priority: HIGH');
lines.push('use_when:');
lines.push('  - decoding RTSEXCPT_* error codes from CODESYS runtime');
lines.push('  - user reports a runtime exception with hex/decimal code');
lines.push('  - explain_error_code tool invocation');
lines.push('  - debugging cycle time, watchdog, fieldbus, IO update errors');
lines.push('never_use_when:');
lines.push('  - error code is from EtherCAT slave (use cia402-reference)');
lines.push('  - error code is from CMMT-AS drive (use cmmt-as-cia402-dict)');
lines.push('  - error is application-level (PLC code logic), not runtime');
lines.push('keywords: [RTSEXCPT, runtime error, exception, watchdog, cycletime, fieldbus, IO update, CPX-CEC, CODESYS V2, CODESYS V3, error code]');
lines.push('source: errors.ini (Festo CPX-CEC V2.3.9.x package, legacy)');
lines.push(`extracted: ${today}`);
lines.push('license: gated — Festo customer-portal package, not redistributable');
lines.push(`total_codes: ${sections.length}`);
lines.push('---');
lines.push('');
lines.push('# CODESYS Runtime Error Codes — RTSEXCPT_* canonical reference');
lines.push('');
lines.push('Official ground-truth extracted from the `errors.ini` shipped with the');
lines.push('Festo CPX-CEC V2.3.9.x package. This is the canonical dictionary the CODESYS');
lines.push('V2/V3 runtime uses to map `RTSEXCPT_*` → human-readable message.');
lines.push('');
lines.push('When `explain_error_code` decodes an RTSEXCPT_* code, this table is');
lines.push('the authoritative source. Do not infer/paraphrase — quote it literally.');
lines.push('');
lines.push('Types:');
lines.push('- `MessageFatal` — blocks system operation');
lines.push('- `Message` — recoverable error or operator notice');
lines.push('- `Status` — configuration info, non-error');
lines.push('');

for (const range of Object.values(ranges)) {
  if (range.items.length === 0) continue;
  lines.push(`## ${range.label}`);
  lines.push('');
  lines.push('| Hex | Decimal | Symbol | Type | Message (EN) |');
  lines.push('|---|---|---|---|---|');
  for (const item of range.items.sort((a, b) => a.decimal - b.decimal)) {
    const hex = item.hex ?? `0x${item.decimal.toString(16).toUpperCase().padStart(8, '0')}`;
    const symbol = item.symbol ?? '—';
    const type = item.type ?? '—';
    const english = (item.english ?? '—').replace(/\|/g, '\\|');
    lines.push(`| \`${hex}\` | ${item.decimal} | \`${symbol}\` | ${type} | ${english} |`);
  }
  lines.push('');
}

lines.push('## Cross-reference — symbol → hex');
lines.push('');
lines.push('Reverse lookup for when the code appears in textual form.');
lines.push('');
lines.push('| Symbol | Hex | Message (EN) |');
lines.push('|---|---|---|');
const allWithSymbol = sections.filter((s) => s.symbol).sort((a, b) => a.symbol.localeCompare(b.symbol));
for (const s of allWithSymbol) {
  lines.push(`| \`${s.symbol}\` | \`${s.hex}\` | ${(s.english ?? '—').replace(/\|/g, '\\|')} |`);
}
lines.push('');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, lines.join('\n'), 'utf8');

console.log(`✓ parsed ${sections.length} error codes`);
console.log(`  generic: ${ranges.generic.items.length}`);
console.log(`  target:  ${ranges.target.items.length}`);
console.log(`  status:  ${ranges.status.items.length}`);
console.log(`  with-symbol: ${allWithSymbol.length}`);
console.log(`→ ${outputPath}`);
