(* =============================================================
   FB_TemperatureSensor — Universal Temperature Sensor Interface

   Category:     Sensors
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Supports three input types:
   - 4-20mA transmitter (nInputType := 0)
   - 0-10V transmitter  (nInputType := 1)
   - Direct PT100 RTD   (nInputType := 2)

   Features: scaling, wire-break/short detection, high/low alarms
   with hysteresis, first-order filter.

   Usage:
     fbTemp : FB_TemperatureSensor;
     fbTemp(nRawValue := nAD_Ch0, nInputType := 0,
            rScaleMin := 0.0, rScaleMax := 200.0,
            rAlarmHigh := 180.0, rAlarmLow := 5.0);
     rTemperature := fbTemp.rValue;
     bOverTemp    := fbTemp.bAlarmHigh;
   ============================================================= *)
FUNCTION_BLOCK FB_TemperatureSensor
VAR_INPUT
    nRawValue       : INT;                 (* Raw ADC value *)
    nInputType      : INT := 0;            (* 0=4-20mA, 1=0-10V, 2=PT100 *)
    rScaleMin       : REAL := 0.0;         (* Eng. unit at raw min [deg C] *)
    rScaleMax       : REAL := 200.0;       (* Eng. unit at raw max [deg C] *)
    nRawMin         : INT := 0;            (* Raw ADC minimum *)
    nRawMax         : INT := 32767;        (* Raw ADC maximum *)
    rAlarmHigh      : REAL := 180.0;       (* High alarm threshold *)
    rAlarmLow       : REAL := 5.0;         (* Low alarm threshold *)
    rWarnHigh       : REAL := 150.0;       (* High warning threshold *)
    rWarnLow        : REAL := 10.0;        (* Low warning threshold *)
    rHysteresis     : REAL := 2.0;         (* Alarm hysteresis *)
    rFilterFactor   : REAL := 0.1;         (* Low-pass filter (0.0-1.0) *)
    nWireBreakLow   : INT := 100;          (* Wire break detection: below this = open *)
    nWireBreakHigh  : INT := 32600;        (* Wire break detection: above this = short *)
    bEnable         : BOOL := TRUE;        (* Enable sensor processing *)
END_VAR
VAR_OUTPUT
    rValue          : REAL;                (* Scaled temperature [deg C] *)
    rRawFiltered    : REAL;                (* Filtered raw value *)
    bAlarmHigh      : BOOL;                (* High alarm active *)
    bAlarmLow       : BOOL;               (* Low alarm active *)
    bWarnHigh       : BOOL;                (* High warning active *)
    bWarnLow        : BOOL;                (* Low warning active *)
    bWireBreak      : BOOL;                (* Wire break / open circuit *)
    bShortCircuit   : BOOL;                (* Short circuit detected *)
    bErr          : BOOL;                (* Any error condition *)
    bValid          : BOOL;                (* Reading is valid *)
END_VAR
VAR
    rRawReal        : REAL;
    rScaled         : REAL;
    rRange          : REAL;
    bInit           : BOOL := FALSE;
END_VAR

IF NOT bEnable THEN
    bValid := FALSE;
    RETURN;
END_IF

rRawReal := INT_TO_REAL(nRawValue);

(* Wire break / short circuit detection *)
bWireBreak    := nRawValue < nWireBreakLow;
bShortCircuit := nRawValue > nWireBreakHigh;
bErr        := bWireBreak OR bShortCircuit;

IF bErr THEN
    bValid := FALSE;
    RETURN;
END_IF

(* First-order low-pass filter *)
IF NOT bInit THEN
    rRawFiltered := rRawReal;
    bInit := TRUE;
ELSE
    rRawFiltered := rRawFiltered + rFilterFactor * (rRawReal - rRawFiltered);
END_IF

(* Linear scaling: raw → engineering units *)
rRange := INT_TO_REAL(nRawMax - nRawMin);
IF ABS(rRange) > 0.001 THEN
    rScaled := (rRawFiltered - INT_TO_REAL(nRawMin)) / rRange
               * (rScaleMax - rScaleMin) + rScaleMin;
ELSE
    rScaled := rScaleMin;
END_IF
rValue := rScaled;
bValid := TRUE;

(* Alarm evaluation with hysteresis *)
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

IF rValue >= rWarnHigh THEN
    bWarnHigh := TRUE;
ELSIF rValue < (rWarnHigh - rHysteresis) THEN
    bWarnHigh := FALSE;
END_IF

IF rValue <= rWarnLow THEN
    bWarnLow := TRUE;
ELSIF rValue > (rWarnLow + rHysteresis) THEN
    bWarnLow := FALSE;
END_IF

END_FUNCTION_BLOCK
