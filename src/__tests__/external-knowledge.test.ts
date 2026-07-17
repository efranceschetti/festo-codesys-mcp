/**
 * External knowledge regression tests — gated content extracted into
 * knowledge/external/festo-private/.
 *
 * These tests validate the integration between the extraction scripts
 * (scripts/parse-codesys-errors-ini.mjs, parse-devdesc-xml.mjs,
 * parse-esi-cia402.mjs, extract-chm.mjs) and the BM25 knowledge indexer.
 *
 * Tests are CONDITIONAL: they skip when the extracted gated content is
 * not present (e.g. CI Ubuntu, fresh checkout). They only run on machines
 * where the user has run the extraction pipeline locally.
 *
 * Why: the extracted content lives in knowledge/external/ which is
 * gitignored (Festo customer-portal license — not redistributable). So
 * CI never has it, but local dev machines that ran the pipeline do.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { listManuals, searchManuals } from '../knowledge/manuals.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const EXTERNAL_DIR = join(REPO_ROOT, 'knowledge/external/festo-private');
const HAS_EXTERNAL = existsSync(EXTERNAL_DIR);

describe('External knowledge — gated extraction integration', () => {
  it('skips entire suite when gated content is absent (CI / fresh clone)', () => {
    if (!HAS_EXTERNAL) {
      // Documents the skip — does not fail
      assert.ok(true, 'knowledge/external/ not present — extraction not run locally');
    } else {
      assert.ok(HAS_EXTERNAL, 'knowledge/external/ found, suite will run');
    }
  });

  it('codesys-runtime-errors.md exists and contains canonical RTSEXCPT entries', { skip: !HAS_EXTERNAL }, () => {
    const file = join(EXTERNAL_DIR, 'codesys-runtime-errors.md');
    assert.ok(existsSync(file), 'codesys-runtime-errors.md should exist after running parse-codesys-errors-ini.mjs');

    const content = readFileSync(file, 'utf8');

    // Ground truth from errors.ini canonical entries
    const groundTruth = [
      { code: '0x00000016', symbol: 'RTSEXCPT_CYCLE_TIME_EXCEED', message: 'Cycletime exceeded' },
      { code: '0x00000010', symbol: 'RTSEXCPT_WATCHDOG', message: 'Watchdog expired' },
      { code: '0x00000011', symbol: 'RTSEXCPT_HARDWAREWATCHDOG', message: 'Hardware watchdog expired' },
      { code: '0x00000014', symbol: 'RTSEXCPT_FIELDBUS_ERROR', message: 'Field bus error' },
      { code: '0x00000401', symbol: 'RTSEXCPT_CBUS_ERROR', message: 'Unable to initialize CPX' },
    ];

    for (const gt of groundTruth) {
      assert.ok(content.includes(gt.code), `should contain hex code ${gt.code}`);
      assert.ok(content.includes(gt.symbol), `should contain symbol ${gt.symbol}`);
      assert.ok(content.includes(gt.message), `should contain message "${gt.message}"`);
    }
  });

  it('codesys-runtime-errors.md uses canonical frontmatter convention', { skip: !HAS_EXTERNAL }, () => {
    const file = join(EXTERNAL_DIR, 'codesys-runtime-errors.md');
    const content = readFileSync(file, 'utf8');
    const fm = content.split('---')[1] ?? '';
    // Required fields per knowledge/manuals convention
    assert.match(fm, /id:\s*codesys-runtime-errors/, 'has id');
    assert.match(fm, /title:/, 'has title');
    assert.match(fm, /priority:\s*HIGH/, 'has priority HIGH');
    assert.match(fm, /use_when:/, 'has use_when');
    assert.match(fm, /never_use_when:/, 'has never_use_when');
    assert.match(fm, /keywords:/, 'has keywords');
  });

  it('CMMT-AS-MP-S1 CiA 402 dict — has communication area objects', { skip: !HAS_EXTERNAL }, () => {
    const file = join(EXTERNAL_DIR, 'cmmt-as-mp-s1-cia402-dict.md');
    if (!existsSync(file)) {
      // OK to skip if the user ran only parse-codesys-errors-ini.mjs (did not run parse-esi-cia402.mjs)
      return;
    }
    const content = readFileSync(file, 'utf8');
    // Mandatory CiA 402 / CoE objects that EVERY drive must expose
    const required = ['0x1000', '0x1001', '0x1018', '0x6040', '0x6041', '0x6060', '0x6061'];
    for (const idx of required) {
      assert.ok(content.includes(idx), `should contain mandatory object index ${idx}`);
    }
  });

  it('festo-devices-extracted.md — has at least CMMP-AS, CMMD-AS, CMMT families', { skip: !HAS_EXTERNAL }, () => {
    const file = join(EXTERNAL_DIR, 'festo-devices-extracted.md');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf8');
    assert.ok(content.includes('CMMP-AS'), 'has CMMP-AS family');
    assert.ok(content.includes('CMMD-AS'), 'has CMMD-AS family');
    assert.ok(content.includes('CMMT'), 'has CMMT family');
    assert.ok(/Vendor:Product Id|Id/i.test(content), 'has identification table');
  });

  it('extracted markdown is BM25-indexable (no malformed frontmatter)', { skip: !HAS_EXTERNAL }, () => {
    const file = join(EXTERNAL_DIR, 'codesys-runtime-errors.md');
    const content = readFileSync(file, 'utf8');
    // Frontmatter must start and end with --- on the first line and
    // before the content. The indexer parses only the first 4096 bytes.
    assert.ok(content.startsWith('---\n'), 'frontmatter starts with ---');
    const closingDash = content.indexOf('\n---', 4);
    assert.ok(closingDash > 0 && closingDash < 2048, 'frontmatter closes within 2KB');
  });

  // Bug A2/A3 regression — listManuals + searchManuals must walk recursively
  // into knowledge/external/festo-private/, not only flat in knowledge/manuals/.
  it('listManuals walks recursive into knowledge/external/ (Bug A3)', { skip: !HAS_EXTERNAL }, async () => {
    const manuals = await listManuals();
    const externalEntries = manuals.filter((m) => m.filename.includes('festo-private'));
    assert.ok(externalEntries.length > 0, 'should find at least one entry under festo-private/');
    // At least the core ones: codesys-runtime-errors + at least one cia402-dict
    assert.ok(
      externalEntries.some((m) => m.filename.includes('codesys-runtime-errors')),
      'should include codesys-runtime-errors.md',
    );
    assert.ok(
      externalEntries.some((m) => m.filename.includes('cia402-dict')),
      'should include at least one cia402-dict.md (CMMT-AS / CMMT-ST / EMCA / MP-S1 / MP-S3)',
    );
  });

  it('searchManuals finds RTSEXCPT entries from codesys-runtime-errors.md (Bug A2)', { skip: !HAS_EXTERNAL }, async () => {
    const result = await searchManuals('0x00000016');
    assert.ok(!result.markdown.startsWith('No matches'), 'searchManuals should match canonical hex code');
    assert.ok(result.totalMatches > 0, 'searchManuals must report totalMatches > 0 (Bug B regression)');
    assert.ok(
      result.markdown.includes('RTSEXCPT_CYCLE_TIME_EXCEED'),
      'searchManuals output must include the canonical RTSEXCPT_ symbol from external/',
    );
    assert.ok(
      result.markdown.includes('codesys-runtime-errors'),
      'searchManuals output must reference the gated file',
    );
  });

  it('searchManuals finds device entries from festo-devices-extracted.md', { skip: !HAS_EXTERNAL }, async () => {
    const result = await searchManuals('CMMP-AS-C5-3A-M0');
    assert.ok(!result.markdown.startsWith('No matches'), 'searchManuals should match a known device');
    assert.ok(result.markdown.includes('CMMP-AS'), 'output mentions the family');
    assert.ok(result.totalMatches > 0, 'totalMatches must be > 0 for known device');
  });
});
