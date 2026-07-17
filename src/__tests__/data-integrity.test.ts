/**
 * Data Integrity Tests — Verify JSON data files parse correctly.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

function loadJson(filename: string): unknown {
  const path = join(DATA_DIR, filename);
  assert.ok(existsSync(path), `Data file missing: ${filename}`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

describe('data/hungarian-prefixes.json', () => {
  it('parses and contains required types', () => {
    const data = loadJson('hungarian-prefixes.json') as Record<string, string>;
    assert.equal(data['BOOL'], 'b');
    assert.equal(data['INT'], 'n');
    assert.equal(data['REAL'], 'r');
    assert.equal(data['TIME'], 't');
    assert.equal(data['STRING'], 's');
    assert.equal(data['WORD'], 'w');
    assert.equal(data['BYTE'], 'by');
  });
});

describe('data/type-prefixes.json', () => {
  it('parses and contains POU types', () => {
    const data = loadJson('type-prefixes.json') as Record<string, string>;
    assert.equal(data['functionBlock'], 'FB_');
    assert.equal(data['program'], 'PRG_');
    assert.equal(data['enum'], 'E_');
    assert.equal(data['struct'], 'ST_');
  });
});

describe('data/state-machine-states.json', () => {
  it('parses and has required states', () => {
    const data = loadJson('state-machine-states.json') as { states: Record<string, { name: string }>; required: string[] };
    assert.ok(data.states['0']);
    assert.equal(data.states['0'].name, 'IDLE');
    assert.ok(data.states['90']);
    assert.equal(data.states['90'].name, 'DONE');
    assert.ok(data.states['99']);
    assert.equal(data.states['99'].name, 'ERROR');
    assert.ok(Array.isArray(data.required));
  });
});

describe('data/fb-interface-patterns.json', () => {
  it('parses and has trigger/status patterns', () => {
    const data = loadJson('fb-interface-patterns.json') as { triggers: Record<string, unknown>; status: Record<string, unknown> };
    assert.ok(data.triggers['bEnable']);
    assert.ok(data.status['bDone']);
    assert.ok(data.status['bBusy']);
    assert.ok(data.status['bErr']);
    assert.ok(data.status['nErrId']);
  });
});

describe('data/festo-error-codes.json', () => {
  it('parses and has error code sources', () => {
    const data = loadJson('festo-error-codes.json') as Record<string, Record<string, { message: string; recovery: string }>>;
    assert.ok(data['cia402']);
    assert.ok(data['festo_ptp']);
    assert.ok(data['codesys']);
    // Check a known error code
    assert.ok(data['cia402']['0x7500']);
    assert.ok(data['cia402']['0x7500'].message.length > 0);
    assert.ok(data['cia402']['0x7500'].recovery.length > 0);
  });
});
