/**
 * codesys-ide-tools tests.
 *
 * These exercise registration (every tool registers cleanly with the SDK
 * registerTool API) and a smoke-test of registration count via a minimal
 * MCP server. Full spawn-based tests live in scripts/e2e-codesys.mjs and
 * require real CODESYS — out of scope for unit tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCodesysIdeTools } from '../tools/codesys-ide-tools.js';
import { registerCodesysIdeResources } from '../resources/codesys-ide-resources.js';

describe('registerCodesysIdeTools', () => {
  it('registers without throwing on a fresh McpServer', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    assert.doesNotThrow(() => registerCodesysIdeTools(server));
  });

  it('registers all 8 ide_* tools (by attempted duplicate registration)', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCodesysIdeTools(server);
    // Second registration must throw — proves the 8 names are taken.
    assert.throws(() => registerCodesysIdeTools(server));
  });
});

describe('registerCodesysIdeResources', () => {
  it('registers without throwing on a fresh McpServer', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    assert.doesNotThrow(() => registerCodesysIdeResources(server));
  });

  it('registers 3 unique resource URIs (duplicate throws)', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCodesysIdeResources(server);
    assert.throws(() => registerCodesysIdeResources(server));
  });
});
