/**
 * Knowledge Base Indexer (async I/O)
 *
 * Indexes all markdown files in the knowledge/ directory using BM25.
 * Persists the index to JSON for fast startup.
 *
 * F3-020 / F3-021 (PENDING B3): all filesystem I/O is async (fs/promises).
 * Constructor returns immediately; loadIndex() runs in background and
 * subsequent index/search calls await `ensureLoaded()` so the event loop is
 * never blocked by readFileSync/writeFileSync of the 1.1MB BM25 JSON.
 */

import { readFile, writeFile, readdir, stat, access } from 'fs/promises';
import { join, relative, extname } from 'path';
import { createHash } from 'crypto';
import { KNOWLEDGE_DIR } from '../knowledge/loader.js';
import { tokenize, chunkText, BM25 } from './bm25.js';
import { sanitizeKnowledgeContent } from './content-sanitizer.js';
import { log } from '../utils/logger.js';

const INDEX_FILE = 'bm25_index.json';
const INDEX_VERSION = 3; // v3: aggregate-hash integrity check on persisted index

/**
 * SHA-1 over the concatenated (source + tokens) of every chunk.
 * Used to detect corrupted/truncated index files — race-condition writes,
 * partial flushes, or external tampering. Reading from disk is O(N) anyway,
 * so the recompute cost is negligible.
 */
export function computeAggregateHash(chunks: Array<{ source: string; tokens: string[] }>): string {
  const h = createHash('sha1');
  for (const c of chunks) {
    h.update(c.source);
    h.update('\n');
    h.update(c.tokens.join(' '));
    h.update('\n');
  }
  return h.digest('hex');
}

interface Chunk {
  source: string;
  text: string;
  tokens: string[];
}

interface FileMeta {
  mtime: number;
  size: number;
}

interface IndexData {
  version: number;
  aggregateHash?: string; // v3+: integrity check against tampering / partial writes
  fileMeta: Record<string, FileMeta>;
  chunks: Array<{ source: string; text: string; tokens: string[] }>;
}

export interface SearchResult {
  source: string;
  score: number;
  snippet: string;
}

// ── Query Cache (LRU with TTL) ──────────────────────────────────────────

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 50;

class QueryCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.results;
  }

  set(key: string, results: SearchResult[]): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { results, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ── Walk directory recursively (async) ──────────────────────────────────

async function walkDir(dir: string, extensions: Set<string>): Promise<string[]> {
  const results: string[] = [];

  async function exists(p: string): Promise<boolean> {
    try { await access(p); return true; } catch { return false; }
  }

  if (!(await exists(dir))) return results;

  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const s = await stat(full);
      if (s.isDirectory()) {
        results.push(...await walkDir(full, extensions));
      } else if (extensions.has(extname(full).toLowerCase()) && entry !== INDEX_FILE) {
        results.push(full);
      }
    } catch {
      // Skip inaccessible files
    }
  }
  return results;
}

// ── Knowledge Indexer ────────────────────────────────────────────────────

export class KnowledgeIndexer {
  private bm25 = new BM25();
  private chunks: Chunk[] = [];
  private fileMeta: Record<string, FileMeta> = {};
  private indexed = false;
  private indexPath: string;
  private knowledgeDir: string;
  private queryCache = new QueryCache();
  private loadingPromise: Promise<void> | null;
  /**
   * D5-003: parallel dedupe of index(). Without this, two simultaneous
   * `search()` calls before the first index completes would fire two
   * full passes in parallel, mutating `this.chunks` mid-flight and
   * passing inconsistent state to `bm25.fit()`.
   */
  private indexingPromise: Promise<{ docsCount: number; chunksCount: number; reindexed: number }> | null = null;

  /**
   * @param dir Override the knowledge directory. Default is the
   * shared `KNOWLEDGE_DIR` used by the production singleton; tests
   * pass a tmpdir so they can stage files and corrupted indexes
   * without touching real state.
   */
  constructor(dir: string = KNOWLEDGE_DIR) {
    this.knowledgeDir = dir;
    this.indexPath = join(dir, INDEX_FILE);
    // Kick off load asynchronously; don't block constructor.
    this.loadingPromise = this.loadIndex().catch((err) => {
      log('warn', 'knowledge-indexer', `loadIndex failed: ${err}`);
    });
  }

