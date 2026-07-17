(* =============================================================
   FB_Debounce — Digital Input Debounce Filter

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Filters noisy digital inputs using a TON timer. Output only
   changes after the input has been stable for tDebounce time.

   Usage:
     fbDebounce : FB_Debounce;
     fbDebounce(bIn := bRawInput, tDebounce := T#50MS);
     bFiltered := fbDebounce.bOut;
   ============================================================= *)
FUNCTION_BLOCK FB_Debounce
VAR_INPUT
    bIn         : BOOL;                (* Raw digital input *)
    tDebounce   : TIME := T#50MS;      (* Debounce time *)
END_VAR
VAR_OUTPUT
    bOut        : BOOL;                (* Filtered output *)
    bRising     : BOOL;                (* Rising edge detected *)
    bFalling    : BOOL;                (* Falling edge detected *)
END_VAR
VAR
    tonOn       : TON;
    tonOff      : TON;
    bPrev       : BOOL;
END_VAR

tonOn(IN := bIn, PT := tDebounce);
tonOff(IN := NOT bIn, PT := tDebounce);

IF tonOn.Q THEN
    bOut := TRUE;
ELSIF tonOff.Q THEN
    bOut := FALSE;
END_IF

bRising  := bOut AND NOT bPrev;
bFalling := NOT bOut AND bPrev;
bPrev    := bOut;

END_FUNCTION_BLOCK
