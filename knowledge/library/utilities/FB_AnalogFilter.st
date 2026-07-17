(* =============================================================
   FB_AnalogFilter — First-Order Low-Pass / Moving Average Filter

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Smooths noisy analog signals. Supports two modes:
   - LOW_PASS: Exponential moving average (alpha = tCycle / tFilter)
   - MOVING_AVG: Simple moving average over nSamples

   Usage:
     fbFilter : FB_AnalogFilter;
     fbFilter(rIn := rRawAnalog, nMode := 0, rFilterFactor := 0.1);
     rSmooth := fbFilter.rOut;
   ============================================================= *)
FUNCTION_BLOCK FB_AnalogFilter
VAR_INPUT
    rIn             : REAL;            (* Raw input value *)
    nMode           : INT := 0;        (* 0=Low-pass, 1=Moving average *)
    rFilterFactor   : REAL := 0.1;     (* Low-pass alpha (0.0-1.0, lower=smoother) *)
    nSamples        : INT := 10;       (* Moving average window size (max 32) *)
    bReset          : BOOL;            (* Reset filter to current input *)
END_VAR
VAR_OUTPUT
    rOut            : REAL;            (* Filtered output *)
END_VAR
VAR
    bInit           : BOOL := FALSE;
    (* Moving average buffer *)
    aBuffer         : ARRAY[0..31] OF REAL;
    nIndex          : INT := 0;
    rSum            : REAL := 0.0;
    nCount          : INT := 0;
END_VAR

IF bReset OR NOT bInit THEN
    rOut := rIn;
    bInit := TRUE;
    rSum := 0.0;
    nIndex := 0;
    nCount := 0;
    bReset := FALSE;
END_IF

CASE nMode OF
0: (* Low-pass exponential filter *)
    rOut := rOut + rFilterFactor * (rIn - rOut);

1: (* Moving average *)
    IF nSamples < 1 THEN nSamples := 1; END_IF
    IF nSamples > 32 THEN nSamples := 32; END_IF

    rSum := rSum - aBuffer[nIndex] + rIn;
    aBuffer[nIndex] := rIn;
    nIndex := nIndex + 1;
    IF nIndex >= nSamples THEN
        nIndex := 0;
    END_IF
    IF nCount < nSamples THEN
        nCount := nCount + 1;
    END_IF
    IF nCount > 0 THEN
        rOut := rSum / INT_TO_REAL(nCount);
    END_IF
END_CASE

END_FUNCTION_BLOCK
