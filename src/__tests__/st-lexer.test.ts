/**
 * ST Lexer Tests
 * Validates positional tokenization aware of comment/string/literal.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeIdentifiers, findIdentifierTokens } from '../utils/st-lexer.js';

describe('st-lexer — tokenizeIdentifiers', () => {
  it('captures identifiers with 1-based multi-line position', () => {
    const src = 'FUNCTION_BLOCK FB_X\n  nState := 0;';
    const toks = tokenizeIdentifiers(src);
    const fb = toks.find(t => t.value === 'FB_X');
    assert.ok(fb);
    assert.equal(fb.start.line, 1);
    assert.equal(fb.start.column, 16); // after "FUNCTION_BLOCK " (15 chars + 1)
    const ns = toks.find(t => t.value === 'nState');
    assert.equal(ns?.start.line, 2);
    assert.equal(ns?.start.column, 3);
  });

  it('ignores block comment, including nested', () => {
    const src = 'a (* bb (* cc *) dd *) e';
    const vals = tokenizeIdentifiers(src).map(t => t.value);
    assert.deepEqual(vals, ['a', 'e']); // bb/cc/dd stay inside the comment
  });

  it('ignores line comment //', () => {
    const src = 'keep1 := 1; // ignore_me also_ignored\nkeep2 := 2;';
    const vals = tokenizeIdentifiers(src).map(t => t.value);
    assert.deepEqual(vals, ['keep1', 'keep2']);
  });

  it('ignores identifiers inside string, with $ escape', () => {
    const src = "msg := 'hello sFoo $' still_in_string'; real := 1;";
    const vals = tokenizeIdentifiers(src).map(t => t.value);
    assert.ok(vals.includes('msg'));
    assert.ok(vals.includes('real'));
    assert.ok(!vals.includes('sFoo'));
    assert.ok(!vals.includes('still_in_string'));
  });

  it('ignores typed/based literals (T#10MS, 16#FF)', () => {
    const src = 'tmr := T#10MS; mask := 16#FF; v := 1;';
    const vals = tokenizeIdentifiers(src).map(t => t.value);
    assert.ok(vals.includes('tmr'));
    assert.ok(vals.includes('mask'));
    assert.ok(vals.includes('v'));
    assert.ok(!vals.includes('T'));
    assert.ok(!vals.includes('MS'));
    assert.ok(!vals.includes('FF'));
  });

  it('marks qualified + qualifier on member access', () => {
    const toks = tokenizeIdentifiers('x := E_MachineMode.OFF;');
    const off = toks.find(t => t.value === 'OFF');
    assert.equal(off?.qualified, true);
    assert.equal(off?.qualifier, 'E_MachineMode');
    const em = toks.find(t => t.value === 'E_MachineMode');
    assert.equal(em?.qualified, false);
  });

  it('chaining a.b.c — qualifier is the immediate parent', () => {
    const toks = tokenizeIdentifiers('y := a.b.c;');
    assert.equal(toks.find(t => t.value === 'b')?.qualifier, 'a');
    assert.equal(toks.find(t => t.value === 'c')?.qualifier, 'b');
  });

  it('findIdentifierTokens matches whole token (not substring)', () => {
    const src = 'rOutput := 1; bOutput := 2; Out := 3;';
    assert.equal(findIdentifierTokens(src, 'Out').length, 1); // only the "Out"
    assert.equal(findIdentifierTokens(src, 'rOutput').length, 1);
  });

  it('findIdentifierTokens is case-insensitive by default', () => {
    assert.equal(findIdentifierTokens('bEnable := benable;', 'BENABLE').length, 2);
    assert.equal(findIdentifierTokens('bEnable := benable;', 'BENABLE', false).length, 0);
  });

  it('CRLF counts as one line', () => {
    const toks = tokenizeIdentifiers('a := 1;\r\nb := 2;');
    assert.equal(toks.find(t => t.value === 'b')?.start.line, 2);
  });
});
