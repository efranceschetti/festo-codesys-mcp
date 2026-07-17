(* =============================================================
   FB_BrakeMotor — Motor with Electromagnetic Brake

   Category:     Motion
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls a motor with electromagnetic holding brake.
   Sequence: Release brake → wait → start motor (and reverse on stop).
   Prevents mechanical shock from simultaneous brake/motor switching.

   Usage:
     fbHoist : FB_BrakeMotor;
     fbHoist(bStart := bCmdHoist, bOverload := bDI_HoistOL);
     bMotorOut := fbHoist.bContactor;
     bBrakeOut := fbHoist.bBrakeRelease;
   ============================================================= *)
FUNCTION_BLOCK FB_BrakeMotor
VAR_INPUT
    bStart          : BOOL;                (* Start command *)
    bOverload       : BOOL := TRUE;        (* Thermal overload (NC) *)
    tBrakeDelay     : TIME := T#300MS;     (* Brake release delay before motor start *)
    tBrakeApply     : TIME := T#200MS;     (* Motor stop delay before brake apply *)
    bEnable         : BOOL := TRUE;        (* Enable control *)
    bReset          : BOOL;                (* Reset error *)
END_VAR
VAR_OUTPUT
    bContactor      : BOOL;                (* Motor contactor output *)
    bBrakeRelease   : BOOL;                (* Brake release output (TRUE=released) *)
    bRunning        : BOOL;                (* Motor is running *)
    bErr          : BOOL;                (* Error active *)
    nErrId          : DINT;                (* 0=OK, 1=Overload *)
END_VAR
VAR
    nState          : INT := 0;
    tonBrakeRel     : TON;
    tonBrakeApp     : TON;
END_VAR

(* Reset *)
IF bReset AND bErr THEN
    nState := 0;
    bErr := FALSE;
    nErrId := 0;
END_IF

(* Overload — immediate stop *)
IF NOT bOverload THEN
    bContactor := FALSE;
    bBrakeRelease := FALSE;
    bRunning := FALSE;
    bErr := TRUE;
    nErrId := 1;
    nState := 10;
    RETURN;
END_IF

IF NOT bEnable THEN
    bContactor := FALSE;
    bBrakeRelease := FALSE;
    bRunning := FALSE;
    nState := 0;
    RETURN;
END_IF

CASE nState OF
0: (* Stopped — brake applied *)
    bContactor := FALSE;
    bBrakeRelease := FALSE;
    bRunning := FALSE;
    tonBrakeRel(IN := FALSE, PT := tBrakeDelay);
    tonBrakeApp(IN := FALSE, PT := tBrakeApply);

    IF bStart THEN
        nState := 1;
    END_IF

1: (* Releasing brake *)
    bBrakeRelease := TRUE;
    bContactor := FALSE;
    tonBrakeRel(IN := TRUE, PT := tBrakeDelay);

    IF tonBrakeRel.Q THEN
        nState := 2;
        tonBrakeRel(IN := FALSE, PT := tBrakeDelay);
    END_IF

    IF NOT bStart THEN
        nState := 0;
        bBrakeRelease := FALSE;
    END_IF

2: (* Running *)
    bContactor := TRUE;
    bBrakeRelease := TRUE;
    bRunning := TRUE;

    IF NOT bStart THEN
        nState := 3;
    END_IF

3: (* Stopping — motor off, brake delayed *)
    bContactor := FALSE;
    bBrakeRelease := TRUE;
    bRunning := FALSE;
    tonBrakeApp(IN := TRUE, PT := tBrakeApply);

    IF tonBrakeApp.Q THEN
        bBrakeRelease := FALSE;
        tonBrakeApp(IN := FALSE, PT := tBrakeApply);
        nState := 0;
    END_IF

10: (* Error *)
    bContactor := FALSE;
    bBrakeRelease := FALSE;
    bRunning := FALSE;

END_CASE

END_FUNCTION_BLOCK
