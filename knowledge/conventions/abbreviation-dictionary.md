---
id: abbreviation-dictionary
title: Standard PLC Abbreviations
priority: CRITICAL
use_when:
  - writing any Structured Text code
  - naming variables, FBs, or parameters
  - reviewing code for abbreviation consistency
never_use_when:
  - reading existing code without modification
keywords: [abbreviation, Pos, Vel, Acc, Dec, Pwr, Drv, Mtr, Cmd, Sts, Err, Flt, Rst, Rdy, shorthand, short names, standard terms, acronym, abbreviate, Ref, Act, Set, what does this prefix mean, name too long]
see_also: [conventions, hungarian-notation]
---

# FestoCodesysMCP Abbreviation Dictionary

> **Rule**: Use these standard abbreviations consistently across ALL code.
> **Rationale**: Keeps variable names short, readable, and industry-standard.
> **Format**: PascalCase with Hungarian prefix → `rActPos`, `bPwrRdy`

---

## Motion Control

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Pos`       | Position        | `rActPos`, `rRefPos`   |
| `Vel`       | Velocity        | `rActVel`, `rMaxVel`   |
| `Acc`       | Acceleration    | `rAcc`, `rMaxAcc`      |
| `Dec`       | Deceleration    | `rDec`, `rEmgDec`      |
| `Jrk`       | Jerk            | `rJrk`                 |
| `Spd`       | Speed           | `rSpd`, `rSpdRef`      |
| `Trq`       | Torque          | `rTrq`, `rTrqLim`      |
| `Home`      | Home / Homing   | `bHomeDone`, `fbHome`  |
| `Jog`       | Jog             | `bJogFwd`, `bJogRev`   |
| `Brk`       | Brake           | `bBrkRls`, `bBrkEng`   |
| `Ovr`       | Override        | `rSpdOvr`, `rTrqOvr`   |
| `Abs`       | Absolute        | `rAbsPos`              |
| `Rel`       | Relative        | `rRelDist`             |

## Power & Drive

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Pwr`       | Power           | `bPwrOn`, `bPwrRdy`   |
| `Drv`       | Drive           | `fbDrv`, `eDrvState`   |
| `Mtr`       | Motor           | `fbMtr`, `bMtrRun`     |
| `Srv`       | Servo           | `fbSrv`, `stSrvCfg`    |
| `Vfd`       | VFD (inverter)  | `fbVfd`, `rVfdSpd`     |
| `Enb`       | Enable          | `bEnbPwr`, `bEnbPos`   |
| `Dis`       | Disable         | `bDisDrv`              |

## Signals & Status

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Cmd`       | Command         | `bRunCmd`, `bStpCmd`   |
| `Sts`       | Status          | `wStsWord`, `nSts`     |
| `Ref`       | Reference       | `rPosRef`, `rSpdRef`   |
| `Act`       | Actual          | `rActPos`, `rActVel`   |
| `Set`       | Setpoint        | `rTmpSet`, `rPrsSet`   |
| `Fbk`       | Feedback        | `rPosFbk`, `bSenFbk`  |
| `Rdy`       | Ready           | `bAxisRdy`, `bSysRdy` |
| `Rqst`      | Request         | `bRqstHom`, `bRqstRst` |
| `Ack`       | Acknowledge     | `bAlmAck`, `bErrAck`  |

## Error & Safety

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Err`       | Error           | `bErr`, `nErrId`       |
| `Flt`       | Fault           | `bFlt`, `nFltCode`     |
| `Alm`       | Alarm           | `bAlm`, `stAlmData`    |
| `Wrn`       | Warning         | `bWrn`, `nWrnId`       |
| `Rst`       | Reset           | `bErrRst`, `bFltRst`   |
| `Emg`       | Emergency       | `bEmgStp`, `bEmgAct`   |
| `Saf`       | Safety          | `bSafOk`, `bSafGate`   |
| `Intlk`     | Interlock       | `bIntlkOk`             |

## Direction & Movement

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Fwd`       | Forward         | `bFwd`, `bJogFwd`     |
| `Rev`       | Reverse         | `bRev`, `bJogRev`     |
| `Ext`       | Extend          | `bCylExt`              |
| `Ret`       | Retract         | `bCylRet`              |
| `Opn`       | Open            | `bVlvOpn`              |
| `Cls`       | Close           | `bVlvCls`, `bDoorCls` |
| `Stp`       | Stop            | `bStp`, `bEmgStp`     |
| `Hlt`       | Halt            | `bHlt`                 |
| `Run`       | Run             | `bRun`, `bMtrRun`     |

## Process Control

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Tmp`       | Temperature     | `rTmp`, `rTmpAct`      |
| `Prs`       | Pressure        | `rPrs`, `rPrsAct`      |
| `Flw`       | Flow            | `rFlw`, `rFlwRate`     |
| `Lvl`       | Level           | `rLvl`, `rTankLvl`     |
| `Hum`       | Humidity        | `rHum`                 |
| `Cnt`       | Count / Counter | `nCnt`, `nPartCnt`     |
| `Tmr`       | Timer           | `fbTmr`, `tTmrDelay`  |
| `Cyc`       | Cycle           | `nCycCnt`, `tCycTime`  |
| `Seq`       | Sequence        | `nSeqStep`             |
| `Rcp`       | Recipe          | `stRcp`, `nRcpIdx`     |

