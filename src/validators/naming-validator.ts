/**
 * Naming Convention Validators
 *
 * Validates Hungarian notation, POU prefixes, and snake_case detection.
 */

import type { ValidationResult } from './types.js';
import { HUNGARIAN_PREFIXES, TYPE_PREFIXES } from '../knowledge/conventions.js';

/**
 * Validate a variable name against Hungarian notation rules.
 * Returns valid=true if the prefix matches the type.
 */
export function validateHungarianNotation(varName: string, typeName: string): ValidationResult {
  const upper = typeName.toUpperCase();
  const expected = HUNGARIAN_PREFIXES[upper];

  if (!expected) {
    return {
      valid: true,
      message: `Type "${typeName}" has no Hungarian prefix rule — custom/derived types are exempt`,
      details: { varName, typeName, exempt: true },
    };
  }

  if (varName.startsWith(expected)) {
    return {
      valid: true,
      message: `"${varName}" correctly uses prefix "${expected}" for ${upper}`,
      details: { varName, typeName: upper, prefix: expected },
    };
  }

  const suggestion = `${expected}${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
  return {
    valid: false,
    message: `"${varName}" (${upper}) should start with "${expected}" → suggested: "${suggestion}"`,
    details: { varName, typeName: upper, expectedPrefix: expected, suggestion },
  };
}

/**
 * Validate a POU name has the correct prefix for its type.
 *
 * D5-011: case-insensitive lookup + tolerant of separators. Previously
 * `validatePouPrefix('FB','FunctionBlock')` silently returned
 * `valid:true` with the message "no prefix rule" — the validator swallowed
 * legitimate user variants.
 */
export function validatePouPrefix(pouName: string, pouType: string): ValidationResult {
  // Try exact → camelCase normalized → snake_case stripped → lowercase
  const candidates = new Set<string>();
  candidates.add(pouType);
  candidates.add(pouType.toLowerCase());
  // Remove _ and -, lower case (function_block / Function-Block / FUNCTIONBLOCK → functionblock)
  const stripped = pouType.replace(/[_-]/g, '').toLowerCase();
  candidates.add(stripped);
  // Match against dict keys normalized the same way
  let expected: string | undefined;
  for (const c of candidates) {
    if (TYPE_PREFIXES[c]) { expected = TYPE_PREFIXES[c]; break; }
  }
  if (!expected) {
    for (const [key, val] of Object.entries(TYPE_PREFIXES)) {
      if (key.toLowerCase() === stripped) { expected = val; break; }
    }
  }

  if (!expected) {
    return {
      valid: false,
      message: `Unknown POU type "${pouType}". Expected one of: ${Object.keys(TYPE_PREFIXES).join(', ')}`,
      details: { pouName, pouType, available: Object.keys(TYPE_PREFIXES) },
    };
  }

  if (pouName.startsWith(expected)) {
    return {
      valid: true,
      message: `"${pouName}" correctly uses prefix "${expected}" for ${pouType}`,
      details: { pouName, pouType, prefix: expected },
    };
  }

  return {
    valid: false,
    message: `"${pouName}" should start with "${expected}" for ${pouType} → suggested: "${expected}${pouName}"`,
    details: { pouName, pouType, expectedPrefix: expected, suggestion: `${expected}${pouName}` },
  };
}

/**
 * Detect snake_case names that should be PascalCase.
 * Excludes known prefixes (FB_, PRG_, etc.) which use underscores legitimately.
 */
export function validateNoPsnakeCase(name: string): ValidationResult {
  const knownPrefixes = /^(FB_|PRG_|E_|ST_|GVL_|FC_|I_|VAR_|END_)/;
  if (knownPrefixes.test(name)) {
    return {
      valid: true,
      message: `"${name}" uses a standard prefix — underscore is correct`,
      details: { name, hasStandardPrefix: true },
    };
  }

  if (name.includes('_')) {
    return {
      valid: false,
      message: `"${name}" uses snake_case — must be PascalCase (e.g., "${toPascalCase(name)}")`,
      details: { name, suggestion: toPascalCase(name) },
    };
  }

  return {
    valid: true,
    message: `"${name}" does not use snake_case`,
    details: { name },
  };
}

function toPascalCase(snake: string): string {
  return snake
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}
