---
id: hungarian-notation
title: Hungarian Notation Rationale and Reference
priority: MEDIUM
use_when:
  - need detailed explanation of why PLC uses Hungarian notation
  - looking up complete prefix table including rare types
never_use_when:
  - already familiar with prefixes (use naming-conventions instead)
keywords: [Hungarian, prefix, b, n, r, t, fb, st, e, w, dw, BOOL, INT, REAL, TIME, type prefix, variable prefix, why prefixes, naming rationale, data type prefix, what prefix for type, prefix table]
see_also: [conventions, abbreviations]
---

# Hungarian Notation in PLC / IEC 61131-3 Programming

> FestoCodesysMCP convention reference — why we use it and how.

---

## Status: Active Standard in Industrial Automation

In general software development (C#, Java, Python, TypeScript), Hungarian Notation fell out of favor in the 2000s because:
- Modern IDEs provide rich IntelliSense and type inference
- Languages have strong static type systems
- Code readability improved without prefixes

**However, in PLC / IEC 61131-3 programming, Hungarian Notation remains the active standard** and is recommended by all major platforms.

### Why It's Still Essential for PLCs

| Reason | Explanation |
| ------ | ----------- |
| **No IntelliSense on HMIs** | Weintek EasyBuilder Pro and other HMI IDEs show flat variable lists — prefixes are the only way to quickly identify types |
| **Safety-Critical Code** | Mixing BOOL and INT on safety I/O can cause physical damage; visual type ID prevents this |
| **Cross-Platform Readability** | Code may run on CODESYS, TwinCAT, or TIA Portal — prefixes are universally understood |
| **Industry Consensus** | CODESYS, Beckhoff, Siemens, Festo, Bosch Rexroth all use and recommend it |
| **IEC 61131-3 Community** | PLCopen coding guidelines and IEC training materials use Hungarian Notation |
| **Variable Browser Limitations** | CODESYS online debugger shows variables in simple lists, prefixes help navigate |

---

## Data Type Prefixes

| Prefix | IEC 61131-3 Type | Example |
| ------ | ---------------- | ------- |
| `b` | BOOL | `bEnable`, `bDone`, `bErr` |
| `n` | INT, DINT, SINT, LINT | `nState`, `nErrId`, `nCount` |
| `u` | UINT, UDINT, USINT, ULINT | `uIndex`, `uSteps` |
| `r` | REAL, LREAL | `rPos`, `rVel`, `rAcc` |
| `w` | WORD | `wControlWord`, `wStatusWord` |
| `dw` | DWORD | `dwDiag` |
| `lw` | LWORD | `lwTimestamp` |
| `by` | BYTE | `byRawData` |
| `t` | TIME, LTIME | `tDelay`, `tCycleTime` |
| `s` | STRING | `sName`, `sErrMsg` |
| `ws` | WSTRING | `wsDisplay` |
| `a` | ARRAY | `anValues`, `arPositions` |
| `p` | POINTER | `pData` |
| `ref` | REFERENCE | `refAxis` |

---

## POU Type Prefixes

| Prefix | POU Type | Example |
| ------ | -------- | ------- |
| `FB_` | Function Block | `FB_ServoAxis`, `FB_ConveyorCtrl` |
| `FC_` | Function | `FC_ScaleAnalog`, `FC_BitToWord` |
| `PRG_` | Program | `PRG_Main`, `PRG_Motion` |
| `E_` | Enum | `E_MachState`, `E_AxisMode` |
| `ST_` | Struct | `ST_AxisCfg`, `ST_AlarmData` |
| `I_` | Interface | `I_Actuator`, `I_Sensor` |
| `GVL_` | Global Variable List | `GVL_IO`, `GVL_HMI`, `GVL_Sys` |
| `CONST_` | Constants GVL | `CONST_Limits`, `CONST_Timers` |

---

## Instance Prefixes

| Prefix | Instance Type | Example |
| ------ | ------------- | ------- |
| `fb` | FB instance | `fbPwr`, `fbHome`, `fbMoveAbs` |
| `ton` | TON timer | `tonDelay`, `tonWatchdog` |
| `tof` | TOF timer | `tofDebounce` |
| `ctu` | CTU counter | `ctuParts`, `ctuCycles` |
| `rtrig` | R_TRIG | `rtrigStart` |
| `ftrig` | F_TRIG | `ftrigStop` |
| `st` | Struct instance | `stAxisCfg`, `stAlarm` |
| `e` | Enum variable | `eMachState`, `eOpMode` |

---

## Naming Convention Summary

```
[prefix][PascalCaseName]
```

Examples:
- `bEnableAxis1` — BOOL, enable for Axis 1
- `rTargetPosition` — REAL, target position value
- `nErrorCode` — INT, error code
- `fbServoCtrl` — instance of FB_ServoCtrl
- `wControlWord` — WORD, CiA 402 controlword
- `eMachineState` — enum variable of type E_MachineState
- `stAxisConfig` — struct instance of type ST_AxisConfig
- `GVL_IO.bEmergencyStop` — qualified access to BOOL in GVL_IO

---

## Comparison: PLC vs General Software

| Aspect | General Software | PLC / IEC 61131-3 |
| ------ | ---------------- | ----------------- |
| Hungarian Notation | ❌ Deprecated | ✅ Active Standard |
| Reason | IDE IntelliSense, strong types | No HMI IntelliSense, safety-critical |
| Alternative | camelCase / snake_case | None — Hungarian IS the standard |
| Who recommends | Nobody (since ~2005) | CODESYS, Beckhoff, Siemens, Festo, PLCopen |
