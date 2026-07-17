/**
 * Validators Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateHungarianNotation, validatePouPrefix, validateNoPsnakeCase } from '../validators/naming-validator.js';
import { validateFbInterface } from '../validators/fb-interface-validator.js';
import { validateStateMachine } from '../validators/state-machine-validator.js';
import { validateBatch, getValidatorTypes } from '../validators/batch-validator.js';

describe('validateHungarianNotation', () => {
  it('passes correct prefix', () => {
    const r = validateHungarianNotation('bReady', 'BOOL');
    assert.equal(r.valid, true);
  });

  it('fails wrong prefix', () => {
    const r = validateHungarianNotation('ready', 'BOOL');
    assert.equal(r.valid, false);
    assert.ok(r.message.includes('"b"'));
  });

  it('handles DINT with n prefix', () => {
    const r = validateHungarianNotation('nCounter', 'DINT');
    assert.equal(r.valid, true);
  });

  it('exempts unknown types', () => {
    const r = validateHungarianNotation('myCustom', 'FB_Motor');
    assert.equal(r.valid, true);
    assert.ok(r.details.exempt);
  });
});

describe('validatePouPrefix', () => {
  it('passes FB_ for functionBlock', () => {
    const r = validatePouPrefix('FB_Motor', 'functionBlock');
    assert.equal(r.valid, true);
  });

  it('fails missing prefix', () => {
    const r = validatePouPrefix('Motor', 'functionBlock');
    assert.equal(r.valid, false);
    assert.ok(r.message.includes('FB_'));
  });

  it('passes PRG_ for program', () => {
    const r = validatePouPrefix('PRG_Main', 'program');
    assert.equal(r.valid, true);
  });
});

describe('validateNoPsnakeCase', () => {
  it('detects snake_case', () => {
    const r = validateNoPsnakeCase('my_variable');
    assert.equal(r.valid, false);
    assert.ok(r.message.includes('PascalCase'));
  });

  it('allows standard prefixes with underscore', () => {
    const r = validateNoPsnakeCase('FB_Motor');
    assert.equal(r.valid, true);
  });

  it('passes PascalCase', () => {
    const r = validateNoPsnakeCase('MotorSpeed');
    assert.equal(r.valid, true);
  });
});

describe('validateFbInterface', () => {
  it('passes complete FB interface', () => {
    const code = `
FUNCTION_BLOCK FB_Test
VAR_INPUT
  bEnable : BOOL;
END_VAR
VAR_OUTPUT
  bDone : BOOL;
  bBusy : BOOL;
  bErr : BOOL;
  nErrId : UDINT;
END_VAR`;
    const r = validateFbInterface(code);
    assert.equal(r.valid, true);
  });

  it('fails missing outputs', () => {
    const code = `
FUNCTION_BLOCK FB_Test
VAR_INPUT
  bEnable : BOOL;
END_VAR
VAR_OUTPUT
  bDone : BOOL;
END_VAR`;
    const r = validateFbInterface(code);
    assert.equal(r.valid, false);
    assert.ok(r.message.includes('bBusy'));
  });

  it('skips non-FB code', () => {
    const r = validateFbInterface('PROGRAM PRG_Main\nVAR\nEND_VAR');
    assert.equal(r.valid, true);
    assert.ok(r.details.skipped);
  });
});

describe('validateStateMachine', () => {
  it('passes complete state machine', () => {
    const code = 'nState := 0; nState := 10; nState := 90; nState := 99;';
    const r = validateStateMachine(code);
    assert.equal(r.valid, true);
  });

  it('warns missing ERROR state', () => {
    const code = 'nState := 0; nState := 10; nState := 90;';
    const r = validateStateMachine(code);
    assert.equal(r.valid, true); // warning, not critical
    assert.ok(r.message.includes('99'));
  });

  it('fails missing IDLE state', () => {
    const code = 'nState := 10; nState := 90; nState := 99;';
    const r = validateStateMachine(code);
    assert.equal(r.valid, false);
  });

  it('skips code without nState', () => {
    const r = validateStateMachine('bReady := TRUE;');
    assert.equal(r.valid, true);
    assert.ok(r.details.skipped);
  });
});

describe('validateBatch', () => {
  it('processes multiple items', () => {
    const result = validateBatch([
      { type: 'hungarian', input: 'bReady', extra: 'BOOL' },
      { type: 'hungarian', input: 'ready', extra: 'BOOL' },
      { type: 'pou_prefix', input: 'FB_Motor', extra: 'functionBlock' },
    ]);
    assert.equal(result.total, 3);
    assert.equal(result.passed, 2);
    assert.equal(result.failed, 1);
  });

  it('handles unknown validator type', () => {
    const result = validateBatch([{ type: 'nonexistent', input: 'test' }]);
    assert.equal(result.failed, 1);
  });

  it('lists available types', () => {
    const types = getValidatorTypes();
    assert.ok(types.includes('hungarian'));
    assert.ok(types.includes('fb_interface'));
    assert.ok(types.includes('state_machine'));
  });
});
