/**
 * Dynamic Manual Loader
 * Auto-discovers and loads user-converted .md manuals from knowledge/manuals/
 * AND from gated content in knowledge/external/festo-private/ (recursive).
 * Includes caching for performance.
 */

import { readFile, readdir, stat, access } from 'fs/promises';
import { join, basename, relative } from 'path';
import { KNOWLEDGE_DIR } from './loader.js';

export const MANUALS_DIR = join(KNOWLEDGE_DIR, 'manuals');
export const EXTERNAL_KNOWLEDGE_DIR = join(KNOWLEDGE_DIR, 'external');

/**
 * Roots to be searched by listManuals/searchManuals. Each root is
 * walked recursively. Nonexistent roots are silently skipped.
 *
 * Addresses Bug A2/A3: explain_error_code and searchManuals only saw
 * the flat `knowledge/manuals/` — knowledge/external/festo-private/ was
 * invisible even after the extraction pipeline ran.
 */
const MANUAL_ROOTS = [MANUALS_DIR, EXTERNAL_KNOWLEDGE_DIR];

export interface ManualEntry {
  filename: string;     // relative path (unique key) — may include subdirs
  fullPath: string;     // absolute path — used by getContent for reading
  name: string;         // human-readable name derived from the path
  sizeKB: number;
}

// Caches
let cachedList: ManualEntry[] | null = null;

/**
 * LRU cache with a limit in BYTES (not in entry count).
 * Addresses F3-019: the previous contentCache was a Map<string,string> without
 * a limit — in long sessions with many large manuals, the process
 * grew until OOM kill.
 *
 * Default cap: 50 MB. Average manual ~1MB, so ~50 hot ones fit.
 */
class LruByteCache {
  private cache = new Map<string, string>();
  private bytesUsed = 0;
  constructor(private readonly maxBytes: number) {}

  get(key: string): string | undefined {
    const val = this.cache.get(key);
    if (val !== undefined) {
      // Move to the end = most recently used
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.bytesUsed -= Buffer.byteLength(this.cache.get(key)!, 'utf-8');
      this.cache.delete(key);
    }
    const valueSize = Buffer.byteLength(value, 'utf-8');
    if (valueSize > this.maxBytes) {
      // Item larger than the entire cap — do not cache
      return;
    }
    while (this.bytesUsed + valueSize > this.maxBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      this.bytesUsed -= Buffer.byteLength(this.cache.get(oldestKey)!, 'utf-8');
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
    this.bytesUsed += valueSize;
  }

  /** D5-004: targeted or total invalidation when the watcher detects a change. */
  delete(key: string): boolean {
    const val = this.cache.get(key);
    if (val === undefined) return false;
    this.bytesUsed -= Buffer.byteLength(val, 'utf-8');
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.bytesUsed = 0;
  }

  get sizeBytes(): number { return this.bytesUsed; }
  get entries(): number { return this.cache.size; }
}

const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50 MB
const contentCache = new LruByteCache(MAX_CACHE_BYTES);

/**
 * Reads file content by absolute path. Uses cache keyed by the absolute path
 * to avoid collision when two roots have files with the same basename.
 */
async function getContent(fullPath: string): Promise<string> {
  const cached = contentCache.get(fullPath);
  if (cached !== undefined) return cached;
  const content = await readFile(fullPath, 'utf-8');
  contentCache.set(fullPath, content);
  return content;
}

/**
 * Recursive walk of a directory, returning absolute paths of .md files.
 * Skips README.md (auxiliary, not a manual).
 */
async function walkMd(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMd(full)));
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      out.push(full);
    }
  }
  return out;
}

