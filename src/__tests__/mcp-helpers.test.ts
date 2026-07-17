/**
 * MCP Helpers Tests
 * Validates shared response builders, error handling, and comment stripping.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { successResponse, errorResponse, getErrorMessage, stripComments } from '../utils/mcp-helpers.js';

describe('successResponse', () => {
  it('returns correct MCP response structure', () => {
    const result = successResponse('hello');
    assert.deepEqual(result, { content: [{ type: 'text', text: 'hello' }] });
  });

  it('does not include isError flag', () => {
    const result = successResponse('ok');
    assert.equal('isError' in result, false);
  });

  it('handles empty string', () => {
    const result = successResponse('');
    assert.equal(result.content[0].text, '');
  });

  it('handles multiline text', () => {
    const result = successResponse('line1\nline2\nline3');
    assert.ok(result.content[0].text.includes('\n'));
  });
});

describe('errorResponse', () => {
  it('returns correct MCP error structure', () => {
    const result = errorResponse('something failed');
    assert.deepEqual(result, {
      content: [{ type: 'text', text: 'something failed' }],
      isError: true,
    });
  });

  it('includes isError flag', () => {
    const result = errorResponse('err');
    assert.equal(result.isError, true);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    assert.equal(getErrorMessage(new Error('test error')), 'test error');
  });

  it('returns string errors as-is', () => {
    assert.equal(getErrorMessage('plain string'), 'plain string');
  });

  it('stringifies unknown error types', () => {
    const msg = getErrorMessage(42);
    assert.ok(msg.includes('42'));
  });

  it('handles null', () => {
    const msg = getErrorMessage(null);
    assert.ok(msg.includes('null'));
  });

  it('handles undefined', () => {
    const msg = getErrorMessage(undefined);
    assert.ok(typeof msg === 'string');
  });

  it('handles objects', () => {
    const msg = getErrorMessage({ code: 404 });
    assert.ok(msg.includes('404'));
  });
});

describe('stripComments', () => {
  it('strips single-line comments', () => {
    const code = 'bEnable := TRUE; // Enable motor\nnState := 10;';
    const stripped = stripComments(code);
    assert.ok(!stripped.includes('Enable motor'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
    assert.ok(stripped.includes('nState := 10;'));
  });

  it('strips block comments', () => {
    const code = '(* This is a\nmultiline comment *)\nbEnable := TRUE;';
    const stripped = stripComments(code);
    assert.ok(!stripped.includes('multiline comment'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
  });

  it('strips nested comment patterns correctly', () => {
    const code = 'bEnable := TRUE; (* comment with // inside *)';
    const stripped = stripComments(code);
    assert.ok(!stripped.includes('comment'));
    assert.ok(stripped.includes('bEnable := TRUE;'));
  });

  it('preserves code with no comments', () => {
    const code = 'bEnable := TRUE;\nnState := 0;';
    assert.equal(stripComments(code), code);
  });

  it('handles empty string', () => {
    assert.equal(stripComments(''), '');
  });

  it('handles only comments', () => {
    const stripped = stripComments('// just a comment\n(* block comment *)');
    assert.equal(stripped.trim(), '');
  });

  it('handles multiple block comments', () => {
    const code = '(* A *) x := 1; (* B *) y := 2;';
    const stripped = stripComments(code);
    assert.ok(stripped.includes('x := 1;'));
    assert.ok(stripped.includes('y := 2;'));
    assert.ok(!stripped.includes('A'));
    assert.ok(!stripped.includes('B'));
  });
});