  /**
   * Wait for any pending background load before mutating/reading state.
   * No-op once first load completes.
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
      this.loadingPromise = null;
    }
  }

  get isIndexed(): boolean {
    return this.indexed && this.chunks.length > 0;
  }

  /** Index knowledge files. Incremental by default — only re-indexes changed files. */
  async index(force = false): Promise<{ docsCount: number; chunksCount: number; reindexed: number }> {
    // D5-003: parallel dedupe. Reuses the in-flight promise if another call
    // is already indexing (race when search() fires index() before the
    // boot main.index() completes).
    if (this.indexingPromise) return this.indexingPromise;
    this.indexingPromise = this.doIndex(force).finally(() => {
      this.indexingPromise = null;
    });
    return this.indexingPromise;
  }

  private async doIndex(force = false): Promise<{ docsCount: number; chunksCount: number; reindexed: number }> {
    await this.ensureLoaded();

    if (this.indexed && !force) {
      const { changed, deleted } = await this.getChangedFiles();
      if (changed.length === 0 && deleted.length === 0) {
        return {
          docsCount: new Set(this.chunks.map(c => c.source)).size,
          chunksCount: this.chunks.length,
          reindexed: 0,
        };
      }
      return this.incrementalIndex(changed, deleted);
    }

    // Full index
    const extensions = new Set(['.md', '.txt']);
    const files = await walkDir(this.knowledgeDir, extensions);
    this.chunks = [];
    this.fileMeta = {};
    let docsProcessed = 0;

    for (const filepath of files.sort()) {
      try {
        const rawText = await readFile(filepath, 'utf-8');
        if (!rawText.trim()) continue;

        const relPath = relative(this.knowledgeDir, filepath).replace(/\\/g, '/');
        const s = await stat(filepath);
        this.fileMeta[relPath] = { mtime: s.mtimeMs, size: s.size };

        const text = sanitizeKnowledgeContent(rawText, relPath);
        const textChunks = chunkText(text, 500, 100);
        for (const chunk of textChunks) {
          const tokens = tokenize(chunk);
          if (tokens.length > 0) {
            this.chunks.push({ source: relPath, text: chunk, tokens });
          }
        }
        docsProcessed++;
      } catch (err) {
        // D5-013: log skipped files (was a silent catch). Permission denied,
        // invalid encoding, etc. used to be invisible in production.
        log('warn', 'knowledge-indexer', `Skipped ${filepath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (this.chunks.length > 0) {
      this.bm25.fit(this.chunks.map(c => c.tokens));
    }

    this.indexed = true;
    this.queryCache.clear();
    await this.saveIndex();

    log('info', 'knowledge-indexer', `Indexed ${docsProcessed} docs → ${this.chunks.length} chunks`);
    return { docsCount: docsProcessed, chunksCount: this.chunks.length, reindexed: docsProcessed };
  }

  /** Search with LRU cache and optional adjacent chunk retrieval. */
  async search(query: string, maxResults = 10, includeAdjacent = true): Promise<SearchResult[]> {
    await this.ensureLoaded();

    if (!this.isIndexed) {
      await this.index();
      if (!this.isIndexed) return [];
    }

    const cacheKey = `${query}|${maxResults}|${includeAdjacent}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const results = this.bm25.search(queryTokens, maxResults);

    const searchResults = results.map(({ index, score }) => {
      let snippet = this.chunks[index].text;

      if (includeAdjacent) {
        const source = this.chunks[index].source;
        const prev = index > 0 && this.chunks[index - 1].source === source
          ? this.chunks[index - 1].text.slice(-200) + '\n---\n'
          : '';
        const next = index < this.chunks.length - 1 && this.chunks[index + 1].source === source
          ? '\n---\n' + this.chunks[index + 1].text.slice(0, 200)
          : '';
        snippet = prev + snippet + next;
      }

      if (snippet.length > 800) snippet = snippet.slice(0, 800) + '...';

      return { source: this.chunks[index].source, score, snippet };
    });

    this.queryCache.set(cacheKey, searchResults);
    return searchResults;
  }

  // ── Incremental Indexing ─────────────────────────────────────────────

  /**
   * Detects modified/new files AND deleted files (drift).
   * F3-029: previously only new/modified — chunks of deleted files
   * stayed orphaned in the index indefinitely, making search
   * return snippets of manuals that no longer exist.
   */
  private async getChangedFiles(): Promise<{ changed: string[]; deleted: string[] }> {
    const extensions = new Set(['.md', '.txt']);
    const files = await walkDir(this.knowledgeDir, extensions);
    const changed: string[] = [];
    const seen = new Set<string>();

    for (const filepath of files) {
      try {
        const relPath = relative(this.knowledgeDir, filepath).replace(/\\/g, '/');
        seen.add(relPath);
        const s = await stat(filepath);
        const cached = this.fileMeta[relPath];
        if (!cached || cached.mtime !== s.mtimeMs || cached.size !== s.size) {
          changed.push(filepath);
        }
      } catch { /* skip */ }
    }

    const deleted: string[] = [];
    for (const relPath of Object.keys(this.fileMeta)) {
      if (!seen.has(relPath)) {
        deleted.push(relPath);
      }
    }

    return { changed, deleted };
  }

  private async incrementalIndex(changedFiles: string[], deletedFiles: string[] = []): Promise<{ docsCount: number; chunksCount: number; reindexed: number }> {
    for (const relPath of deletedFiles) {
      this.chunks = this.chunks.filter(c => c.source !== relPath);
      delete this.fileMeta[relPath];
    }

    for (const filepath of changedFiles) {
      try {
        const relPath = relative(this.knowledgeDir, filepath).replace(/\\/g, '/');
        const s = await stat(filepath);
        const rawText = await readFile(filepath, 'utf-8');

        this.chunks = this.chunks.filter(c => c.source !== relPath);

        if (rawText.trim()) {
          const text = sanitizeKnowledgeContent(rawText, relPath);
          const textChunks = chunkText(text, 500, 100);
          for (const chunk of textChunks) {
            const tokens = tokenize(chunk);
            if (tokens.length > 0) {
              this.chunks.push({ source: relPath, text: chunk, tokens });
            }
          }
        }

        this.fileMeta[relPath] = { mtime: s.mtimeMs, size: s.size };
      } catch { /* skip */ }
    }

    if (this.chunks.length > 0) {
      this.bm25.fit(this.chunks.map(c => c.tokens));
    }

    this.queryCache.clear();
    await this.saveIndex();

    log('info', 'knowledge-indexer', `Incremental: ${changedFiles.length} re-indexed, ${deletedFiles.length} deleted`);
    return {
      docsCount: new Set(this.chunks.map(c => c.source)).size,
      chunksCount: this.chunks.length,
      reindexed: changedFiles.length + deletedFiles.length,
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────

  private async saveIndex(): Promise<void> {
    try {
      const chunkPayload = this.chunks.map(c => ({
        source: c.source,
        text: c.text,
        tokens: c.tokens,
      }));
      const data: IndexData = {
        version: INDEX_VERSION,
        aggregateHash: computeAggregateHash(chunkPayload),
        fileMeta: this.fileMeta,
        chunks: chunkPayload,
      };
      await writeFile(this.indexPath, JSON.stringify(data), 'utf-8');
      log('info', 'knowledge-indexer', `Index saved: ${this.chunks.length} chunks`);
    } catch (err) {
      log('warn', 'knowledge-indexer', `Failed to save index: ${err}`);
    }
  }

  private async loadIndex(): Promise<void> {
    try {
      await access(this.indexPath);
    } catch {
      return; // file doesn't exist
    }

    try {
      const raw = await readFile(this.indexPath, 'utf-8');
      const data = JSON.parse(raw) as IndexData;

      if ((data.version ?? 0) < INDEX_VERSION) {
        log('info', 'knowledge-indexer', `Index version ${data.version} < ${INDEX_VERSION}, will reindex`);
        return;
      }

      // v3+: integrity check against partial writes / tampering.
      if (data.aggregateHash !== undefined) {
        const expected = computeAggregateHash(
          (data.chunks ?? []).map(c => ({ source: c.source, tokens: c.tokens ?? [] })),
        );
        if (expected !== data.aggregateHash) {
          log('warn', 'knowledge-indexer', `Index aggregate hash mismatch (expected ${expected.slice(0, 8)}, got ${data.aggregateHash.slice(0, 8)}), will reindex`);
          return;
        }
      }

      this.fileMeta = data.fileMeta ?? {};
      this.chunks = [];
      for (const item of data.chunks ?? []) {
        const tokens = item.tokens?.length > 0 ? item.tokens : tokenize(item.text);
        if (tokens.length > 0) {
          this.chunks.push({ source: item.source, text: item.text, tokens });
        }
      }

      if (this.chunks.length > 0) {
        this.bm25.fit(this.chunks.map(c => c.tokens));
        this.indexed = true;
        log('info', 'knowledge-indexer', `Index loaded: ${this.chunks.length} chunks, ${Object.keys(this.fileMeta).length} files tracked`);
      }
    } catch {
      this.indexed = false;
    }
  }
}

// ── Singleton instance ───────────────────────────────────────────────────

export const knowledgeIndexer = new KnowledgeIndexer();
