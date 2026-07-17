(* =============================================================
   FB_StandardMotor — Direct-On-Line Motor with Contactor

   Category:     Motion
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls a standard DOL motor with contactor feedback,
   start delay, and overload protection monitoring.

   Usage:
     fbPump : FB_StandardMotor;
     fbPump(bStart := bCmdPump, bFeedback := bDI_PumpContactor,
            bOverload := bDI_PumpOL);
     bPumpOutput := fbPump.bContactor;
     bPumpRunning := fbPump.bRunning;
   ============================================================= *)
FUNCTION_BLOCK FB_StandardMotor
VAR_INPUT
    bStart          : BOOL;                (* Start command *)
    bFeedback       : BOOL;                (* Contactor feedback (aux contact) *)
    bOverload       : BOOL;                (* Thermal overload relay (NC) *)
    bUseFeedback    : BOOL := FALSE;       (* Enable feedback monitoring *)
    tStartDelay     : TIME := T#0S;        (* Delay before start *)
    tFeedbackTime   : TIME := T#3S;        (* Contactor feedback timeout *)
    bEnable         : BOOL := TRUE;        (* Enable control *)
    bReset          : BOOL;                (* Reset error *)
END_VAR
VAR_OUTPUT
    bContactor      : BOOL;                (* Contactor output *)
    bRunning        : BOOL;                (* Motor is running *)
    bErr          : BOOL;                (* Error active *)
    nErrId          : DINT;                (* 0=OK, 1=Overload, 2=No feedback, 3=Lost feedback *)
END_VAR
VAR
    nState          : INT := 0;
    tonDelay        : TON;
    tonFeedback     : TON;
END_VAR

(* Reset *)
IF bReset AND bErr THEN
    nState := 0;
    bErr := FALSE;
    nErrId := 0;
END_IF

(* Overload trip — immediate stop *)
IF NOT bOverload THEN
    bContactor := FALSE;
    bRunning := FALSE;
    bErr := TRUE;
    nErrId := 1;
    nState := 10;
    RETURN;
END_IF

IF NOT bEnable THEN
    bContactor := FALSE;
    bRunning := FALSE;
    nState := 0;
    RETURN;
END_IF

CASE nState OF
0: (* Stopped *)
    bContactor := FALSE;
    bRunning := FALSE;
    tonDelay(IN := FALSE, PT := tStartDelay);
    tonFeedback(IN := FALSE, PT := tFeedbackTime);

    IF bStart THEN
        nState := 1;
    END_IF

1: (* Start delay *)
    tonDelay(IN := TRUE, PT := tStartDelay);
    IF tonDelay.Q OR tStartDelay = T#0S THEN
        bContactor := TRUE;
        nState := 2;
        tonDelay(IN := FALSE, PT := tStartDelay);
    END_IF

    IF NOT bStart THEN
        nState := 0;
        tonDelay(IN := FALSE, PT := tStartDelay);
    END_IF

2: (* Starting — waiting for feedback *)
    bContactor := TRUE;
    IF bUseFeedback THEN
        tonFeedback(IN := NOT bFeedback, PT := tFeedbackTime);
        IF bFeedback THEN
            bRunning := TRUE;
            nState := 3;
            tonFeedback(IN := FALSE, PT := tFeedbackTime);
        ELSIF tonFeedback.Q THEN
            bContactor := FALSE;
            bErr := TRUE;
            nErrId := 2;
            nState := 10;
        END_IF
    ELSE
        bRunning := TRUE;
        nState := 3;
    END_IF

    IF NOT bStart THEN
        nState := 0;
        bContactor := FALSE;
    END_IF

3: (* Running *)
    bContactor := TRUE;
    bRunning := TRUE;

    (* Lost feedback while running *)
    IF bUseFeedback AND NOT bFeedback THEN
        bContactor := FALSE;
        bRunning := FALSE;
        bErr := TRUE;
        nErrId := 3;
        nState := 10;
    END_IF

    IF NOT bStart THEN
        nState := 0;
        bContactor := FALSE;
        bRunning := FALSE;
    END_IF

10: (* Error *)
    bContactor := FALSE;
    bRunning := FALSE;

END_CASE

END_FUNCTION_BLOCK
