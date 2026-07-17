/**
 * Integration Tests — FestoCodesysMCP
 * End-to-end tests for tool logic, edge cases, and parser robustness.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseStFile } from '../utils/st-parser.js';
import { buildPouXml, buildProjectXml, type PouDefinition } from '../utils/xml-builder.js';
import { validatePath, ensureDir } from '../utils/path-validation.js';
import { buildStFile } from '../tools/plc-code-tools.js';
import { validateBatch } from '../validators/batch-validator.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ── ST Parser Edge Cases ─────────────────────────────────────────────

describe('ST Parser — Edge Cases', () => {
  it('parses empty body function block', () => {
    const code = 'FUNCTION_BLOCK FB_Empty\nVAR\n    nState : INT := 0;\nEND_VAR\n';
    const result = parseStFile(code, 'FB_Empty.st');
    assert.equal(result.kind, 'pou');
    if (result.kind === 'pou') {
      assert.equal(result.pou.name, 'FB_Empty');
      assert.equal(result.pou.pouType, 'functionBlock');
    }
  });

  it('parses variable without initial value', () => {
    const code = 'FUNCTION_BLOCK FB_Test\nVAR\n    bReady : BOOL;\nEND_VAR\n';
    const result = parseStFile(code, 'FB_Test.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.localVars?.[0]?.name, 'bReady');
      assert.equal(result.pou.localVars?.[0]?.type, 'BOOL');
      assert.equal(result.pou.localVars?.[0]?.initialValue, undefined);
    }
  });

  it('parses ARRAY type in variable declaration', () => {
    const code = 'FUNCTION_BLOCK FB_Arr\nVAR\n    aValues : ARRAY[0..9] OF REAL;\nEND_VAR\n';
    const result = parseStFile(code, 'FB_Arr.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.localVars?.[0]?.type, 'ARRAY[0..9] OF REAL');
    }
  });

  it('parses STRING with length', () => {
    const code = 'FUNCTION_BLOCK FB_Str\nVAR\n    sName : STRING(80) := \'hello\';\nEND_VAR\n';
    const result = parseStFile(code, 'FB_Str.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.localVars?.[0]?.type, 'STRING(80)');
      assert.equal(result.pou.localVars?.[0]?.initialValue, "'hello'");
    }
  });

  it('parses all VAR sections in one FB', () => {
    const code = `FUNCTION_BLOCK FB_Full
VAR_INPUT
    bEnable : BOOL;
END_VAR
VAR_OUTPUT
    bDone : BOOL;
    nErrId : DINT := 0;
END_VAR
VAR_IN_OUT
    stAxis : ST_AxisConfig;
END_VAR
VAR
    nState : INT := 0;
END_VAR

CASE nState OF
    0: ;
END_CASE`;
    const result = parseStFile(code, 'FB_Full.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.inputVars?.length, 1);
      assert.equal(result.pou.outputVars?.length, 2);
      assert.equal(result.pou.inOutVars?.length, 1);
      assert.equal(result.pou.localVars?.length, 1);
      assert.ok(result.pou.body.includes('CASE'));
    }
  });

  it('parses enum with trailing comma gracefully', () => {
    const code = 'TYPE E_Test :\n(\n    A := 0,\n    B := 1,\n);\nEND_TYPE';
    const result = parseStFile(code, 'E_Test.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind === 'dataType') {
      assert.equal(result.dataType.kind, 'enum');
      assert.ok(result.dataType.members.length >= 2);
    }
  });

  it('parses struct with derived types', () => {
    const code = `TYPE ST_Config :
STRUCT
    rMaxVel : REAL;
    fbTimer : TON;
    eMode : E_MachState;
END_STRUCT
END_TYPE`;
    const result = parseStFile(code, 'ST_Config.st');
    if (result.kind === 'dataType') {
      assert.equal(result.dataType.kind, 'struct');
      assert.equal(result.dataType.members.length, 3);
      assert.equal(result.dataType.members[1].type, 'TON');
    }
  });

  it('parses GVL with qualified_only attribute', () => {
    const code = `{attribute 'qualified_only'}
VAR_GLOBAL
    bSysRdy : BOOL;
    nCycles : DINT := 0;
END_VAR`;
    const result = parseStFile(code, 'GVL_Sys.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind === 'gvl') {
      assert.equal(result.gvl.variables.length, 2);
      assert.equal(result.gvl.name, 'GVL_Sys');
    }
  });

  it('handles file with only whitespace', () => {
    // Parser should not crash on whitespace-only input
    const result = parseStFile('   \n\n   ', 'empty.st');
    assert.ok(result.kind !== undefined);
  });

  it('parses function with return type correctly', () => {
    const code = `FUNCTION FC_Add : REAL
VAR_INPUT
    rA : REAL;
    rB : REAL;
END_VAR

FC_Add := rA + rB;`;
    const result = parseStFile(code, 'FC_Add.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.pouType, 'function');
      assert.equal(result.pou.returnType, 'REAL');
      assert.equal(result.pou.name, 'FC_Add');
    }
  });

  it('parses variables with inline comments', () => {
    const code = `FUNCTION_BLOCK FB_Motor
VAR_INPUT
    bEnable : BOOL; // Enable the motor
    rSpeed : REAL := 0.0; // Target speed in rpm
END_VAR
`;
    const result = parseStFile(code, 'FB_Motor.st');
    if (result.kind === 'pou') {
      assert.equal(result.pou.inputVars?.[0]?.comment, 'Enable the motor');
      assert.equal(result.pou.inputVars?.[1]?.comment, 'Target speed in rpm');
    }
  });

  it('parses variables with (* block *) comments', () => {
    const code = `FUNCTION_BLOCK FB_BlockComment
VAR_INPUT
    bStart      : BOOL;                (* Start command *)
    bFeedback   : BOOL;                (* Contactor feedback *)
    tDelay      : TIME := T#3S;        (* Feedback timeout *)
END_VAR
VAR_OUTPUT
    bRunning    : BOOL;                (* Motor running *)
    nErrId      : INT;                 (* Error code *)
END_VAR

;`;
    const result = parseStFile(code, 'FB_BlockComment.st');
    assert.equal(result.kind, 'pou');
    if (result.kind === 'pou') {
      assert.equal(result.pou.inputVars?.length, 3, 'should parse 3 input vars with (* comments *)');
      assert.equal(result.pou.outputVars?.length, 2, 'should parse 2 output vars with (* comments *)');
      assert.equal(result.pou.inputVars?.[0]?.name, 'bStart');
      assert.equal(result.pou.inputVars?.[0]?.comment, 'Start command');
      assert.equal(result.pou.inputVars?.[2]?.initialValue, 'T#3S');
      assert.equal(result.pou.outputVars?.[1]?.comment, 'Error code');
    }
  });

  it('parses real library block FB_StandardMotor correctly', () => {
    const libDir = join(import.meta.dirname, '..', '..', 'knowledge', 'library');
    const content = readFileSync(join(libDir, 'motion', 'FB_StandardMotor.st'), 'utf-8');
    const result = parseStFile(content, 'FB_StandardMotor.st');
    assert.equal(result.kind, 'pou');
    if (result.kind === 'pou') {
      assert.ok((result.pou.inputVars?.length ?? 0) >= 5, 'FB_StandardMotor should have at least 5 input vars');
      assert.ok((result.pou.outputVars?.length ?? 0) >= 3, 'FB_StandardMotor should have at least 3 output vars');
      assert.equal(result.pou.pouType, 'functionBlock');
    }
  });
});

// ── XML Builder Edge Cases ───────────────────────────────────────────

describe('XML Builder — Edge Cases', () => {
  it('handles POU with empty var arrays', () => {
    const pou: PouDefinition = {
      name: 'FB_NoVars',
      pouType: 'functionBlock',
      inputVars: [],
      outputVars: [],
      localVars: [],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('name="FB_NoVars"'));
  });

  it('handles POU with undefined var arrays', () => {
    const pou: PouDefinition = {
      name: 'FB_Minimal',
      pouType: 'functionBlock',
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('name="FB_Minimal"'));
  });

  it('escapes unicode in body', () => {
    const pou: PouDefinition = {
      name: 'FB_Unicode',
      pouType: 'functionBlock',
      body: 'sMsg := \'Temperatur überschritten\';',
    };
    const xml = buildPouXml(pou);
    // Unicode chars should pass through, only XML special chars are escaped
    assert.ok(xml.includes('berschritten'));
  });

  it('project with empty arrays generates valid XML', () => {
    const xml = buildProjectXml('EmptyProject', []);
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('http://www.plcopen.org/xml/tc6_0200'));
    assert.ok(xml.includes('<instances>'));
  });

  it('project with multiple GVLs generates separate addData blocks', () => {
    const xml = buildProjectXml('Multi', [], [], [
      { name: 'GVL_A', variables: [{ name: 'bA', type: 'BOOL' }] },
      { name: 'GVL_B', variables: [{ name: 'bB', type: 'BOOL' }] },
    ]);
    assert.ok(xml.includes('GVL_A'));
    assert.ok(xml.includes('GVL_B'));
  });

  it('handles very long variable names', () => {
    const longName = 'n' + 'A'.repeat(200);
    const pou: PouDefinition = {
      name: 'FB_LongNames',
      pouType: 'functionBlock',
      localVars: [{ name: longName, type: 'INT' }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes(longName));
  });
});

// ── XML CDATA and Escaping ──────────────────────────────────────────

describe('XML Builder — CDATA and Escaping', () => {
  it('wraps POU body in CDATA', () => {
    const pou: PouDefinition = {
      name: 'FB_CdataTest',
      pouType: 'functionBlock',
      body: 'IF rVal > 10.0 THEN bOk := TRUE; END_IF',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('<![CDATA['));
    assert.ok(xml.includes('rVal > 10.0'));
    assert.ok(xml.includes(']]>'));
  });

  it('handles ]]> in ST code (CDATA escape)', () => {
    const pou: PouDefinition = {
      name: 'FB_CdataEdge',
      pouType: 'functionBlock',
      body: 'sMsg := \'end ]]> here\';',
    };
    const xml = buildPouXml(pou);
    // Should not have raw ]]> that breaks out of CDATA
    assert.ok(xml.includes('<![CDATA['));
    assert.ok(xml.includes('end ]]'));
  });

  it('escapes apostrophes in attribute values', () => {
    const pou: PouDefinition = {
      name: 'FB_Apos',
      pouType: 'functionBlock',
      localVars: [{ name: 'sName', type: 'STRING', initialValue: "It's working" }],
      body: ';',
    };
    const xml = buildPouXml(pou);
    assert.ok(xml.includes('&apos;'), 'apostrophe should be escaped in attributes');
  });

  it('GVL body uses proper variable elements', () => {
    const xml = buildProjectXml('CdataProject', [], [], [
      { name: 'GVL_Test', variables: [{ name: 'bFlag', type: 'BOOL' }] },
    ]);
    assert.ok(xml.includes('globalVars'));
    assert.ok(xml.includes('name="bFlag"'));
  });

  it('project POU bodies use CDATA wrapping', () => {
    const xml = buildProjectXml('CdataProj', [
      { name: 'FB_A', pouType: 'functionBlock', body: 'IF x > 5 THEN ; END_IF' },
    ]);
    assert.ok(xml.includes('<![CDATA['));
    assert.ok(xml.includes('x > 5'));
  });
});

// ── Path Validation Edge Cases ───────────────────────────────────────

describe('Path Validation — Edge Cases', () => {
  it('accepts simple filenames', () => {
    assert.equal(validatePath('test.st'), null);
  });

  it('accepts nested relative paths', () => {
    assert.equal(validatePath('src/tools/helper.ts'), null);
  });

  it('accepts paths with unicode characters (D5-001: requires escape hatch)', () => {
    const original = process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
    process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = '1';
    try {
      assert.equal(validatePath('/home/user/proj\u00e9t\u00f6/main.st'), null);
    } finally {
      if (original === undefined) delete process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE;
      else process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE = original;
    }
  });

  it('rejects multiple null bytes', () => {
    const result = validatePath('/home/\0user/\0file');
    assert.ok(result !== null);
    assert.ok(result!.includes('null bytes'));
  });

  it('rejects backslash traversal after normalization', () => {
    // On Linux, backslashes are valid in filenames, but normalize handles them
    const result = validatePath('..\\etc\\passwd');
    assert.ok(result !== null);
  });
});

// ── ensureDir Tests ──────────────────────────────────────────────────

describe('ensureDir', () => {
  it('creates nested directories', async () => {
    const testDir = join(tmpdir(), `festo-test-${Date.now()}`);
    const nested = join(testDir, 'a', 'b', 'c');
    try {
      await ensureDir(nested);
      assert.ok(existsSync(nested));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('does not throw on existing directory', async () => {
    const testDir = join(tmpdir(), `festo-test-${Date.now()}`);
    try {
      mkdirSync(testDir, { recursive: true });
      // Should not throw
      await ensureDir(testDir);
      assert.ok(existsSync(testDir));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

// ── Round-Trip: Parse ST → Build XML → Validate ─────────────────────

describe('Round-Trip: ST → XML → Validate', () => {
  it('round-trips a function block through parse and build', () => {
    const stCode = `FUNCTION_BLOCK FB_Valve
VAR_INPUT
    bOpen : BOOL;
END_VAR
VAR_OUTPUT
    bIsOpen : BOOL;
    nErrId : DINT := 0;
END_VAR
VAR
    nState : INT := 0;
END_VAR

CASE nState OF
    0: // IDLE
        IF bOpen THEN
            nState := 10;
        END_IF
    10: // OPENING
        bIsOpen := TRUE;
        nState := 90;
    90: // DONE
        ;
    99: // ERROR
        ;
END_CASE`;

    const parsed = parseStFile(stCode, 'FB_Valve.st');
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind === 'pou') {
      const xml = buildPouXml(parsed.pou);
      // Verify the XML is valid PLCopen
      assert.ok(xml.startsWith('<?xml'));
      assert.ok(xml.includes('http://www.plcopen.org/xml/tc6_0200'));
      assert.ok(xml.includes('name="FB_Valve"'));
      assert.ok(xml.includes('pouType="functionBlock"'));
      assert.ok(xml.includes('<inputVars>'));
      assert.ok(xml.includes('<outputVars>'));
      assert.ok(xml.includes('<localVars>'));
      assert.ok(xml.includes('CASE nState OF'));
      assert.ok(xml.includes('<instances>'));
    }
  });

  it('round-trips a project through parse and build', () => {
    const fb = `FUNCTION_BLOCK FB_Motor
VAR_INPUT
    bEnable : BOOL;
END_VAR
VAR_OUTPUT
    bRunning : BOOL;
END_VAR

bRunning := bEnable;`;

    const prg = `PROGRAM PRG_Main
VAR
    fbMotor : FB_Motor;
END_VAR

fbMotor(bEnable := TRUE);`;

    const enumType = `TYPE E_Mode :
(
    AUTO := 0,
    MANUAL := 1
);
END_TYPE`;

    const gvl = `{attribute 'qualified_only'}
VAR_GLOBAL
    bReady : BOOL;
END_VAR`;

    const parsedFb = parseStFile(fb, 'FB_Motor.st');
    const parsedPrg = parseStFile(prg, 'PRG_Main.st');
    const parsedEnum = parseStFile(enumType, 'E_Mode.st');
    const parsedGvl = parseStFile(gvl, 'GVL_Sys.st');

    assert.equal(parsedFb.kind, 'pou');
    assert.equal(parsedPrg.kind, 'pou');
    assert.equal(parsedEnum.kind, 'dataType');
    assert.equal(parsedGvl.kind, 'gvl');

    if (parsedFb.kind === 'pou' && parsedPrg.kind === 'pou' &&
        parsedEnum.kind === 'dataType' && parsedGvl.kind === 'gvl') {
      const xml = buildProjectXml('TestProject',
        [parsedFb.pou, parsedPrg.pou],
        [parsedEnum.dataType],
        [parsedGvl.gvl]
      );

      assert.ok(xml.includes('name="FB_Motor"'));
      assert.ok(xml.includes('name="PRG_Main"'));
      assert.ok(xml.includes('name="E_Mode"'));
      assert.ok(xml.includes('GVL_Sys'));
      assert.ok(xml.includes('<ProjectStructure>'));
    }
  });
});

// ── E2E Composition: FB → naming review → ST → XML → schema check ─

describe('E2E composition — full FB lifecycle through the pipeline', () => {
  // The handlers of create_function_block / review_st_code / generate_plcopen_xml /
  // validate_plcopen_xml are MCP-server-bound, but each one is a thin wrapper over
  // pure functions that ARE exported. Composing those functions in order gives us
  // the same coverage of the canonical "create → review → emit → validate" path
  // without spinning up an MCP transport.

  it('composes a clean Hungarian FB through every stage and emits valid PLCopen XML', () => {
    const fbName = 'FB_Conveyor';
    const description = 'Conveyor belt motor controller with start/stop and fault handling';
    const inputVars = [
      { name: 'bExecute', type: 'BOOL', comment: 'Rising edge starts the cycle' },
    ];
    const outputVars = [
      { name: 'bDone', type: 'BOOL', comment: 'Cycle completed' },
      { name: 'bBusy', type: 'BOOL', comment: 'Cycle in progress' },
      { name: 'bErr', type: 'BOOL', comment: 'Cycle errored' },
      { name: 'nErrId', type: 'INT', comment: 'Error identifier' },
    ];
    const localVars = [
      { name: 'nState', type: 'INT', initialValue: '0', comment: 'State pointer' },
    ];
    const stCode = [
      'CASE nState OF',
      '    0:',
      '        IF bExecute THEN nState := 10; END_IF',
      '    10:',
      '        bBusy := TRUE;',
      '        nState := 90;',
      '    90:',
      '        bDone := TRUE;',
      '        bBusy := FALSE;',
      '    99:',
      '        bErr := TRUE;',
      'END_CASE',
    ].join('\n');

    // Stage 1 — assemble the .st text.
    const st = buildStFile(
      'FUNCTION_BLOCK', fbName, description,
      inputVars, outputVars, [], localVars, stCode,
    );
    assert.ok(st.includes('FUNCTION_BLOCK FB_Conveyor'));
    assert.ok(st.includes('END_FUNCTION_BLOCK'));
    assert.ok(st.includes('VAR_INPUT'));
    assert.ok(st.includes('VAR_OUTPUT'));
    assert.ok(st.includes('CASE nState OF'));

    // Stage 2 — naming review across each variable should pass cleanly.
    const allVars = [...inputVars, ...outputVars, ...localVars];
    const review = validateBatch(allVars.map(v => ({
      type: 'hungarian',
      input: v.name,
      extra: v.type,
    })));
    assert.equal(review.failed, 0,
      `Hungarian validator flagged: ${review.results.filter(r => !r.result.valid).map(r => JSON.stringify(r)).join(', ')}`);

    // Stage 3 — parse the .st back to a typed POU definition.
    const parsed = parseStFile(st, `${fbName}.st`);
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind !== 'pou') return;
    assert.equal(parsed.pou.name, fbName);
    assert.equal(parsed.pou.pouType, 'functionBlock');

    // Stage 4 — build PLCopen XML and assert it carries every section we
    // expect a CODESYS importer to look for.
    const xml = buildPouXml(parsed.pou);
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('http://www.plcopen.org/xml/tc6_0200'));
    assert.ok(xml.includes('coordinateInfo'), 'CODESYS rejects without coordinateInfo');
    assert.ok(xml.includes(`name="${fbName}"`));
    assert.ok(xml.includes('pouType="functionBlock"'));
    assert.ok(xml.includes('<inputVars>'));
    assert.ok(xml.includes('<outputVars>'));
    assert.ok(xml.includes('<localVars>'));
    assert.ok(xml.includes('<![CDATA['), 'body must be CDATA-wrapped');
    assert.ok(xml.includes('CASE nState OF'));
    assert.ok(xml.includes('<instances>'), 'PLCopen XML requires instances envelope');
  });

  it('breaks the chain: a snake_case violation is caught at review stage', () => {
    // Plant a snake_case variable — the standard says we ALWAYS catch this
    // before it reaches XML generation.
    const review = validateBatch([
      { type: 'snake_case', input: 'my_var_oops' },
      { type: 'snake_case', input: 'bMyVar' }, // valid — should pass
    ]);
    assert.equal(review.total, 2);
    assert.ok(review.failed >= 1, 'snake_case validator should flag my_var_oops');
    const oops = review.results.find(r => r.input === 'my_var_oops');
    assert.ok(oops);
    assert.equal(oops.result.valid, false);
  });
});

// ── File I/O Round Trip ──────────────────────────────────────────────

describe('File I/O — ST File Generation', () => {
  it('writes and reads back a valid ST file', () => {
    const testDir = join(tmpdir(), `festo-io-${Date.now()}`);
    try {
      mkdirSync(testDir, { recursive: true });
      const stContent = `FUNCTION_BLOCK FB_IOTest
VAR_INPUT
    bIn : BOOL;
END_VAR

;`;
      const filePath = join(testDir, 'FB_IOTest.st');
      writeFileSync(filePath, stContent, 'utf-8');
      assert.ok(existsSync(filePath));

      // Parse it back
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseStFile(content, 'FB_IOTest.st');
      assert.equal(parsed.kind, 'pou');
      if (parsed.kind === 'pou') {
        assert.equal(parsed.pou.name, 'FB_IOTest');
      }
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// End-to-end (source .st → PLCopen XML) of the generator's A-F bugs.
// The unit tests in st-parser.test.ts cover the PARSER; these ensure
// that the fix propagates to the emitted XML (xml-builder side) — in case
// the parser preserves it but the builder dropped it (a Bug A regression in
// buildVarSection/buildGvlAddData would go unnoticed without this).
// ────────────────────────────────────────────────────────────────────

describe('Generator end-to-end — Bug A: address AT % in XML', () => {
  it('GVL with AT %IX/IW emits address="%..." in XML', () => {
    const st = `VAR_GLOBAL
    bEmergencyOk AT %IX0.0 : BOOL;
    nFlowRate AT %IW3.0 : INT;
    bSemAddr : BOOL;
END_VAR`;
    const parsed = parseStFile(st, 'GVL_IO.st');
    assert.equal(parsed.kind, 'gvl');
    if (parsed.kind !== 'gvl') return;
    const xml = buildProjectXml('P', [], [], [parsed.gvl]);
    assert.ok(xml.includes('address="%IX0.0"'), 'address IX should appear in XML');
    assert.ok(xml.includes('address="%IW3.0"'), 'address IW should appear in XML');
    assert.equal((xml.match(/address="/g) || []).length, 2, 'exactly 2 addresses');
    assert.ok(xml.includes('name="bSemAddr"'), 'var without AT % also present');
  });

  it('POU localVar with AT %QX emits address in XML', () => {
    const st = `PROGRAM PRG_X
VAR
    yMotor AT %QX2.0 : BOOL;
END_VAR
END_PROGRAM`;
    const parsed = parseStFile(st, 'PRG_X.st');
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind !== 'pou') return;
    const xml = buildPouXml(parsed.pou);
    assert.ok(xml.includes('address="%QX2.0"'), 'address QX should appear in the POU XML');
  });
});

describe('Generator end-to-end — Bug B: multiple VAR_GLOBAL in XML', () => {
  it('3 VAR_GLOBAL blocks → all vars in XML', () => {
    const st = `VAR_GLOBAL
    bX1 : BOOL;
END_VAR
VAR_GLOBAL PERSISTENT RETAIN
    nCycle : DINT;
END_VAR
VAR_GLOBAL
    bY1 : BOOL;
END_VAR`;
    const parsed = parseStFile(st, 'GVL_Multi.st');
    assert.equal(parsed.kind, 'gvl');
    if (parsed.kind !== 'gvl') return;
    const xml = buildProjectXml('P', [], [], [parsed.gvl]);
    assert.ok(xml.includes('name="bX1"'));
    assert.ok(xml.includes('name="nCycle"'));
    assert.ok(xml.includes('name="bY1"'));
  });
});

describe('Generator end-to-end — Bug D: VAR CONSTANT in XML', () => {
  it('VAR CONSTANT emits <localVars constant="true"> in XML', () => {
    const st = `FUNCTION_BLOCK FB_SM
VAR
    nState : INT;
END_VAR
VAR CONSTANT
    cIDLE : INT := 0;
END_VAR
END_FUNCTION_BLOCK`;
    const parsed = parseStFile(st, 'FB_SM.st');
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind !== 'pou') return;
    const xml = buildPouXml(parsed.pou);
    assert.ok(xml.includes('<localVars constant="true">'), 'should emit localVars constant=true');
    assert.ok(xml.includes('name="cIDLE"'));
  });
});

describe('Generator end-to-end — Bug E: array initializer in XML', () => {
  it('multi-line ARRAY emits complete initialValue in XML', () => {
    const st = `PROGRAM PRG_E
VAR
    arAngles : ARRAY[0..3] OF REAL := [
        0.0, 30.0,
        60.0, 90.0
    ];
END_VAR
END_PROGRAM`;
    const parsed = parseStFile(st, 'PRG_E.st');
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind !== 'pou') return;
    const xml = buildPouXml(parsed.pou);
    assert.ok(xml.includes('<initialValue>'), 'should emit initialValue');
    // The 4 array values must be present (escaped or raw).
    for (const v of ['0.0', '30.0', '60.0', '90.0']) {
      assert.ok(xml.includes(v), `value ${v} of the array must be in the initialValue`);
    }
  });
});

describe('Generator end-to-end — Bug F: 1st var after comment in XML', () => {
  it('comment on its own line does not drop the 1st var in XML', () => {
    const st = `FUNCTION_BLOCK FB_F
VAR_INPUT
    (* inputs *)
    bFirst : BOOL;
    bSecond : BOOL;
END_VAR
END_FUNCTION_BLOCK`;
    const parsed = parseStFile(st, 'FB_F.st');
    assert.equal(parsed.kind, 'pou');
    if (parsed.kind !== 'pou') return;
    const xml = buildPouXml(parsed.pou);
    assert.ok(xml.includes('name="bFirst"'), 'bFirst should be in XML');
    assert.ok(xml.includes('name="bSecond"'), 'bSecond should be in XML');
  });
});
