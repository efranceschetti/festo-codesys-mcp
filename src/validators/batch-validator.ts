/**
 * Batch Validator
 *
 * Runs multiple validators in a single call with aggregate results.
 * Pattern ported from EplanMCP validators.py validate_batch().
 */

import type { ValidationResult, BatchValidationResult } from './types.js';
import { validateHungarianNotation, validatePouPrefix, validateNoPsnakeCase } from './naming-validator.js';
import { validateFbInterface } from './fb-interface-validator.js';
import { validateStateMachine } from './state-machine-validator.js';

type ValidatorFn = (input: string, extra?: string) => ValidationResult;

const VALIDATORS: Record<string, ValidatorFn> = {
  'hungarian': (input, extra) => validateHungarianNotation(input, extra ?? 'BOOL'),
  'pou_prefix': (input, extra) => validatePouPrefix(input, extra ?? 'functionBlock'),
  'snake_case': (input) => validateNoPsnakeCase(input),
  'fb_interface': (input) => validateFbInterface(input),
  'state_machine': (input) => validateStateMachine(input),
};

export function getValidatorTypes(): string[] {
  return Object.keys(VALIDATORS);
}

export function validateBatch(
  items: Array<{ type: string; input: string; extra?: string }>
): BatchValidationResult {
  const results: BatchValidationResult['results'] = [];
  let passed = 0;
  let failed = 0;

  for (const item of items) {
    // Addresses P1 prototype pollution: VALIDATORS[item.type] with item.type === '__proto__'
    // would return Object.prototype (truthy but non-callable), pass through `!validator`
    // and crash the Node process at `validator(...)`.
    const validator = Object.hasOwn(VALIDATORS, item.type) ? VALIDATORS[item.type] : undefined;
    if (!validator) {
      results.push({
        type: item.type,
        input: item.input,
        result: {
          valid: false,
          message: `Unknown validator type "${item.type}". Available: ${Object.keys(VALIDATORS).join(', ')}`,
          details: {},
        },
      });
      failed++;
      continue;
    }

    const result = validator(item.input, item.extra);
    results.push({ type: item.type, input: item.input, result });
    if (result.valid) passed++;
    else failed++;
  }

  return { total: items.length, passed, failed, results };
}
