/**
 * BM25 Engine Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, chunkText, BM25 } from '../services/bm25.js';
import { computeAggregateHash } from '../services/knowledge-indexer.js';

describe('tokenize', () => {
  it('lowercases input and preserves snake_case identifier as full token', () => {
    // Backward-compat: identifiers like MC_Power/CiA402 remain matchable
    // via exact string search.
    const tokens = tokenize('MC_Power Festo CiA402');
    assert.ok(tokens.includes('mc_power'), 'snake_case identifier preserved');
    assert.ok(tokens.includes('festo'));
    assert.ok(tokens.includes('cia402'));
  });

  it('decomposes snake_case identifier into sub-tokens (regression: Bug A1)', () => {
    // Bug A1: natural-language search for "cycle time exceeded" did not match
    // `RTSEXCPT_CYCLE_TIME_EXCEED` because the tokenizer kept the _ joined.
    // Fix: besides the full token, it also generates components split by _.
    const tokens = tokenize('RTSEXCPT_CYCLE_TIME_EXCEED');
    assert.ok(tokens.includes('rtsexcpt_cycle_time_exceed'), 'full identifier kept');
    assert.ok(tokens.includes('rtsexcpt'), 'sub-token present');
    assert.ok(tokens.includes('cycle'), 'sub-token present');
    assert.ok(tokens.includes('time'), 'sub-token present');
    assert.ok(tokens.includes('exceed'), 'sub-token present');
  });

  it('decomposition handles common PLC patterns', () => {
    const mc = tokenize('MC_MoveAbsolute_Festo MC_Power_Festo');
    assert.ok(mc.includes('mc'));
    assert.ok(mc.includes('moveabsolute'));
    assert.ok(mc.includes('power'));
    assert.ok(mc.includes('festo'));
    const fb = tokenize('FB_StandardMotor');
    assert.ok(fb.includes('fb'));
    assert.ok(fb.includes('standardmotor'));
  });

  it('removes stopwords', () => {
    const tokens = tokenize('the motor is on and the drive');
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('is'));
    assert.ok(!tokens.includes('on'));
    assert.ok(!tokens.includes('and'));
    assert.ok(tokens.includes('motor'));
    assert.ok(tokens.includes('drive'));
  });

  it('filters single-char tokens (full and sub)', () => {
    const tokens = tokenize('a b cc dd');
    assert.ok(!tokens.includes('a'));
    assert.ok(!tokens.includes('b'));
    assert.ok(tokens.includes('cc'));
    assert.ok(tokens.includes('dd'));
    // Single-char sub-token also filtered (e.g. RTSEXCPT_X — 'x' does not count)
    const rtX = tokenize('RTSEXCPT_X_VALUE');
    assert.ok(!rtX.includes('x'));
    assert.ok(rtX.includes('value'));
  });

  it('handles empty input', () => {
    assert.deepEqual(tokenize(''), []);
    assert.deepEqual(tokenize('   '), []);
  });
});

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('hello world', 500, 100);
    assert.equal(chunks.length, 1);
  });

  it('creates overlapping chunks for long text', () => {
    const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText(text, 500, 100);
    assert.ok(chunks.length > 1);
    // First chunk should have ~500 words
    const firstChunkWords = chunks[0].split(/\s+/).length;
    assert.ok(firstChunkWords >= 490 && firstChunkWords <= 510);
  });
});

describe('BM25', () => {
  it('scores relevant document higher', () => {
    const bm25 = new BM25();
    const corpus = [
      tokenize('homing method 37 absolute encoder BiSS'),
      tokenize('motor power supply voltage current'),
      tokenize('homing procedure reference point encoder'),
    ];
    bm25.fit(corpus);

    const results = bm25.search(tokenize('homing encoder'));
    assert.ok(results.length > 0);
    // Doc 0 and Doc 2 should score higher than Doc 1
    const indices = results.map(r => r.index);
    assert.ok(indices.includes(0) || indices.includes(2));
  });

  it('returns empty for no-match query', () => {
    const bm25 = new BM25();
    bm25.fit([tokenize('alpha beta gamma')]);
    const results = bm25.search(tokenize('zzzznotexist'));
    assert.equal(results.length, 0);
  });

  it('respects topK limit', () => {
    const bm25 = new BM25();
    const corpus = Array.from({ length: 20 }, (_, i) => tokenize(`document number ${i} about servo motor`));
    bm25.fit(corpus);
    const results = bm25.search(tokenize('servo motor'), 3);
    assert.ok(results.length <= 3);
  });

  it('scores are sorted descending', () => {
    const bm25 = new BM25();
    bm25.fit([
      tokenize('EtherCAT CiA 402 state machine controlword statusword'),
      tokenize('MQTT publish subscribe JSON telemetry'),
      tokenize('EtherCAT PDO mapping process data object CiA'),
    ]);
    const results = bm25.search(tokenize('EtherCAT CiA'));
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].score >= results[i].score);
    }
  });
});

describe('computeAggregateHash (index integrity)', () => {
  const sampleChunks = [
    { source: 'a.md', tokens: ['hello', 'world'] },
    { source: 'b.md', tokens: ['foo', 'bar', 'baz'] },
  ];

  it('is deterministic for identical input', () => {
    const h1 = computeAggregateHash(sampleChunks);
    const h2 = computeAggregateHash(sampleChunks);
    assert.equal(h1, h2);
  });

  it('produces a 40-char SHA-1 hex digest', () => {
    const hash = computeAggregateHash(sampleChunks);
    assert.match(hash, /^[a-f0-9]{40}$/);
  });

  it('changes when a token is altered', () => {
    const original = computeAggregateHash(sampleChunks);
    const modified = computeAggregateHash([
      { source: 'a.md', tokens: ['hello', 'world'] },
      { source: 'b.md', tokens: ['foo', 'bar', 'BAZ'] }, // last token uppercased
    ]);
    assert.notEqual(original, modified);
  });

  it('changes when chunk order swaps', () => {
    const original = computeAggregateHash(sampleChunks);
    const swapped = computeAggregateHash([sampleChunks[1], sampleChunks[0]]);
    assert.notEqual(original, swapped);
  });

  it('changes when a source path differs but tokens are equal', () => {
    const original = computeAggregateHash([{ source: 'a.md', tokens: ['x'] }]);
    const renamed = computeAggregateHash([{ source: 'b.md', tokens: ['x'] }]);
    assert.notEqual(original, renamed);
  });

  it('produces different hashes for empty vs single-empty chunk', () => {
    const empty = computeAggregateHash([]);
    const oneEmpty = computeAggregateHash([{ source: 'a.md', tokens: [] }]);
    assert.notEqual(empty, oneEmpty);
  });
});
