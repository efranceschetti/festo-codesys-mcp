(* =============================================================
   FB_FlowSensor — Flow Rate Sensor with Totalization

   Category:     Sensors
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Monitors flow rate from analog sensor (4-20mA/0-10V).
   Includes low-flow alarm, totalization (accumulated volume),
   and peak flow tracking.

   Usage:
     fbFlow : FB_FlowSensor;
     fbFlow(nRawValue := nAD_Flow,
            rScaleMin := 0.0, rScaleMax := 50.0,
            rAlarmLow := 5.0, tCycleTime := T#100MS);
     rFlowRate  := fbFlow.rValue;
     rTotalVol  := fbFlow.rTotalVolume;
     bNoFlow    := fbFlow.bAlarmLow;
   ============================================================= *)
FUNCTION_BLOCK FB_FlowSensor
VAR_INPUT
    nRawValue       : INT;                 (* Raw ADC value *)
    rScaleMin       : REAL := 0.0;         (* Flow min [L/min] *)
    rScaleMax       : REAL := 50.0;        (* Flow max [L/min] *)
    nRawMin         : INT := 0;            (* ADC minimum *)
    nRawMax         : INT := 32767;        (* ADC maximum *)
    rAlarmLow       : REAL := 5.0;         (* Low flow alarm [L/min] *)
    rHysteresis     : REAL := 1.0;         (* Alarm hysteresis *)
    rFilterFactor   : REAL := 0.15;        (* Filter alpha *)
    tCycleTime      : TIME := T#100MS;     (* PLC scan cycle *)
    bEnable         : BOOL := TRUE;        (* Enable sensor *)
    bResetTotal     : BOOL;                (* Reset totalizer *)
END_VAR
VAR_OUTPUT
    rValue          : REAL;                (* Flow rate [L/min] *)
    rTotalVolume    : REAL := 0.0;         (* Accumulated volume [L] *)
    rPeakFlow       : REAL := 0.0;         (* Peak flow recorded *)
    bAlarmLow       : BOOL;                (* Low flow alarm *)
    bNoFlow         : BOOL;                (* Zero flow detected *)
    bValid          : BOOL;                (* Reading valid *)
END_VAR
VAR
    rFiltered       : REAL;
    rRange          : REAL;
    rDtMin          : REAL;
    bInit           : BOOL := FALSE;
END_VAR

IF bResetTotal THEN
    rTotalVolume := 0.0;
    rPeakFlow := 0.0;
END_IF

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
    rValue := 0.0;
END_IF
IF rValue < 0.0 THEN rValue := 0.0; END_IF
bValid := TRUE;

(* Totalization: flow [L/min] * dt [min] = volume [L] *)
rDtMin := TIME_TO_REAL(tCycleTime) / 60000.0;  (* ms → minutes *)
rTotalVolume := rTotalVolume + rValue * rDtMin;

(* Peak tracking *)
IF rValue > rPeakFlow THEN
    rPeakFlow := rValue;
END_IF

(* Alarms *)
bNoFlow := rValue < 0.5;
IF rValue <= rAlarmLow THEN bAlarmLow := TRUE;
ELSIF rValue > (rAlarmLow + rHysteresis) THEN bAlarmLow := FALSE; END_IF

END_FUNCTION_BLOCK
