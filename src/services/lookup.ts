/**
 * Standard Lookup Service
 *
 * Provides lookup functions for Hungarian prefixes, type prefixes,
 * state machine states, FB interface patterns, and error codes.
 * All data loaded from JSON with embedded fallbacks.
 */

import { loadJsonData } from './data-loader.js';
import { HUNGARIAN_PREFIXES, TYPE_PREFIXES } from '../knowledge/conventions.js';

// ── Load externalized data ───────────────────────────────────────────────

interface StateMachineData {
  states: Record<string, { name: string; description: string }>;
  required: string[];
  convention: string;
}

interface FbInterfaceData {
  triggers: Record<string, { type: string; section: string; description: string }>;
  status: Record<string, { type: string; section: string; description: string }>;
  convention: string;
}

interface ErrorEntry { message: string; recovery: string }
interface ErrorCodesData {
  cia402: Record<string, ErrorEntry>;
  festo_ptp: Record<string, ErrorEntry>;
  codesys: Record<string, ErrorEntry>;
}

const STATE_MACHINE = loadJsonData<StateMachineData>('state-machine-states.json', {
  states: { '0': { name: 'IDLE', description: 'Waiting' }, '90': { name: 'DONE', description: 'Done' }, '99': { name: 'ERROR', description: 'Error' } },
  required: ['0', '90', '99'],
  convention: 'nState : INT',
});

const FB_INTERFACE = loadJsonData<FbInterfaceData>('fb-interface-patterns.json', {
  triggers: { bEnable: { type: 'BOOL', section: 'VAR_INPUT', description: 'Continuous enable' } },
  status: { bDone: { type: 'BOOL', section: 'VAR_OUTPUT', description: 'Done' } },
  convention: 'bEnable/bExecute IN → bDone/bBusy/bErr/nErrId OUT',
});

const ERROR_CODES = loadJsonData<ErrorCodesData>('festo-error-codes.json', {
  cia402: {}, festo_ptp: {}, codesys: {},
});

// ── Lookup Results ───────────────────────────────────────────────────────

export interface LookupResult {
  found: boolean;
  message: string;
  details: Record<string, unknown>;
}

// ── Lookup Functions ─────────────────────────────────────────────────────

export function lookupHungarianPrefix(typeName: string): LookupResult {
  const upper = typeName.toUpperCase();
  const prefix = HUNGARIAN_PREFIXES[upper];
  if (prefix) {
    return {
      found: true,
      message: `Type ${upper} → prefix "${prefix}"`,
      details: { type: upper, prefix },
    };
  }
  return {
    found: false,
    message: `No Hungarian prefix defined for "${typeName}". Known types: ${Object.keys(HUNGARIAN_PREFIXES).join(', ')}`,
    details: { knownTypes: Object.keys(HUNGARIAN_PREFIXES) },
  };
}

export function lookupTypePrefix(pouType: string): LookupResult {
  // Try exact match first, then lowercase
  const prefix = TYPE_PREFIXES[pouType] ?? TYPE_PREFIXES[pouType.toLowerCase()];
  if (prefix) {
    return {
      found: true,
      message: `POU type "${pouType}" → prefix "${prefix}"`,
      details: { pouType, prefix },
    };
  }
  return {
    found: false,
    message: `No prefix for POU type "${pouType}". Known: ${Object.keys(TYPE_PREFIXES).join(', ')}`,
    details: { knownTypes: Object.keys(TYPE_PREFIXES) },
  };
}

export function lookupState(stateNumber: string): LookupResult {
  const state = STATE_MACHINE.states[stateNumber];
  if (state) {
    return {
      found: true,
      message: `State ${stateNumber} = ${state.name}: ${state.description}`,
      details: { stateNumber, ...state },
    };
  }
  return {
    found: false,
    message: `State ${stateNumber} not in standard pattern. Convention: ${STATE_MACHINE.convention}`,
    details: { allStates: STATE_MACHINE.states },
  };
}

export function lookupErrorCode(code: string): LookupResult {
  const normalized = code.toLowerCase().replace('16#', '0x');
  const hexKey = normalized.startsWith('0x') ? normalized : `0x${normalized}`;
  const decKey = code.replace(/^0x|^16#/i, '');

  // Search across all error sources
  for (const [source, codes] of Object.entries(ERROR_CODES) as [string, Record<string, ErrorEntry>][]) {
    for (const [key, entry] of Object.entries(codes)) {
      if (key.toLowerCase() === hexKey || key === decKey || key === code) {
        return {
          found: true,
          message: `[${source.toUpperCase()}] ${key}: ${entry.message}`,
          details: { source, code: key, message: entry.message, recovery: entry.recovery },
        };
      }
    }
  }

  return {
    found: false,
    message: `Error code "${code}" not found in embedded database. Try explain_error_code for a deep search across all knowledge.`,
    details: { searchedSources: Object.keys(ERROR_CODES) },
  };
}

export function lookupFbInterface(): LookupResult {
  const lines: string[] = [
    `Convention: ${FB_INTERFACE.convention}\n`,
    '**Trigger Inputs (choose one):**',
  ];
  for (const [name, info] of Object.entries(FB_INTERFACE.triggers)) {
    lines.push(`- \`${name} : ${info.type}\` — ${info.description}`);
  }
  lines.push('\n**Status Outputs (all required):**');
  for (const [name, info] of Object.entries(FB_INTERFACE.status)) {
    lines.push(`- \`${name} : ${info.type}\` — ${info.description}`);
  }
  return {
    found: true,
    message: lines.join('\n'),
    details: { triggers: FB_INTERFACE.triggers, status: FB_INTERFACE.status },
  };
}

export function listStandard(): LookupResult {
  const sections: string[] = [
    '# FestoCodesysMCP Standard Reference\n',
    '## Hungarian Notation',
    '| Type | Prefix |',
    '|------|--------|',
    ...Object.entries(HUNGARIAN_PREFIXES).map(([t, p]) => `| ${t} | \`${p}\` |`),
    '\n## POU Type Prefixes',
    '| POU Type | Prefix |',
    '|----------|--------|',
    ...Object.entries(TYPE_PREFIXES).map(([t, p]) => `| ${t} | \`${p}\` |`),
    `\n## State Machine\n${STATE_MACHINE.convention}`,
    '| State | Name | Description |',
    '|-------|------|-------------|',
    ...Object.entries(STATE_MACHINE.states).map(([n, s]) => `| ${n} | ${s.name} | ${s.description} |`),
    `\n## FB Interface Pattern\n${FB_INTERFACE.convention}`,
  ];

  return {
    found: true,
    message: sections.join('\n'),
    details: {},
  };
}
