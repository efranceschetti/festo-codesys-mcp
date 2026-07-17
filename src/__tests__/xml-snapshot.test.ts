/**
 * PLCopen XML Snapshot Tests
 *
 * The xml-builder is already covered functionally by xml-builder.test.ts
 * and validators.test.ts. This file pins the *exact byte layout* of the
 * generated XML for canonical inputs so that subtle structural drifts
 * (attribute order, whitespace, nesting) — which CODESYS may accept but
 * other importers reject — surface immediately in CI rather than at
 * import-time on the customer machine.
 *
 * Update fixtures intentionally with `UPDATE_SNAPSHOTS=1 npm test`.
 * Without that flag, a mismatch fails the test.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { buildPouXml, type PouDefinition } from '../utils/xml-builder.js';

// Fixtures live in src/__tests__/fixtures/xml/ (versioned). At runtime
// the compiled test runs from build/__tests__/, so resolve relative to
// process.cwd() which is the repo root when invoked via `npm test`.
const FIXTURES_DIR = join(process.cwd(), 'src', '__tests__', 'fixtures', 'xml');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

/**
 * Strip the timestamp embedded by getDateTime() in the generator —
 * `<contentHeader ... modificationDateTime="2026-05-09T12:34:56" ...>` —
 * so snapshots are deterministic across runs. We only normalize the
 * date attribute; everything else must match byte-for-byte.
 */
function normalizeTimestamps(xml: string): string {
  return xml
    .replace(/(creation|modification)DateTime="[^"]+"/g, '$1DateTime="<NORMALIZED>"')
    .replace(/(?<!ation)\bdateTime="[^"]+"/g, 'dateTime="<NORMALIZED>"')
    .replace(/<created>[^<]+<\/created>/g, '<created><NORMALIZED></created>');
}

async function loadOrSeed(fixturePath: string, fresh: string): Promise<string> {
  try {
    await access(fixturePath);
  } catch {
    await mkdir(dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, fresh, 'utf-8');
    return fresh;
  }
  if (UPDATE) {
    await writeFile(fixturePath, fresh, 'utf-8');
    return fresh;
  }
  // EOL-agnostic: the generator emits LF; on a Windows checkout (autocrlf) the
  // versioned fixture comes back from disk as CRLF. Normalize so the snapshot pins
  // layout/structure (attribute order, spaces, nesting) — not the end-of-line
  // policy, which is the responsibility of .gitattributes. On CI Ubuntu (LF) it is a no-op.
  return (await readFile(fixturePath, 'utf-8')).replace(/\r\n/g, '\n');
}

describe('XML Snapshot — canonical PLCopen output stability', () => {
  before(async () => {
    await mkdir(FIXTURES_DIR, { recursive: true });
  });

  it('FB simple — single bool input/output, body assigns input to output', async () => {
    const pou: PouDefinition = {
      name: 'FB_Simple',
      pouType: 'functionBlock',
      inputVars: [{ name: 'bEnable', type: 'BOOL', comment: 'Enable command' }],
      outputVars: [{ name: 'bDone', type: 'BOOL', comment: 'Done flag' }],
      body: 'bDone := bEnable;',
    };
    const fresh = normalizeTimestamps(buildPouXml(pou));
    const expected = await loadOrSeed(join(FIXTURES_DIR, 'fb-simple.xml'), fresh);
    assert.equal(fresh, expected);
  });

  it('FB with state machine — full Hungarian + IDLE/WORKING/DONE/ERROR', async () => {
    const pou: PouDefinition = {
      name: 'FB_StateMachine',
      pouType: 'functionBlock',
      inputVars: [
        { name: 'bExecute', type: 'BOOL', comment: 'Rising edge starts cycle' },
        { name: 'tTimeout', type: 'TIME', initialValue: 'T#5s', comment: 'Operation timeout' },
      ],
      outputVars: [
        { name: 'bDone', type: 'BOOL', comment: 'Cycle complete' },
        { name: 'bBusy', type: 'BOOL', comment: 'Cycle in progress' },
        { name: 'bErr', type: 'BOOL', comment: 'Cycle errored' },
        { name: 'nErrId', type: 'INT', comment: 'Error ID' },
      ],
      localVars: [
        { name: 'nState', type: 'INT', initialValue: '0', comment: 'State machine pointer' },
        { name: 'fbTimer', type: 'TON', comment: 'Timeout watchdog' },
      ],
      body: [
        'CASE nState OF',
        '    0: (* IDLE *)',
        '        IF bExecute THEN',
        '            nState := 10;',
        '        END_IF',
        '    10: (* WORKING *)',
        '        bBusy := TRUE;',
        '        fbTimer(IN := TRUE, PT := tTimeout);',
        '        IF fbTimer.Q THEN',
        '            nState := 99;',
        '            nErrId := 100;',
        '        END_IF',
        '    90: (* DONE *)',
        '        bDone := TRUE;',
        '        bBusy := FALSE;',
        '    99: (* ERROR *)',
        '        bErr := TRUE;',
        '        bBusy := FALSE;',
        'END_CASE',
      ].join('\n'),
    };
    const fresh = normalizeTimestamps(buildPouXml(pou));
    const expected = await loadOrSeed(join(FIXTURES_DIR, 'fb-state-machine.xml'), fresh);
    assert.equal(fresh, expected);
  });

  it('PRG — cyclic program with FB instance call', async () => {
    const pou: PouDefinition = {
      name: 'PRG_Main',
      pouType: 'program',
      localVars: [
        { name: 'fbWorker', type: 'FB_StateMachine', comment: 'Cycle worker' },
        { name: 'bStart', type: 'BOOL', comment: 'Operator start button' },
      ],
      body: [
        'fbWorker(',
        '    bExecute := bStart,',
        ');',
        '',
        'IF fbWorker.bDone THEN',
        '    bStart := FALSE;',
        'END_IF',
      ].join('\n'),
    };
    const fresh = normalizeTimestamps(buildPouXml(pou));
    const expected = await loadOrSeed(join(FIXTURES_DIR, 'prg-cyclic.xml'), fresh);
    assert.equal(fresh, expected);
  });
});
