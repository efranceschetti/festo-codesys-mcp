/**
 * ST Project Index Tests (Stage 1)
 * Validates cross-file definition extraction and the index by name.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { indexSources, buildProjectIndex, getDefinitions, findReferences } from '../services/st-index.js';

describe('st-index — extractSymbols / indexSources', () => {
  it('extracts FB + vars with correct kinds and container', () => {
    const st = `FUNCTION_BLOCK FB_Motor
VAR_INPUT
  bEnable : BOOL;
  rSpeed : REAL := 0.0;
END_VAR
VAR_OUTPUT
  bRunning : BOOL;
END_VAR
VAR_IN_OUT
  stAxis : ST_AxisConfig;
END_VAR
VAR
  nState : INT := 0;
END_VAR
VAR CONSTANT
  cMAX : INT := 5;
END_VAR
END_FUNCTION_BLOCK`;

    const idx = indexSources([{ path: 'FB_Motor.st', content: st }]);

    const fb = getDefinitions(idx, 'FB_Motor');
    assert.equal(fb.length, 1);
    assert.equal(fb[0].kind, 'functionBlock');

    assert.equal(getDefinitions(idx, 'bEnable')[0].kind, 'inputVar');
    assert.equal(getDefinitions(idx, 'bEnable')[0].container, 'FB_Motor');
    assert.equal(getDefinitions(idx, 'bEnable')[0].type, 'BOOL');
    assert.equal(getDefinitions(idx, 'bRunning')[0].kind, 'outputVar');
    assert.equal(getDefinitions(idx, 'stAxis')[0].kind, 'inOutVar');
    assert.equal(getDefinitions(idx, 'nState')[0].kind, 'localVar');
    assert.equal(getDefinitions(idx, 'cMAX')[0].kind, 'localConstVar');
  });

  it('enum qualified_only → enum + enumMembers', () => {
    const st = `{attribute 'qualified_only'}
TYPE E_MachineMode :
(
  OFF := 0,
  MANUAL := 1,
  AUTO := 2,
  EMERGENCY := 99
) INT := OFF;
END_TYPE`;

    const idx = indexSources([{ path: 'E_MachineMode.st', content: st }]);

    const e = getDefinitions(idx, 'E_MachineMode');
    assert.equal(e.length, 1);
    assert.equal(e[0].kind, 'enum');

    const off = getDefinitions(idx, 'OFF');
    assert.equal(off[0].kind, 'enumMember');
    assert.equal(off[0].container, 'E_MachineMode');
  });

  it('GVL → gvl + globalVars', () => {
    const st = `{attribute 'qualified_only'}
VAR_GLOBAL
  bSysReady : BOOL;
  nErrCode : DINT;
END_VAR`;

    const idx = indexSources([{ path: 'GVL_IO.st', content: st }]);

    assert.equal(getDefinitions(idx, 'GVL_IO')[0].kind, 'gvl');
    assert.equal(getDefinitions(idx, 'bSysReady')[0].kind, 'globalVar');
    assert.equal(getDefinitions(idx, 'bSysReady')[0].container, 'GVL_IO');
  });

  it('byName and case-insensitive and topLevelByName only contains containers', () => {
    const st = `FUNCTION_BLOCK FB_Test
VAR
  nValue : INT;
END_VAR
END_FUNCTION_BLOCK`;

    const idx = indexSources([{ path: 'FB_Test.st', content: st }]);

    assert.equal(getDefinitions(idx, 'fb_test').length, 1); // case-insensitive
    assert.ok(idx.topLevelByName.has('FB_TEST'));
    assert.ok(!idx.topLevelByName.has('NVALUE')); // var is not top-level
  });

  it('cross-file: the index aggregates multiple files', () => {
    const a = `FUNCTION_BLOCK FB_A
VAR_IN_OUT
  cfg : ST_Cfg;
END_VAR
END_FUNCTION_BLOCK`;
    const b = `FUNCTION_BLOCK FB_B
VAR_IN_OUT
  cfg : ST_Cfg;
END_VAR
END_FUNCTION_BLOCK`;

    const idx = indexSources([
      { path: 'FB_A.st', content: a },
      { path: 'FB_B.st', content: b },
    ]);

    assert.equal(idx.files.length, 2);
    assert.equal(getDefinitions(idx, 'cfg').length, 2); // appears in both FBs
  });

  it('malformed file does not break the index', () => {
    const idx = indexSources([
      { path: 'good.st', content: 'FUNCTION_BLOCK FB_Good\nEND_FUNCTION_BLOCK' },
      { path: 'weird.st', content: '###not valid st###' },
    ]);
    assert.ok(getDefinitions(idx, 'FB_Good').length >= 1);
  });
});

describe('st-index — integration (bundled knowledge/library corpus)', () => {
  it('indexes the corpus and finds known FBs/types/GVLs', async () => {
    const idx = await buildProjectIndex('knowledge/library');
    assert.ok(idx.files.length >= 30, `expected >=30 files, got ${idx.files.length}`);
    assert.ok(idx.topLevelByName.size > 0);
    assert.ok(
      getDefinitions(idx, 'FB_PidController').some(d => d.kind === 'functionBlock'),
      'FB_PidController should be indexed as functionBlock',
    );
  });
});

describe('st-index — positions (locator) and findReferences (Stage 2)', () => {
  const fbT = `FUNCTION_BLOCK FB_T
VAR
  nCount : INT;   (* nCount in the comment does NOT count *)
END_VAR
nCount := nCount + 1;
msg := 'nCount in a string';
END_FUNCTION_BLOCK`;

  it('locator assigns position (line) to the declaration', () => {
    const idx = indexSources([{ path: 'FB_T.st', content: fbT }]);
    assert.equal(getDefinitions(idx, 'nCount')[0].position?.line, 3);
    assert.equal(getDefinitions(idx, 'FB_T')[0].position?.line, 1);
  });

  it('findReferences ignores comment/string and excludes declaration by default', () => {
    const idx = indexSources([{ path: 'FB_T.st', content: fbT }]);
    const refs = findReferences(idx, 'nCount');
    assert.equal(refs.length, 2);                 // 2 uses in body; comment/string/decl excluded
    assert.ok(refs.every(r => r.position.line === 5));
    assert.ok(refs.every(r => r.containerPou === 'FB_T'));
    assert.ok(refs.every(r => !r.isDefinitionSite));

    const withDecl = findReferences(idx, 'nCount', { includeDeclaration: true });
    assert.equal(withDecl.length, 3);
    assert.ok(withDecl.some(r => r.isDefinitionSite));
  });

  it('resolves qualified access E_X.MEMBER via qualifier, cross-file', () => {
    const enumSt = `{attribute 'qualified_only'}
TYPE E_Mode :
( OFF := 0, ON := 1 ) INT := OFF;
END_TYPE`;
    const prgSt = `PROGRAM PRG_X
VAR
  eMode : E_Mode;
END_VAR
eMode := E_Mode.ON;
IF eMode = E_Mode.OFF THEN ; END_IF
END_PROGRAM`;
    const idx = indexSources([
      { path: 'E_Mode.st', content: enumSt },
      { path: 'PRG_X.st', content: prgSt },
    ]);

    const onRefs = findReferences(idx, 'ON');
    assert.ok(onRefs.some(r => r.disambiguation.some(d => d.includes('member of E_Mode'))));

    const modeRefs = findReferences(idx, 'E_Mode');
    assert.ok(modeRefs.length >= 2);
    assert.ok(modeRefs.every(r => r.containerPou === 'PRG_X')); // decl in E_Mode.st stays out
  });
});
