/**
 * JSON Data Loader with Fallback
 *
 * Loads externalized data from the data/ directory.
 * If the file is missing or corrupted, returns the embedded fallback.
 * Pattern ported from EplanMCP standard.py _load_json().
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

/**
 * Load a JSON data file from data/ with a type-safe fallback.
 * Falls back silently — the server works out-of-the-box without data files.
 */
export function loadJsonData<T>(filename: string, fallback: T): T {
  try {
    const content = readFileSync(join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export { DATA_DIR };
