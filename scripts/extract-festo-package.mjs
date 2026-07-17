#!/usr/bin/env node
// Selectively extract content from CODESYS .package (ZIP) files into
// knowledge/external/_raw/<pkg-stem>/. Keeps only: XML, CHM, INI,
// HTML, package.manifest. Discards binaries (.dll, .compiled-library,
// .ico, .png, .bmp).
//
// Usage:
//   node scripts/extract-festo-package.mjs <pkg-path> [<pkg-path>...]
//
// Pass one or more CODESYS .package file paths as arguments.
//
// Idempotent: -o overwrites without a prompt.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT_BASE = resolve(REPO_ROOT, 'knowledge/external/_raw');

// Extensions to keep — text-friendly + parseable structured formats.
// (Strategy: extract everything then delete — INFO-ZIP unzip 6.00 on MSYS
// handles wildcards inconsistently, so post-filtering is more robust.)
const KEEP_EXT = new Set([
  '.xml', '.chm', '.ini', '.html', '.htm', '.txt', '.manifest',
]);
const KEEP_BASENAMES = new Set(['package.manifest']);

function pruneBinaries(dir) {
  let kept = 0;
  let removed = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        // remove the folder if it became empty after the prune
        try {
          if (readdirSync(full).length === 0) rmSync(full, { recursive: true, force: true });
        } catch { /* ignore */ }
      } else {
        const ext = extname(entry).toLowerCase();
        if (KEEP_EXT.has(ext) || KEEP_BASENAMES.has(entry)) {
          kept++;
        } else {
          rmSync(full, { force: true });
          removed++;
        }
      }
    }
  };
  walk(dir);
  return { kept, removed };
}

const packages = process.argv.slice(2);

if (packages.length === 0) {
  console.error('Usage: node scripts/extract-festo-package.mjs <pkg-path> [<pkg-path>...]');
  console.error('  Provide one or more CODESYS .package file paths to extract.');
  process.exit(1);
}

if (!existsSync(OUT_BASE)) mkdirSync(OUT_BASE, { recursive: true });

let totalOk = 0;
let totalFail = 0;

for (const pkg of packages) {
  if (!existsSync(pkg)) {
    console.log(`✗ skip (missing): ${pkg}`);
    totalFail++;
    continue;
  }
  const stem = basename(pkg, extname(pkg)).replace(/[()]/g, '_').replace(/\s+/g, '_');
  const outDir = resolve(OUT_BASE, stem);
  mkdirSync(outDir, { recursive: true });

  const res = spawnSync('unzip', ['-o', '-q', pkg, '-d', outDir], { stdio: ['ignore', 'pipe', 'pipe'] });

  if (res.status !== 0) {
    console.log(`✗ FAIL (exit ${res.status}): ${basename(pkg)}`);
    if (res.stderr) console.log(`  stderr: ${res.stderr.toString().slice(0, 200)}`);
    totalFail++;
    continue;
  }
  const { kept, removed } = pruneBinaries(outDir);
  console.log(`✓ ${basename(pkg)} → ${kept} kept, ${removed} pruned`);
  totalOk++;
}

console.log('');
console.log(`Done: ${totalOk} ok, ${totalFail} fail`);
console.log(`Output: ${OUT_BASE}`);
