(* =============================================================
   FB_Hysteresis — On/Off Control with Deadband

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Implements hysteresis switching: output turns ON when input
   exceeds rSetpoint + rHysteresis/2, turns OFF when input drops
   below rSetpoint - rHysteresis/2. Prevents oscillation.

   Usage:
     fbHyst : FB_Hysteresis;
     fbHyst(rIn := rTemperature, rSetpoint := 50.0, rHysteresis := 4.0);
     bHeaterOn := fbHyst.bOut;
   ============================================================= *)
FUNCTION_BLOCK FB_Hysteresis
VAR_INPUT
    rIn         : REAL;            (* Process value *)
    rSetpoint   : REAL := 50.0;    (* Target setpoint *)
    rHysteresis : REAL := 4.0;     (* Total hysteresis band *)
    bInvert     : BOOL := FALSE;   (* Invert output logic *)
END_VAR
VAR_OUTPUT
    bOut        : BOOL;            (* Control output *)
END_VAR
VAR
    rHigh       : REAL;
    rLow        : REAL;
END_VAR

rHigh := rSetpoint + rHysteresis / 2.0;
rLow  := rSetpoint - rHysteresis / 2.0;

IF rIn >= rHigh THEN
    bOut := NOT bInvert;
ELSIF rIn <= rLow THEN
    bOut := bInvert;
END_IF
(* Between rLow and rHigh: output retains previous state *)

END_FUNCTION_BLOCK
