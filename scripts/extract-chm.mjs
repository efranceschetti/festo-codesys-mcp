#!/usr/bin/env node
// Extract .chm (HTML Help) via 7z and convert HTML → plain markdown.
//
// For each English CHM (skip /de/ to avoid duplication), extract to a
// temporary folder, read every .htm, strip HTML tags, and generate one
// consolidated markdown in knowledge/external/festo-private/manuals/<chm-stem>.md.
//
// HTML→text strategy: simple regex — preserves headings (h1-h4), strips
// other tags, decodes basic HTML entities. Not perfect, but BM25 does
// not need rich markdown — it needs searchable TEXT.
//
// Usage:
//   node scripts/extract-chm.mjs [<chm-path>...]
//
// No args: extract every unique /en/ CHM in knowledge/external/_raw/.

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RAW_DIR = resolve(REPO_ROOT, 'knowledge/external/_raw');
const OUT_DIR = resolve(REPO_ROOT, 'knowledge/external/festo-private/manuals');

// Detect the 7z executable — on Windows it lives in Program Files, on Ubuntu in PATH as 7z/7zz/7za
function find7z() {
  const candidates = [
    '/c/Program Files/7-Zip/7z.exe',
    'C:\\Program Files\\7-Zip\\7z.exe',
    '7z',
    '7zz',
    '7za',
  ];
  for (const c of candidates) {
    const res = spawnSync(c, ['--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (res.status === 0 || res.status === 7) return c; // 7z prints its banner with status 0
  }
  throw new Error('7z executable not found. Install 7-Zip or p7zip-full.');
}

const SEVENZ = find7z();

function walkChm(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkChm(full));
    else if (entry.name.toLowerCase().endsWith('.chm') && /[/\\]en[/\\]/i.test(full)) out.push(full);
  }
  return out;
}

function walkHtm(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtm(full));
    else if (/\.(htm|html)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
};

function htmlToText(html) {
  let s = html;
  // remove script + style + comments
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // preserve headings as markdown
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  s = s.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');
  // preserve list items
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  // preserve <br> as newline
  s = s.replace(/<br\s*\/?>/gi, '\n');
  // paragraph breaks
  s = s.replace(/<\/p>/gi, '\n\n');
  // preserve <code> / <pre> roughly
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  // table rows → separate lines (not rebuilding the markdown table,
  // just preserving the text)
  s = s.replace(/<\/tr>/gi, '\n');
  s = s.replace(/<\/td>/gi, ' | ');
  s = s.replace(/<\/th>/gi, ' | ');
  // strip all other tags
  s = s.replace(/<[^>]+>/g, '');
  // decode HTML entities
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) s = s.replaceAll(ent, ch);
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
  // collapse whitespace
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  // drop lines that are only noise (whitespace, pipes, dashes, residual &nbsp;)
  // — common in help-file HTML with empty table cells
  s = s
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return '';
      // drop if only pipes, dashes, spaces and nbsp (≤ 3 chars of real content)
      const real = trimmed.replace(/[|\-\s ]/g, '');
      if (real.length === 0) return '';
      return line;
    })
    .join('\n');
  // Collapse runs of empty (or whitespace-only) lines into a single paragraph break.
  s = s.replace(/(\n[ \t]*){2,}/g, '\n\n');
  return s.trim();
}

function processChm(chmPath) {
  const stem = basename(chmPath, extname(chmPath));
  const tmp = mkdtempSync(join(tmpdir(), `chm-${stem}-`));

  try {
    const res = spawnSync(SEVENZ, ['x', '-y', `-o${tmp}`, chmPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (res.status !== 0) {
      console.log(`  ✗ 7z failed (exit ${res.status}): ${chmPath}`);
      return null;
    }

    const htmFiles = walkHtm(tmp).sort();
    if (htmFiles.length === 0) {
      console.log(`  ✗ no HTML extracted: ${chmPath}`);
      return null;
    }

    const today = new Date().toISOString().slice(0, 10);
    const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const outFile = resolve(OUT_DIR, `${slug}.md`);

    const lines = [];
    lines.push('---');
    lines.push(`id: chm-${slug}`);
    lines.push(`title: ${stem} — extracted manual (CHM → markdown)`);
    lines.push('priority: MEDIUM');
    lines.push('use_when:');
    lines.push(`  - need detail on Festo library / device covered by ${stem}`);
    lines.push('  - looking up FB signatures, parameters, error codes from official Festo CHM');
    lines.push('never_use_when:');
    lines.push('  - high-level overview suffices (use the public knowledge equivalent)');
    lines.push(`keywords: [${stem.replace(/[_-]/g, ', ').replace('3', 'V3')}, Festo manual, CHM extracted]`);
    lines.push(`source_chm: ${relative(RAW_DIR, chmPath).replace(/\\/g, '/')}`);
    lines.push(`html_files: ${htmFiles.length}`);
    lines.push(`extracted: ${today}`);
    lines.push('extraction: 7z + regex HTML→text (lossy, search-optimized not display-optimized)');
    lines.push('license: gated — Festo customer-portal package, not redistributable');
    lines.push('---');
    lines.push('');
    lines.push(`# ${stem}`);
    lines.push('');
    lines.push(`> Festo manual extracted via 7z + HTML→text regex. ${htmFiles.length} HTML files processed.`);
    lines.push('> Text optimized for BM25 search, not for fluent human reading.');
    lines.push('> For formatted detail, open the original `.chm` in the Windows Help Viewer.');
    lines.push('');

    let totalChars = 0;
    let skippedEmpty = 0;
    for (const htm of htmFiles) {
      try {
        const html = readFileSync(htm, 'utf8');
        const text = htmlToText(html);
        if (!text) continue;
        // Skip sections with little real content — only residual whitespace/pipe noise
        const realChars = text.replace(/[\s|\-]/g, '').length;
        if (realChars < 30) {
          skippedEmpty++;
          continue;
        }
        const relName = relative(tmp, htm).replace(/\\/g, '/');
        lines.push(`## File: ${relName}`);
        lines.push('');
        lines.push(text);
        lines.push('');
        totalChars += text.length;
      } catch {
        // ignore unreadable
      }
    }
    if (skippedEmpty > 0) {
      lines.push(`> Note: ${skippedEmpty} HTML file(s) skipped (negligible textual content).`);
      lines.push('');
    }

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(outFile, lines.join('\n'), 'utf8');
    return { outFile, htmFiles: htmFiles.length, chars: totalChars };
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

const cliArgs = process.argv.slice(2);
const chmFiles =
  cliArgs.length > 0
    ? cliArgs
    : (existsSync(RAW_DIR) ? walkChm(RAW_DIR) : []);

// Dedupe by filename — same CHM can appear in multiple packages
const seen = new Set();
const unique = [];
for (const f of chmFiles) {
  const name = basename(f);
  if (seen.has(name)) continue;
  seen.add(name);
  unique.push(f);
}

console.log(`Found ${chmFiles.length} CHM (en) total → ${unique.length} unique`);

let ok = 0;
let fail = 0;
let totalChars = 0;
for (const chm of unique) {
  console.log(`▸ ${basename(chm)}`);
  const r = processChm(chm);
  if (r) {
    console.log(`  ✓ ${r.htmFiles} html → ${(r.chars / 1024).toFixed(1)}KB text`);
    ok++;
    totalChars += r.chars;
  } else {
    fail++;
  }
}

console.log('');
console.log(`Done: ${ok} ok, ${fail} fail`);
console.log(`Total text extracted: ${(totalChars / 1024).toFixed(1)}KB`);
console.log(`Output: ${OUT_DIR}`);
