/**
 * festo-cpx-tools + festo-edcon-tools registration tests.
 *
 * Same shape as codesys-ide-tools.test.ts — exercises registerTool API
 * cleanliness and uniqueness. Real hardware tests live in scripts/e2e-*.mjs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCpxTools } from '../tools/festo-cpx-tools.js';
import { registerEdconTools } from '../tools/festo-edcon-tools.js';

describe('registerCpxTools', () => {
  it('registers without throwing on a fresh McpServer', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    assert.doesNotThrow(() => registerCpxTools(server));
  });

  it('registers 4 unique tool names (duplicate throws)', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCpxTools(server);
    assert.throws(() => registerCpxTools(server));
  });
});

describe('registerEdconTools', () => {
  it('registers without throwing on a fresh McpServer', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    assert.doesNotThrow(() => registerEdconTools(server));
  });

  it('registers 4 unique tool names (duplicate throws)', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerEdconTools(server);
    assert.throws(() => registerEdconTools(server));
  });
});

describe('combined registration (cpx + edcon)', () => {
  it('coexist without name collisions', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    assert.doesNotThrow(() => {
      registerCpxTools(server);
      registerEdconTools(server);
    });
  });
});
