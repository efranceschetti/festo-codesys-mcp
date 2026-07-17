/**
 * Embedded knowledge: EPLAN Platform, .NET API, Data Portal REST API.
 */

import { loadKnowledge } from './loader.js';

export function getEplanReference(): string {
  return loadKnowledge('eplan/eplan-reference.md');
}
