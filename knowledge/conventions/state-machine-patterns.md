---
id: state-machine-patterns
title: IEC 61131-3 State Machine Patterns
priority: HIGH
use_when:
  - creating a new Function Block with sequential logic
  - implementing CASE-based state machines
  - need standard state numbering (0=IDLE, 10-80=work, 90=DONE, 99=ERROR)
never_use_when:
  - simple combinational logic without states
keywords: [state machine, CASE, nState, IDLE, DONE, ERROR, sequential, transition, sequential logic, step sequence, CASE OF, state transition, FB state, step machine, nState pattern, how to structure a function block, stepper sequence logic, work states]
see_also: [conventions, motion-patterns]
---

# State Machine Patterns

> Standard state machine patterns for IEC 61131-3 Function Blocks.

---

## Standard Pattern

```iecst
CASE nState OF
    0: // IDLE
        bDone := FALSE;
        bBusy := FALSE;
        bErr := FALSE;
        nErrId := 0;
        IF bEnable AND bExecute THEN
            bBusy := TRUE;
            nState := 10;
        END_IF

    10: // INIT
        // Initialization / precondition check
        IF bPreCondOk THEN
            nState := 20;
        ELSIF bTimeout THEN
            nErrId := 16#8001;
            nState := 99;
        END_IF

    20: // EXECUTING
        // Main work
        IF bWorkDone THEN
            nState := 90;
        ELSIF bFaultDetected THEN
            nErrId := 16#8010;
            nState := 99;
        END_IF

    90: // DONE
        bDone := TRUE;
        bBusy := FALSE;
        IF NOT bExecute THEN
            nState := 0;  // Auto-reset on falling edge
        END_IF

    99: // ERROR
        bErr := TRUE;
        bBusy := FALSE;
        IF NOT bExecute THEN
            bErr := FALSE;
            nErrId := 0;
            nState := 0;
        END_IF
END_CASE
```

## Error Code Convention

| Range           | Category            |
|-----------------|---------------------|
| `16#0000`       | No error            |
| `16#8001-800F`  | Initialization      |
| `16#8010-801F`  | Communication       |
| `16#8020-802F`  | Motion              |
| `16#8030-803F`  | Process             |
| `16#8040-804F`  | Safety              |
| `16#80F0-80FF`  | Internal / Generic  |

## Motion Sequence Pattern

```iecst
CASE nState OF
    0: // IDLE
        IF bExecute THEN
            nState := 10;
        END_IF

    10: // POWER ON
        fbPwr(Axis := stAxis, Enable := TRUE,
              Enable_Positive := TRUE, Enable_Negative := TRUE);
        IF fbPwr.Status THEN
            nState := 20;
        ELSIF fbPwr.Error THEN
            nErrId := 16#8020;
            nState := 99;
        END_IF

    20: // HOME
        fbHom(Axis := stAxis, Execute := TRUE, Position := 0.0);
        IF fbHom.Done THEN
            fbHom(Axis := stAxis, Execute := FALSE);
            nState := 30;
        ELSIF fbHom.Error THEN
            nErrId := 16#8021;
            nState := 99;
        END_IF

    30: // READY - waiting for move commands
        bRdy := TRUE;
        IF bMoveCmd THEN
            bRdy := FALSE;
            nState := 40;
        END_IF

    40: // MOVING
        fbMoveAbs(Axis := stAxis, Execute := TRUE,
                  Position := rTgtPos, Velocity := rMaxVel);
        IF fbMoveAbs.Done THEN
            fbMoveAbs(Axis := stAxis, Execute := FALSE);
            nState := 30;
        ELSIF fbMoveAbs.Error THEN
            nErrId := 16#8022;
            nState := 99;
        END_IF

    90: // DONE
        bDone := TRUE;

    99: // ERROR
        fbPwr(Axis := stAxis, Enable := FALSE);
        bErr := TRUE;
END_CASE
```

## Parallel Multi-Axis Pattern

```iecst
// Use separate state variables for each axis
nStateX : INT;  // X-axis state
nStateZ : INT;  // Z-axis state

// Coordinate via flags
bXready : BOOL;
bZready : BOOL;

// Both axes ready = proceed
IF bXready AND bZready THEN
    nSeqState := NEXT_STEP;
END_IF
```
