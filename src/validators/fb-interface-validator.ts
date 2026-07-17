/**
 * FB Interface Pattern Validator
 *
 * Validates that Function Blocks follow the standard interface pattern:
 * bEnable/bExecute IN → bDone/bBusy/bErr/nErrId OUT
 */

import type { ValidationResult } from './types.js';
import { stripComments } from '../utils/mcp-helpers.js';

export function validateFbInterface(code: string): ValidationResult {
  const stripped = stripComments(code);
  const issues: string[] = [];
  const found: string[] = [];

  // Only check if this is a FUNCTION_BLOCK with VAR_INPUT/VAR_OUTPUT
  if (!stripped.includes('FUNCTION_BLOCK')) {
    return {
      valid: true,
      message: 'Not a FUNCTION_BLOCK — FB interface check skipped',
      details: { skipped: true },
    };
  }

  if (!stripped.includes('VAR_INPUT') || !stripped.includes('VAR_OUTPUT')) {
    return {
      valid: true,
      message: 'FUNCTION_BLOCK without VAR_INPUT/VAR_OUTPUT — interface check skipped',
      details: { skipped: true },
    };
  }

  // D5-009: word boundary em vez de substring. Antes `nbEnableCount` casava
  // como "bEnable presente" porque a string "bEnable" aparece dentro;
  // \b rejeita esse falso positivo.
  const hasWord = (varName: string): boolean =>
    new RegExp(`\\b${varName}\\b`).test(stripped);

  // Check trigger inputs
  const hasEnable = hasWord('bEnable');
  const hasExecute = hasWord('bExecute');
  const hasTrigger = hasEnable || hasExecute;
  if (!hasTrigger) {
    issues.push('Missing trigger input: add bEnable (continuous) or bExecute (edge-triggered)');
  } else {
    found.push(hasEnable ? 'bEnable' : 'bExecute');
  }

  // Check status outputs
  const statusVars = ['bDone', 'bBusy', 'bErr', 'nErrId'];
  for (const v of statusVars) {
    if (hasWord(v)) {
      found.push(v);
    } else {
      issues.push(`Missing output: ${v}`);
    }
  }

  if (issues.length === 0) {
    return {
      valid: true,
      message: `FB interface is complete: ${found.join(', ')}`,
      details: { found },
    };
  }

  return {
    valid: false,
    message: `FB interface incomplete (${issues.length} issues):\n${issues.map(i => `- ${i}`).join('\n')}`,
    details: { issues, found },
  };
}
