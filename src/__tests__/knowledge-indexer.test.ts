/**
 * Knowledge Indexer — error path tests
 *
 * Targets the gaps identified by the c8 baseline (services/knowledge-indexer.ts ~38%):
 * loadIndex() rejecting corrupt JSON, version mismatch reindex, aggregate-hash
 * mismatch reindex, and walkDir() handling missing directories.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { KnowledgeIndexer } from '../services/knowledge-indexer.js';

const TEST_ROOT = join(tmpdir(), `festo-indexer-test-${Date.now()}`);

async function setupKnowledgeDir(name: string): Promise<string> {
  const dir = join(TEST_ROOT, name);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function settle(): Promise<void> {
  // Allow the constructor's background loadIndex() promise to settle.
  await new Promise<void>(resolve => setImmediate(resolve));
  await new Promise<void>(resolve => setTimeout(resolve, 30));
}

describe('KnowledgeIndexer — error paths and recovery', () => {
  before(async () => {
    await mkdir(TEST_ROOT, { recursive: true });
  });

  after(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  it('starts unindexed when knowledge directory does not exist', async () => {
    const phantomDir = join(TEST_ROOT, 'does-not-exist');
    const indexer = new KnowledgeIndexer(phantomDir);
    await settle();
    assert.equal(indexer.isIndexed, false);
  });

  it('handles a corrupt JSON index by silently dropping it', async () => {
    const dir = await setupKnowledgeDir('corrupt-json');
    await writeFile(join(dir, 'bm25_index.json'), 'this is not JSON {{{', 'utf-8');
    await writeFile(join(dir, 'sample.md'), '# Test\nMC_Power axis enable.', 'utf-8');

    const indexer = new KnowledgeIndexer(dir);
    await settle();
    // Corrupt JSON load fails silently → unindexed until index() reruns.
    assert.equal(indexer.isIndexed, false);

    // Force reindex from scratch — should rebuild from the .md file.
    const result = await indexer.index(true);
    assert.equal(result.docsCount, 1);
    assert.ok(result.chunksCount > 0);
    assert.equal(indexer.isIndexed, true);
  });

  it('discards a v2 index file (version below current INDEX_VERSION)', async () => {
    const dir = await setupKnowledgeDir('old-version');
    const oldFormat = {
      version: 2,
      fileMeta: { 'sample.md': { mtime: 1, size: 10 } },
      chunks: [{ source: 'sample.md', text: 'cached body', tokens: ['cached', 'body'] }],
    };
    await writeFile(join(dir, 'bm25_index.json'), JSON.stringify(oldFormat), 'utf-8');
    await writeFile(join(dir, 'sample.md'), '# Sample\nMC_MoveAbsolute target position.', 'utf-8');

    const indexer = new KnowledgeIndexer(dir);
    await settle();
    // Version mismatch → load aborted → unindexed.
    assert.equal(indexer.isIndexed, false);

    // Forced reindex regenerates fresh v3 index.
    const result = await indexer.index(true);
    assert.equal(result.docsCount, 1);
    assert.equal(indexer.isIndexed, true);
  });

  it('discards a v3 index whose aggregateHash does not match its chunks', async () => {
    const dir = await setupKnowledgeDir('hash-mismatch');
    // Construct a v3-shaped index but with a deliberately wrong hash.
    const tampered = {
      version: 3,
      aggregateHash: 'deadbeef'.repeat(5), // 40 chars but bogus
      fileMeta: { 'sample.md': { mtime: 1, size: 10 } },
      chunks: [{ source: 'sample.md', text: 'tampered body', tokens: ['tampered', 'body'] }],
    };
    await writeFile(join(dir, 'bm25_index.json'), JSON.stringify(tampered), 'utf-8');
    await writeFile(join(dir, 'sample.md'), '# Sample\nFestoMQTT publish topic.', 'utf-8');

    const indexer = new KnowledgeIndexer(dir);
    await settle();
    // Hash check fails → load aborted → unindexed.
    assert.equal(indexer.isIndexed, false);

    // Reindex completes successfully and persists fresh hash.
    const result = await indexer.index(true);
    assert.equal(result.docsCount, 1);
    assert.equal(indexer.isIndexed, true);
  });

  it('round-trips: save then immediate reload preserves chunks', async () => {
    const dir = await setupKnowledgeDir('round-trip');
    await writeFile(join(dir, 'a.md'), '# Doc A\nMC_Power MC_Home', 'utf-8');
    await writeFile(join(dir, 'b.md'), '# Doc B\ncontrolword statusword', 'utf-8');

    const first = new KnowledgeIndexer(dir);
    await settle();
    await first.index(true);
    assert.equal(first.isIndexed, true);

    // Second instance reads the just-written index file. Hash matches,
    // version matches → indexed without re-walking the directory.
    const second = new KnowledgeIndexer(dir);
    await settle();
    assert.equal(second.isIndexed, true);
    const results = await second.search('MC_Power');
    assert.ok(results.length > 0);
  });

  it('search() lazy-indexes when called on a fresh instance with files but no index', async () => {
    const dir = await setupKnowledgeDir('lazy-index');
    await writeFile(join(dir, 'lazy.md'), '# Lazy\nMC_Stop emergency halt.', 'utf-8');

    const indexer = new KnowledgeIndexer(dir);
    await settle();
    assert.equal(indexer.isIndexed, false);

    // search() must trigger index() internally.
    const results = await indexer.search('MC_Stop');
    assert.ok(results.length > 0);
    assert.equal(indexer.isIndexed, true);
  });
});
