/**
 * Path Validation Tests
 * Validates security of path traversal prevention.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, sep } from 'node:path';
import { validatePath } from '../utils/path-validation.js';

// D5-001: most legacy tests assume that absolute paths like
// `/home/user/project` are accepted (Linux semantics). On Windows and on CI
// where `process.cwd()` differs, these paths fall OUTSIDE the workspace
// and the jail rejects them. Enabling the escape hatch around the legacy tests
// preserves the intent (testing validation SEMANTICS) without disabling the jail.
const originalAllow = process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
before(() => { process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = '1'; });
after(() => {
  if (originalAllow === undefined) delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
  else process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = originalAllow;
});

describe('Path Validation — Valid Paths', () => {
  it('accepts absolute paths', () => {
    assert.equal(validatePath('/home/user/project'), null);
  });

  it('accepts relative paths without traversal', () => {
    assert.equal(validatePath('src/main.st'), null);
  });

  it('accepts paths with dots in filenames', () => {
    assert.equal(validatePath('/home/user/file.v2.0.st'), null);
  });

  it('accepts current directory', () => {
    assert.equal(validatePath('.'), null);
  });

  it('accepts paths with spaces', () => {
    assert.equal(validatePath('/home/user/my project/src'), null);
  });

  it('blocks paths that resolve to sensitive directories', () => {
    // normalize('/home/user/../../../etc/passwd') = '/etc/passwd'
    // Strengthened validation blocks access to /etc/
    const result = validatePath('/home/user/../../../etc/passwd');
    assert.ok(result !== null, 'should block path resolving to /etc/');
    assert.ok(result!.includes('/etc/'));
  });

  it('allows resolved parent paths outside sensitive dirs', () => {
    // normalize('/home/user/..') = '/home'
    assert.equal(validatePath('/home/user/..'), null);
  });
});

describe('Path Validation — Directory Traversal Attacks', () => {
  it('rejects bare ".."', () => {
    const result = validatePath('..');
    assert.ok(result !== null, 'should reject ".."');
    assert.ok(result!.includes('traversal'));
  });

  it('rejects "../" prefix (relative escape)', () => {
    const result = validatePath('../etc/passwd');
    assert.ok(result !== null, 'should reject "../etc/passwd"');
  });

  it('rejects deep relative traversal "../../.."', () => {
    const result = validatePath('../../../etc/passwd');
    assert.ok(result !== null, 'should reject deep traversal');
  });

  it('rejects null bytes', () => {
    const result = validatePath('/home/user/file\x00.st');
    assert.ok(result !== null, 'should reject null bytes');
    assert.ok(result!.includes('null bytes'));
  });

  it('rejects empty path', () => {
    const result = validatePath('');
    assert.ok(result !== null, 'should reject empty path');
  });

  it('rejects control characters', () => {
    const result = validatePath('/home/user/\x01file.st');
    assert.ok(result !== null, 'should reject control characters');
    assert.ok(result!.includes('control characters'));
  });

  it('rejects excessively long paths', () => {
    const longPath = '/home/' + 'a'.repeat(5000);
    const result = validatePath(longPath);
    assert.ok(result !== null, 'should reject path exceeding max length');
    assert.ok(result!.includes('maximum length'));
  });
});

describe('Path Validation — Sensitive Directories', () => {
  it('blocks /etc/', () => {
    const result = validatePath('/etc/shadow');
    assert.ok(result !== null);
    assert.ok(result!.includes('/etc/'));
  });

  it('blocks /proc/', () => {
    const result = validatePath('/proc/1/status');
    assert.ok(result !== null);
    assert.ok(result!.includes('/proc/'));
  });

  it('blocks /sys/', () => {
    const result = validatePath('/sys/class/net');
    assert.ok(result !== null);
  });

  it('blocks /root/.ssh/', () => {
    const result = validatePath('/root/.ssh/authorized_keys');
    assert.ok(result !== null);
  });

  it('allows /home/user/', () => {
    assert.equal(validatePath('/home/user/project'), null);
  });

  it('allows /tmp/', () => {
    assert.equal(validatePath('/tmp/plc-output'), null);
  });
});

// D5-001 regression — workspace jail rejects paths outside the CWD on Windows
// (and on any platform if the escape flag is off).
describe('Path Validation — Workspace Jail (D5-001)', () => {
  it('REJECTS path outside workspace when escape hatch off', () => {
    const original = process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    try {
      // Build an absolute path guaranteed to be outside the workspace
      const outside = sep === '\\' ? 'C:\\Windows\\Temp\\evil.st' : '/tmp/evil.st';
      const result = validatePath(outside);
      // /tmp may equal the CWD's /tmp on some systems — we only assert
      // that if it falls outside, it is rejected.
      const cwd = resolve(process.cwd());
      const abs = resolve(outside);
      if (!abs.startsWith(cwd + sep) && abs !== cwd) {
        assert.ok(result !== null, `should reject path outside workspace: ${outside}`);
        assert.ok(result!.includes('workspace'));
      }
    } finally {
      if (original !== undefined) process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = original;
    }
  });

  it('ALLOWS path inside workspace', () => {
    const original = process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    try {
      assert.equal(validatePath('src/test.st'), null);
      assert.equal(validatePath('./project'), null);
    } finally {
      if (original !== undefined) process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = original;
    }
  });

  it('escape hatch FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1 allows paths outside', () => {
    process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = '1';
    try {
      assert.equal(validatePath('/home/user/project'), null);
    } finally {
      delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    }
  });
});

// ── P2.0 regression: win32 drive-letter case must not break the jail ──
// The jail compares resolve(userPath) against resolve(process.cwd()). On
// Windows the filesystem is case-insensitive, so `D:\ws\out` and `d:\ws\out`
// are the same directory — the jail must accept both. This test runs with the
// jail ACTIVE (the file-level before() enables the escape hatch for legacy
// tests, so we disable it locally and restore afterwards).
describe('Path Validation — P2.0 win32 case-insensitive jail', () => {
  it('accepts an in-workspace path whose drive-letter case differs from cwd', (t) => {
    if (process.platform !== 'win32') {
      t.skip('windows-only semantics');
      return;
    }
    const saved = process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    try {
      const real = resolve(process.cwd(), 'subdir');
      const flipped = /^[a-z]:/.test(real)
        ? real[0].toUpperCase() + real.slice(1)
        : real[0].toLowerCase() + real.slice(1);
      assert.equal(validatePath(real), null, 'canonical-case path must be accepted');
      assert.equal(validatePath(flipped), null,
        'same path with flipped drive-letter case must also be accepted on win32');
    } finally {
      if (saved === undefined) delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
      else process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = saved;
    }
  });
});
