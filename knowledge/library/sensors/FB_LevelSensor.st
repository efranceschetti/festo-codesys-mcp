(* =============================================================
   FB_LevelSensor — Tank Level Sensor with Alarms

   Category:     Sensors
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Monitors liquid level in tanks/reservoirs. Supports continuous
   analog input (4-20mA/0-10V) with high/low alarms and
   optional float switch inputs for redundant level detection.

   Usage:
     fbLevel : FB_LevelSensor;
     fbLevel(nRawValue := nAD_Level,
             rScaleMin := 0.0, rScaleMax := 100.0,
             rAlarmHigh := 95.0, rAlarmLow := 10.0,
             bFloatHigh := bDI_FloatHigh,
             bFloatLow := bDI_FloatLow);
     rLevelPercent := fbLevel.rValue;
     bRefillNeeded := fbLevel.bAlarmLow;
   ============================================================= *)
FUNCTION_BLOCK FB_LevelSensor
VAR_INPUT
    nRawValue       : INT;                 (* Raw ADC value *)
    rScaleMin       : REAL := 0.0;         (* Level minimum [%] *)
    rScaleMax       : REAL := 100.0;       (* Level maximum [%] *)
    nRawMin         : INT := 0;            (* ADC minimum *)
    nRawMax         : INT := 32767;        (* ADC maximum *)
    rAlarmHigh      : REAL := 95.0;        (* High level alarm [%] *)
    rAlarmLow       : REAL := 10.0;        (* Low level alarm [%] *)
    rWarnLow        : REAL := 20.0;        (* Low level warning [%] *)
    rHysteresis     : REAL := 3.0;         (* Alarm hysteresis *)
    rFilterFactor   : REAL := 0.05;        (* Filter (slow for level) *)
    bFloatHigh      : BOOL := FALSE;       (* Float switch: high level *)
    bFloatLow       : BOOL := TRUE;        (* Float switch: low level (NC) *)
    bUseFloats      : BOOL := FALSE;       (* Use float switches for alarms *)
    bEnable         : BOOL := TRUE;        (* Enable sensor *)
END_VAR
VAR_OUTPUT
    rValue          : REAL;                (* Level [%] *)
    bAlarmHigh      : BOOL;                (* High level alarm *)
    bAlarmLow       : BOOL;                (* Low level alarm *)
    bWarnLow        : BOOL;                (* Low level warning *)
    bEmpty          : BOOL;                (* Tank empty *)
    bFull           : BOOL;                (* Tank full *)
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
ELSE
    rValue := rScaleMin;
END_IF

(* Clamp *)
IF rValue > rScaleMax THEN rValue := rScaleMax; END_IF
IF rValue < rScaleMin THEN rValue := rScaleMin; END_IF
bValid := TRUE;

(* Alarms — analog or float switch based *)
IF bUseFloats THEN
    bAlarmHigh := bFloatHigh;
    bAlarmLow  := NOT bFloatLow;  (* NC float: open = low level *)
ELSE
    IF rValue >= rAlarmHigh THEN bAlarmHigh := TRUE;
    ELSIF rValue < (rAlarmHigh - rHysteresis) THEN bAlarmHigh := FALSE; END_IF

    IF rValue <= rAlarmLow THEN bAlarmLow := TRUE;
    ELSIF rValue > (rAlarmLow + rHysteresis) THEN bAlarmLow := FALSE; END_IF
END_IF

(* Warning *)
IF rValue <= rWarnLow THEN bWarnLow := TRUE;
ELSIF rValue > (rWarnLow + rHysteresis) THEN bWarnLow := FALSE; END_IF

bEmpty := rValue <= rScaleMin + 1.0;
bFull  := rValue >= rScaleMax - 1.0;

END_FUNCTION_BLOCK
