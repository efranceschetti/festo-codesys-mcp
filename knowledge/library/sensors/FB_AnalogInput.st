(* =============================================================
   FB_AnalogInput — Generic Analog Input with Scaling and Filtering

   Category:     Sensors
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   General-purpose analog input block with linear scaling from
   raw ADC to engineering units, first-order filtering, and
   high/low alarm limits.

   Usage:
     fbPressure : FB_AnalogInput;
     fbPressure(nRawValue := nAD_Ch1,
                rScaleMin := 0.0, rScaleMax := 10.0,
                sUnit := 'bar');
     rPressure := fbPressure.rValue;
   ============================================================= *)
FUNCTION_BLOCK FB_AnalogInput
VAR_INPUT
    nRawValue       : INT;                 (* Raw ADC value *)
    rScaleMin       : REAL := 0.0;         (* Engineering minimum *)
    rScaleMax       : REAL := 100.0;       (* Engineering maximum *)
    nRawMin         : INT := 0;            (* ADC raw minimum *)
    nRawMax         : INT := 32767;        (* ADC raw maximum *)
    rAlarmHigh      : REAL := 90.0;        (* High alarm limit *)
    rAlarmLow       : REAL := 5.0;         (* Low alarm limit *)
    rHysteresis     : REAL := 2.0;         (* Alarm hysteresis *)
    rFilterFactor   : REAL := 0.2;         (* Filter alpha (0.0-1.0) *)
    bEnable         : BOOL := TRUE;        (* Enable processing *)
END_VAR
VAR_OUTPUT
    rValue          : REAL;                (* Scaled value *)
    rPercent        : REAL;                (* 0-100% of scale *)
    bAlarmHigh      : BOOL;                (* High alarm *)
    bAlarmLow       : BOOL;                (* Low alarm *)
    bValid          : BOOL;                (* Reading valid *)
END_VAR
VAR
    rFiltered       : REAL;
    rRange          : REAL;
    bInit           : BOOL := FALSE;
END_VAR

IF NOT bEnable THEN
    bValid := FALSE;
    RETURN;
END_IF

(* Filter *)
IF NOT bInit THEN
    rFiltered := INT_TO_REAL(nRawValue);
    bInit := TRUE;
ELSE
    rFiltered := rFiltered + rFilterFactor * (INT_TO_REAL(nRawValue) - rFiltered);
END_IF

(* Scale *)
rRange := INT_TO_REAL(nRawMax - nRawMin);
IF ABS(rRange) > 0.001 THEN
    rValue := (rFiltered - INT_TO_REAL(nRawMin)) / rRange
              * (rScaleMax - rScaleMin) + rScaleMin;
    rPercent := (rFiltered - INT_TO_REAL(nRawMin)) / rRange * 100.0;
ELSE
    rValue := rScaleMin;
    rPercent := 0.0;
END_IF
bValid := TRUE;

(* Alarms with hysteresis *)
IF rValue >= rAlarmHigh THEN
    bAlarmHigh := TRUE;
ELSIF rValue < (rAlarmHigh - rHysteresis) THEN
    bAlarmHigh := FALSE;
END_IF

IF rValue <= rAlarmLow THEN
    bAlarmLow := TRUE;
ELSIF rValue > (rAlarmLow + rHysteresis) THEN
    bAlarmLow := FALSE;
END_IF

END_FUNCTION_BLOCK
