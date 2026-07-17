(* =============================================================
   FB_ScaleInt — Linear INT Value Scaling

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Maps an input INT from one range to another. Internal
   calculation uses REAL to avoid integer overflow.

   Usage:
     fbScale : FB_ScaleInt;
     fbScale(nIn := nAdcRaw, nInMin := 0, nInMax := 4095,
             nOutMin := 0, nOutMax := 1000);
     nEngValue := fbScale.nOut;
   ============================================================= *)
FUNCTION_BLOCK FB_ScaleInt
VAR_INPUT
    nIn     : INT;             (* Input value *)
    nInMin  : INT := 0;       (* Input range minimum *)
    nInMax  : INT := 4095;    (* Input range maximum *)
    nOutMin : INT := 0;       (* Output range minimum *)
    nOutMax : INT := 1000;    (* Output range maximum *)
    bClamp  : BOOL := TRUE;   (* Clamp output to OutMin..OutMax *)
END_VAR
VAR_OUTPUT
    nOut    : INT;             (* Scaled output *)
    bErr  : BOOL;            (* Division by zero *)
END_VAR
VAR
    rTemp   : REAL;
    nRange  : INT;
END_VAR

nRange := nInMax - nInMin;
IF nRange = 0 THEN
    bErr := TRUE;
    nOut := nOutMin;
    RETURN;
END_IF

bErr := FALSE;
rTemp := INT_TO_REAL(nIn - nInMin) / INT_TO_REAL(nRange)
         * INT_TO_REAL(nOutMax - nOutMin) + INT_TO_REAL(nOutMin);
nOut := REAL_TO_INT(rTemp);

IF bClamp THEN
    IF nOut > nOutMax THEN nOut := nOutMax;
    ELSIF nOut < nOutMin THEN nOut := nOutMin;
    END_IF
END_IF

END_FUNCTION_BLOCK
