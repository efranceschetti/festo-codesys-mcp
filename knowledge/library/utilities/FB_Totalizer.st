(* =============================================================
   FB_Totalizer — Flow/Energy Integrator with Reset

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Integrates a rate value over time (e.g., liters/min → total liters,
   kW → kWh). Uses trapezoidal integration for accuracy.

   Usage:
     fbTotal : FB_Totalizer;
     fbTotal(bEnable := TRUE, rRate := rFlowLitersPerMin,
             tCycleTime := T#100MS, bReset := FALSE);
     rTotalLiters := fbTotal.rTotal;
   ============================================================= *)
FUNCTION_BLOCK FB_Totalizer
VAR_INPUT
    bEnable     : BOOL;                (* Enable integration *)
    rRate       : REAL := 0.0;         (* Rate value [units/time_base] *)
    tCycleTime  : TIME := T#100MS;     (* PLC scan cycle time *)
    rTimeBase   : REAL := 60.0;        (* Rate time base in seconds (60=per minute) *)
    bReset      : BOOL;                (* Reset total to zero *)
END_VAR
VAR_OUTPUT
    rTotal      : REAL := 0.0;         (* Accumulated total *)
    rPeakRate   : REAL := 0.0;         (* Peak rate recorded *)
END_VAR
VAR
    rPrevRate   : REAL := 0.0;
    rDtSec      : REAL;
END_VAR

IF bReset THEN
    rTotal := 0.0;
    rPeakRate := 0.0;
    rPrevRate := 0.0;
    RETURN;
END_IF

IF NOT bEnable THEN
    rPrevRate := rRate;
    RETURN;
END_IF

(* Convert cycle time to seconds *)
rDtSec := TIME_TO_REAL(tCycleTime) / 1000.0;

(* Trapezoidal integration: average of current and previous rate *)
IF rTimeBase > 0.0 THEN
    rTotal := rTotal + ((rRate + rPrevRate) / 2.0) * (rDtSec / rTimeBase);
END_IF

(* Track peak *)
IF rRate > rPeakRate THEN
    rPeakRate := rRate;
END_IF

rPrevRate := rRate;

END_FUNCTION_BLOCK
