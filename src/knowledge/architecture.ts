/**
 * Embedded knowledge: PLC program architecture (Input-Process-Output, state
 * machines, emergent coordination) and alarm design patterns.
 */

import { loadKnowledge } from './loader.js';

export function getPlcArchitecturePatterns(): string {
  return loadKnowledge('architecture/plc-architecture-patterns.md');
}

export function getPlcAlarmPatterns(): string {
  return loadKnowledge('architecture/plc-alarm-patterns.md');
}
