(* =============================================================
   FB_EventLogger — Circular Event Buffer Logger

   Category:     System
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Logs events (alarms, state changes, operator actions) into a
   circular buffer. Stores event code, timestamp, and message.
   Oldest events are overwritten when buffer is full.

   Usage:
     fbLog : FB_EventLogger;
     fbLog(bLogEvent := bNewAlarm, nEventCode := 1001,
           sMessage := 'Over temperature detected');
     nTotalEvents := fbLog.nEventCount;
   ============================================================= *)
FUNCTION_BLOCK FB_EventLogger
VAR_INPUT
    bLogEvent       : BOOL;                (* Trigger: log new event *)
    nEventCode      : DINT;                (* Event code *)
    sMessage        : STRING(80);          (* Event message *)
    bClear          : BOOL;                (* Clear all events *)
END_VAR
VAR_OUTPUT
    nEventCount     : UDINT;               (* Total events logged *)
    nBufferUsed     : INT;                 (* Entries in buffer *)
    bBufferFull     : BOOL;                (* Buffer has wrapped *)
    (* Last event info *)
    nLastCode       : DINT;
    sLastMessage    : STRING(80);
END_VAR
VAR CONSTANT
    MAX_EVENTS      : INT := 100;
END_VAR
VAR
    aEventCodes     : ARRAY[0..99] OF DINT;
    aEventMessages  : ARRAY[0..99] OF STRING(80);
    nWriteIndex     : INT := 0;
    bWrapped        : BOOL := FALSE;
    rtrigLog        : R_TRIG;
END_VAR

rtrigLog(CLK := bLogEvent);

IF bClear THEN
    nWriteIndex := 0;
    nEventCount := 0;
    nBufferUsed := 0;
    bWrapped := FALSE;
    bBufferFull := FALSE;
    RETURN;
END_IF

IF rtrigLog.Q THEN
    (* Write to buffer *)
    aEventCodes[nWriteIndex] := nEventCode;
    aEventMessages[nWriteIndex] := sMessage;

    (* Update last event *)
    nLastCode := nEventCode;
    sLastMessage := sMessage;

    (* Advance write pointer *)
    nWriteIndex := nWriteIndex + 1;
    nEventCount := nEventCount + 1;

    IF nWriteIndex >= MAX_EVENTS THEN
        nWriteIndex := 0;
        bWrapped := TRUE;
    END_IF

    (* Buffer usage *)
    IF bWrapped THEN
        nBufferUsed := MAX_EVENTS;
        bBufferFull := TRUE;
    ELSE
        nBufferUsed := nWriteIndex;
    END_IF
END_IF

END_FUNCTION_BLOCK
