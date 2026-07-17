(* =============================================================
   ST_SensorConfig — Analog Sensor Configuration

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0

   Usage:
     stCfgTemp : ST_SensorConfig := (
       rScaleMin   := 0.0,
       rScaleMax   := 200.0,
       rAlarmHigh  := 180.0,
       rAlarmLow   := 5.0,
       rWarnHigh   := 150.0,
       rWarnLow    := 10.0,
       nRawMin     := 0,
       nRawMax     := 32767
     );
   ============================================================= *)
TYPE ST_SensorConfig :
STRUCT
    rScaleMin   : REAL := 0.0;      (* Engineering unit minimum *)
    rScaleMax   : REAL := 100.0;    (* Engineering unit maximum *)
    rAlarmHigh  : REAL := 90.0;     (* High alarm threshold *)
    rAlarmLow   : REAL := 5.0;      (* Low alarm threshold *)
    rWarnHigh   : REAL := 80.0;     (* High warning threshold *)
    rWarnLow    : REAL := 10.0;     (* Low warning threshold *)
    rHysteresis : REAL := 2.0;      (* Alarm hysteresis band *)
    nRawMin     : INT  := 0;        (* Raw ADC minimum (e.g. 0 for 4-20mA) *)
    nRawMax     : INT  := 32767;    (* Raw ADC maximum *)
    tFilterTime : TIME := T#100MS;  (* Analog filter time constant *)
END_STRUCT;
END_TYPE
