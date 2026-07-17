/**
 * Validation Tools — Standalone validators for PLC code conventions.
 *
 * Tool: plc_validate
 * Actions: naming, fb_interface, state_machine, batch
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateHungarianNotation, validatePouPrefix, validateNoPsnakeCase } from '../validators/naming-validator.js';
import { validateFbInterface } from '../validators/fb-interface-validator.js';
import { validateStateMachine } from '../validators/state-machine-validator.js';
import { validateBatch, getValidatorTypes } from '../validators/batch-validator.js';
import { errorResponse, structuredResponse } from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';

export function registerValidationTools(server: McpServer) {

  server.registerTool(
    'plc_validate',
    {
      title: 'PLC Code Validator',
      description: `Validate PLC code against conventions — composable validators with consistent results.
USE WHEN: you need to check ST against conventions programmatically — naming, FB interface, or state machine — without a full review.
Actions: 'naming' (check variable names + Hungarian notation), 'fb_interface' (check FB pattern),
'state_machine' (check nState pattern), 'batch' (validate multiple items at once).
Returns {valid, message, details} for each check.`,
      inputSchema: {
        action: z.enum(['naming', 'fb_interface', 'state_machine', 'batch']).describe(
          "'naming': check variable/POU naming | 'fb_interface': check FB bEnable/bDone pattern | 'state_machine': check nState 0/90/99 | 'batch': multiple validations"
        ),
        code: z.string().optional().describe('ST code to validate (for fb_interface, state_machine)'),
        varName: z.string().optional().describe('Variable name (for naming action)'),
        typeName: z.string().optional().describe('Type name like BOOL, INT, REAL (for naming action)'),
        pouName: z.string().optional().describe('POU name (for naming action with pouType)'),
        pouType: z.string().optional().describe('POU type: functionBlock, program, enum, struct (for naming action)'),
        items: z.string().optional().describe('JSON array of {type, input, extra?} for batch mode'),
      },
      outputSchema: {
        action: z.string(),
        valid: z.boolean(),
        passed: z.number(),
        failed: z.number(),
        message: z.string(),
        results: z.array(z.object({
          name: z.string(),
          valid: z.boolean(),
          message: z.string(),
          details: z.record(z.string(), z.unknown()).optional(),
        })).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ action, code, varName, typeName, pouName, pouType, items }) => {
      log('info', 'plc_validate', `action=${action}`);

      switch (action) {
        case 'naming': {
          const checks: Array<{ name: string; valid: boolean; message: string; details?: Record<string, unknown> }> = [];
          const text: string[] = [];

          if (varName && typeName) {
            const r = validateHungarianNotation(varName, typeName);
            checks.push({ name: 'hungarian', valid: r.valid, message: r.message, details: r.details });
            text.push(`**Hungarian:** ${r.valid ? '✓' : '✗'} ${r.message}`);
          }
          if (pouName && pouType) {
            const r = validatePouPrefix(pouName, pouType);
            checks.push({ name: 'pou_prefix', valid: r.valid, message: r.message, details: r.details });
            text.push(`**POU Prefix:** ${r.valid ? '✓' : '✗'} ${r.message}`);
          }
          if (varName) {
            const r = validateNoPsnakeCase(varName);
            if (!r.valid) {
              checks.push({ name: 'snake_case', valid: r.valid, message: r.message, details: r.details });
              text.push(`**snake_case:** ✗ ${r.message}`);
            }
          }
          if (checks.length === 0) {
            return errorResponse('Provide varName+typeName (Hungarian check) and/or pouName+pouType (prefix check)');
          }
          const passed = checks.filter(c => c.valid).length;
          const failed = checks.length - passed;
          const allValid = failed === 0;
          return structuredResponse(`# Naming Validation\n\n${text.join('\n\n')}`, {
            action, valid: allValid, passed, failed,
            message: `${passed}/${checks.length} checks passed`,
            results: checks,
          });
        }

        case 'fb_interface': {
          if (!code) return errorResponse('Missing "code" parameter — provide ST code to validate');
          const result = validateFbInterface(code);
          return structuredResponse(
            `# FB Interface Validation\n\n**${result.valid ? 'PASS' : 'FAIL'}**: ${result.message}`,
            { action, valid: result.valid, passed: result.valid ? 1 : 0, failed: result.valid ? 0 : 1, message: result.message, details: result.details },
          );
        }

        case 'state_machine': {
          if (!code) return errorResponse('Missing "code" parameter — provide ST code to validate');
          const result = validateStateMachine(code);
          return structuredResponse(
            `# State Machine Validation\n\n**${result.valid ? 'PASS' : 'FAIL'}**: ${result.message}`,
            { action, valid: result.valid, passed: result.valid ? 1 : 0, failed: result.valid ? 0 : 1, message: result.message, details: result.details },
          );
        }

        case 'batch': {
          if (!items) {
            return errorResponse(
              'Missing "items" — provide JSON array. Example:\n' +
              '[{"type":"hungarian","input":"myVar","extra":"BOOL"},{"type":"fb_interface","input":"FUNCTION_BLOCK FB_Test..."}]\n\n' +
              `Available types: ${getValidatorTypes().join(', ')}`
            );
          }

          let parsed: Array<{ type: string; input: string; extra?: string }>;
          try {
            parsed = JSON.parse(items);
          } catch {
            return errorResponse('Invalid JSON in "items" parameter');
          }

          const batch = validateBatch(parsed);
          const lines = [
            '# Batch Validation Results\n',
            `**Total:** ${batch.total} | **Passed:** ${batch.passed} | **Failed:** ${batch.failed}\n`,
          ];
          for (const r of batch.results) {
            lines.push(`- **[${r.type}]** \`${r.input.slice(0, 50)}\`: ${r.result.valid ? '✓' : '✗'} ${r.result.message}`);
          }
          return structuredResponse(lines.join('\n'), {
            action, valid: batch.failed === 0, passed: batch.passed, failed: batch.failed,
            message: `Batch: ${batch.passed}/${batch.total} passed`,
            results: batch.results.map(r => ({
              name: r.type,
              valid: r.result.valid,
              message: r.result.message,
              details: { input: r.input, ...r.result.details },
            })),
          });
        }
      }
    }
  );
}
