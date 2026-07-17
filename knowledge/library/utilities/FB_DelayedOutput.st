(* =============================================================
   FB_DelayedOutput — Output with Post-Run Timer

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Generic output controller that stays ON while the trigger
   is active and continues for a configurable delay after the
   trigger turns off. Common use cases: exhaust fans, cooling
   pumps, lubrication systems, or any output requiring a
   post-operation run-on period.

   Includes thermal overload detection and manual override.

   Usage:
     fbFan : FB_DelayedOutput;
     fbFan(
       bEnable    := TRUE,
       bTrigger   := bProcessActive,
       tPostDelay := T#30S
     );
     bOutput := fbFan.bOutput;
   ============================================================= *)
FUNCTION_BLOCK FB_DelayedOutput
VAR_INPUT
    bEnable             : BOOL := TRUE;     (* Enable output system *)
    bTrigger            : BOOL;             (* Trigger signal — output ON while active *)
    bManualOn           : BOOL;             (* Manual override ON *)
    tPostDelay          : TIME := T#30S;    (* Post-trigger delay *)
    bFeedbackOK         : BOOL := TRUE;     (* Feedback OK — e.g. thermal overload relay *)
END_VAR
VAR_OUTPUT
    bOutput             : BOOL;             (* Output command *)
    bActive             : BOOL;             (* Output running *)
    bPostRun            : BOOL;             (* Post-run phase active *)
    bFeedbackFault      : BOOL;             (* Feedback fault alarm *)
END_VAR
VAR
    tonPostRun          : TON;              (* Post-run timer *)
    bWasTrigger         : BOOL;             (* Previous trigger state *)
    bPostRunning        : BOOL;             (* Post-run in progress *)
END_VAR

IF NOT bEnable THEN
    bOutput := FALSE;
    bActive := FALSE;
    bPostRun := FALSE;
    bFeedbackFault := FALSE;
    bPostRunning := FALSE;
    RETURN;
END_IF;

(* ============================================================
   FEEDBACK PROTECTION
   ============================================================ *)

bFeedbackFault := NOT bFeedbackOK;

(* ============================================================
   POST-RUN LOGIC
   ============================================================ *)

(* Detect trigger turn-off edge *)
IF bWasTrigger AND NOT bTrigger THEN
    bPostRunning := TRUE;
END_IF;
bWasTrigger := bTrigger;

(* Post-run timer *)
tonPostRun(IN := bPostRunning, PT := tPostDelay);
IF tonPostRun.Q THEN
    bPostRunning := FALSE;
    tonPostRun(IN := FALSE);
END_IF;

bPostRun := bPostRunning;

(* ============================================================
   OUTPUT
   ============================================================ *)

(* Output ON when:
   - Trigger active, OR
   - Post-run timer running, OR
   - Manual override
   AND no feedback fault *)
bOutput := (bTrigger OR bPostRunning OR bManualOn) AND NOT bFeedbackFault;
bActive := bOutput;

END_FUNCTION_BLOCK
