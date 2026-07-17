/**
 * ST Parser Tests
 * Validates parsing of IEC 61131-3 Structured Text files.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseStFile } from '../utils/st-parser.js';

describe('ST Parser — Function Blocks', () => {
  it('parses a basic function block with all var sections', () => {
    const st = `FUNCTION_BLOCK FB_Motor
VAR_INPUT
    bEnable : BOOL;
    rSpeed : REAL := 0.0;
END_VAR
VAR_OUTPUT
    bRunning : BOOL;
    bErr : BOOL;
    nErrId : DINT;
END_VAR
VAR_IN_OUT
    stAxis : ST_AxisConfig;
END_VAR
VAR
    nState : INT := 0;
    fbTimer : TON;
END_VAR

CASE nState OF
    0: // IDLE
        ;
    99: // ERROR
        bErr := TRUE;
END_CASE
END_FUNCTION_BLOCK`;

    const result = parseStFile(st, 'FB_Motor.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;

    assert.equal(result.pou.name, 'FB_Motor');
    assert.equal(result.pou.pouType, 'functionBlock');
    assert.equal(result.pou.inputVars?.length, 2);
    assert.equal(result.pou.outputVars?.length, 3);
    assert.equal(result.pou.inOutVars?.length, 1);
    assert.equal(result.pou.localVars?.length, 2);

    // Check input var details
    assert.equal(result.pou.inputVars?.[0].name, 'bEnable');
    assert.equal(result.pou.inputVars?.[0].type, 'BOOL');
    assert.equal(result.pou.inputVars?.[1].name, 'rSpeed');
    assert.equal(result.pou.inputVars?.[1].initialValue, '0.0');

    // Check body contains logic
    assert.ok(result.pou.body.includes('CASE nState OF'));
  });

  it('parses a function block with no vars', () => {
    const st = `FUNCTION_BLOCK FB_Empty
END_FUNCTION_BLOCK`;

    const result = parseStFile(st, 'FB_Empty.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.name, 'FB_Empty');
    assert.equal(result.pou.pouType, 'functionBlock');
  });
});

describe('ST Parser — Programs', () => {
  it('parses a program', () => {
    const st = `PROGRAM PRG_Main
VAR
    nState : INT := 0;
    bStart : BOOL;
END_VAR

CASE nState OF
    0: // IDLE
        ;
END_CASE
END_PROGRAM`;

    const result = parseStFile(st, 'PRG_Main.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.name, 'PRG_Main');
    assert.equal(result.pou.pouType, 'program');
    assert.equal(result.pou.localVars?.length, 2);
  });
});

describe('ST Parser — Functions', () => {
  it('parses a function with return type', () => {
    const st = `FUNCTION FC_Add : REAL
VAR_INPUT
    rA : REAL;
    rB : REAL;
END_VAR

FC_Add := rA + rB;
END_FUNCTION`;

    const result = parseStFile(st, 'FC_Add.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.name, 'FC_Add');
    assert.equal(result.pou.pouType, 'function');
    assert.equal(result.pou.returnType, 'REAL');
    assert.equal(result.pou.inputVars?.length, 2);
  });
});

describe('ST Parser — Data Types', () => {
  it('parses an enum type', () => {
    const st = `TYPE E_MachState :
(
    IDLE := 0,
    RUNNING := 10,
    ERROR := 99
);
END_TYPE`;

    const result = parseStFile(st, 'E_MachState.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.name, 'E_MachState');
    assert.equal(result.dataType.kind, 'enum');
    assert.equal(result.dataType.members.length, 3);
    assert.equal(result.dataType.members[0].name, 'IDLE');
    assert.equal(result.dataType.members[0].value, '0');
    assert.equal(result.dataType.members[2].name, 'ERROR');
    assert.equal(result.dataType.members[2].value, '99');
  });

  it('parses a struct type', () => {
    const st = `TYPE ST_AxisConfig :
STRUCT
    rMaxVel : REAL;
    rMaxAcc : REAL;
    nHomingMethod : INT;
END_STRUCT
END_TYPE`;

    const result = parseStFile(st, 'ST_AxisConfig.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.name, 'ST_AxisConfig');
    assert.equal(result.dataType.kind, 'struct');
    assert.equal(result.dataType.members.length, 3);
    assert.equal(result.dataType.members[0].name, 'rMaxVel');
    assert.equal(result.dataType.members[0].type, 'REAL');
  });
});

describe('ST Parser — GVLs', () => {
  it('parses a global variable list', () => {
    const st = `{attribute 'qualified_only'}
VAR_GLOBAL
    bSysRdy : BOOL;
    nErrCode : DINT;
END_VAR`;

    const result = parseStFile(st, 'GVL_Sys.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.name, 'GVL_Sys');
    assert.equal(result.gvl.variables.length, 2);
    assert.equal(result.gvl.isConstant, false);
  });

  it('parses a constant GVL', () => {
    const st = `VAR_GLOBAL CONSTANT
    nMaxAxes : INT := 8;
END_VAR`;

    const result = parseStFile(st, 'GVL_Const.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.isConstant, true);
    assert.equal(result.gvl.variables[0].name, 'nMaxAxes');
    assert.equal(result.gvl.variables[0].initialValue, '8');
  });

  it('parses variables with comments', () => {
    const st = `{attribute 'qualified_only'}
VAR_GLOBAL
    bReady : BOOL; // System ready flag
    rTemp : REAL := 25.0; // Default temperature
END_VAR`;

    const result = parseStFile(st, 'GVL_Test.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.variables[0].comment, 'System ready flag');
    assert.equal(result.gvl.variables[1].comment, 'Default temperature');
  });
});

describe('ST Parser — Function returnType (F3-024)', () => {
  it('test_regression_function_simple_returntype', () => {
    // Pre-existing contract: FUNCTION FName : INT.
    const st = `FUNCTION FAdd : INT
VAR_INPUT
    a : INT;
    b : INT;
END_VAR
FAdd := a + b;
END_FUNCTION`;
    const result = parseStFile(st, 'FAdd.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.pouType, 'function');
    assert.equal(result.pou.returnType, 'INT');
  });

  it('parses ARRAY return type', () => {
    const st = `FUNCTION FGetVec : ARRAY[0..3] OF REAL
VAR_INPUT
    nIdx : INT;
END_VAR
END_FUNCTION`;
    const result = parseStFile(st, 'FGetVec.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.returnType, 'ARRAY[0..3] OF REAL');
  });

  it('parses POINTER TO return type', () => {
    const st = `FUNCTION FGetRef : POINTER TO ST_Axis
VAR_INPUT
    nId : INT;
END_VAR
END_FUNCTION`;
    const result = parseStFile(st, 'FGetRef.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.returnType, 'POINTER TO ST_Axis');
  });
});

describe('ST Parser — Block Comments (F3-046)', () => {
  it('test_regression_enum_no_comments', () => {
    // Pre-existing contract: a simple enum with no comments parses OK.
    const st = `TYPE E_State :
(
    IDLE := 0,
    RUNNING := 10,
    ERROR := 99
);
END_TYPE`;
    const result = parseStFile(st, 'E_State.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.kind, 'enum');
    assert.equal(result.dataType.members.length, 3);
  });

  it('handles nested block comments in enum body', () => {
    // (* outer (* inner *) *) — pre-fix lazy regex left an orphan ` *)`
    // that confused the enum members parser.
    const st = `TYPE E_Mode :
(* Outer comment (* with nested *) inside *)
(
    AUTO := 0,
    MANUAL := 1
);
END_TYPE`;
    const result = parseStFile(st, 'E_Mode.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.kind, 'enum');
    assert.equal(result.dataType.members.length, 2);
    assert.equal(result.dataType.members[0].name, 'AUTO');
    assert.equal(result.dataType.members[1].name, 'MANUAL');
  });
});

describe('ST Parser — Case Sensitivity (F3-022 regression coverage)', () => {
  it('test_regression_var_input_uppercase_preservation', () => {
    // Ensures UPPERCASE always parses — pre-existing contract,
    // must not regress even after adopting case-insensitive.
    const st = `FUNCTION_BLOCK FB_Upper
VAR_INPUT
    bEnable : BOOL;
END_VAR
VAR_OUTPUT
    bDone : BOOL;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_Upper.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 1);
    assert.equal(result.pou.outputVars?.length, 1);
    assert.equal(result.pou.inputVars?.[0].name, 'bEnable');
  });

  it('parses lowercase keywords (var_input, end_var, function_block)', () => {
    // IEC 61131-3 section 2.1.1 defines the language as case-insensitive.
    // Pre-fix of F3-022, this test failed (regex without /i flag).
    const st = `function_block fb_lower
var_input
    bEnable : BOOL;
end_var
var_output
    bDone : BOOL;
end_var
end_function_block`;
    const result = parseStFile(st, 'fb_lower.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 1);
    assert.equal(result.pou.outputVars?.length, 1);
  });

  it('parses MIXED case keywords (Var_Input, End_Var)', () => {
    // CODESYS V3.5 also accepts mixed-case.
    const st = `Function_Block FB_Mixed
Var_Input
    rSpeed : REAL;
End_Var
End_Function_Block`;
    const result = parseStFile(st, 'FB_Mixed.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 1);
    assert.equal(result.pou.inputVars?.[0].type, 'REAL');
  });
});

// ────────────────────────────────────────────────────────────────────
// Parsing regressions found in real GVLs/POUs during development.
// Each case below covers a specific parser bug (A/B/E/F).
// ────────────────────────────────────────────────────────────────────

describe('ST Parser — Bug A: AT %X hardware mapping', () => {
  it('GVL with AT %IX/QX/IW/QW vars preserves all', () => {
    // Pre-fix: vars with `AT %X` were silently skipped by the regex.
    // A real GVL_IO had 83 vars; only 3 survived (the ones without AT %).
    const st = `VAR_GLOBAL
    bEmergencyOk     AT %IX0.0 : BOOL;
    bDoorRelayOk     AT %IX0.1 : BOOL;
    nFlowRate        AT %IW3.0 : INT;
    yMotorMain       AT %QX2.0 : BOOL;
    nGenPower        AT %QW4.0 : INT;
    bSomeFlag        : BOOL;   (* sem AT %X — funciona desde sempre *)
END_VAR`;
    const result = parseStFile(st, 'GVL_IO.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.variables.length, 6, 'all 6 vars must be parsed');
    assert.equal(result.gvl.variables[0].name, 'bEmergencyOk');
    assert.equal(result.gvl.variables[0].type, 'BOOL');
    assert.equal(result.gvl.variables[2].name, 'nFlowRate');
    assert.equal(result.gvl.variables[2].type, 'INT');
  });
});

describe('ST Parser — Bug B: multiple VAR_GLOBAL blocks', () => {
  it('GVL with 3 VAR_GLOBAL blocks (normal + PERSISTENT RETAIN + normal) preserves all', () => {
    // Pre-fix: only the 1st block was parsed. A real GVL
    // had 75 vars in 3 blocks; only 48 from the 1st survived.
    const st = `VAR_GLOBAL
    bX1 : BOOL;
    bX2 : BOOL;
END_VAR
VAR_GLOBAL PERSISTENT RETAIN
    aSlots : ARRAY[0..3] OF INT;
    nCycle : DINT;
END_VAR
VAR_GLOBAL
    bY1 : BOOL;
    bY2 : BOOL;
    bY3 : BOOL;
END_VAR`;
    const result = parseStFile(st, 'GVL_Multi.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.variables.length, 7,
      '3 blocks * (2+2+3) = 7 vars must be parsed');
    const names = result.gvl.variables.map(v => v.name);
    assert.ok(names.includes('bX1'));
    assert.ok(names.includes('aSlots'));
    assert.ok(names.includes('nCycle'));
    assert.ok(names.includes('bY3'));
  });
});

describe('ST Parser — Bug D: separate VAR CONSTANT', () => {
  it('POU with VAR + VAR CONSTANT emits separate localConstantVars', () => {
    // Pre-fix: VAR CONSTANT became normal localVars without constant="true".
    // CODESYS complains C0218 "CASE label requires literal or symbolic
    // integer constant" for CASE nState OF cIDLE: ...
    const st = `FUNCTION_BLOCK FB_StateMachine
VAR
    nState : INT;
    fbTimer : TON;
END_VAR
VAR CONSTANT
    cIDLE       : INT := 0;
    cWORKING    : INT := 10;
    cDONE       : INT := 90;
    cERROR      : INT := 99;
END_VAR
CASE nState OF
    cIDLE: ;
END_CASE
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_StateMachine.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.localVars?.length, 2, 'normal VAR has 2 vars');
    assert.equal(result.pou.localConstantVars?.length, 4, 'VAR CONSTANT has 4 vars');
    assert.equal(result.pou.localConstantVars?.[0].name, 'cIDLE');
    assert.equal(result.pou.localConstantVars?.[0].initialValue, '0');
    assert.equal(result.pou.localConstantVars?.[3].name, 'cERROR');
    assert.equal(result.pou.localConstantVars?.[3].initialValue, '99');
  });
});

describe('ST Parser — Bug E: array initializer multi-line', () => {
  it('parses ARRAY OF REAL := [...] spread over multiple lines', () => {
    // Pre-fix: line-by-line parser did not find the final ; → var lost.
    // A real multi-line ARRAY OF REAL required single-line.
    const st = `PROGRAM PRG_Test
VAR
    arAngles : ARRAY[0..15] OF REAL := [
        0.0, 30.0, 60.0, 90.0,
        120.0, 150.0, 180.0, 210.0,
        240.0, 270.0, 300.0, 330.0,
        0.0, 0.0, 0.0, 0.0
    ];
    nCount : INT := 12;
END_VAR
END_PROGRAM`;
    const result = parseStFile(st, 'PRG_Test.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.localVars?.length, 2, 'arAngles + nCount = 2 vars');
    assert.equal(result.pou.localVars?.[0].name, 'arAngles');
    assert.ok(result.pou.localVars?.[0].type.startsWith('ARRAY'),
      `type must start with ARRAY (got: ${result.pou.localVars?.[0].type})`);
    assert.equal(result.pou.localVars?.[1].name, 'nCount');
    assert.equal(result.pou.localVars?.[1].initialValue, '12');
  });
});

describe('ST Parser — Bug F: 1st var after own-line comment', () => {
  // Regression introduced by the Bug C fix: the 1st declaration right after an
  // `(* ... *)` comment on ITS OWN LINE inside a section was discarded.
  // Cause: the range slice came from the ORIGINAL (comments preserved for
  // trailing inline), so the leading comment ended up BEFORE the var name and
  // the declRe `^(\w+)` did not match → var lost.

  it('VAR_INPUT — own-line comment does not swallow the 1st var', () => {
    const st = `FUNCTION_BLOCK FB_BugF
VAR_INPUT
    (* Comentario em linha propria *)
    bFirst : BOOL;
    bSecond : BOOL;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugF.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 2, 'bFirst + bSecond = 2 vars');
    assert.equal(result.pou.inputVars?.[0].name, 'bFirst');
    assert.equal(result.pou.inputVars?.[1].name, 'bSecond');
  });

  it('VAR (local) — own-line comment does not swallow the 1st var', () => {
    const st = `FUNCTION_BLOCK FB_BugFLocal
VAR
    (* counters *)
    nA : INT;
    nB : INT;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFLocal.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.localVars?.length, 2, 'nA + nB = 2 vars');
    assert.equal(result.pou.localVars?.[0].name, 'nA');
    assert.equal(result.pou.localVars?.[1].name, 'nB');
  });

  it('VAR_OUTPUT — own-line comment does not swallow the 1st var', () => {
    const st = `FUNCTION_BLOCK FB_BugFOut
VAR_OUTPUT
    (* outputs *)
    bDone : BOOL;
    bErr : BOOL;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFOut.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.outputVars?.length, 2, 'bDone + bErr = 2 vars');
    assert.equal(result.pou.outputVars?.[0].name, 'bDone');
  });

  it('VAR_IN_OUT — own-line comment does not swallow the 1st var', () => {
    const st = `FUNCTION_BLOCK FB_BugFInOut
VAR_IN_OUT
    (* refs *)
    stAxis : ST_AxisConfig;
    stCfg : ST_Config;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFInOut.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inOutVars?.length, 2, 'stAxis + stCfg = 2 vars');
    assert.equal(result.pou.inOutVars?.[0].name, 'stAxis');
  });

  it('VAR CONSTANT — own-line comment does not swallow the 1st const', () => {
    const st = `FUNCTION_BLOCK FB_BugFConst
VAR CONSTANT
    (* machine states *)
    cIDLE : INT := 0;
    cRUN : INT := 10;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFConst.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.localConstantVars?.length, 2, 'cIDLE + cRUN = 2 consts');
    assert.equal(result.pou.localConstantVars?.[0].name, 'cIDLE');
    assert.equal(result.pou.localConstantVars?.[0].initialValue, '0');
  });

  it('VAR_GLOBAL — own-line comment does not swallow the 1st var', () => {
    const st = `VAR_GLOBAL
    (* section 1 *)
    bX1 : BOOL;
    bX2 : BOOL;
END_VAR`;
    const result = parseStFile(st, 'GVL_BugF.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.variables.length, 2, 'bX1 + bX2 = 2 vars');
    assert.equal(result.gvl.variables[0].name, 'bX1');
    assert.equal(result.gvl.variables[1].name, 'bX2');
  });

  it('MULTI-LINE own-line comment does not swallow the following var', () => {
    // Bug C variant: a 2+ line comment before the only var made
    // inputVars come out empty.
    const st = `FUNCTION_BLOCK FB_BugFMulti
VAR_INPUT
    (* Comment with "quotes" and (parentheses) and a special symbol
       second line of the comment *)
    bEnable : BOOL;
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFMulti.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 1, 'bEnable must survive');
    assert.equal(result.pou.inputVars?.[0].name, 'bEnable');
  });

  it('leading comment does NOT become the var comment (trailing inline still works)', () => {
    // Ensures we remove only the LEADING comment; trailing inline `// ...`
    // or `(* ... *)` after the `;` still becomes the comment field.
    const st = `FUNCTION_BLOCK FB_BugFComment
VAR_INPUT
    (* inputs section *)
    bEnable : BOOL; // enables the cycle
END_VAR
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_BugFComment.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.equal(result.pou.inputVars?.length, 1);
    assert.equal(result.pou.inputVars?.[0].name, 'bEnable');
    assert.equal(result.pou.inputVars?.[0].comment, 'enables the cycle',
      'trailing inline comment must be preserved, not the leading one');
  });
});

// ── P2.0 regression suite — generator bugs confirmed against production use ──
// Each test below guards a bug that was reproduced against the real pipeline
// before being fixed. Do not weaken these assertions.

describe('ST Parser — P2.0 regressions', () => {
  it('GVL: VAR_GLOBAL PERSISTENT RETAIN sets isPersistent and isRetain', () => {
    const st = `VAR_GLOBAL PERSISTENT RETAIN
    nCount : INT;
END_VAR`;
    const result = parseStFile(st, 'GVL_Persist.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.isPersistent, true, 'PERSISTENT modifier must be captured');
    assert.equal(result.gvl.isRetain, true, 'RETAIN modifier must be captured');
    assert.equal(result.gvl.isConstant, false);
    assert.equal(result.gvl.variables.length, 1);
  });

  it('GVL: VAR_GLOBAL RETAIN sets isRetain only (no persistent cross-contamination)', () => {
    const st = `VAR_GLOBAL RETAIN
    nRet : INT;
END_VAR`;
    const result = parseStFile(st, 'GVL_Ret.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.isRetain, true);
    assert.ok(!result.gvl.isPersistent, 'plain RETAIN must not set isPersistent');
  });

  it('GVL: VAR_GLOBAL CONSTANT sets isConstant only (no retain/persistent)', () => {
    const st = `VAR_GLOBAL CONSTANT
    cMax : INT := 10;
END_VAR`;
    const result = parseStFile(st, 'GVL_Const.st');
    assert.equal(result.kind, 'gvl');
    if (result.kind !== 'gvl') return;
    assert.equal(result.gvl.isConstant, true);
    assert.ok(!result.gvl.isRetain, 'CONSTANT must not set isRetain');
    assert.ok(!result.gvl.isPersistent, 'CONSTANT must not set isPersistent');
  });

  it("datatype: {attribute 'qualified_only'} pragma is captured on enums", () => {
    const st = `{attribute 'qualified_only'}
TYPE E_Color : (Red, Green, Blue); END_TYPE`;
    const result = parseStFile(st, 'E_Color.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.qualifiedOnly, true, 'pragma must be captured');
    assert.equal(result.dataType.members.length, 3);
  });

  it("datatype: {attribute 'qualified_only'} pragma is captured on structs", () => {
    const st = `{attribute 'qualified_only'}
TYPE ST_Cfg :
STRUCT
    nMax : INT;
END_STRUCT
END_TYPE`;
    const result = parseStFile(st, 'ST_Cfg.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.equal(result.dataType.qualifiedOnly, true);
  });

  it('datatype: enum WITHOUT the pragma has no qualifiedOnly', () => {
    const st = 'TYPE E_Plain : (A, B); END_TYPE';
    const result = parseStFile(st, 'E_Plain.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.ok(!result.dataType.qualifiedOnly, 'no pragma → no qualifiedOnly');
  });

  it('VAR block: NESTED multi-line comment between declarations must not swallow the next var', () => {
    const st = `FUNCTION_BLOCK FB_NestedComment
VAR
    a : INT;
    (* outer (* inner *) still *)
    b : INT;
END_VAR
a := b;
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_NestedComment.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    const names = result.pou.localVars?.map(v => v.name);
    assert.deepEqual(names, ['a', 'b'],
      'variable after a NESTED block comment must survive (silent-loss family)');
  });

  it('VAR block: plain multi-line comment between declarations keeps both vars (Bug F guard)', () => {
    const st = `FUNCTION_BLOCK FB_PlainComment
VAR
    a : INT;
    (* this is a
       multi-line comment *)
    b : INT;
END_VAR
a := b;
END_FUNCTION_BLOCK`;
    const result = parseStFile(st, 'FB_PlainComment.st');
    assert.equal(result.kind, 'pou');
    if (result.kind !== 'pou') return;
    assert.deepEqual(result.pou.localVars?.map(v => v.name), ['a', 'b']);
  });

  it('enum: typed enum with explicit default keeps all members (Bug H guard)', () => {
    const st = 'TYPE E_Mode : (Idle := 0, Run := 1, Stop := 2) INT := Idle; END_TYPE';
    const result = parseStFile(st, 'E_Mode.st');
    assert.equal(result.kind, 'dataType');
    if (result.kind !== 'dataType') return;
    assert.deepEqual(result.dataType.members,
      [{ name: 'Idle', value: '0' }, { name: 'Run', value: '1' }, { name: 'Stop', value: '2' }]);
  });
});
