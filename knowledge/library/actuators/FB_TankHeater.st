(* =============================================================
   FB_TankHeater — Tank Heater with Thermostat and Freeze Protection

   Category:     Actuators
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Controls a heating element with thermostat logic (hysteresis),
   overheat protection, freeze protection, dry-run prevention,
   and maximum continuous runtime limit.

   Usage:
     fbHeater : FB_TankHeater;
     fbHeater(
       bEnable   := TRUE,
       bTurnOn   := bCmdHeat,
       rActTemp  := rTankTemperature,
       rSetpoint := 25.0,
       bLevelOK  := bLevelSwitch
     );
     bHeater    := fbHeater.bHeaterElement;
     bTempOK    := fbHeater.bTemperatureOK;
   ============================================================= *)
FUNCTION_BLOCK FB_TankHeater
VAR_INPUT
    bEnable             : BOOL;             (* Enable heater system *)
    bTurnOn             : BOOL;             (* Command to heat *)
    (* Temperature feedback *)
    rActTemp            : REAL;             (* Actual tank temperature [deg C] *)
    rSetpoint           : REAL := 25.0;     (* Target temperature [deg C] *)
    (* Thermostat parameters *)
    rHysteresis         : REAL := 2.0;      (* Hysteresis band [deg C] *)
    rMaxTemp            : REAL := 40.0;     (* Max allowed temperature [deg C] *)
    rMinTemp            : REAL := 5.0;      (* Freeze protection threshold [deg C] *)
    (* Safety *)
    bLevelOK            : BOOL := TRUE;     (* Tank level OK — prevent dry running *)
    tMaxOnTime          : TIME := T#30M;    (* Max continuous heater ON time *)
END_VAR
VAR_OUTPUT
    bHeaterElement      : BOOL;             (* Heater output *)
    bHeating            : BOOL;             (* Heating in progress *)
    bTemperatureOK      : BOOL;             (* Temperature within range *)
    bOverheatAlarm      : BOOL;             (* Over-temperature alarm *)
    bFreezeAlarm        : BOOL;             (* Under-temperature alarm *)
    bTimeoutAlarm       : BOOL;             (* Max ON time exceeded *)
END_VAR
VAR
    bThermostatReq      : BOOL;             (* Internal thermostat state *)
    tonMaxTime          : TON;              (* Max ON timer *)
    tonOverheat         : TON;              (* Overheat confirmation *)
END_VAR

IF NOT bEnable THEN
    bHeaterElement := FALSE;
    bHeating := FALSE;
    bTemperatureOK := TRUE;
    bOverheatAlarm := FALSE;
    bFreezeAlarm := FALSE;
    bTimeoutAlarm := FALSE;
    RETURN;
END_IF;

(* ============================================================
   THERMOSTAT LOGIC WITH HYSTERESIS
   ============================================================ *)

(* Turn ON below setpoint - hysteresis *)
IF rActTemp < (rSetpoint - rHysteresis) THEN
    bThermostatReq := TRUE;
END_IF;

(* Turn OFF above setpoint + hysteresis *)
IF rActTemp > (rSetpoint + rHysteresis) THEN
    bThermostatReq := FALSE;
END_IF;

(* ============================================================
   SAFETY CHECKS
   ============================================================ *)

(* Overheat detection — confirmed after 5s *)
tonOverheat(IN := rActTemp > rMaxTemp, PT := T#5S);
bOverheatAlarm := tonOverheat.Q;

(* Freeze protection — always heat if too cold *)
bFreezeAlarm := rActTemp < rMinTemp;

(* Maximum continuous runtime *)
tonMaxTime(IN := bHeaterElement, PT := tMaxOnTime);
bTimeoutAlarm := tonMaxTime.Q;

(* ============================================================
   OUTPUT LOGIC
   ============================================================ *)

(* Heater ON conditions:
   1. Enabled AND commanded on (or freeze protection)
   2. Thermostat requests heat (or freeze protection)
   3. Water level OK (prevent dry-run)
   4. No overheat
   5. Max time not exceeded *)
bHeaterElement := bEnable AND
                  (bTurnOn OR bFreezeAlarm) AND
                  (bThermostatReq OR bFreezeAlarm) AND
                  bLevelOK AND
                  NOT bOverheatAlarm AND
                  NOT bTimeoutAlarm;

bHeating := bHeaterElement;

(* Temperature status *)
bTemperatureOK := (rActTemp >= rMinTemp) AND (rActTemp <= rMaxTemp);

END_FUNCTION_BLOCK
