/**
 * PLC Function Block Library — Loader, Catalog & Search
 *
 * Auto-discovers .st files in knowledge/library/{category}/
 * Provides catalog listing, content retrieval, and keyword search.
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadKnowledge, KNOWLEDGE_DIR } from './loader.js';

const LIBRARY_DIR = join(KNOWLEDGE_DIR, 'library');

const CATEGORIES = [
  'types', 'motion', 'actuators', 'sensors', 'safety',
  'system', 'utilities',
] as const;

export interface LibraryBlock {
  name: string;
  category: string;
  filename: string;
  description: string;
  path: string;
}

let catalogCache: LibraryBlock[] | null = null;

/**
 * Build and return the full library catalog.
 * Scans all category directories for .st files and extracts descriptions
 * from the first line matching "— Description text" in the header comment.
 */
export function getLibraryCatalog(): LibraryBlock[] {
  if (catalogCache) return catalogCache;

  const blocks: LibraryBlock[] = [];

  for (const cat of CATEGORIES) {
    const catDir = join(LIBRARY_DIR, cat);
    if (!existsSync(catDir)) continue;

    const files = readdirSync(catDir).filter(f => f.endsWith('.st'));
    for (const file of files) {
      const content = getBlockContent(cat, file);
      const headerMatch = content.match(/\u2014\s*(.+)/);
      blocks.push({
        name: file.replace('.st', ''),
        category: cat,
        filename: file,
        description: headerMatch?.[1]?.trim() || '',
        path: `library/${cat}/${file}`,
      });
    }
  }

  catalogCache = blocks;
  return blocks;
}

/**
 * Get the full .st source code of a library block.
 */
export function getBlockContent(category: string, filename: string): string {
  return loadKnowledge(`library/${category}/${filename}`);
}

/**
 * Search library blocks by keyword (matches name, description, or category).
 */
export function searchLibrary(query: string): LibraryBlock[] {
  const catalog = getLibraryCatalog();
  const q = query.toLowerCase();
  return catalog.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.description.toLowerCase().includes(q) ||
    b.category.toLowerCase().includes(q)
  );
}

/**
 * List categories that have at least one block.
 */
export function listCategories(): string[] {
  return CATEGORIES.filter(c => existsSync(join(LIBRARY_DIR, c)));
}
