/**
 * codesys-interop tests.
 *
 * No real CODESYS spawn — these exercise the resolver helpers + the
 * fillTemplate substitution. Spawn-mock tests against the full pipeline are
 * deferred (would require a deeper child_process shim than node:test offers
 * out of the box).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodesysPath,
  resolveCodesysProfile,
} from '../services/codesys-interop.js';
import {
  fillTemplate,
  CREATE_POU_SCRIPT_TEMPLATE,
  OPEN_PROJECT_SCRIPT_TEMPLATE,
  SET_POU_CODE_SCRIPT_TEMPLATE,
  CHECK_STATUS_SCRIPT,
} from '../utils/codesys-python-templates.js';

describe('resolveCodesysPath', () => {
  const ORIGINAL = process.env.FESTO_MCP_CODESYS_PATH;
  beforeEach(() => { delete process.env.FESTO_MCP_CODESYS_PATH; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FESTO_MCP_CODESYS_PATH;
    else process.env.FESTO_MCP_CODESYS_PATH = ORIGINAL;
  });

  it('returns null when env and opts both empty', () => {
    assert.equal(resolveCodesysPath(), null);
  });

  it('returns null when path does not exist on disk', () => {
    process.env.FESTO_MCP_CODESYS_PATH = 'C:/nonexistent/CODESYS.exe';
    assert.equal(resolveCodesysPath(), null);
  });

  it('opts override env', () => {
    process.env.FESTO_MCP_CODESYS_PATH = 'C:/env/CODESYS.exe';
    // The path doesn't exist on disk so this still resolves null,
    // but the override path is what got checked.
    assert.equal(resolveCodesysPath({ codesysPath: 'C:/opts/CODESYS.exe' }), null);
  });
});

describe('resolveCodesysProfile', () => {
  const ORIGINAL = process.env.FESTO_MCP_CODESYS_PROFILE;
  beforeEach(() => { delete process.env.FESTO_MCP_CODESYS_PROFILE; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FESTO_MCP_CODESYS_PROFILE;
    else process.env.FESTO_MCP_CODESYS_PROFILE = ORIGINAL;
  });

  it('returns null when not configured', () => {
    assert.equal(resolveCodesysProfile(), null);
  });

  it('reads env var', () => {
    process.env.FESTO_MCP_CODESYS_PROFILE = 'CODESYS V3.5 SP20 Patch 6';
    assert.equal(resolveCodesysProfile(), 'CODESYS V3.5 SP20 Patch 6');
  });

  it('opts override env', () => {
    process.env.FESTO_MCP_CODESYS_PROFILE = 'env-profile';
    assert.equal(
      resolveCodesysProfile({ codesysProfile: 'opts-profile' }),
      'opts-profile',
    );
  });
});

describe('fillTemplate', () => {
  it('replaces a single placeholder', () => {
    const result = fillTemplate('hello {NAME}!', { NAME: 'world' });
    assert.equal(result, 'hello world!');
  });

  it('replaces multiple distinct placeholders', () => {
    const result = fillTemplate('{A} and {B} and {A} again', { A: 'x', B: 'y' });
    assert.equal(result, 'x and y and x again');
  });

  it('leaves unknown placeholders untouched', () => {
    const result = fillTemplate('keep {UNKNOWN}', { OTHER: 'z' });
    assert.equal(result, 'keep {UNKNOWN}');
  });

  it('handles empty replacement values', () => {
    const result = fillTemplate('{X}y{X}', { X: '' });
    assert.equal(result, 'y');
  });
});

describe('CODESYS Python templates', () => {
  it('CHECK_STATUS_SCRIPT contains success and error markers', () => {
    assert.ok(CHECK_STATUS_SCRIPT.includes('SCRIPT_SUCCESS'));
    assert.ok(CHECK_STATUS_SCRIPT.includes('SCRIPT_ERROR'));
  });

  it('CHECK_STATUS_SCRIPT references scriptengine.projects.primary', () => {
    assert.ok(CHECK_STATUS_SCRIPT.includes('script_engine.projects.primary'));
  });

  it('OPEN_PROJECT_SCRIPT_TEMPLATE inlines ensure_project_open function', () => {
    assert.ok(OPEN_PROJECT_SCRIPT_TEMPLATE.includes('def ensure_project_open'));
  });

  it('OPEN_PROJECT_SCRIPT_TEMPLATE has PROJECT_FILE_PATH placeholder', () => {
    assert.ok(OPEN_PROJECT_SCRIPT_TEMPLATE.includes('{PROJECT_FILE_PATH}'));
  });

  it('CREATE_POU_SCRIPT_TEMPLATE has all expected placeholders', () => {
    const expected = ['{POU_NAME}', '{POU_TYPE_STR}', '{IMPL_LANGUAGE_STR}', '{PARENT_PATH}', '{PROJECT_FILE_PATH}'];
    for (const ph of expected) {
      assert.ok(
        CREATE_POU_SCRIPT_TEMPLATE.includes(ph),
        `expected placeholder ${ph} in CREATE_POU_SCRIPT_TEMPLATE`,
      );
    }
  });

  it('CREATE_POU_SCRIPT_TEMPLATE references PouType enum', () => {
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('script_engine.PouType.Program'));
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('script_engine.PouType.FunctionBlock'));
    assert.ok(CREATE_POU_SCRIPT_TEMPLATE.includes('script_engine.PouType.Function'));
  });

  it('SET_POU_CODE_SCRIPT_TEMPLATE has triple-quoted code placeholders', () => {
    assert.ok(SET_POU_CODE_SCRIPT_TEMPLATE.includes('"""{DECLARATION_CONTENT}"""'));
    assert.ok(SET_POU_CODE_SCRIPT_TEMPLATE.includes('"""{IMPLEMENTATION_CONTENT}"""'));
  });

  it('fillTemplate produces a script without remaining placeholders for create_pou', () => {
    const result = fillTemplate(CREATE_POU_SCRIPT_TEMPLATE, {
      PROJECT_FILE_PATH: 'C:/projects/test.project',
      POU_NAME: 'FB_Test',
      POU_TYPE_STR: 'FunctionBlock',
      IMPL_LANGUAGE_STR: 'ST',
      PARENT_PATH: 'Application',
    });
    // No leftover {X} tokens of the known set
    assert.equal(result.includes('{POU_NAME}'), false);
    assert.equal(result.includes('{POU_TYPE_STR}'), false);
    assert.equal(result.includes('{IMPL_LANGUAGE_STR}'), false);
    assert.equal(result.includes('{PARENT_PATH}'), false);
    assert.equal(result.includes('{PROJECT_FILE_PATH}'), false);
    // And actual values present
    assert.ok(result.includes('FB_Test'));
    assert.ok(result.includes('FunctionBlock'));
    assert.ok(result.includes('C:/projects/test.project'));
  });
});
