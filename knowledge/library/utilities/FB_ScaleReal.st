(* =============================================================
   FB_ScaleReal — Linear REAL Value Scaling

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Maps an input REAL from one range to another using linear
   interpolation. Optionally clamps output to limits.

   Usage:
     fbScale : FB_ScaleReal;
     fbScale(rIn := rRawAdc, rInMin := 0.0, rInMax := 32767.0,
             rOutMin := 0.0, rOutMax := 100.0, bClamp := TRUE);
     rPercent := fbScale.rOut;
   ============================================================= *)
FUNCTION_BLOCK FB_ScaleReal
VAR_INPUT
    rIn     : REAL;                (* Input value *)
    rInMin  : REAL := 0.0;        (* Input range minimum *)
    rInMax  : REAL := 32767.0;    (* Input range maximum *)
    rOutMin : REAL := 0.0;        (* Output range minimum *)
    rOutMax : REAL := 100.0;      (* Output range maximum *)
    bClamp  : BOOL := TRUE;       (* Clamp output to OutMin..OutMax *)
END_VAR
VAR_OUTPUT
    rOut    : REAL;                (* Scaled output *)
    bErr  : BOOL;               (* Division by zero (InMax = InMin) *)
END_VAR
VAR
    rRange  : REAL;
END_VAR

rRange := rInMax - rInMin;
IF ABS(rRange) < 1.0E-10 THEN
    bErr := TRUE;
    rOut := rOutMin;
    RETURN;
END_IF

bErr := FALSE;
rOut := (rIn - rInMin) / rRange * (rOutMax - rOutMin) + rOutMin;

IF bClamp THEN
    IF rOut > rOutMax THEN rOut := rOutMax;
    ELSIF rOut < rOutMin THEN rOut := rOutMin;
    END_IF
END_IF

END_FUNCTION_BLOCK
