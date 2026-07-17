/**
 * Lookup Tools — Quick reference for PLC conventions and error codes.
 *
 * Tool: plc_lookup
 * Actions: hungarian, type_prefix, state, error_code, fb_interface, list_standard
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  lookupHungarianPrefix,
  lookupTypePrefix,
  lookupState,
  lookupErrorCode,
  lookupFbInterface,
  listStandard,
} from '../services/lookup.js';
import { errorResponse, structuredResponse } from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';

export function registerLookupTools(server: McpServer) {

  server.registerTool(
    'plc_lookup',
    {
      title: 'PLC Quick Lookup',
      description: `Quick lookup for PLC conventions and error codes — instant answers without loading full knowledge topics.
USE WHEN: you need a single fact — prefix, state number, error code — without loading a full topic. Try this BEFORE plc_knowledge for point lookups.
Actions: 'hungarian' (type→prefix), 'type_prefix' (POU→prefix), 'state' (state number→name),
'error_code' (decode Festo/CiA402/CODESYS error), 'fb_interface' (standard FB pattern), 'list_standard' (full reference).`,
      inputSchema: {
        action: z.enum(['hungarian', 'type_prefix', 'state', 'error_code', 'fb_interface', 'list_standard']).describe(
          "'hungarian': get prefix for a type | 'type_prefix': get prefix for POU type | 'state': decode state number | 'error_code': decode error | 'fb_interface': show standard FB pattern | 'list_standard': full convention reference"
        ),
        value: z.string().optional().describe('The value to look up (type name, POU type, state number, or error code)'),
      },
      outputSchema: {
        action: z.string(),
        found: z.boolean(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ action, value }) => {
      log('info', 'plc_lookup', `${action}: ${value || '(none)'}`);

      switch (action) {
        case 'hungarian': {
          if (!value) return errorResponse('Missing "value" — provide a type name (e.g., "BOOL", "DINT", "REAL")');
          const result = lookupHungarianPrefix(value);
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
        case 'type_prefix': {
          if (!value) return errorResponse('Missing "value" — provide a POU type (e.g., "functionBlock", "enum", "struct")');
          const result = lookupTypePrefix(value);
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
        case 'state': {
          if (!value) return errorResponse('Missing "value" — provide a state number (e.g., "0", "90", "99")');
          const result = lookupState(value);
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
        case 'error_code': {
          if (!value) return errorResponse('Missing "value" — provide an error code (e.g., "0x7500", "4357", "3700")');
          const result = lookupErrorCode(value);
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
        case 'fb_interface': {
          const result = lookupFbInterface();
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
        case 'list_standard': {
          const result = listStandard();
          return structuredResponse(result.message, { action, found: result.found, message: result.message, details: result.details });
        }
      }
    }
  );
}
