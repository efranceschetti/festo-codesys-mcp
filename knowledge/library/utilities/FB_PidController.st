(* =============================================================
   FB_PidController — Generic PID Controller with Anti-Windup

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   General-purpose PID controller for any closed-loop control:
   temperature, pressure, flow, position, speed, etc.
   Features: P-I-D action, configurable deadband, output
   clamping, integral anti-windup, and self-retriggering
   cycle timer for consistent sample rate.

   Usage:
     fbPid : FB_PidController;
     fbPid(
       bEnable   := bControlActive,
       rSetpoint := 100.0,
       rFeedback := rSensorValue,
       rKp       := 2.0,
       rKi       := 0.5,
       rKd       := 0.1
     );
     rControlOutput := fbPid.rOutput;
   ============================================================= *)
FUNCTION_BLOCK FB_PidController
VAR_INPUT
    bEnable             : BOOL;             (* Enable control loop *)
    rSetpoint           : REAL;             (* Target value [engineering units] *)
    rFeedback           : REAL;             (* Actual value [engineering units] *)
    (* Tuning parameters *)
    rKp                 : REAL := 1.0;      (* Proportional gain *)
    rKi                 : REAL := 0.0;      (* Integral gain *)
    rKd                 : REAL := 0.0;      (* Derivative gain *)
    (* Output limits *)
    rOutputMax          : REAL := 100.0;    (* Max output *)
    rOutputMin          : REAL := 0.0;      (* Min output *)
    rDeadband           : REAL := 0.0;      (* Error deadband [engineering units] *)
    (* Sample time *)
    tCycleTime          : TIME := T#10MS;   (* Match to PLC task cycle *)
END_VAR
VAR_OUTPUT
    rOutput             : REAL;             (* Control output *)
    bAtSetpoint         : BOOL;             (* Within deadband *)
    rError              : REAL;             (* Current error *)
    bSaturated          : BOOL;             (* Output at limits *)
END_VAR
VAR
    (* PID internal state *)
    rIntegral           : REAL;
    rPrevError          : REAL;
    rDerivative         : REAL;
    (* Calculated terms *)
    rPropTerm           : REAL;
    rIntTerm            : REAL;
    rDerTerm            : REAL;
    rRawOutput          : REAL;
    (* Timing *)
    tonCycle            : TON;
    rDtSeconds          : REAL;
    (* Anti-windup *)
    rIntegralMax        : REAL;
    rIntegralMin        : REAL;
    (* First scan flag *)
    bFirstCycle         : BOOL := TRUE;
END_VAR

(* ============================================================
   CYCLE TIMING — self-retriggering for consistent sample rate
   ============================================================ *)

tonCycle(IN := NOT tonCycle.Q, PT := tCycleTime);
rDtSeconds := TIME_TO_REAL(tCycleTime) / 1000.0;

(* ============================================================
   PID CALCULATION
   ============================================================ *)

IF bEnable THEN
    IF tonCycle.Q OR bFirstCycle THEN
        bFirstCycle := FALSE;

        (* --- Error Calculation --- *)
        rError := rSetpoint - rFeedback;

        (* Deadband: suppress control action near setpoint *)
        IF rDeadband > 0.0 AND ABS(rError) <= rDeadband THEN
            rError := 0.0;
            bAtSetpoint := TRUE;
        ELSE
            bAtSetpoint := FALSE;
        END_IF;

        (* --- Proportional Term --- *)
        rPropTerm := rKp * rError;

        (* --- Integral Term with Anti-Windup --- *)
        IF NOT bSaturated THEN
            rIntegral := rIntegral + (rError * rDtSeconds);
        END_IF;

        (* Clamp integral *)
        IF rKi > 0.0 THEN
            rIntegralMax := (rOutputMax - rOutputMin) / rKi;
        ELSE
            rIntegralMax := 1000.0;
        END_IF;
        rIntegralMin := -rIntegralMax;

        IF rIntegral > rIntegralMax THEN
            rIntegral := rIntegralMax;
        ELSIF rIntegral < rIntegralMin THEN
            rIntegral := rIntegralMin;
        END_IF;

        rIntTerm := rKi * rIntegral;

        (* --- Derivative Term --- *)
        IF rDtSeconds > 0.0 THEN
            rDerivative := (rError - rPrevError) / rDtSeconds;
        ELSE
            rDerivative := 0.0;
        END_IF;
        rDerTerm := rKd * rDerivative;

        rPrevError := rError;

        (* --- Total Output --- *)
        rRawOutput := rPropTerm + rIntTerm + rDerTerm;

        (* --- Output Clamping --- *)
        IF rRawOutput > rOutputMax THEN
            rOutput := rOutputMax;
            bSaturated := TRUE;
        ELSIF rRawOutput < rOutputMin THEN
            rOutput := rOutputMin;
            bSaturated := TRUE;
        ELSE
            rOutput := rRawOutput;
            bSaturated := FALSE;
        END_IF;
    END_IF;
ELSE
    (* --- Disabled: reset all state --- *)
    rOutput := 0.0;
    rIntegral := 0.0;
    rPrevError := 0.0;
    rDerivative := 0.0;
    bFirstCycle := TRUE;
    bAtSetpoint := FALSE;
    bSaturated := FALSE;
END_IF;

END_FUNCTION_BLOCK
