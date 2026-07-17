/**
 * Embedded knowledge: testing Structured Text without hardware — the Python
 * twin method (scan-based timers, discriminative tests, swept-AABB collision).
 */

import { loadKnowledge } from './loader.js';

export function getPlcTestingTwin(): string {
  return loadKnowledge('testing/plc-testing-twin.md');
}
