/**
 * Festo CPX tools (cpx_*) — wraps festo-cpx-io Python SDK via python-runner.
 *
 * These tools talk **directly to CPX hardware via Modbus/TCP**, bypassing the
 * PLC. Useful for commissioning, I/O wiring validation, and field diagnostics.
 *
 * Gating: FESTO_MCP_ENABLE_HARDWARE=1 in src/index.ts (these tools won't
 * register otherwise — they'd report "Python interpreter not found" anyway).
 *
 * Wraps the Python SDK directly: see python/wrappers/cpx_*.py.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runPythonWrapper } from '../services/python-runner.js';
import { successResponse, errorResponse, getErrorMessage } from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';

const IpString = z.string().min(7).describe('IPv4 of the CPX device (e.g., "192.168.0.10")');

export function registerCpxTools(server: McpServer) {

  // ── cpx_discover_system ───────────────────────────────────────────────
  server.registerTool(
    'cpx_discover_system',
    {
      title: 'Discover CPX-AP modules on the network',
      description: `Connects to a CPX-AP head at <ipAddress> and lists installed modules.
Useful as a "is the bus alive?" check before deeper diagnostics.`,
      inputSchema: {
        ipAddress: IpString,
        timeoutMs: z.number().int().min(100).max(30_000).optional().default(1000),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ ipAddress, timeoutMs }) => {
      try {
        const result = await runPythonWrapper('cpx_discover', { ipAddress, timeoutMs });
        if (!result.success) return errorResponse(result.stderr);
        log('info', 'cpx_discover_system', `${ipAddress}: ${JSON.stringify(result.data).slice(0, 200)}`);
        return successResponse(JSON.stringify(result.data, null, 2));
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── cpx_read_channel ──────────────────────────────────────────────────
  server.registerTool(
    'cpx_read_channel',
    {
      title: 'Read I/O channel from CPX-AP module',
      description: 'Reads a single channel (DI/DO/AI/AO) from a module by index.',
      inputSchema: {
        ipAddress: IpString,
        moduleIndex: z.number().int().min(0).describe('Module index in the bus topology (0-based)'),
        channel: z.number().int().min(0).describe('Channel index within the module (0-based)'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ ipAddress, moduleIndex, channel }) => {
      try {
        const result = await runPythonWrapper('cpx_read_channel', { ipAddress, moduleIndex, channel });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── cpx_write_channel ─────────────────────────────────────────────────
  server.registerTool(
    'cpx_write_channel',
    {
      title: 'Write I/O channel on CPX-AP module',
      description: `Writes a value to a channel (DO/AO) on a module.
Bypasses the PLC — for bench commissioning only. Will fail if a PLC has the bus locked.`,
      inputSchema: {
        ipAddress: IpString,
        moduleIndex: z.number().int().min(0),
        channel: z.number().int().min(0),
        value: z.union([z.boolean(), z.number(), z.string()]).describe('Channel value (BOOL true/false, INT, or REAL as appropriate)'),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ ipAddress, moduleIndex, channel, value }) => {
      try {
        const result = await runPythonWrapper('cpx_write_channel', { ipAddress, moduleIndex, channel, value });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── cpx_system_state ──────────────────────────────────────────────────
  server.registerTool(
    'cpx_system_state',
    {
      title: 'Full CPX-AP system snapshot',
      description: 'Dumps modules + all channel values. Heavier than discover_system — use sparingly.',
      inputSchema: {
        ipAddress: IpString,
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ ipAddress }) => {
      try {
        const result = await runPythonWrapper('cpx_system_state', { ipAddress });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  log('info', 'startup', 'CPX hardware tools registered (4 cpx_* tools)');
}
