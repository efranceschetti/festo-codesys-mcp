/**
 * Naming Convention Utility Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePrefix, ensurePouPrefix, ensureDutPrefix } from '../utils/naming.js';
import { buildGvlStCode } from '../utils/xml-builder.js';

describe('ensurePrefix', () => {
  it('returns unchanged name when prefix already present', () => {
    const result = ensurePrefix('FB_ServoAxis', 'FB_');
    assert.equal(result.name, 'FB_ServoAxis');
    assert.equal(result.corrected, false);
  });

  it('adds prefix when missing', () => {
    const result = ensurePrefix('ServoAxis', 'FB_');
    assert.equal(result.name, 'FB_ServoAxis');
    assert.equal(result.corrected, true);
  });

  it('handles empty prefix gracefully', () => {
    const result = ensurePrefix('MyBlock', '');
    assert.equal(result.name, 'MyBlock');
    assert.equal(result.corrected, false);
  });
});

describe('ensurePouPrefix', () => {
  it('adds FB_ for FUNCTION_BLOCK', () => {
    const result = ensurePouPrefix('ServoAxis', 'FUNCTION_BLOCK');
    assert.equal(result.name, 'FB_ServoAxis');
    assert.equal(result.corrected, true);
  });

  it('adds PRG_ for PROGRAM', () => {
    const result = ensurePouPrefix('Main', 'PROGRAM');
    assert.equal(result.name, 'PRG_Main');
    assert.equal(result.corrected, true);
  });

  it('adds FC_ for FUNCTION', () => {
    const result = ensurePouPrefix('CalcSpeed', 'FUNCTION');
    assert.equal(result.name, 'FC_CalcSpeed');
    assert.equal(result.corrected, true);
  });

  it('no change when prefix already correct', () => {
    const result = ensurePouPrefix('FB_ServoAxis', 'FUNCTION_BLOCK');
    assert.equal(result.name, 'FB_ServoAxis');
    assert.equal(result.corrected, false);
  });

  it('returns unchanged for unknown POU type', () => {
    const result = ensurePouPrefix('MyBlock', 'UNKNOWN');
    assert.equal(result.name, 'MyBlock');
    assert.equal(result.corrected, false);
  });
});

describe('ensureDutPrefix', () => {
  it('adds E_ for enum', () => {
    const result = ensureDutPrefix('MachState', 'enum');
    assert.equal(result.name, 'E_MachState');
    assert.equal(result.corrected, true);
  });

  it('adds ST_ for struct', () => {
    const result = ensureDutPrefix('AxisConfig', 'struct');
    assert.equal(result.name, 'ST_AxisConfig');
    assert.equal(result.corrected, true);
  });

  it('no change when E_ prefix present', () => {
    const result = ensureDutPrefix('E_MachState', 'enum');
    assert.equal(result.name, 'E_MachState');
    assert.equal(result.corrected, false);
  });

  it('no change when ST_ prefix present', () => {
    const result = ensureDutPrefix('ST_AxisConfig', 'struct');
    assert.equal(result.name, 'ST_AxisConfig');
    assert.equal(result.corrected, false);
  });
});

describe('buildGvlStCode', () => {
  it('generates VAR_GLOBAL with variables', () => {
    const code = buildGvlStCode({
      name: 'GVL_Test',
      variables: [
        { name: 'bReady', type: 'BOOL' },
        { name: 'nCount', type: 'INT', initialValue: '0' },
        { name: 'rTemp', type: 'REAL', comment: 'Temperature' },
      ],
    });
    assert.ok(code.includes('VAR_GLOBAL'));
    assert.ok(code.includes('bReady : BOOL;'));
    assert.ok(code.includes('nCount : INT := 0;'));
    assert.ok(code.includes('// Temperature'));
    assert.ok(code.includes('END_VAR'));
  });

  it('generates VAR_GLOBAL CONSTANT when isConstant', () => {
    const code = buildGvlStCode({
      name: 'GVL_Cfg',
      variables: [{ name: 'nMaxSpeed', type: 'DINT', initialValue: '1000' }],
      isConstant: true,
    });
    assert.ok(code.includes('VAR_GLOBAL CONSTANT'));
  });
});
