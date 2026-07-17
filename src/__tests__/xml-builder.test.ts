/**
 * XML Builder Tests
 * Validates PLCopen XML generation for CODESYS import.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPouXml,
  buildDataTypeXml,
  buildGvlXml,
  buildGvlStCode,
  buildProjectXml,
  type PouDefinition,
  type DataTypeDefinition,
  type GvlDefinition,
} from '../utils/xml-builder.js';

// ── Helpers ───────────────────────────────────────────────────────────

function assertValidPLCopenXml(xml: string, label: string) {
  assert.ok(xml.startsWith('<?xml'), `${label}: missing XML declaration`);
  assert.ok(xml.includes('http://www.plcopen.org/xml/tc6_0200'), `${label}: missing PLCopen namespace`);
  assert.ok(xml.includes('http://www.w3.org/1999/xhtml'), `${label}: missing XHTML namespace`);
  assert.ok(xml.includes('<fileHeader'), `${label}: missing fileHeader`);
  assert.ok(xml.includes('<contentHeader'), `${label}: missing contentHeader`);
  assert.ok(xml.includes('</contentHeader>'), `${label}: contentHeader self-closing`);
  assert.ok(xml.includes('<coordinateInfo>'), `${label}: missing coordinateInfo`);
  assert.ok(xml.includes('<fbd>'), `${label}: missing fbd scaling`);
  assert.ok(xml.includes('<ld>'), `${label}: missing ld scaling`);
  assert.ok(xml.includes('<sfc>'), `${label}: missing sfc scaling`);
  assert.ok(xml.includes('<instances>'), `${label}: missing instances`);
  assert.ok(xml.includes('<configurations'), `${label}: missing configurations`);

  // Zero-ID rule: no id= on connectionPoints
  const idViolations = (xml.match(/<connectionPoint(?:In|Out)\s+id=/g) || []).length;
  assert.equal(idViolations, 0, `${label}: zero-ID rule violated`);
}

// ── POU XML ──────────────────────────────────────────────────────────

describe('XML Builder — POU', () => {
  it('generates valid XML for a function block', () => {
    const pou: PouDefinition = {
      name: 'FB_Motor',
      pouType: 'functionBlock',
      inputVars: [{ name: 'bEnable', type: 'BOOL' }],
      outputVars: [{ name: 'bRunning', type: 'BOOL' }, { name: 'nErrId', type: 'DINT', initialValue: '0' }],
      localVars: [{ name: 'nState', type: 'INT', initialValue: '0' }],
      body: 'CASE nState OF\n    0: ;\nEND_CASE',
    };
    const xml = buildPouXml(pou);
    assertValidPLCopenXml(xml, 'FB_Motor');

    assert.ok(xml.includes('name="FB_Motor"'));
    assert.ok(xml.includes('pouType="functionBlock"'));
    assert.ok(xml.includes('<inputVars>'));
    assert.ok(xml.includes('<outputVars>'));
    assert.ok(xml.includes('<localVars>'));
    assert.ok(xml.includes('<ST>'));
    assert.ok(xml.includes('CASE nState OF'));
  });

  it('generates valid XML for a program', () => {
    const pou: PouDefinition = {
      name: 'PRG_Main',
      pouType: 'program',
      localVars: [{ name: 'nState', type: 'INT', initialValue: '0' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assertValidPLCopenXml(xml, 'PRG_Main');
    assert.ok(xml.includes('pouType="program"'));
  });

  it('generates valid XML for a function with return type', () => {
    const pou: PouDefinition = {
      name: 'FC_Add',
      pouType: 'function',
      returnType: 'REAL',
      inputVars: [{ name: 'rA', type: 'REAL' }, { name: 'rB', type: 'REAL' }],
      body: 'FC_Add := rA + rB;',
    };
    const xml = buildPouXml(pou);
    assertValidPLCopenXml(xml, 'FC_Add');
    assert.ok(xml.includes('<returnType><REAL /></returnType>'));
  });

  it('wraps body in CDATA section (preserves special characters)', () => {
    const pou: PouDefinition = {
      name: 'FB_Test',
      pouType: 'functionBlock',
      body: 'IF nVal > 10 AND nVal < 100 THEN bOk := TRUE; END_IF',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('<![CDATA['), 'body should be in CDATA');
    assert.ok(xml.includes(']]>'), 'CDATA should be closed');
    assert.ok(xml.includes('nVal > 10'), 'CDATA should preserve raw > in body');
    assert.ok(xml.includes('nVal < 100'), 'CDATA should preserve raw < in body');
  });

  it('escapes special characters in attribute names', () => {
    const pou: PouDefinition = {
      name: 'FB_A&B',
      pouType: 'functionBlock',
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('name="FB_A&amp;B"'), 'name attribute not escaped');
    assert.ok(!xml.includes('name="FB_A&B"'), 'raw & in attribute');
  });

  it('handles initial values with special characters', () => {
    const pou: PouDefinition = {
      name: 'FB_Test',
      pouType: 'functionBlock',
      localVars: [{ name: 'sMsg', type: 'STRING', initialValue: 'Hello "World"' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('&quot;'), 'initial value quotes not escaped');
  });

  it('maps all IEC 61131-3 simple types correctly', () => {
    const types = ['BOOL', 'INT', 'DINT', 'UINT', 'UDINT', 'SINT', 'USINT', 'LINT', 'ULINT',
      'REAL', 'LREAL', 'WORD', 'DWORD', 'LWORD', 'BYTE', 'TIME', 'STRING', 'WSTRING'];

    for (const t of types) {
      const pou: PouDefinition = {
        name: `FB_Test_${t}`,
        pouType: 'functionBlock',
        localVars: [{ name: `var_${t}`, type: t }],
        body: ';',
      };
      const xml = buildPouXml(pou);
      // STRING and WSTRING are lowercase in PLCopen XML
      const expected = t === 'STRING' ? '<string />' : t === 'WSTRING' ? '<wstring />' : `<${t} />`;
      assert.ok(xml.includes(expected), `type ${t} not mapped correctly, expected ${expected}`);
    }
  });

  it('maps ARRAY types', () => {
    const pou: PouDefinition = {
      name: 'FB_Arr',
      pouType: 'functionBlock',
      localVars: [{ name: 'aValues', type: 'ARRAY[0..9] OF REAL' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('<array>'));
    assert.ok(xml.includes('lower="0"'));
    assert.ok(xml.includes('upper="9"'));
    assert.ok(xml.includes('<REAL />'));
  });

  it('maps multi-dimensional ARRAY types (F3-023)', () => {
    // IEC 61131-3 allows multi-dimensional arrays — PLCopen XML emits
    // multiple <dimension> inside the same <array>.
    const pou: PouDefinition = {
      name: 'FB_Mat',
      pouType: 'functionBlock',
      localVars: [{ name: 'aMatrix', type: 'ARRAY[0..9, 0..9] OF INT' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('<array>'));
    // two dimensions
    const dimMatches = xml.match(/<dimension /g) ?? [];
    assert.equal(dimMatches.length, 2);
    assert.ok(xml.includes('<INT />'));
  });

  it('maps 3D ARRAY with negative bounds', () => {
    const pou: PouDefinition = {
      name: 'FB_Cube',
      pouType: 'functionBlock',
      localVars: [{ name: 'aCube', type: 'ARRAY[-1..1, 0..9, 5..15] OF DINT' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    const dimMatches = xml.match(/<dimension /g) ?? [];
    assert.equal(dimMatches.length, 3);
    assert.ok(xml.includes('lower="-1"'));
    assert.ok(xml.includes('upper="1"'));
    assert.ok(xml.includes('<DINT />'));
  });

  it('maps STRING with length', () => {
    const pou: PouDefinition = {
      name: 'FB_Str',
      pouType: 'functionBlock',
      localVars: [{ name: 'sName', type: 'STRING(80)' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('length="80"'));
  });

  it('maps derived types (FB instances)', () => {
    const pou: PouDefinition = {
      name: 'FB_WithTimer',
      pouType: 'functionBlock',
      localVars: [{ name: 'fbTimer', type: 'TON' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('<derived name="TON" />'));
  });

  it('emits address attribute for AT %-mapped vars (Bug A)', () => {
    const pou: PouDefinition = {
      name: 'FB_IO',
      pouType: 'functionBlock',
      localVars: [{ name: 'bIn', type: 'BOOL', address: '%IX0.0' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('address="%IX0.0"'), 'AT % address must be emitted on the <variable>');
    assert.ok(/<variable name="bIn" address="%IX0.0">/.test(xml), 'address attribute placement');
  });
});

// ── Data Type XML ────────────────────────────────────────────────────

describe('XML Builder — Data Types', () => {
  it('generates valid XML for an enum', () => {
    const dt: DataTypeDefinition = {
      name: 'E_State',
      kind: 'enum',
      members: [
        { name: 'IDLE', value: '0' },
        { name: 'RUNNING', value: '10' },
        { name: 'ERROR', value: '99' },
      ],
    };
    const xml = buildDataTypeXml(dt);
    assertValidPLCopenXml(xml, 'E_State');
    assert.ok(xml.includes('name="E_State"'));
    assert.ok(xml.includes('<enum>'));
    assert.ok(xml.includes('name="IDLE"'));
    assert.ok(xml.includes('value="0"'));
  });

  it('generates valid XML for a struct', () => {
    const dt: DataTypeDefinition = {
      name: 'ST_Cfg',
      kind: 'struct',
      members: [
        { name: 'rMaxVel', type: 'REAL', comment: 'Max velocity' },
        { name: 'nMode', type: 'INT' },
      ],
    };
    const xml = buildDataTypeXml(dt);
    assertValidPLCopenXml(xml, 'ST_Cfg');
    assert.ok(xml.includes('<struct>'));
    assert.ok(xml.includes('name="rMaxVel"'));
    assert.ok(xml.includes('Max velocity'));
  });
});

// ── GVL XML ──────────────────────────────────────────────────────────

describe('XML Builder — GVL', () => {
  it('generates valid XML for a GVL', () => {
    const gvl: GvlDefinition = {
      name: 'GVL_Sys',
      variables: [
        { name: 'bReady', type: 'BOOL' },
        { name: 'nCycles', type: 'DINT', initialValue: '0', comment: 'Cycle counter' },
      ],
    };
    const xml = buildGvlXml(gvl);
    assertValidPLCopenXml(xml, 'GVL_Sys');
    assert.ok(xml.includes('globalVars'));
    assert.ok(xml.includes('GVL_Sys'));
    assert.ok(xml.includes('name="bReady"'));
    assert.ok(xml.includes('name="nCycles"'));
  });

  it('generates VAR_GLOBAL CONSTANT for constant GVLs', () => {
    const gvl: GvlDefinition = {
      name: 'GVL_Const',
      variables: [{ name: 'nMax', type: 'INT', initialValue: '100' }],
      isConstant: true,
    };
    const xml = buildGvlXml(gvl);
    assert.ok(xml.includes('constant="true"'));
  });

  it('emits address attribute for AT %-mapped GVL vars (Bug A)', () => {
    const gvl: GvlDefinition = {
      name: 'GVL_IO',
      variables: [
        { name: 'bEmergencyOk', type: 'BOOL', address: '%IX0.0' },
        { name: 'nFlowRate', type: 'INT', address: '%IW3.0' },
      ],
    };
    const xml = buildGvlXml(gvl);
    assert.ok(xml.includes('address="%IX0.0"'), 'IX address must be emitted');
    assert.ok(xml.includes('address="%IW3.0"'), 'IW address must be emitted');
  });
});

// ── Project XML ──────────────────────────────────────────────────────

describe('XML Builder — Project', () => {
  it('generates valid XML for a full project', () => {
    const pous: PouDefinition[] = [
      {
        name: 'PRG_Main',
        pouType: 'program',
        localVars: [{ name: 'nState', type: 'INT', initialValue: '0' }],
        body: 'CASE nState OF 0: ; END_CASE',
      },
      {
        name: 'FB_Ctrl',
        pouType: 'functionBlock',
        inputVars: [{ name: 'bEnable', type: 'BOOL' }],
        outputVars: [{ name: 'bDone', type: 'BOOL' }],
        body: 'bDone := bEnable;',
      },
    ];
    const dataTypes: DataTypeDefinition[] = [
      { name: 'E_Mode', kind: 'enum', members: [{ name: 'AUTO', value: '0' }, { name: 'MANUAL', value: '1' }] },
    ];
    const gvls: GvlDefinition[] = [
      { name: 'GVL_Sys', variables: [{ name: 'bReady', type: 'BOOL' }] },
    ];

    const xml = buildProjectXml('TestProject', pous, dataTypes, gvls);
    assertValidPLCopenXml(xml, 'TestProject');

    // Verify all components present
    assert.ok(xml.includes('name="PRG_Main"'));
    assert.ok(xml.includes('name="FB_Ctrl"'));
    assert.ok(xml.includes('name="E_Mode"'));
    assert.ok(xml.includes('name="GVL_Sys"'));
    assert.ok(xml.includes('<ProjectStructure>'));
    assert.ok(xml.includes('Object Name='));
  });

  it('handles project with no data types or GVLs', () => {
    const pous: PouDefinition[] = [
      { name: 'PRG_Main', pouType: 'program', body: ';' },
    ];
    const xml = buildProjectXml('MinimalProject', pous);
    assertValidPLCopenXml(xml, 'MinimalProject');
    assert.ok(xml.includes('name="PRG_Main"'));
  });
});

// ── P2.0 regression suite — XML emission of confirmed generator bugs ──

describe('XML Builder — P2.0 regressions', () => {
  it('globalVars: retain + persistent attributes are emitted', () => {
    const xml = buildProjectXml('P', [], [], [{
      name: 'GVL_Persist',
      variables: [{ name: 'nCount', type: 'INT' }],
      isRetain: true,
      isPersistent: true,
    }]);
    assert.match(xml, /<globalVars name="GVL_Persist"[^>]*retain="true"/,
      'retain="true" must survive into the XML');
    assert.match(xml, /<globalVars name="GVL_Persist"[^>]*persistent="true"/,
      'persistent="true" must survive into the XML');
  });

  it('globalVars: plain RETAIN emits retain only; CONSTANT control unchanged', () => {
    const xml = buildProjectXml('P', [], [], [
      { name: 'GVL_Ret', variables: [{ name: 'a', type: 'INT' }], isRetain: true },
      { name: 'GVL_Const', variables: [{ name: 'b', type: 'INT' }], isConstant: true },
    ]);
    assert.match(xml, /<globalVars name="GVL_Ret"[^>]*retain="true"/);
    assert.doesNotMatch(xml, /<globalVars name="GVL_Ret"[^>]*persistent=/);
    assert.match(xml, /<globalVars name="GVL_Const"[^>]*constant="true"/);
    assert.doesNotMatch(xml, /<globalVars name="GVL_Const"[^>]*retain=/);
  });

  it('gvl ST round-trip: buildGvlStCode reflects PERSISTENT RETAIN', () => {
    const st = buildGvlStCode({
      name: 'GVL_Persist',
      variables: [{ name: 'nCount', type: 'INT' }],
      isRetain: true,
      isPersistent: true,
    });
    assert.match(st.split('\n')[0], /^VAR_GLOBAL PERSISTENT RETAIN$/);
  });

  it('dataType: qualifiedOnly emits the CODESYS qualified_only addData attribute', () => {
    const xml = buildProjectXml('P', [], [{
      name: 'E_Color',
      kind: 'enum',
      members: [{ name: 'Red' }, { name: 'Green' }, { name: 'Blue' }],
      qualifiedOnly: true,
    }], []);
    assert.match(xml,
      /<dataType name="E_Color">[\s\S]*?<Attribute Name="qualified_only"[\s\S]*?<\/dataType>/,
      'qualified_only must be emitted as an addData Attribute inside the dataType');
  });

  it('dataType: without qualifiedOnly no qualified_only appears', () => {
    const xml = buildProjectXml('P', [], [{
      name: 'E_Plain',
      kind: 'enum',
      members: [{ name: 'A' }, { name: 'B' }],
    }], []);
    assert.ok(!xml.includes('qualified_only'), 'no pragma → no qualified_only in XML');
  });

  // A5 lock-in: documents the CURRENT structure guarantees and known gaps.
  // If ObjectId / <libraries> support ever lands, flip the negative assertions
  // into positive, determinism-checked ones (same input → same GUIDs).
  it('project XML: structure guarantees and known gaps (lock-in)', () => {
    const xml = buildProjectXml('Proj',
      [
        { name: 'FB_Test', pouType: 'functionBlock', body: 'x := 1;' },
        { name: 'Main', pouType: 'program', body: 'y := 2;' },
      ],
      [{ name: 'E_State', kind: 'enum', members: [{ name: 'Idle' }] }],
      [{ name: 'GVL_Cfg', variables: [{ name: 'n', type: 'INT' }] }]);
    // Present today:
    assert.ok(xml.includes('<ProjectStructure>'), 'ProjectStructure must be emitted');
    assert.match(xml, /<Object Name="FB_Test"/);
    assert.match(xml, /<Object Name="Main"/);
    assert.match(xml, /<Object Name="GVL_Cfg"/);
    assert.match(xml, /<pous>[\s\S]*pouType="program"[\s\S]*<\/pous>/,
      'PROGRAM lives in the global <pous> block');
    // Known gaps (documented in README known-limitations):
    assert.ok(!xml.includes('ObjectId'), 'known gap: no per-object ObjectId (yet)');
    assert.ok(!xml.includes('<libraries'), 'known gap: no <libraries> element (yet)');
  });
});
