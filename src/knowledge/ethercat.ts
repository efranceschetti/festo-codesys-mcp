/**
 * Embedded knowledge: EtherCAT CiA 402.
 */

import { loadKnowledge } from './loader.js';

export function getCia402Reference(): string {
  return loadKnowledge('ethercat/cia402-reference.md');
}
