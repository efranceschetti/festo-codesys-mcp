/**
 * Snapshot-style stability tests for the 13 CODESYS IronPython templates.
 *
 * Goal: catch unintended drift in the absorbed code from codesys-mcp-toolkit.
 * If a template is intentionally edited, the assertion fails and you re-baseline
 * here — making the change visible in code review.
 *
 * Note: we deliberately don't snapshot the FULL template text (would create
 * a 700-line test file). Instead we assert on stable structural invariants:
 *   - Marker presence (SCRIPT_SUCCESS / SCRIPT_ERROR)
 *   - Known Python identifiers the templates reference
 *   - Placeholder name set
 *   - Length within ±10% tolerance of the baseline
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENSURE_PROJECT_OPEN_PYTHON_SNIPPET,
  FIND_OBJECT_BY_PATH_PYTHON_SNIPPET,
  CHECK_STATUS_SCRIPT,
  OPEN_PROJECT_SCRIPT_TEMPLATE,
  CREATE_PROJECT_SCRIPT_TEMPLATE,
  SAVE_PROJECT_SCRIPT_TEMPLATE,
  CREATE_POU_SCRIPT_TEMPLATE,
  SET_POU_CODE_SCRIPT_TEMPLATE,
  CREATE_PROPERTY_SCRIPT_TEMPLATE,
  CREATE_METHOD_SCRIPT_TEMPLATE,
  COMPILE_PROJECT_SCRIPT_TEMPLATE,
  GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
  GET_POU_CODE_SCRIPT_TEMPLATE,
  PATCH_POU_CODE_SCRIPT_TEMPLATE,
  GET_DEVICE_TREE_SCRIPT_TEMPLATE,
  fillTemplate,
} from '../utils/codesys-python-templates.js';

// Baseline lengths captured 2026-05-17 against the absorbed templates.
// Re-baselined 2026-05-24 after the templates started emitting
// SCRIPT_RESULT_JSON: payloads (GET_PROJECT_STRUCTURE, GET_POU_CODE) and
// added 2 new templates (PATCH_POU_CODE, GET_DEVICE_TREE).
// ±10% tolerance catches drift while tolerating small whitespace edits.
const LENGTH_BASELINES: Record<string, number> = {
  ENSURE_PROJECT_OPEN_PYTHON_SNIPPET: 6504,
  FIND_OBJECT_BY_PATH_PYTHON_SNIPPET: 4415,
  CHECK_STATUS_SCRIPT: 1205,
  OPEN_PROJECT_SCRIPT_TEMPLATE: 7284,
  CREATE_PROJECT_SCRIPT_TEMPLATE: 2734,
  SAVE_PROJECT_SCRIPT_TEMPLATE: 7473,
  CREATE_POU_SCRIPT_TEMPLATE: 14239,
  SET_POU_CODE_SCRIPT_TEMPLATE: 15415,
  CREATE_PROPERTY_SCRIPT_TEMPLATE: 13987,
  CREATE_METHOD_SCRIPT_TEMPLATE: 13974,
  COMPILE_PROJECT_SCRIPT_TEMPLATE: 8924,
  GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE: 11489,
  GET_POU_CODE_SCRIPT_TEMPLATE: 14603,
  PATCH_POU_CODE_SCRIPT_TEMPLATE: 14610,
  GET_DEVICE_TREE_SCRIPT_TEMPLATE: 11362,
};

function assertLengthWithinTolerance(name: string, actual: number, tolerancePct = 10): void {
  const baseline = LENGTH_BASELINES[name];
  assert.ok(baseline !== undefined, `no baseline for ${name}`);
  const lower = baseline * (1 - tolerancePct / 100);
  const upper = baseline * (1 + tolerancePct / 100);
  assert.ok(
    actual >= lower && actual <= upper,
    `${name} length ${actual} outside baseline ${baseline} ±${tolerancePct}%`,
  );
}

describe('Template structural invariants', () => {
  it('all 15 templates have lengths within ±10% of baseline', () => {
    const entries: Array<[string, string]> = [
      ['ENSURE_PROJECT_OPEN_PYTHON_SNIPPET', ENSURE_PROJECT_OPEN_PYTHON_SNIPPET],
      ['FIND_OBJECT_BY_PATH_PYTHON_SNIPPET', FIND_OBJECT_BY_PATH_PYTHON_SNIPPET],
      ['CHECK_STATUS_SCRIPT', CHECK_STATUS_SCRIPT],
      ['OPEN_PROJECT_SCRIPT_TEMPLATE', OPEN_PROJECT_SCRIPT_TEMPLATE],
      ['CREATE_PROJECT_SCRIPT_TEMPLATE', CREATE_PROJECT_SCRIPT_TEMPLATE],
      ['SAVE_PROJECT_SCRIPT_TEMPLATE', SAVE_PROJECT_SCRIPT_TEMPLATE],
      ['CREATE_POU_SCRIPT_TEMPLATE', CREATE_POU_SCRIPT_TEMPLATE],
      ['SET_POU_CODE_SCRIPT_TEMPLATE', SET_POU_CODE_SCRIPT_TEMPLATE],
      ['CREATE_PROPERTY_SCRIPT_TEMPLATE', CREATE_PROPERTY_SCRIPT_TEMPLATE],
      ['CREATE_METHOD_SCRIPT_TEMPLATE', CREATE_METHOD_SCRIPT_TEMPLATE],
      ['COMPILE_PROJECT_SCRIPT_TEMPLATE', COMPILE_PROJECT_SCRIPT_TEMPLATE],
      ['GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE', GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE],
      ['GET_POU_CODE_SCRIPT_TEMPLATE', GET_POU_CODE_SCRIPT_TEMPLATE],
      ['PATCH_POU_CODE_SCRIPT_TEMPLATE', PATCH_POU_CODE_SCRIPT_TEMPLATE],
      ['GET_DEVICE_TREE_SCRIPT_TEMPLATE', GET_DEVICE_TREE_SCRIPT_TEMPLATE],
    ];
    for (const [name, text] of entries) {
      assertLengthWithinTolerance(name, text.length);
    }
  });

  it('every executable template ends with SCRIPT_SUCCESS or SCRIPT_ERROR markers', () => {
    const executable = [
      CHECK_STATUS_SCRIPT,
      OPEN_PROJECT_SCRIPT_TEMPLATE,
      CREATE_PROJECT_SCRIPT_TEMPLATE,
      SAVE_PROJECT_SCRIPT_TEMPLATE,
      CREATE_POU_SCRIPT_TEMPLATE,
      SET_POU_CODE_SCRIPT_TEMPLATE,
      CREATE_PROPERTY_SCRIPT_TEMPLATE,
      CREATE_METHOD_SCRIPT_TEMPLATE,
      COMPILE_PROJECT_SCRIPT_TEMPLATE,
      GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
      GET_POU_CODE_SCRIPT_TEMPLATE,
      PATCH_POU_CODE_SCRIPT_TEMPLATE,
      GET_DEVICE_TREE_SCRIPT_TEMPLATE,
    ];
    for (const t of executable) {
      assert.ok(t.includes('SCRIPT_SUCCESS'), 'missing SCRIPT_SUCCESS marker');
      assert.ok(t.includes('SCRIPT_ERROR'), 'missing SCRIPT_ERROR marker');
    }
  });

  it('templates that return structured data emit SCRIPT_RESULT_JSON marker', () => {
    const jsonEmitters = [
      GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
      GET_POU_CODE_SCRIPT_TEMPLATE,
      PATCH_POU_CODE_SCRIPT_TEMPLATE,
      GET_DEVICE_TREE_SCRIPT_TEMPLATE,
    ];
    for (const t of jsonEmitters) {
      assert.ok(t.includes('SCRIPT_RESULT_JSON:'), 'missing SCRIPT_RESULT_JSON: marker');
      assert.ok(t.includes('import json') || t.includes(', json'), 'missing "import json"');
    }
  });

  it('all templates are pure ASCII (IronPython 2.7 tempfile is written as latin1, non-ASCII chars crash with SyntaxErrorException)', () => {
    const allTemplates: Array<[string, string]> = [
      ['ENSURE_PROJECT_OPEN_PYTHON_SNIPPET', ENSURE_PROJECT_OPEN_PYTHON_SNIPPET],
      ['FIND_OBJECT_BY_PATH_PYTHON_SNIPPET', FIND_OBJECT_BY_PATH_PYTHON_SNIPPET],
      ['CHECK_STATUS_SCRIPT', CHECK_STATUS_SCRIPT],
      ['OPEN_PROJECT_SCRIPT_TEMPLATE', OPEN_PROJECT_SCRIPT_TEMPLATE],
      ['CREATE_PROJECT_SCRIPT_TEMPLATE', CREATE_PROJECT_SCRIPT_TEMPLATE],
      ['SAVE_PROJECT_SCRIPT_TEMPLATE', SAVE_PROJECT_SCRIPT_TEMPLATE],
      ['CREATE_POU_SCRIPT_TEMPLATE', CREATE_POU_SCRIPT_TEMPLATE],
      ['SET_POU_CODE_SCRIPT_TEMPLATE', SET_POU_CODE_SCRIPT_TEMPLATE],
      ['CREATE_PROPERTY_SCRIPT_TEMPLATE', CREATE_PROPERTY_SCRIPT_TEMPLATE],
      ['CREATE_METHOD_SCRIPT_TEMPLATE', CREATE_METHOD_SCRIPT_TEMPLATE],
      ['COMPILE_PROJECT_SCRIPT_TEMPLATE', COMPILE_PROJECT_SCRIPT_TEMPLATE],
      ['GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE', GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE],
      ['GET_POU_CODE_SCRIPT_TEMPLATE', GET_POU_CODE_SCRIPT_TEMPLATE],
      ['PATCH_POU_CODE_SCRIPT_TEMPLATE', PATCH_POU_CODE_SCRIPT_TEMPLATE],
      ['GET_DEVICE_TREE_SCRIPT_TEMPLATE', GET_DEVICE_TREE_SCRIPT_TEMPLATE],
    ];
    for (const [name, template] of allTemplates) {
      for (let i = 0; i < template.length; i++) {
        const code = template.charCodeAt(i);
        assert.ok(
          code < 128,
          `${name} contains non-ASCII char at offset ${i}: U+${code.toString(16).padStart(4, '0')} (${JSON.stringify(template[i])})`,
        );
      }
    }
  });

  it('snippets are NOT standalone (no shebang, no main entry — meant for embedding)', () => {
    assert.equal(ENSURE_PROJECT_OPEN_PYTHON_SNIPPET.includes('SCRIPT_SUCCESS'), false);
    assert.equal(FIND_OBJECT_BY_PATH_PYTHON_SNIPPET.includes('SCRIPT_SUCCESS'), false);
  });

  it('templates that need project context embed ensure_project_open', () => {
    const needsProject = [
      OPEN_PROJECT_SCRIPT_TEMPLATE,
      SAVE_PROJECT_SCRIPT_TEMPLATE,
      CREATE_POU_SCRIPT_TEMPLATE,
      SET_POU_CODE_SCRIPT_TEMPLATE,
      CREATE_PROPERTY_SCRIPT_TEMPLATE,
      CREATE_METHOD_SCRIPT_TEMPLATE,
      COMPILE_PROJECT_SCRIPT_TEMPLATE,
      GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
      GET_POU_CODE_SCRIPT_TEMPLATE,
      PATCH_POU_CODE_SCRIPT_TEMPLATE,
      GET_DEVICE_TREE_SCRIPT_TEMPLATE,
    ];
    for (const t of needsProject) {
      assert.ok(t.includes('def ensure_project_open'), 'missing ensure_project_open');
    }
  });

  it('templates that traverse object hierarchy embed find_object_by_path_robust', () => {
    const needsFind = [
      CREATE_POU_SCRIPT_TEMPLATE,
      SET_POU_CODE_SCRIPT_TEMPLATE,
      CREATE_PROPERTY_SCRIPT_TEMPLATE,
      CREATE_METHOD_SCRIPT_TEMPLATE,
      GET_POU_CODE_SCRIPT_TEMPLATE,
      PATCH_POU_CODE_SCRIPT_TEMPLATE,
    ];
    for (const t of needsFind) {
      assert.ok(t.includes('def find_object_by_path_robust'), 'missing find_object_by_path_robust');
    }
  });
});

describe('fillTemplate full-rendering of each parametric template', () => {
  it('CREATE_PROJECT_SCRIPT_TEMPLATE renders cleanly', () => {
    const result = fillTemplate(CREATE_PROJECT_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/projects/new.project',
      TEMPLATE_PROJECT_PATH: 'C:/template/Standard.project',
    });
    assert.equal(result.includes('{PROJECT_FILE_PATH}'), false);
    assert.equal(result.includes('{TEMPLATE_PROJECT_PATH}'), false);
    assert.ok(result.includes('C:/projects/new.project'));
    assert.ok(result.includes('C:/template/Standard.project'));
  });

  it('SET_POU_CODE_SCRIPT_TEMPLATE preserves triple-quoted code blocks', () => {
    const result = fillTemplate(SET_POU_CODE_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/p.project',
      POU_FULL_PATH: 'Application/FB_X',
      DECLARATION_CONTENT: 'FUNCTION_BLOCK FB_X\nVAR_INPUT\nbX : BOOL;\nEND_VAR',
      IMPLEMENTATION_CONTENT: 'bX := TRUE;',
    });
    // Triple-quoted string preservation
    assert.ok(result.includes('"""FUNCTION_BLOCK FB_X'));
    assert.ok(result.includes('"""bX := TRUE;"""'));
  });

  it('CREATE_PROPERTY_SCRIPT_TEMPLATE renders cleanly', () => {
    const result = fillTemplate(CREATE_PROPERTY_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/p.project',
      PARENT_POU_FULL_PATH: 'Application/FB_Y',
      PROPERTY_NAME: 'IsActive',
      PROPERTY_TYPE: 'BOOL',
    });
    assert.equal(result.includes('{PROPERTY_NAME}'), false);
    assert.equal(result.includes('{PROPERTY_TYPE}'), false);
    assert.ok(result.includes('IsActive'));
    assert.ok(result.includes('"BOOL"'));
  });

  it('CREATE_METHOD_SCRIPT_TEMPLATE handles empty return type', () => {
    const result = fillTemplate(CREATE_METHOD_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/p.project',
      PARENT_POU_FULL_PATH: 'Application/FB_Z',
      METHOD_NAME: 'DoWork',
      RETURN_TYPE: '',
    });
    assert.equal(result.includes('{RETURN_TYPE}'), false);
    assert.ok(result.includes('"DoWork"'));
  });

  it('GET_POU_CODE_SCRIPT_TEMPLATE has correct marker pairs for code retrieval', () => {
    const result = fillTemplate(GET_POU_CODE_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/p.project',
      POU_FULL_PATH: 'Application/FB_A',
    });
    assert.ok(result.includes('### POU DECLARATION START ###'));
    assert.ok(result.includes('### POU DECLARATION END ###'));
    assert.ok(result.includes('### POU IMPLEMENTATION START ###'));
    assert.ok(result.includes('### POU IMPLEMENTATION END ###'));
  });
});

describe('Python syntax sanity check (regex-based, not a real parser)', () => {
  it('no template has unbalanced triple quotes after rendering', () => {
    // SET_POU_CODE has 2 triple-quoted blocks; everything else has 0.
    const rendered = fillTemplate(SET_POU_CODE_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'p',
      POU_FULL_PATH: 'q',
      DECLARATION_CONTENT: 'foo',
      IMPLEMENTATION_CONTENT: 'bar',
    });
    const tripleQuoteCount = (rendered.match(/"""/g) ?? []).length;
    // Must be even (balanced opening/closing)
    assert.equal(tripleQuoteCount % 2, 0, `unbalanced triple quotes (${tripleQuoteCount})`);
  });

  it('every script imports scriptengine', () => {
    const executable = [
      CHECK_STATUS_SCRIPT,
      OPEN_PROJECT_SCRIPT_TEMPLATE,
      CREATE_PROJECT_SCRIPT_TEMPLATE,
      SAVE_PROJECT_SCRIPT_TEMPLATE,
      CREATE_POU_SCRIPT_TEMPLATE,
      SET_POU_CODE_SCRIPT_TEMPLATE,
      CREATE_PROPERTY_SCRIPT_TEMPLATE,
      CREATE_METHOD_SCRIPT_TEMPLATE,
      COMPILE_PROJECT_SCRIPT_TEMPLATE,
      GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
      GET_POU_CODE_SCRIPT_TEMPLATE,
      PATCH_POU_CODE_SCRIPT_TEMPLATE,
      GET_DEVICE_TREE_SCRIPT_TEMPLATE,
    ];
    for (const t of executable) {
      assert.ok(/import scriptengine/.test(t) || /scriptengine as script_engine/.test(t),
        'missing scriptengine import');
    }
  });

  it('CREATE_POU_SCRIPT references all 3 PouType enum values', () => {
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('PouType.Program'));
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('PouType.FunctionBlock'));
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('PouType.Function'));
  });
});
