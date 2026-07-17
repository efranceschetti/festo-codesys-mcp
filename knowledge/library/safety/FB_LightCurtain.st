(* =============================================================
   FB_LightCurtain — Safety Light Curtain Monitor

   Category:     Safety
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Monitors a dual-channel safety light curtain (OSSD outputs).
   Detects discrepancy between channels, provides muting support
   for material pass-through.

   Usage:
     fbCurtain : FB_LightCurtain;
     fbCurtain(bOSSD1 := bDI_Curtain_Ch1, bOSSD2 := bDI_Curtain_Ch2,
               bMuteRequest := bMuteActive);
     bCurtainOK := fbCurtain.bSafe;
   ============================================================= *)
FUNCTION_BLOCK FB_LightCurtain
VAR_INPUT
    bOSSD1          : BOOL;                (* OSSD channel 1 (TRUE=clear) *)
    bOSSD2          : BOOL;                (* OSSD channel 2 (TRUE=clear) *)
    bMuteRequest    : BOOL;                (* Muting request (bypass curtain) *)
    tDiscrepancy    : TIME := T#200MS;     (* Max channel discrepancy time *)
    tMuteMaxTime    : TIME := T#60S;       (* Maximum muting duration *)
    bEnable         : BOOL := TRUE;        (* Enable monitoring *)
    bReset          : BOOL;                (* Reset errors *)
END_VAR
VAR_OUTPUT
    bSafe           : BOOL;                (* Curtain clear / safe *)
    bIntrusion      : BOOL;                (* Object detected in field *)
    bMuted          : BOOL;                (* Curtain is muted *)
    bDiscrepancy    : BOOL;                (* Channel discrepancy fault *)
    bErr          : BOOL;                (* Error active *)
    nErrId          : DINT;                 (* 0=OK, 1=Intrusion, 2=Discrepancy, 3=Mute timeout *)
END_VAR
VAR
    tonDiscrep      : TON;
    tonMute         : TON;
    bBothClear      : BOOL;
    rtrigReset      : R_TRIG;
END_VAR

rtrigReset(CLK := bReset);

IF NOT bEnable THEN
    bSafe := FALSE;
    RETURN;
END_IF

bBothClear := bOSSD1 AND bOSSD2;

(* Discrepancy detection *)
tonDiscrep(IN := (bOSSD1 XOR bOSSD2), PT := tDiscrepancy);
IF tonDiscrep.Q AND NOT bDiscrepancy THEN
    bDiscrepancy := TRUE;
    bErr := TRUE;
    nErrId := 2;
END_IF

(* Muting *)
IF bMuteRequest AND NOT bDiscrepancy THEN
    bMuted := TRUE;
    tonMute(IN := TRUE, PT := tMuteMaxTime);
    IF tonMute.Q THEN
        bMuted := FALSE;
        bErr := TRUE;
        nErrId := 3;
    END_IF
ELSE
    bMuted := FALSE;
    tonMute(IN := FALSE, PT := tMuteMaxTime);
END_IF

(* Safe output *)
IF bDiscrepancy THEN
    bSafe := FALSE;
    bIntrusion := FALSE;
ELSIF bMuted THEN
    bSafe := TRUE;
    bIntrusion := FALSE;
ELSE
    bSafe := bBothClear;
    bIntrusion := NOT bBothClear;
    IF bIntrusion THEN
        nErrId := 1;
    ELSIF NOT bErr THEN
        nErrId := 0;
    END_IF
END_IF

(* Reset *)
IF rtrigReset.Q THEN
    bDiscrepancy := FALSE;
    bErr := FALSE;
    nErrId := 0;
    tonMute(IN := FALSE, PT := tMuteMaxTime);
END_IF

END_FUNCTION_BLOCK
