(* =============================================================
   FB_Blink — LED/Output Blink Pattern Generator

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Generates a blinking output with configurable on/off times.
   Useful for status LEDs, warning indicators, HMI feedback.

   Usage:
     fbBlink : FB_Blink;
     fbBlink(bEnable := TRUE, tOnTime := T#500MS, tOffTime := T#500MS);
     bLedOutput := fbBlink.bOut;
   ============================================================= *)
FUNCTION_BLOCK FB_Blink
VAR_INPUT
    bEnable     : BOOL;                (* Enable blinking *)
    tOnTime     : TIME := T#500MS;     (* ON duration *)
    tOffTime    : TIME := T#500MS;     (* OFF duration *)
END_VAR
VAR_OUTPUT
    bOut        : BOOL;                (* Blinking output *)
END_VAR
VAR
    tonOn       : TON;
    tonOff      : TON;
END_VAR

IF NOT bEnable THEN
    bOut := FALSE;
    tonOn(IN := FALSE, PT := tOnTime);
    tonOff(IN := FALSE, PT := tOffTime);
    RETURN;
END_IF

IF NOT bOut THEN
    tonOff(IN := TRUE, PT := tOffTime);
    IF tonOff.Q THEN
        bOut := TRUE;
        tonOff(IN := FALSE, PT := tOffTime);
    END_IF
ELSE
    tonOn(IN := TRUE, PT := tOnTime);
    IF tonOn.Q THEN
        bOut := FALSE;
        tonOn(IN := FALSE, PT := tOnTime);
    END_IF
END_IF

END_FUNCTION_BLOCK
