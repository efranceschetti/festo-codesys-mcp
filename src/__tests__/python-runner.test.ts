/**
 * python-runner tests.
 *
 * Exercise the path resolution helpers and the failure-fast path when the
 * interpreter or wrapper is missing. Full spawn-based tests with real Python
 * are scope of npm run python:test.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePythonInterpreter,
  resolveWrappersDir,
  runPythonWrapper,
} from '../services/python-runner.js';

describe('resolvePythonInterpreter', () => {
  const ORIGINAL = process.env.FESTO_MCP_PYTHON;
  beforeEach(() => { delete process.env.FESTO_MCP_PYTHON; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FESTO_MCP_PYTHON;
    else process.env.FESTO_MCP_PYTHON = ORIGINAL;
  });

  it('defaults to python/.venv/Scripts/python.exe on Windows', () => {
    if (process.platform !== 'win32') return; // OS-specific assertion
    const result = resolvePythonInterpreter();
    assert.ok(result.endsWith('Scripts\\python.exe') || result.endsWith('Scripts/python.exe'),
      `expected Scripts/python.exe suffix, got ${result}`);
  });

  it('opts override env', () => {
    process.env.FESTO_MCP_PYTHON = '/env/python';
    assert.equal(resolvePythonInterpreter({ pythonPath: '/opts/python' }), '/opts/python');
  });

  it('env wins over default', () => {
    process.env.FESTO_MCP_PYTHON = '/env/python';
    assert.equal(resolvePythonInterpreter(), '/env/python');
  });
});

describe('resolveWrappersDir', () => {
  const ORIGINAL = process.env.FESTO_MCP_WRAPPERS_DIR;
  beforeEach(() => { delete process.env.FESTO_MCP_WRAPPERS_DIR; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FESTO_MCP_WRAPPERS_DIR;
    else process.env.FESTO_MCP_WRAPPERS_DIR = ORIGINAL;
  });

  it('defaults to python/wrappers under repo root', () => {
    const result = resolveWrappersDir();
    assert.ok(
      result.endsWith('python\\wrappers') || result.endsWith('python/wrappers'),
      `expected python/wrappers suffix, got ${result}`,
    );
  });

  it('opts override env', () => {
    process.env.FESTO_MCP_WRAPPERS_DIR = '/env/wrap';
    assert.equal(resolveWrappersDir({ wrappersDir: '/opts/wrap' }), '/opts/wrap');
  });
});

describe('runPythonWrapper — failure paths', () => {
  it('returns SCRIPT_ERROR when interpreter missing', async () => {
    const result = await runPythonWrapper('cpx_discover', { ipAddress: '0.0.0.0' }, {
      pythonPath: '/nonexistent/python',
    });
    assert.equal(result.success, false);
    assert.ok(result.stderr.includes('SCRIPT_ERROR'));
    assert.ok(result.stderr.includes('not found'));
  });

  it('returns SCRIPT_ERROR when wrapper script missing', async () => {
    // Use the host python (resolvePythonInterpreter default) only as
    // existence check — but pass a non-existent wrappers dir.
    const result = await runPythonWrapper('no_such_wrapper', {}, {
      pythonPath: '/nonexistent/python', // also missing so we don't actually spawn
      wrappersDir: '/nonexistent/wrappers',
    });
    assert.equal(result.success, false);
    assert.ok(result.stderr.includes('SCRIPT_ERROR'));
  });
});
