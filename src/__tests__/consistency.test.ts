/**
 * Consistency Tests — FestoCodesysMCP
 *
 * Validates that all knowledge files, library blocks, manuals, and
 * knowledge topics are accessible and return valid content.
 * Run: npm test (requires npm run build first)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadKnowledge } from '../knowledge/loader.js';
import { getLibraryCatalog, getBlockContent, searchLibrary } from '../knowledge/library.js';
import { listManuals, loadManual, searchManuals } from '../knowledge/manuals.js';
import { getNamingConventions, getAbbreviationDictionary, getStateMachinePatterns, getHungarianNotation } from '../knowledge/conventions.js';
import { getXmlProtocol, getPlcopenSchema, getPlcopenExample, getPlcopenExtensions, getGroundTruth } from '../knowledge/plcopen.js';
import { getFestoCpxReference, getFestoPtpReference, getMotionPatterns, getCdpxHmi, getVtuxTerminal, getCmmtSt } from '../knowledge/festo.js';
import { getCia402Reference } from '../knowledge/ethercat.js';
import { getEplanReference } from '../knowledge/eplan.js';

function assertNotPlaceholder(content: string, label: string) {
  assert.ok(content.length > 50, `${label}: content too short (${content.length} chars)`);
  assert.ok(!content.startsWith('[Knowledge file not found'), `${label}: file not found`);
}

// ── Group 1: Knowledge Loader ───────────────────────────────────────────

describe('Knowledge Loader', () => {
  const knowledgeFiles = [
    'conventions/naming-conventions.md',
    'conventions/abbreviation-dictionary.md',
    'conventions/hungarian-notation.md',
    'conventions/state-machine-patterns.md',
    'plcopen/xml-protocol.md',
    'plcopen/IEC61131_10.xsd',
    'plcopen/IEC61131_10_Example.xml',
    'plcopen/plcopen-extensions.md',
    'festo/festo-cpx-reference.md',
    'festo/festo-ptp-reference.md',
    'ethercat/cia402-reference.md',
    'eplan/eplan-reference.md',
    'codesys/ground-truth.md',
    'festo/motion-patterns.md',
    'festo/festo-cdpx-hmi.md',
    'festo/festo-vtux-terminal.md',
    'festo/festo-cmmt-st.md',
  ];

  for (const file of knowledgeFiles) {
    it(`loads ${file}`, () => {
      const content = loadKnowledge(file);
      assertNotPlaceholder(content, file);
    });
  }
});

// ── Group 2: Library Catalog ────────────────────────────────────────────

describe('Library Catalog', () => {
  it('has exactly 38 blocks', () => {
    const catalog = getLibraryCatalog();
    assert.equal(catalog.length, 38);
  });

  it('has exactly 7 categories', () => {
    const catalog = getLibraryCatalog();
    const categories = [...new Set(catalog.map(b => b.category))].sort();
    assert.deepEqual(categories, [
      'actuators', 'motion', 'safety', 'sensors', 'system', 'types', 'utilities',
    ]);
  });

  it('has correct block counts per category', () => {
    const catalog = getLibraryCatalog();
    const counts = new Map<string, number>();
    for (const b of catalog) counts.set(b.category, (counts.get(b.category) || 0) + 1);

    assert.equal(counts.get('types'), 8);
    assert.equal(counts.get('motion'), 4);
    assert.equal(counts.get('actuators'), 5);
    assert.equal(counts.get('sensors'), 4);
    assert.equal(counts.get('safety'), 2);
    assert.equal(counts.get('system'), 5);
    assert.equal(counts.get('utilities'), 10);
  });

  it('every block has name, category, and description', () => {
    const catalog = getLibraryCatalog();
    for (const block of catalog) {
      assert.ok(block.name.length > 0, 'block missing name');
      assert.ok(block.category.length > 0, `${block.name} missing category`);
      assert.ok(block.description.length > 0, `${block.name} missing description`);
    }
  });

  it('every block content loads successfully', () => {
    const catalog = getLibraryCatalog();
    for (const block of catalog) {
      const content = getBlockContent(block.category, block.filename);
      assertNotPlaceholder(content, block.name);
    }
  });

  it('contains key blocks', () => {
    const catalog = getLibraryCatalog();
    const names = catalog.map(b => b.name);
    assert.ok(names.includes('FB_StandardMotor'), 'missing FB_StandardMotor');
    assert.ok(names.includes('FB_PidController'), 'missing FB_PidController');
    assert.ok(names.includes('E_AxisState'), 'missing E_AxisState');
    assert.ok(names.includes('ST_SensorConfig'), 'missing ST_SensorConfig');
  });

  it('search finds relevant blocks', () => {
    const results = searchLibrary('motor');
    assert.ok(results.length > 0, 'search "motor" returned no results');
    assert.ok(results.some(b => b.name === 'FB_StandardMotor'));
  });
});

// ── Group 3: Manual System ──────────────────────────────────────────────

describe('Manual System', () => {
  it('lists all manuals (at least 15)', async () => {
    const manuals = await listManuals();
    assert.ok(manuals.length >= 15, `expected at least 15 manuals, got ${manuals.length}`);
  });

  it('all filenames end with .md', async () => {
    const manuals = await listManuals();
    for (const m of manuals) {
      assert.ok(m.filename.endsWith('.md'), `${m.filename} does not end with .md`);
    }
  });

  it('every manual loads successfully', async () => {
    const manuals = await listManuals();
    for (const m of manuals) {
      const content = await loadManual(m.filename);
      assert.ok(!content.includes('[Manual not found'), `${m.filename}: not found`);
      assert.ok(content.length > 100, `${m.filename}: too short`);
    }
  });

  it('search returns results for known terms', async () => {
    const results = await searchManuals('EtherCAT');
    assert.ok(results.markdown.includes('Search Results'), 'EtherCAT search returned no results');
    assert.ok(results.totalMatches > 0, 'EtherCAT search totalMatches must be > 0');
  });
});

// ── Group 4: Knowledge Topics ───────────────────────────────────────────

describe('Knowledge Topics', () => {
  const topicFunctions: Record<string, () => string> = {
    'conventions': getNamingConventions,
    'abbreviations': getAbbreviationDictionary,
    'hungarian-notation': getHungarianNotation,
    'state-machines': getStateMachinePatterns,
    'ground-truth': getGroundTruth,
    'xml-rules': getXmlProtocol,
    'plcopen-schema': getPlcopenSchema,
    'plcopen-example': getPlcopenExample,
    'plcopen-extensions': getPlcopenExtensions,
    'festo-cpx': getFestoCpxReference,
    'festo-ptp': getFestoPtpReference,
    'motion-patterns': getMotionPatterns,
    'ethercat-cia402': getCia402Reference,
    'eplan': getEplanReference,
    'festo-cdpx-hmi': getCdpxHmi,
    'festo-vtux-terminal': getVtuxTerminal,
    'festo-cmmt-st': getCmmtSt,
  };

  for (const [name, fn] of Object.entries(topicFunctions)) {
    it(`topic "${name}" returns valid content`, () => {
      const content = fn();
      assert.ok(content.length > 20, `${name}: content too short`);
      assert.ok(!content.startsWith('[Knowledge file not found'), `${name}: file not found`);
    });
  }
});
