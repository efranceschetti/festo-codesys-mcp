(* =============================================================
   FB_SystemMonitor — System Watchdog and Diagnostics

   Category:     System
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Monitors system health: HMI heartbeat, PLC cycle time,
   runtime hours, and provides a watchdog output toggle for
   external monitoring.

   Usage:
     fbSysMon : FB_SystemMonitor;
     fbSysMon(bHmiHeartbeat := GVL_HMI.bHeartbeat,
              tHmiTimeout := T#5S);
     bHmiOK     := fbSysMon.bHmiAlive;
     bWatchdog  := fbSysMon.bWatchdogToggle;
   ============================================================= *)
FUNCTION_BLOCK FB_SystemMonitor
VAR_INPUT
    bHmiHeartbeat   : BOOL;            (* HMI heartbeat signal (toggles) *)
    tHmiTimeout     : TIME := T#5S;    (* HMI communication timeout *)
    bEnable         : BOOL := TRUE;    (* Enable monitoring *)
END_VAR
VAR_OUTPUT
    bHmiAlive       : BOOL;            (* HMI communication OK *)
    bWatchdogToggle : BOOL;            (* PLC watchdog toggle (1Hz) *)
    nRunHours       : UDINT;           (* Total PLC runtime hours *)
    nRunMinutes     : USINT;           (* Runtime minutes (0-59) *)
    nCycleCount     : UDINT;           (* Scan cycle counter *)
    bFirstScan      : BOOL;            (* First scan after start *)
END_VAR
VAR
    tonHmi          : TON;
    tonWatchdog     : TON;
    tonHour         : TON;
    bHmiPrev        : BOOL;
    bHmiChanged     : BOOL;
    bInit           : BOOL := FALSE;
    nMinCounter     : INT := 0;
END_VAR

(* First scan detection *)
IF NOT bInit THEN
    bFirstScan := TRUE;
    bInit := TRUE;
ELSE
    bFirstScan := FALSE;
END_IF

nCycleCount := nCycleCount + 1;

IF NOT bEnable THEN RETURN; END_IF

(* HMI heartbeat monitoring *)
bHmiChanged := (bHmiHeartbeat XOR bHmiPrev);
bHmiPrev := bHmiHeartbeat;

IF bHmiChanged THEN
    tonHmi(IN := FALSE, PT := tHmiTimeout);
    bHmiAlive := TRUE;
ELSE
    tonHmi(IN := TRUE, PT := tHmiTimeout);
    IF tonHmi.Q THEN
        bHmiAlive := FALSE;
    END_IF
END_IF

(* Watchdog toggle — 1Hz *)
tonWatchdog(IN := NOT tonWatchdog.Q, PT := T#500MS);
IF tonWatchdog.Q THEN
    bWatchdogToggle := NOT bWatchdogToggle;
    tonWatchdog(IN := FALSE, PT := T#500MS);
END_IF

(* Runtime hour counter *)
tonHour(IN := TRUE, PT := T#60S);
IF tonHour.Q THEN
    tonHour(IN := FALSE, PT := T#60S);
    nMinCounter := nMinCounter + 1;
    nRunMinutes := INT_TO_USINT(nMinCounter MOD 60);
    IF nMinCounter >= 60 THEN
        nRunHours := nRunHours + 1;
        nMinCounter := 0;
    END_IF
END_IF

END_FUNCTION_BLOCK
