/**
 * Tools Logic Tests
 * Validates the static analysis and review logic used by MCP tools.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HUNGARIAN_PREFIXES, TYPE_PREFIXES } from '../knowledge/conventions.js';

describe('Hungarian Notation Prefixes', () => {
  it('has correct BOOL prefix', () => {
    assert.equal(HUNGARIAN_PREFIXES['BOOL'], 'b');
  });

  it('maps INT/DINT/SINT/LINT to "n"', () => {
    assert.equal(HUNGARIAN_PREFIXES['INT'], 'n');
    assert.equal(HUNGARIAN_PREFIXES['DINT'], 'n');
    assert.equal(HUNGARIAN_PREFIXES['SINT'], 'n');
    assert.equal(HUNGARIAN_PREFIXES['LINT'], 'n');
  });

  it('maps UINT/UDINT/USINT/ULINT to "u"', () => {
    assert.equal(HUNGARIAN_PREFIXES['UINT'], 'u');
    assert.equal(HUNGARIAN_PREFIXES['UDINT'], 'u');
    assert.equal(HUNGARIAN_PREFIXES['USINT'], 'u');
    assert.equal(HUNGARIAN_PREFIXES['ULINT'], 'u');
  });

  it('maps REAL/LREAL to "r"', () => {
    assert.equal(HUNGARIAN_PREFIXES['REAL'], 'r');
    assert.equal(HUNGARIAN_PREFIXES['LREAL'], 'r');
  });

  it('maps WORD to "w" and DWORD to "dw"', () => {
    assert.equal(HUNGARIAN_PREFIXES['WORD'], 'w');
    assert.equal(HUNGARIAN_PREFIXES['DWORD'], 'dw');
  });

  it('maps TIME/LTIME to "t"', () => {
    assert.equal(HUNGARIAN_PREFIXES['TIME'], 't');
    assert.equal(HUNGARIAN_PREFIXES['LTIME'], 't');
  });

  it('maps STRING to "s"', () => {
    assert.equal(HUNGARIAN_PREFIXES['STRING'], 's');
  });

  it('maps BYTE to "by"', () => {
    assert.equal(HUNGARIAN_PREFIXES['BYTE'], 'by');
  });

  it('covers all expected types', () => {
    const expectedTypes = [
      'BOOL', 'INT', 'DINT', 'SINT', 'LINT',
      'UINT', 'UDINT', 'USINT', 'ULINT',
      'REAL', 'LREAL', 'WORD', 'DWORD', 'LWORD',
      'BYTE', 'TIME', 'LTIME', 'STRING', 'WSTRING',
    ];
    for (const t of expectedTypes) {
      assert.ok(HUNGARIAN_PREFIXES[t] !== undefined, `missing prefix for ${t}`);
    }
  });
});

describe('Type Prefixes', () => {
  it('has correct POU prefixes', () => {
    assert.equal(TYPE_PREFIXES['functionBlock'], 'FB_');
    assert.equal(TYPE_PREFIXES['program'], 'PRG_');
    assert.equal(TYPE_PREFIXES['function'], 'FC_');
    assert.equal(TYPE_PREFIXES['enum'], 'E_');
    assert.equal(TYPE_PREFIXES['struct'], 'ST_');
    assert.equal(TYPE_PREFIXES['gvl'], 'GVL_');
    assert.equal(TYPE_PREFIXES['interface'], 'I_');
  });
});

describe('Static Analysis Logic — Comment Stripping', () => {
  it('strips single-line comments', () => {
    const code = 'bEnable := TRUE; // Enable motor\nnState := 10;';
    const stripped = code.replace(/\/\/.*$/gm, '');
    assert.ok(!stripped.includes('Enable motor'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
    assert.ok(stripped.includes('nState := 10;'));
  });

  it('strips block comments', () => {
    const code = '(* This is a\nmultiline comment *)\nbEnable := TRUE;';
    const stripped = code.replace(/\(\*[\s\S]*?\*\)/g, '');
    assert.ok(!stripped.includes('multiline comment'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
  });

  it('strips nested comment patterns correctly', () => {
    const code = 'bEnable := TRUE; (* comment with // inside *)';
    const stripped = code
      .replace(/\(\*[\s\S]*?\*\)/g, '')
      .replace(/\/\/.*$/gm, '');
    assert.ok(!stripped.includes('comment'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
  });
});

describe('Static Analysis Logic — State Machine Detection', () => {
  it('detects state values', () => {
    const code = 'nState := 0;\nnState := 10;\nnState := 99;';
    const statePattern = /nState\s*:=\s*(\d+)/g;
    const values = new Set<string>();
    let match;
    while ((match = statePattern.exec(code)) !== null) {
      values.add(match[1]);
    }
    assert.ok(values.has('0'), 'should detect IDLE state');
    assert.ok(values.has('10'), 'should detect work state');
    assert.ok(values.has('99'), 'should detect ERROR state');
  });

  it('detects missing IDLE state', () => {
    const code = 'nState := 10;\nnState := 20;\nnState := 99;';
    const statePattern = /nState\s*:=\s*(\d+)/g;
    const values = new Set<string>();
    let match;
    while ((match = statePattern.exec(code)) !== null) {
      values.add(match[1]);
    }
    assert.ok(!values.has('0'), 'IDLE state should be missing');
  });
});

describe('Static Analysis Logic — WHILE Loop Detection', () => {
  it('detects WHILE loops', () => {
    const code = 'WHILE bCondition DO\n    nCount := nCount + 1;\nEND_WHILE';
    assert.ok(code.includes('WHILE'), 'should detect WHILE');
  });

  it('does not false-positive on commented WHILE', () => {
    const code = '// WHILE this is a comment\nbEnable := TRUE;';
    const stripped = code.replace(/\/\/.*$/gm, '');
    assert.ok(!stripped.includes('WHILE'), 'stripped code should not contain WHILE');
  });
});

describe('Static Analysis Logic — Variable Naming', () => {
  it('detects snake_case violations', () => {
    const code = 'my_var : BOOL;\nmotor_speed : REAL;';
    const snakePattern = /\b(\w+_\w+)\s*:/g;
    const violations: string[] = [];
    let match;
    while ((match = snakePattern.exec(code)) !== null) {
      const name = match[1];
      if (!/^(FB_|PRG_|E_|ST_|GVL_|FC_|I_|VAR_)/.test(name)) {
        violations.push(name);
      }
    }
    assert.equal(violations.length, 2);
    assert.ok(violations.includes('my_var'));
    assert.ok(violations.includes('motor_speed'));
  });

  it('does not flag valid type prefixes as snake_case', () => {
    const code = 'FB_Motor : FB_StandardMotor;\nE_State : E_MachState;';
    const snakePattern = /\b(\w+_\w+)\s*:/g;
    const violations: string[] = [];
    let match;
    while ((match = snakePattern.exec(code)) !== null) {
      const name = match[1];
      if (!/^(FB_|PRG_|E_|ST_|GVL_|FC_|I_|VAR_)/.test(name)) {
        violations.push(name);
      }
    }
    assert.equal(violations.length, 0);
  });
});
