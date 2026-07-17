(* =============================================================
   FB_DataLogger — Cyclic Data Logger to CSV File

   Category:     System
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: SysFile (SysFileOpen, SysFileWrite, SysFileClose)

   Cyclic data logger that writes PLC variables to CSV format
   via the SysFile library. Features configurable interval timer,
   automatic file rotation after N samples, and error handling.

   Usage:
     fbLog : FB_DataLogger;
     fbLog(bEnable    := TRUE,
           tInterval  := T#1S,
           sFilePath  := '/var/log/plcdata.csv',
           sData      := CONCAT(REAL_TO_STRING(rTemp), ',',
                                REAL_TO_STRING(rPressure)));
     nSamples := fbLog.nSampleCount;
   ============================================================= *)
FUNCTION_BLOCK FB_DataLogger
VAR_INPUT
    bEnable         : BOOL;                (* Enable cyclic logging *)
    tInterval       : TIME := T#1S;        (* Logging interval *)
    sFilePath       : STRING(255);         (* Target CSV file path *)
    sData           : STRING(255);         (* CSV data line to write *)
    nMaxSamples     : UDINT := 10000;      (* Max samples before file rotation *)
    bReset          : BOOL;                (* Reset sample counter and close file *)
END_VAR
VAR_OUTPUT
    bBusy           : BOOL;                (* Logger is active *)
    bErr            : BOOL;                (* Error occurred *)
    nErrId          : DINT;                (* Error code: 0=none, 1=open fail, 2=write fail, 3=close fail *)
    nSampleCount    : UDINT;               (* Total samples written to current file *)
    bFileRotated    : BOOL;                (* File rotation occurred this cycle *)
END_VAR
VAR CONSTANT
    LF              : STRING(1) := '$N';   (* Line feed character *)
END_VAR
VAR
    nState          : INT := 0;            (* State machine *)
    tonInterval     : TON;                 (* Interval timer *)
    hFile           : DWORD := 0;          (* SysFile handle *)
    bFileOpen       : BOOL := FALSE;       (* File currently open *)
    nBytesWritten   : UDINT;               (* Bytes written in last operation *)
    sLine           : STRING(255);         (* Formatted output line *)
    nFileIndex      : UDINT := 0;          (* File rotation counter *)
    bWasEnabled     : BOOL := FALSE;       (* Previous enable state *)
    nResult         : DINT;                (* SysFile operation result *)
END_VAR

(* ============================================================
   RESET HANDLING
   ============================================================ *)

IF bReset THEN
    IF bFileOpen THEN
        (* Close the open file *)
        nResult := SysFileClose(hFile);
        bFileOpen := FALSE;
        hFile := 0;
    END_IF
    nSampleCount := 0;
    nState := 0;
    bBusy := FALSE;
    bErr := FALSE;
    nErrId := 0;
    bFileRotated := FALSE;
    bWasEnabled := FALSE;
    RETURN;
END_IF

(* ============================================================
   MAIN STATE MACHINE
   ============================================================ *)

bFileRotated := FALSE;

CASE nState OF

0: (* IDLE — waiting for enable *)
    bBusy := FALSE;
    bErr := FALSE;
    nErrId := 0;
    IF bEnable THEN
        nState := 10;
    END_IF

10: (* OPEN FILE *)
    bBusy := TRUE;
    IF bFileOpen THEN
        (* File already open, skip to logging *)
        nState := 20;
    ELSE
        (* Open file in append mode *)
        hFile := SysFileOpen(sFilePath, AM_APPEND, ADR(nResult));
        IF hFile <> 0 AND nResult = 0 THEN
            bFileOpen := TRUE;
            nState := 20;
        ELSE
            (* Open failed — try write mode to create new file *)
            hFile := SysFileOpen(sFilePath, AM_WRITE, ADR(nResult));
            IF hFile <> 0 AND nResult = 0 THEN
                bFileOpen := TRUE;
                nState := 20;
            ELSE
                bErr := TRUE;
                nErrId := 1;  (* File open error *)
                nState := 99;
            END_IF
        END_IF
    END_IF

20: (* WAIT FOR INTERVAL *)
    IF NOT bEnable THEN
        nState := 80;
        RETURN;
    END_IF

    tonInterval(IN := TRUE, PT := tInterval);
    IF tonInterval.Q THEN
        tonInterval(IN := FALSE, PT := tInterval);
        nState := 30;
    END_IF

30: (* WRITE DATA *)
    sLine := CONCAT(sData, LF);
    nBytesWritten := SysFileWrite(hFile, ADR(sLine), INT_TO_UDINT(LEN(sLine)), ADR(nResult));
    IF nResult = 0 THEN
        nSampleCount := nSampleCount + 1;
        nState := 40;
    ELSE
        bErr := TRUE;
        nErrId := 2;  (* Write error *)
        nState := 99;
    END_IF

40: (* CHECK FILE ROTATION *)
    IF nSampleCount >= nMaxSamples THEN
        (* Close current file *)
        nResult := SysFileClose(hFile);
        bFileOpen := FALSE;
        hFile := 0;
        nSampleCount := 0;
        nFileIndex := nFileIndex + 1;
        bFileRotated := TRUE;
        nState := 10;  (* Re-open (next file) *)
    ELSE
        nState := 20;  (* Back to interval wait *)
    END_IF

80: (* CLOSE FILE — disable requested *)
    IF bFileOpen THEN
        nResult := SysFileClose(hFile);
        IF nResult <> 0 THEN
            bErr := TRUE;
            nErrId := 3;  (* Close error *)
        END_IF
        bFileOpen := FALSE;
        hFile := 0;
    END_IF
    nState := 0;

99: (* ERROR *)
    bBusy := FALSE;
    bErr := TRUE;
    IF bFileOpen THEN
        nResult := SysFileClose(hFile);
        bFileOpen := FALSE;
        hFile := 0;
    END_IF
    (* Stay in error until disabled and re-enabled *)
    IF NOT bEnable THEN
        nState := 0;
    END_IF

END_CASE

bWasEnabled := bEnable;

END_FUNCTION_BLOCK
