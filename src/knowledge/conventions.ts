/**
 * Embedded knowledge: Naming conventions, Hungarian notation, abbreviations.
 * This is the authoritative source for all naming rules.
 */

import { loadKnowledge } from './loader.js';

export function getNamingConventions(): string {
  return loadKnowledge('conventions/naming-conventions.md');
}

export function getAbbreviationDictionary(): string {
  return loadKnowledge('conventions/abbreviation-dictionary.md');
}

export function getStateMachinePatterns(): string {
  return loadKnowledge('conventions/state-machine-patterns.md');
}

export function getHungarianNotation(): string {
  return loadKnowledge('conventions/hungarian-notation.md');
}

export function getEngineeringDiscipline(): string {
  return loadKnowledge('conventions/engineering-discipline.md');
}

// Inline quick-reference for tools that need it
export const HUNGARIAN_PREFIXES: Record<string, string> = {
  'BOOL': 'b',
  'INT': 'n', 'DINT': 'n', 'SINT': 'n', 'LINT': 'n',
  'UINT': 'u', 'UDINT': 'u', 'USINT': 'u', 'ULINT': 'u',
  'REAL': 'r', 'LREAL': 'r',
  'WORD': 'w', 'DWORD': 'dw', 'LWORD': 'lw',
  'BYTE': 'by',
  'TIME': 't', 'LTIME': 't',
  'STRING': 's', 'WSTRING': 'ws',
};

export const TYPE_PREFIXES: Record<string, string> = {
  'functionBlock': 'FB_',
  'program': 'PRG_',
  'function': 'FC_',
  'enum': 'E_',
  'struct': 'ST_',
  'interface': 'I_',
  'gvl': 'GVL_',
};
