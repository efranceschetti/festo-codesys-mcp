/**
 * Filesystem scan helpers shared by the tools that scan .st.
 * Extracted from xml-tools.ts to be reused by the st-index (code intelligence).
 */

import { readdir, stat, access } from 'fs/promises';
import { join, extname } from 'path';

/** True if the path exists (file or directory). */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Recursively lists all .st files under `dir` (paths absolute/relative to the input). */
export async function scanStFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) files.push(...await scanStFiles(full));
    else if (extname(entry).toLowerCase() === '.st') files.push(full);
  }
  return files;
}
