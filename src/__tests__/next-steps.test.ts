/**
 * Next-Step Hints Tests
 *
 * Guards the NEXT_STEPS map + appendNextStep helper (src/utils/next-steps.ts):
 *  - every hint references only tools that actually exist in the server,
 *  - a hint is only appended for keys that exist (unknown key => text intact),
 *  - the appended block uses the "Next:" marker the server instructions promise.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NEXT_STEPS, appendNextStep } from '../utils/next-steps.js';

// The complete set of tool names registered by the server (18 core tools).
// Hints must never point the agent at a tool that does not exist.
const KNOWN_TOOLS = new Set([
  'plc_lookup',
  'plc_knowledge',
  'plc_library',
  'plc_validate',
  'create_function_block',
  'create_program',
  'create_data_type',
  'create_gvl',
  'create_project_structure',
  'generate_plcopen_xml',
  'validate_plcopen_xml',
  'validate_plcopen_xsd',
  'validate_plcopen_semantic',
  'debug_plc_code',
  'review_st_code',
  'explain_error_code',
  'st_symbols',
  'st_find_references',
]);

// Underscore-joined tokens that legitimately appear in hint prose but are NOT
// tool names (attributes, tool *actions*). Everything else that looks like a
// tool name must resolve against KNOWN_TOOLS.
const NON_TOOL_TOKENS = new Set([
  'qualified_only', // {attribute 'qualified_only'}
  'read_manual',    // plc_knowledge action
  'error_code',     // plc_lookup action
]);

/** Extract lower-case snake_case tokens (candidate tool references). */
function toolLikeTokens(text: string): string[] {
  return text.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? [];
}

describe('NEXT_STEPS map', () => {
  it('is non-empty', () => {
    assert.ok(Object.keys(NEXT_STEPS).length > 0);
  });

  it('every hint references only existing tools', () => {
    for (const [key, hint] of Object.entries(NEXT_STEPS)) {
      for (const token of toolLikeTokens(hint)) {
        if (NON_TOOL_TOKENS.has(token)) continue;
        assert.ok(
          KNOWN_TOOLS.has(token),
          `hint "${key}" references unknown tool-like token "${token}"`,
        );
      }
    }
  });

  it('every hint is a single non-empty line', () => {
    for (const [key, hint] of Object.entries(NEXT_STEPS)) {
      assert.ok(hint.length > 0, `hint "${key}" is empty`);
      assert.ok(!hint.includes('\n'), `hint "${key}" spans multiple lines`);
    }
  });

  it('keys use tool-name or tool-name:variant form', () => {
    for (const key of Object.keys(NEXT_STEPS)) {
      const tool = key.split(':')[0];
      assert.ok(KNOWN_TOOLS.has(tool), `key "${key}" is not keyed on a real tool`);
    }
  });
});

describe('appendNextStep', () => {
  it('appends a "Next:" block for a known key', () => {
    const out = appendNextStep('BODY', 'create_function_block');
    assert.notEqual(out, 'BODY');
    assert.ok(out.startsWith('BODY'));
    assert.ok(out.includes('\nNext: '));
    // create_function_block must steer the agent to review_st_code.
    assert.ok(out.includes('review_st_code'));
  });

  it('returns the text unchanged for an unknown key', () => {
    assert.equal(appendNextStep('BODY', 'no_such_tool'), 'BODY');
    assert.equal(appendNextStep('BODY', 'plc_knowledge:festo-ptp'), 'BODY');
  });

  it('does not mutate the original text content', () => {
    const original = 'Created FB_Test';
    const out = appendNextStep(original, 'create_function_block');
    assert.ok(out.startsWith(original));
  });
});
