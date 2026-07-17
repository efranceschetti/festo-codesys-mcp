/**
 * State Machine Pattern Validator
 *
 * Validates that state machines follow the standard pattern:
 * 0=IDLE, 10-80=work states, 90=DONE, 99=ERROR
 */

import type { ValidationResult } from './types.js';
import { stripComments } from '../utils/mcp-helpers.js';

export function validateStateMachine(code: string): ValidationResult {
  const stripped = stripComments(code);

  // D5-010: accepts state machines in two forms:
  //   1. legacy `nState := <num>` (direct numeric assignment)
  //   2. enum-style `eMchState := E_MachState.IDLE` (recommended by
  //      CLAUDE.md, but not detected before — guaranteed false negatives)
  // Captures both the numeric value and the enum-member name.
  // `\w*?` lazy allows both `nState` (zero chars in the middle) and `nMchState`.
  const literalPattern = /\b[en]\w*?State\s*:=\s*(\d+)/g;
  const enumPattern    = /\b[en]\w*?State\s*:=\s*\w+\.(\w+)/g;

  const stateValues = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = literalPattern.exec(stripped)) !== null) stateValues.add(match[1]);
  while ((match = enumPattern.exec(stripped)) !== null) stateValues.add(match[1]);

  if (stateValues.size === 0) {
    return {
      valid: true,
      message: 'No state machine detected (no nState/eMchState assignments)',
      details: { skipped: true },
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  // Accepts literal "0" OR IDLE/INIT symbol (enum convention)
  const hasIdle = stateValues.has('0') || stateValues.has('IDLE');
  const hasError = stateValues.has('99') || stateValues.has('ERROR') || stateValues.has('FAULT');
  const hasDone = stateValues.has('90') || stateValues.has('DONE') || stateValues.has('COMPLETE');

  if (!hasIdle) {
    issues.push('Missing IDLE state (0 or .IDLE) — machine may not initialize correctly');
  }
  if (!hasError) {
    warnings.push('Missing ERROR state (99 or .ERROR/.FAULT) — consider adding fault handling');
  }
  if (!hasDone) {
    warnings.push('Missing DONE state (90 or .DONE/.COMPLETE) — consider adding completion state');
  }

  // Check CASE statement exists
  if (stripped.includes('CASE') && !stripped.includes('ELSE')) {
    warnings.push('CASE without ELSE — unhandled state values may cause undefined behavior');
  }

  const allMessages = [
    ...issues.map(i => `CRITICAL: ${i}`),
    ...warnings.map(w => `WARNING: ${w}`),
  ];

  // D5-010: numeric ordering failed with enum tokens (NaN). Hybrid sort:
  // numerics first asc, then symbols asc.
  const sortStates = (a: string, b: string): number => {
    const na = +a, nb = +b;
    const aNum = !isNaN(na), bNum = !isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b);
  };

  if (issues.length === 0 && warnings.length === 0) {
    return {
      valid: true,
      message: `State machine is valid. States found: ${[...stateValues].sort(sortStates).join(', ')}`,
      details: { states: [...stateValues] },
    };
  }

  return {
    valid: issues.length === 0,
    message: `State machine review (states: ${[...stateValues].sort(sortStates).join(', ')}):\n${allMessages.map(m => `- ${m}`).join('\n')}`,
    details: { states: [...stateValues], issues, warnings },
  };
}
