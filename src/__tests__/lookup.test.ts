/**
 * Lookup Service Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lookupHungarianPrefix,
  lookupTypePrefix,
  lookupState,
  lookupErrorCode,
  lookupFbInterface,
  listStandard,
} from '../services/lookup.js';

describe('lookupHungarianPrefix', () => {
  it('finds BOOL prefix', () => {
    const r = lookupHungarianPrefix('BOOL');
    assert.equal(r.found, true);
    assert.equal(r.details.prefix, 'b');
  });

  it('is case-insensitive', () => {
    const r = lookupHungarianPrefix('real');
    assert.equal(r.found, true);
    assert.equal(r.details.prefix, 'r');
  });

  it('returns not found for unknown type', () => {
    const r = lookupHungarianPrefix('CUSTOM_TYPE');
    assert.equal(r.found, false);
  });
});

describe('lookupTypePrefix', () => {
  it('finds functionBlock prefix', () => {
    const r = lookupTypePrefix('functionBlock');
    assert.equal(r.found, true);
    assert.equal(r.details.prefix, 'FB_');
  });

  it('returns not found for unknown', () => {
    const r = lookupTypePrefix('widget');
    assert.equal(r.found, false);
  });
});

describe('lookupState', () => {
  it('finds IDLE state', () => {
    const r = lookupState('0');
    assert.equal(r.found, true);
    assert.ok(r.message.includes('IDLE'));
  });

  it('finds ERROR state', () => {
    const r = lookupState('99');
    assert.equal(r.found, true);
    assert.ok(r.message.includes('ERROR'));
  });

  it('returns not found for unknown state', () => {
    const r = lookupState('42');
    assert.equal(r.found, false);
  });
});

describe('lookupErrorCode', () => {
  it('finds CiA 402 error by hex', () => {
    const r = lookupErrorCode('0x7500');
    assert.equal(r.found, true);
    assert.ok(r.message.includes('Communication lost'));
  });

  it('finds Festo PtP error by decimal', () => {
    const r = lookupErrorCode('4357');
    assert.equal(r.found, true);
    assert.ok(r.message.includes('not referenced'));
  });

  it('finds CODESYS error', () => {
    const r = lookupErrorCode('3700');
    assert.equal(r.found, true);
    assert.ok(r.message.includes('Watchdog'));
  });

  it('returns not found for unknown code', () => {
    const r = lookupErrorCode('0xFFFF');
    assert.equal(r.found, false);
  });
});

describe('lookupFbInterface', () => {
  it('returns interface pattern', () => {
    const r = lookupFbInterface();
    assert.equal(r.found, true);
    assert.ok(r.message.includes('bEnable'));
    assert.ok(r.message.includes('bDone'));
  });
});

describe('listStandard', () => {
  it('returns complete reference', () => {
    const r = listStandard();
    assert.equal(r.found, true);
    assert.ok(r.message.includes('Hungarian Notation'));
    assert.ok(r.message.includes('POU Type Prefixes'));
    assert.ok(r.message.includes('State Machine'));
  });
});
