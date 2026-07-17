/**
 * Festo Edcon tools (edcon_*) — wraps festo-edcon Python SDK via python-runner.
 *
 * These tools talk **directly to Festo drives (CMMT-AS/ST, EMMT-ST) via
 * PROFIDRIVE** on Modbus/TCP or EthernetIP. Bypasses the PLC.
 *
 * Use cases:
 *   - Commissioning: set Reference Offset (SDO 0x607C) without FCT tool
 *   - Standalone testing: jog/position a drive before PLC is ready
 *   - Diagnostics: read statusword/fault codes from outside the PLC
 *
 * Gating: FESTO_MCP_ENABLE_HARDWARE=1 in src/index.ts.
 *
 * Wraps the Python SDK directly: see python/wrappers/edcon_*.py.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runPythonWrapper } from '../services/python-runner.js';
import { successResponse, errorResponse, getErrorMessage } from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';

const IpString = z.string().min(7).describe('IPv4 of the drive (e.g., "192.168.0.20")');
const ProtocolEnum = z.enum(['modbus', 'ethernetip']).default('modbus');

export function registerEdconTools(server: McpServer) {

  // ── edcon_drive_control ───────────────────────────────────────────────
  server.registerTool(
    'edcon_drive_control',
    {
      title: 'Festo drive — high-level control',
      description: `Issue a CiA 402 state-machine action on a Festo drive.
Actions:
  - ack_faults        clear latched faults (no-op if none)
  - enable_powerstage drive to Operation Enabled state (drives can now move)
  - disable           drive to Switch On Disabled
  - reference         run drive-controlled homing (referencing_task)`,
      inputSchema: {
        ipAddress: IpString,
        protocol: ProtocolEnum,
        action: z.enum(['ack_faults', 'enable_powerstage', 'disable', 'reference']),
        timeoutSec: z.number().positive().max(120).optional().default(5),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ ipAddress, protocol, action, timeoutSec }) => {
      try {
        const result = await runPythonWrapper('edcon_drive_control', {
          ipAddress, protocol, action, timeoutSec,
        });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── edcon_position_task ───────────────────────────────────────────────
  server.registerTool(
    'edcon_position_task',
    {
      title: 'Festo drive — execute positioning task',
      description: `Move the drive to a target position. Drive must already be in Operation Enabled
state (call edcon_drive_control action=enable_powerstage first).`,
      inputSchema: {
        ipAddress: IpString,
        protocol: ProtocolEnum,
        position: z.number().int().describe('Target position in drive units'),
        velocity: z.number().int().positive().describe('Velocity in drive units/s'),
        absolute: z.boolean().default(true).describe('true=absolute target, false=relative distance'),
        nonblocking: z.boolean().default(false).describe('true=return immediately after starting; false=wait for completion'),
        timeoutSec: z.number().positive().max(600).optional().default(30),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ ipAddress, protocol, position, velocity, absolute, nonblocking, timeoutSec }) => {
      try {
        const result = await runPythonWrapper('edcon_position', {
          ipAddress, protocol, position, velocity, absolute, nonblocking, timeoutSec,
        }, { timeoutMs: (timeoutSec + 5) * 1000 });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── edcon_pnu_read ────────────────────────────────────────────────────
  server.registerTool(
    'edcon_pnu_read',
    {
      title: 'Festo drive — read PNU (raw SDO)',
      description: `Read a Parameter Number Unit (PROFIDRIVE PNU = CiA 402 SDO object).
Examples:
  - PNU 1124  = Firmware version (safe diagnostic)
  - PNU 24700 (0x607C) = Home Offset / Reference Offset
Returns hex-encoded bytes.`,
      inputSchema: {
        ipAddress: IpString,
        protocol: ProtocolEnum,
        pnu: z.number().int().min(0).max(0xFFFF).describe('PNU number (decimal, 0–65535)'),
        subindex: z.number().int().min(0).max(255).optional().default(0),
        numElements: z.number().int().min(1).max(8).optional().default(4).describe('Number of bytes to read'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ ipAddress, protocol, pnu, subindex, numElements }) => {
      try {
        const result = await runPythonWrapper('edcon_pnu', {
          ipAddress, protocol, operation: 'read', pnu, subindex, numElements,
        });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── edcon_pnu_write ───────────────────────────────────────────────────
  server.registerTool(
    'edcon_pnu_write',
    {
      title: 'Festo drive — write PNU (raw SDO)',
      description: `Write a Parameter Number Unit. **Destructive — modifies drive parameters.**
For Reference Offset commissioning:
  pnu=24700 (0x607C), valueHex=little-endian INT32.
Always read first with edcon_pnu_read to confirm current value before writing.`,
      inputSchema: {
        ipAddress: IpString,
        protocol: ProtocolEnum,
        pnu: z.number().int().min(0).max(0xFFFF),
        subindex: z.number().int().min(0).max(255).optional().default(0),
        numElements: z.number().int().min(1).max(8).optional().default(4),
        valueHex: z.string().regex(/^[0-9a-fA-F]+$/).describe('Hex-encoded bytes (little-endian), 2 chars per byte, no 0x prefix'),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ ipAddress, protocol, pnu, subindex, numElements, valueHex }) => {
      try {
        const result = await runPythonWrapper('edcon_pnu', {
          ipAddress, protocol, operation: 'write', pnu, subindex, numElements, valueHex,
        });
        return result.success
          ? successResponse(JSON.stringify(result.data, null, 2))
          : errorResponse(result.stderr);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  log('info', 'startup', 'Festo Edcon hardware tools registered (4 edcon_* tools)');
}
