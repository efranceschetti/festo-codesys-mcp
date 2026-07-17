(* =============================================================
   FB_SolenoidValve — Solenoid Valve Controller

   Category:     Actuators
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls a normally-closed or normally-open solenoid valve
   with optional position feedback sensor and stuck-valve detection.

   Usage:
     fbValve : FB_SolenoidValve;
     fbValve(bOpen := bCmdOpenValve, bFeedback := bDI_ValveOpen,
             tFeedbackDelay := T#2S);
     bValveIsOpen := fbValve.bIsOpen;
   ============================================================= *)
FUNCTION_BLOCK FB_SolenoidValve
VAR_INPUT
    bOpen           : BOOL;                (* Command: open valve *)
    bFeedback       : BOOL;                (* Feedback sensor: valve open *)
    bUseFeedback    : BOOL := FALSE;       (* Enable feedback monitoring *)
    tFeedbackDelay  : TIME := T#2S;        (* Feedback timeout *)
    bNormallyOpen   : BOOL := FALSE;       (* TRUE=NO valve, FALSE=NC valve *)
    bEnable         : BOOL := TRUE;        (* Enable control *)
    bReset          : BOOL;                (* Reset error *)
END_VAR
VAR_OUTPUT
    bSolenoid       : BOOL;                (* Solenoid output *)
    bIsOpen         : BOOL;                (* Valve is open *)
    bIsClosed       : BOOL;                (* Valve is closed *)
    bErr          : BOOL;                (* Stuck valve error *)
    nErrId          : DINT;                 (* 0=OK, 1=Stuck open, 2=Stuck closed *)
END_VAR
VAR
    tonFeedback     : TON;
    bExpectedState  : BOOL;
END_VAR

IF bReset THEN
    bErr := FALSE;
    nErrId := 0;
    tonFeedback(IN := FALSE, PT := tFeedbackDelay);
END_IF

IF NOT bEnable THEN
    bSolenoid := bNormallyOpen;  (* De-energize = safe state *)
    bIsOpen := bNormallyOpen;
    bIsClosed := NOT bNormallyOpen;
    RETURN;
END_IF

(* Drive solenoid *)
IF bNormallyOpen THEN
    bSolenoid := NOT bOpen;  (* Energize to close *)
ELSE
    bSolenoid := bOpen;      (* Energize to open *)
END_IF

(* Status *)
IF bUseFeedback THEN
    bIsOpen := bFeedback;
    bIsClosed := NOT bFeedback;

    (* Stuck detection *)
    bExpectedState := bOpen;
    IF bFeedback <> bExpectedState THEN
        tonFeedback(IN := TRUE, PT := tFeedbackDelay);
        IF tonFeedback.Q AND NOT bErr THEN
            bErr := TRUE;
            IF bOpen AND NOT bFeedback THEN
                nErrId := 2; (* Stuck closed *)
            ELSE
                nErrId := 1; (* Stuck open *)
            END_IF
        END_IF
    ELSE
        tonFeedback(IN := FALSE, PT := tFeedbackDelay);
    END_IF
ELSE
    bIsOpen := bOpen;
    bIsClosed := NOT bOpen;
END_IF

END_FUNCTION_BLOCK
