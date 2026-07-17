---
id: naming-conventions
title: PascalCase + Hungarian Notation Rules
priority: CRITICAL
use_when:
  - writing any Structured Text code
  - reviewing code for naming compliance
  - creating new variables, FBs, or POUs
never_use_when:
  - reading existing code without modification intent
keywords: [naming, PascalCase, Hungarian, prefix, convention, variable, FB_, PRG_, E_, ST_, variable naming, how to name a variable, how should I name, coding standard, identifier, style guide, naming rules, name a variable, symbol name, capitalization, signal namespacing, bus signal naming, group signal owner, single writer, one writer per signal, shared sensor ownership, who owns a signal, fault is a signal not a group, GVL_IO direction, comment hygiene, no bug refs in code, invariant not history, no version comments, comment rules]
see_also: [abbreviations, hungarian-notation, state-machines]
---

# FestoCodesysMCP Naming Conventions

> **Standard**: PascalCase + Hungarian Notation
> **Language**: English only (variables AND comments)
> **Authority**: This document is the single source of truth for all naming.

---

## 1. Hungarian Notation Prefixes

### Variable Prefixes

| Prefix | Data Type        | Example                    |
|--------|------------------|----------------------------|
| `b`    | BOOL             | `bEnable`, `bDone`, `bErr` |
| `n`    | INT / DINT       | `nState`, `nErrId`         |
| `u`    | UINT / UDINT     | `uCount`, `uIdx`           |
| `r`    | REAL / LREAL     | `rPos`, `rVel`, `rAcc`     |
| `w`    | WORD             | `wStsWord`, `wCtrlWord`    |
| `dw`   | DWORD            | `dwActPos`                 |
| `t`    | TIME             | `tDelay`, `tTimeout`       |
| `s`    | STRING           | `sMsg`, `sAlarmTxt`        |
| `a`    | ARRAY            | `arPos`, `anCounts`        |
| `st`   | STRUCT instance  | `stAxisCfg`, `stRecipe`    |
| `e`    | ENUM instance    | `eMachState`, `eAxisState` |
| `fb`   | FB instance      | `fbPwr`, `fbHome`          |
| `p`    | POINTER TO       | `pData`                    |
| `ref`  | REFERENCE TO     | `refAxis`                  |

### Array Prefix Composition

Arrays combine `a` + element type prefix:
- `ar` = ARRAY OF REAL → `arPositions`
- `an` = ARRAY OF INT → `anErrorCodes`
- `ab` = ARRAY OF BOOL → `abFlags`
- `ast` = ARRAY OF STRUCT → `astRecipes`

### Type Definition Prefixes

| Prefix  | Object Type      | Example                 |
|---------|------------------|-------------------------|
| `FB_`   | Function Block   | `FB_ServoAxis`          |
| `PRG_`  | Program          | `PRG_Main`              |
| `FC_`   | Function         | `FC_ScaleVal`           |
| `E_`    | Enumeration      | `E_MachState`           |
| `ST_`   | Structure        | `ST_AxisCfg`            |
| `I_`    | Interface        | `I_Actuator`            |
| `GVL_`  | Global Var List  | `GVL_Sys`               |

### Scope Prefixes (optional, for GVLs)

| Prefix  | Scope            | Example                 |
|---------|------------------|-------------------------|
| `g_`    | Global variable  | `g_nMachState`          |
| `c_`    | Constant         | `c_rMaxVel`             |
| `gc_`   | Global constant  | `gc_nMaxAxes`           |

---

## 2. PascalCase Rules

- **Type names**: `FB_ServoAxis`, `E_MachState`, `ST_AxisCfg`
- **Variables**: prefix + PascalCase → `bEnablePwr`, `rActPos`, `nErrId`
- **Methods**: PascalCase → `Execute`, `Reset`, `GetStatus`
- **Properties**: PascalCase → `IsReady`, `Position`, `ErrorCode`
- **Enum values**: UPPER_SNAKE → `IDLE`, `RUNNING`, `ERROR_TIMEOUT`

---

## 3. Signal Namespacing — `<type><Group>_<Signal>` (status-bus & HMI GVLs)

For **logical signals** in a status-bus GVL (e.g. `GVL_Handshake`) or an HMI GVL (`GVL_HMI`),
the name is **`<typePrefix><Group>_<Signal>`**, and the underscore exists **only** to separate
Group from Signal. One symmetric pattern, **no exceptions** (no legacy, no "for now").

Principle: **PATTERN · SYMMETRY · SIMPLICITY** — reading one signal teaches you to read all.

1. **Exactly ONE `_`**, between Group and Signal. (The `_` in type tags `GVL_`/`FB_`/`E_` and
   scope prefixes `g_`/`c_` lives in the *type/scope* name — never in a signal name.)
2. **One canonical Group token per owner** (the single writer). The same owner never appears
   under two group names (no `Table`/`HeatPos`/`DonePos`; no `Tank`/`Preheat`/`TankHeater`).
