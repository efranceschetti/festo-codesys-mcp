/**
 * Shared Knowledge File Loader with In-Memory Cache
 *
 * Files are read once from disk and cached for the server lifetime.
 * Replaces the duplicated loadKnowledge() functions across
 * conventions.ts, festo.ts, ethercat.ts, and plcopen.ts.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', '..', 'knowledge');

const cache = new Map<string, string>();

/**
 * Load a knowledge file by relative path (e.g., 'conventions/naming-conventions.md').
 * Results are cached in memory — subsequent calls return instantly.
 */
export function loadKnowledge(path: string): string {
  const cached = cache.get(path);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const content = readFileSync(join(KNOWLEDGE_DIR, path), 'utf-8');
    cache.set(path, content);
    return content;
  } catch {
    // Do NOT cache errors — file might be added later
    return `[Knowledge file not found: ${path}]`;
  }
}

export { KNOWLEDGE_DIR };
