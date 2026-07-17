(* =============================================================
   FB_PumpManager — Dual Pump Coordination with Failover

   Category:     Actuators
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Manages two pumps with automatic failover, runtime
   equalization, and maintenance hour tracking. Alternates
   primary pump based on accumulated runtime.

   Usage:
     fbPumps : FB_PumpManager;
     fbPumps(
       bEnable   := bCoolingEnable,
       bFlowOK   := bFlowSwitch,
       bPump1OK  := NOT bPump1Fault,
       bPump2OK  := NOT bPump2Fault
     );
     bPump1 := fbPumps.bPump1;
     bPump2 := fbPumps.bPump2;
   ============================================================= *)
FUNCTION_BLOCK FB_PumpManager
VAR_INPUT
    bEnable             : BOOL;             (* Enable pump system *)
    bFlowOK             : BOOL;             (* Flow sensor feedback *)
    bPump1OK            : BOOL := TRUE;     (* Pump 1 healthy *)
    bPump2OK            : BOOL := TRUE;     (* Pump 2 healthy *)
    bSwapPumps          : BOOL;             (* Manual swap command *)
    tFlowCheckDelay     : TIME := T#5S;     (* Delay before flow check *)
    nHoursToSwap        : DINT := 100;      (* Runtime hours before auto-swap *)
END_VAR
VAR_OUTPUT
    bPump1              : BOOL;             (* Pump 1 output *)
    bPump2              : BOOL;             (* Pump 2 output *)
    bFlowAlarm          : BOOL;             (* No flow detected *)
    bBothFaulted        : BOOL;             (* Both pumps faulted *)
    bPumpActive         : BOOL;             (* A pump is running *)
    nActivePump         : INT;              (* 1 or 2 *)
    nRunHours1         : DINT;             (* Pump 1 runtime hours *)
    nRunHours2         : DINT;             (* Pump 2 runtime hours *)
END_VAR
VAR
    bPrimaryIs1         : BOOL := TRUE;     (* TRUE=pump1 is primary *)
    tonFlowCheck        : TON;              (* Flow check delay *)
    tonHourCounter1     : TON;              (* 1-hour timer pump 1 *)
    tonHourCounter2     : TON;              (* 1-hour timer pump 2 *)
    rtrigSwap           : R_TRIG;           (* Swap edge detect *)
    bFailover           : BOOL;             (* Failover active *)
END_VAR

(* ============================================================
   SWAP LOGIC — equalize runtime
   ============================================================ *)

rtrigSwap(CLK := bSwapPumps);

(* Manual swap *)
IF rtrigSwap.Q THEN
    bPrimaryIs1 := NOT bPrimaryIs1;
END_IF;

(* Auto-swap based on runtime hours *)
IF bPrimaryIs1 AND (nRunHours1 - nRunHours2 >= nHoursToSwap) THEN
    bPrimaryIs1 := FALSE;
ELSIF NOT bPrimaryIs1 AND (nRunHours2 - nRunHours1 >= nHoursToSwap) THEN
    bPrimaryIs1 := TRUE;
END_IF;

(* ============================================================
   PUMP SELECTION AND FAILOVER
   ============================================================ *)

IF bEnable THEN
    bBothFaulted := NOT bPump1OK AND NOT bPump2OK;

    IF bBothFaulted THEN
        bPump1 := FALSE;
        bPump2 := FALSE;
        nActivePump := 0;
    ELSIF bPrimaryIs1 THEN
        IF bPump1OK AND NOT bFailover THEN
            bPump1 := TRUE;
            bPump2 := FALSE;
            nActivePump := 1;
        ELSIF bPump2OK THEN
            bPump1 := FALSE;
            bPump2 := TRUE;
            nActivePump := 2;
            bFailover := TRUE;
        ELSE
            bPump1 := TRUE;
            bPump2 := FALSE;
            nActivePump := 1;
        END_IF;
    ELSE
        IF bPump2OK AND NOT bFailover THEN
            bPump1 := FALSE;
            bPump2 := TRUE;
            nActivePump := 2;
        ELSIF bPump1OK THEN
            bPump1 := TRUE;
            bPump2 := FALSE;
            nActivePump := 1;
            bFailover := TRUE;
        ELSE
            bPump1 := FALSE;
            bPump2 := TRUE;
            nActivePump := 2;
        END_IF;
    END_IF;
ELSE
    bPump1 := FALSE;
    bPump2 := FALSE;
    nActivePump := 0;
    bFailover := FALSE;
END_IF;

bPumpActive := bPump1 OR bPump2;

(* ============================================================
   FLOW MONITORING
   ============================================================ *)

tonFlowCheck(IN := bPumpActive, PT := tFlowCheckDelay);
bFlowAlarm := tonFlowCheck.Q AND NOT bFlowOK;

(* On flow alarm, trigger failover *)
IF bFlowAlarm AND NOT bFailover THEN
    bFailover := TRUE;
END_IF;

(* Reset failover when manually swapped or fault clears *)
IF rtrigSwap.Q THEN
    bFailover := FALSE;
END_IF;

(* ============================================================
   RUNTIME HOUR COUNTERS
   ============================================================ *)

tonHourCounter1(IN := bPump1, PT := T#1H);
IF tonHourCounter1.Q THEN
    nRunHours1 := nRunHours1 + 1;
    tonHourCounter1(IN := FALSE);
END_IF;

tonHourCounter2(IN := bPump2, PT := T#1H);
IF tonHourCounter2.Q THEN
    nRunHours2 := nRunHours2 + 1;
    tonHourCounter2(IN := FALSE);
END_IF;

END_FUNCTION_BLOCK