3. **No internal type prefix.** `bCfg_bHasX` → `bCfg_HasX`; `sCfg_sName` → `sCfg_Name`.
4. **Nothing flat.** Every signal has a group; globals get a `Main`/`Sys` group.
5. **Fault is a signal of the subsystem, never a group:** `bFault_X` → `bX_Fault`,
   `nFault_X` → `nX_FaultCode`.

```text
✅  bSafe_Ok   bConvIn_PartReady   bTable_Indexed   nMain_BlockReason   bHmiUser_DeleteBtn
❌  bManualMode (flat)            bFault_Table (fault as group)
    bHmiConfig_bHasTable (inner prefix)   bHeatPos_PartReady (owner is Table)
    bHmiConfigSaveBtn (missing group `_`)
```

> **Physical-I/O GVL (`GVL_IO`) is exempt from grouping** — it is named by physical *direction*,
> symmetric and IEC-aligned: `i` digital input (`AT %IX`), `q` digital output (`AT %QX`),
> `n` analog word with a **mandatory direction suffix** — `Pv` input (`nTankTempPv`), `Sp` output
> (`nGenPowerSp`). `i`/`q` mirror IEC 61131-3 `%I`/`%Q` (the standard uses `Q`, not `O`, because
> `O`≈`0`). This replaces the old asymmetric `y`/`b` scheme (`b` was a *type* prefix, not a
> direction). `GVL_IO` is the only GVL without `Group_` namespacing.

A lint gate (`test_lint_consistency.py`) enforces `^<type><Group>_<Signal>$` against a canonical
group table and rejects flat names, multiple `_`, inner type prefixes, and faults-as-group.

### Signal ownership — single writer, and where a shared sensor belongs

The group token is not cosmetic: it encodes **ownership**. Two rules follow from it.

1. **One writer per signal.** Exactly one POU may *write* a given bus signal (its owner); everyone
   else only reads it. Two writers = silent clobber (the last one to run in the scan wins). The
   canonical Group *is* that owner — which is why an owner has a single group token.
2. **A shared input belongs to the object it *monitors*, not the one that *consumes* it.** When a
   sensor serves several stations, assign it to the function of the **physical object it observes**,
   never to a downstream consumer. Example: an optical sensor at a rotary table's load position
   detects a part in the fixture — it monitors the **table**, so it belongs to the `Table` group,
   even though two pick stations read it. Same logic as an E-stop belonging to `Safe`, not to each
   axis. Rule of thumb: *sensor monitors state of X → it belongs to X; if it serves many, it
   belongs to the object being observed, and consumers subscribe to that one published signal.*

This keeps coordination flowing through published bus signals (one owner each) instead of many
stations reading the same raw I/O point directly.

---

## 4. Standard FB Interface Pattern

Every Function Block MUST follow:

```iecst
FUNCTION_BLOCK FB_TemplateName
VAR_INPUT
    bEnable     : BOOL;     // Enable block
    bExecute    : BOOL;     // Rising edge trigger
END_VAR
VAR_OUTPUT
    bDone       : BOOL;     // Operation complete
    bBusy       : BOOL;     // Operation in progress
    bErr        : BOOL;     // Error occurred
    nErrId      : DINT;     // Error code (0 = none)
END_VAR
VAR
    nState      : INT := 0; // State machine
END_VAR
```

---

## 5. State Machine Numbering

| Value | State        | Description               |
|-------|-------------|---------------------------|
| 0     | IDLE        | Waiting for command       |
| 10    | INIT        | Initialization            |
| 20-80 | WORK_n      | Working states (step 10)  |
| 90    | DONE        | Operation complete        |
| 99    | ERROR       | Error state               |

---

## 6. Comment Rules

- **Language**: English ONLY
- **Style**: `//` for inline, `(* *)` for block
- **Required at**: FB header, state machine cases, non-obvious logic
- **Prohibited**: Redundant comments (`bEnable := TRUE; // Set enable to true`)

### Comment hygiene — describe the invariant, not the history

A comment explains **what the code does now** — its current contract or invariant — not how it
got there. Change history is the job of `CHANGELOG.md` and the git log; a comment ages and lies,
git blame does not.

**Keep out of code** (`.st`, `.py`, headers, inline):

- Bug/ticket references — `F26 FIX`, `Bug v7`, `Fix #123`
- Revision dates — `Updated: 2026-05-11`, `Refactor 2026-05-11`
- Version diffs — `v8 vs v7`, `v7 deprecated`, `preserved from v6`
- Names of internal tools or processes

```iecst
// bad  — history, belongs in CHANGELOG/git
(* F23 fix: TON must reset on E-stop *)

// good — the live invariant, explains WHY
(* TON must reset on E-stop, otherwise the count accumulates across cycles *)
```

An FB/PRG header should carry name, purpose, state/error-code legend, and design contracts — never
`Refactor`/`Updated`/`Revision` lines. If the refactor story matters to someone, it lives in
`CHANGELOG.md` or the commit message.