async function pathExists(dir: string): Promise<boolean> {
  try {
    await access(dir);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all .md manuals across every MANUAL_ROOTS, recursively.
 *
 * For files in the MANUALS_DIR root, `filename` remains the basename
 * (backward-compat with loadManual calls via 'festo-cpx-e-system').
 * For files in EXTERNAL_KNOWLEDGE_DIR, `filename` includes the subpath
 * (e.g. 'festo-private/codesys-runtime-errors.md').
 */
export async function listManuals(): Promise<ManualEntry[]> {
  if (cachedList !== null) return cachedList;

  const entries: ManualEntry[] = [];
  for (const root of MANUAL_ROOTS) {
    const files = await walkMd(root);
    for (const fullPath of files) {
      const rel = relative(root, fullPath).replace(/\\/g, '/');
      // For the MANUALS_DIR root, filename = basename (compat); otherwise relative path.
      const filename = root === MANUALS_DIR ? basename(fullPath) : rel;
      const stats = await stat(fullPath);
      entries.push({
        filename,
        fullPath,
        name: filename.replace(/\.md$/, '').replace(/[-/]/g, ' '),
        sizeKB: Math.round(stats.size / 1024),
      });
    }
  }

  cachedList = entries;
  return cachedList;
}

/**
 * Invalidate the in-memory caches of manuals. Call when watcher detects
 * filesystem changes (add/unlink/change) so the next list/load reads fresh
 * data from disk.
 *
 * D5-004: now invalidates the contentCache (LRU) too. Before, it only cleared
 * cachedList, and the cached content kept serving stale versions
 * even after `change` events from the watcher — a silent bug where user
 * edits did not reach the MCP client until reboot.
 *
 * @param fullPath Absolute path of the file to invalidate (contentCache key).
 *                 If omitted, clears everything.
 */
export function invalidateManualsCache(fullPath?: string): void {
  cachedList = null;
  if (fullPath) {
    contentCache.delete(fullPath);
  } else {
    contentCache.clear();
  }
}

/**
 * Load a specific manual by filename. Accepts:
 *  - basename ("festo-cpx-e-system" or "festo-cpx-e-system.md") in MANUALS_DIR
 *  - relative path ("festo-private/codesys-runtime-errors.md") in EXTERNAL_KNOWLEDGE_DIR
 *  - basename of a file in an external subdir (e.g. "codesys-runtime-errors") — searched by match
 */
export async function loadManual(filename: string): Promise<string> {
  const manuals = await listManuals();

  // 1. Try an exact match by the filename returned by listManuals
  const normalized = filename.endsWith('.md') ? filename : `${filename}.md`;
  const exact = manuals.find((m) => m.filename === normalized || m.filename === filename);
  if (exact) return getContent(exact.fullPath);

  // 2. Try a match by basename (in case the user passed only the file name)
  const wantedBase = basename(normalized);
  const byBase = manuals.find((m) => basename(m.filename) === wantedBase);
  if (byBase) return getContent(byBase.fullPath);

  // 3. Not found — list what exists
  const available = manuals.map((m) => m.filename).join(', ');
  return `[Manual not found: ${filename}]\n\nAvailable manuals: ${available || 'none — add .md files to knowledge/manuals/'}`;
}

export interface ManualSearchResult {
  /** Rendered markdown — preserves the original output shape. */
  markdown: string;
  /** Total raw matches found (summing all manuals — not truncated at 8/manual). */
  totalMatches: number;
}

/**
 * Search across all manuals for a text query.
 * Returns rendered markdown + total raw match count.
 *
 * Bug B (2026-05-09): consumers with an outputSchema (e.g. explain_error_code)
 * need to know how many real matches there were in manuals. Before, this
 * function only returned an opaque string — `snippetCount` in explain_error_code
 * ignored manual hits and reported 0 even with matches in external/.
 */
export async function searchManuals(query: string): Promise<ManualSearchResult> {
  const manuals = await listManuals();
  if (manuals.length === 0) {
    return {
      markdown: 'No manuals found. Add .md files to knowledge/manuals/ directory.',
      totalMatches: 0,
    };
  }

  const queryLower = query.toLowerCase();
  const results: string[] = [];
  let totalMatches = 0;

  for (const manual of manuals) {
    const content = await getContent(manual.fullPath);
    const lines = content.split('\n');
    const matches: { line: number; text: string }[] = [];
    const usedLines = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(queryLower) && !usedLines.has(i)) {
        const contextStart = Math.max(0, i - 5);
        const contextEnd = Math.min(lines.length - 1, i + 5);
        for (let j = contextStart; j <= contextEnd; j++) usedLines.add(j);
        const context = lines.slice(contextStart, contextEnd + 1).join('\n');
        matches.push({ line: i + 1, text: context });
      }
    }

    if (matches.length > 0) {
      totalMatches += matches.length;
      results.push(`## ${manual.filename} (${matches.length} matches)\n`);
      for (const match of matches.slice(0, 8)) {
        results.push(`**Line ${match.line}:**\n\`\`\`\n${match.text}\n\`\`\`\n`);
      }
      if (matches.length > 8) {
        results.push(`_...and ${matches.length - 8} more matches_\n`);
      }
    }
  }

  if (results.length === 0) {
    return {
      markdown: `No matches found for "${query}" across ${manuals.length} manual(s).`,
      totalMatches: 0,
    };
  }

  return {
    markdown: `# Search Results for "${query}"\n\n${results.join('\n')}`,
    totalMatches,
  };
}