## Limits & Range

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Max`       | Maximum         | `rMaxVel`, `nMaxRetry` |
| `Min`       | Minimum         | `rMinPos`, `rMinTmp`   |
| `Lim`       | Limit           | `bPosLim`, `bNegLim`   |
| `Hi`        | High            | `bHiLvl`, `rHiLim`     |
| `Lo`        | Low             | `bLoLvl`, `rLoLim`     |
| `Nom`       | Nominal         | `rNomSpd`, `rNomTrq`   |
| `Tol`       | Tolerance       | `rPosTol`              |

## Hardware & I/O

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Sen`       | Sensor          | `bSenProx`, `rSenTmp` |
| `Cyl`       | Cylinder        | `fbCyl`, `bCylExt`     |
| `Vlv`       | Valve           | `fbVlv`, `bVlvOpn`    |
| `Sol`       | Solenoid        | `bSolOn`               |
| `Pmp`       | Pump            | `fbPmp`, `bPmpRun`     |
| `Fan`       | Fan             | `fbFan`, `bFanRun`     |
| `Htr`       | Heater          | `fbHtr`, `bHtrOn`      |
| `Clr`       | Cooler          | `fbClr`, `bClrOn`      |
| `Conv`      | Conveyor        | `fbConv`, `bConvRun`   |
| `Btn`       | Button          | `bBtnStart`, `bBtnStp` |
| `Lmp`       | Lamp            | `bLmpGrn`, `bLmpRed`  |
| `Sw`        | Switch          | `bSwAuto`, `bSwMan`    |

## System & Communication

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Sys`       | System          | `bSysRdy`, `eSysState` |
| `Cfg`       | Configuration   | `stAxisCfg`, `stSysCfg`|
| `Prm`       | Parameter       | `stPrm`, `rPrmVal`     |
| `Init`      | Initialize      | `bInitDone`            |
| `Cal`       | Calibration     | `bCalDone`, `rCalOfs`  |
| `Diag`      | Diagnostic      | `stDiag`, `nDiagCode`  |
| `Comm`      | Communication   | `bCommOk`, `bCommErr`  |
| `Idx`       | Index           | `nIdx`, `nRcpIdx`      |
| `Buf`       | Buffer          | `aBuf`, `nBufLen`      |
| `Flg`       | Flag            | `bFlgDone`             |
| `Tsk`       | Task            | `eTskState`            |
| `Mch`       | Machine         | `eMchState`, `stMchCfg`|

## Time & Duration

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Dly`       | Delay           | `tDly`, `tOnDly`       |
| `Dur`       | Duration        | `tDur`, `tCycDur`      |
| `Tout`      | Timeout         | `tTout`, `bTout`       |
| `Intv`      | Interval        | `tIntv`, `tScanIntv`   |
| `Elps`      | Elapsed         | `tElps`                |

## HMI & Visualization

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Hmi`       | HMI             | `stHmiData`            |
| `Dsp`       | Display         | `rDspVal`, `sDspMsg`   |
| `Inp`       | Input (user)    | `rInpVal`, `sInpTxt`   |
| `Vis`       | Visualization   | `bVisAlm`, `nVisPage`  |
| `Scr`       | Screen          | `nScrNum`              |
| `Nav`       | Navigation      | `nNavPage`             |

## Production & Quality

| Abbreviation | Full Term       | Example Variable       |
|-------------|-----------------|------------------------|
| `Prd`       | Production      | `nPrdCnt`, `stPrdData` |
| `Qly`       | Quality         | `bQlyOk`, `nQlyCode`   |
| `Btch`      | Batch           | `nBtchId`, `stBtchData`|
| `Part`      | Part            | `nPartCnt`, `sPartId`  |
| `Rej`       | Reject          | `nRejCnt`, `bRejPart`  |
| `Good`      | Good (parts)    | `nGoodCnt`             |
| `Oee`       | OEE             | `rOee`                 |

---

## Composition Rules

1. **Prefix + Noun + Context**: `rActPos` (REAL, Actual, Position)
2. **Max 20 chars**: Keep names concise but readable
3. **No double abbreviations**: `rAP` is NOT allowed → use `rActPos`
4. **Combine freely**: `bPwrRdy` = BOOL + Power + Ready
5. **Array**: type goes in prefix → `arPos` = ARRAY OF REAL Positions

## Examples of Well-Named Variables

```iecst
// Motion
rActPos         : REAL;     // Actual position [mm]
rRefVel         : REAL;     // Reference velocity [mm/s]
rMaxAcc         : REAL;     // Maximum acceleration [mm/s2]
bHomDone        : BOOL;     // Homing complete
bAxisRdy        : BOOL;     // Axis ready for motion
nErrId          : DINT;     // Error identification code

// Process
rTmpAct         : REAL;     // Actual temperature [C]
rPrsSet         : REAL;     // Pressure setpoint [bar]
bPmpRun         : BOOL;     // Pump running status
nCycCnt         : UDINT;    // Cycle counter

// Safety
bEmgStp         : BOOL;     // Emergency stop active
bSafOk          : BOOL;     // Safety circuit OK
bIntlkOk        : BOOL;     // Interlock satisfied
```
