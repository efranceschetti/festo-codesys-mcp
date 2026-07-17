(* =============================================================
   ST_AlarmEntry — Alarm/Event Record

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0

   Usage:
     aAlarmLog : ARRAY[0..99] OF ST_AlarmEntry;
   ============================================================= *)
TYPE ST_AlarmEntry :
STRUCT
    nCode       : DINT  := 0;       (* Alarm/event code *)
    sMessage    : STRING(80) := ''; (* Human-readable message *)
    bActive     : BOOL  := FALSE;   (* Currently active *)
    bAcked      : BOOL  := FALSE;   (* Acknowledged by operator *)
    dtTimestamp  : DT;               (* When alarm occurred *)
    nCount      : UDINT := 0;       (* Occurrence counter *)
END_STRUCT;
END_TYPE
