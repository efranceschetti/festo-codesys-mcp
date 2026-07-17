(* =============================================================
   FB_PneumaticCylinder — Pneumatic Cylinder Controller

   Category:     Actuators
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls single-acting or double-acting pneumatic cylinders
   with optional limit switch feedback and timeout monitoring.

   Features:
   - Extend/retract commands with edge detection
   - Limit switch monitoring (extended/retracted sensors)
   - Configurable timeout for fault detection
   - Manual/auto mode support

   Usage:
     fbClamp : FB_PneumaticCylinder;
     fbClamp(bExtend := bCmdClamp, bRetract := bCmdUnclamp,
             bSnsExtended := bDI_ClampFwd, bSnsRetracted := bDI_ClampRev,
             tTimeout := T#3S);
     bClamped   := fbClamp.bExtended;
     bUnclamped := fbClamp.bRetracted;
     bFault     := fbClamp.bErr;
   ============================================================= *)
FUNCTION_BLOCK FB_PneumaticCylinder
VAR_INPUT
    bExtend         : BOOL;                (* Command: extend cylinder *)
    bRetract        : BOOL;                (* Command: retract cylinder *)
    bSnsExtended    : BOOL;                (* Sensor: fully extended *)
    bSnsRetracted   : BOOL;                (* Sensor: fully retracted *)
    tTimeout        : TIME := T#5S;        (* Motion timeout *)
    bDoubleActing   : BOOL := TRUE;        (* TRUE=double-acting, FALSE=spring-return *)
    bEnable         : BOOL := TRUE;        (* Enable control *)
    bReset          : BOOL;                (* Reset error *)
END_VAR
VAR_OUTPUT
    bSolExtend      : BOOL;                (* Solenoid: extend valve *)
    bSolRetract     : BOOL;                (* Solenoid: retract valve (double-acting only) *)
    bExtended       : BOOL;                (* Status: fully extended *)
    bRetracted      : BOOL;                (* Status: fully retracted *)
    bMoving         : BOOL;                (* Status: in motion *)
    bErr          : BOOL;                (* Error: timeout or sensor conflict *)
    nErrId          : DINT;                 (* 0=OK, 1=Extend timeout, 2=Retract timeout, 3=Sensor conflict *)
END_VAR
VAR
    nState          : INT := 0;            (* 0=Idle, 1=Extending, 2=Extended, 3=Retracting, 4=Retracted, 10=Error *)
    tonTimeout      : TON;
    rtrigExtend     : R_TRIG;
    rtrigRetract    : R_TRIG;
END_VAR

rtrigExtend(CLK := bExtend);
rtrigRetract(CLK := bRetract);

(* Sensor conflict detection *)
IF bSnsExtended AND bSnsRetracted THEN
    nState := 10;
    nErrId := 3;
    bErr := TRUE;
    bSolExtend := FALSE;
    bSolRetract := FALSE;
END_IF

(* Reset *)
IF bReset AND bErr THEN
    nState := 0;
    bErr := FALSE;
    nErrId := 0;
    tonTimeout(IN := FALSE, PT := tTimeout);
END_IF

IF NOT bEnable THEN
    bSolExtend := FALSE;
    bSolRetract := FALSE;
    bMoving := FALSE;
    RETURN;
END_IF

CASE nState OF
0: (* Idle *)
    bSolExtend := FALSE;
    bSolRetract := FALSE;
    bMoving := FALSE;
    bExtended := bSnsExtended;
    bRetracted := bSnsRetracted;

    IF rtrigExtend.Q AND NOT bSnsExtended THEN
        nState := 1;
    ELSIF rtrigRetract.Q AND NOT bSnsRetracted THEN
        nState := 3;
    END_IF

1: (* Extending *)
    bSolExtend := TRUE;
    IF bDoubleActing THEN bSolRetract := FALSE; END_IF
    bMoving := TRUE;
    tonTimeout(IN := TRUE, PT := tTimeout);

    IF bSnsExtended THEN
        nState := 2;
        tonTimeout(IN := FALSE, PT := tTimeout);
    ELSIF tonTimeout.Q THEN
        nState := 10;
        nErrId := 1;
        bErr := TRUE;
        bSolExtend := FALSE;
    END_IF

2: (* Extended — hold position *)
    bSolExtend := TRUE;
    IF bDoubleActing THEN bSolRetract := FALSE; END_IF
    bMoving := FALSE;
    bExtended := TRUE;
    bRetracted := FALSE;

    IF rtrigRetract.Q THEN
        nState := 3;
    END_IF

3: (* Retracting *)
    bSolExtend := FALSE;
    IF bDoubleActing THEN bSolRetract := TRUE; END_IF
    bMoving := TRUE;
    tonTimeout(IN := TRUE, PT := tTimeout);

    IF bSnsRetracted THEN
        nState := 4;
        tonTimeout(IN := FALSE, PT := tTimeout);
    ELSIF tonTimeout.Q THEN
        nState := 10;
        nErrId := 2;
        bErr := TRUE;
        IF bDoubleActing THEN bSolRetract := FALSE; END_IF
    END_IF

4: (* Retracted — hold position *)
    bSolExtend := FALSE;
    IF bDoubleActing THEN bSolRetract := FALSE; END_IF
    bMoving := FALSE;
    bExtended := FALSE;
    bRetracted := TRUE;

    IF rtrigExtend.Q THEN
        nState := 1;
    END_IF

10: (* Error *)
    bSolExtend := FALSE;
    bSolRetract := FALSE;
    bMoving := FALSE;

END_CASE

END_FUNCTION_BLOCK
