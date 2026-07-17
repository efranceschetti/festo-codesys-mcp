(* =============================================================
   FB_VfdDrive — Variable Frequency Drive Controller

   Category:     Motion
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.1
   Dependencies: None (standard IEC only)

   Controls a VFD/inverter via digital outputs (run/direction)
   and analog output (speed reference). Includes ramp limiting,
   fault monitoring, and frequency feedback.

   Festo CMMT-AS/ST Note:
     For Festo servo drives with EtherCAT, use FB_ServoAxis
     with the Festo PtP Package instead. This FB is for
     traditional VFDs controlled via analog/digital I/O.
     See resource: knowledge://festo-ptp-reference

   Usage:
     fbSpindle : FB_VfdDrive;
     fbSpindle(bRun := bCmdSpin, rSpeedRef := 50.0,
               bFault := bDI_VfdFault, nFeedbackHz := nAD_VfdFreq);
     bRunOut   := fbSpindle.bRunOutput;
     nSpeedOut := fbSpindle.nAnalogOut;
   ============================================================= *)
FUNCTION_BLOCK FB_VfdDrive
VAR_INPUT
    bRun            : BOOL;                (* Run command *)
    bReverse        : BOOL;                (* Direction: FALSE=FWD, TRUE=REV *)
    rSpeedRef       : REAL := 0.0;         (* Speed reference [Hz or %] *)
    rSpeedMax       : REAL := 60.0;        (* Maximum speed [Hz] *)
    rRampUpTime     : REAL := 5.0;         (* Acceleration ramp [seconds] *)
    rRampDownTime   : REAL := 3.0;         (* Deceleration ramp [seconds] *)
    bFault          : BOOL;                (* VFD fault input (NO) *)
    nFeedbackHz     : INT := 0;            (* Speed feedback raw [ADC] *)
    nFeedbackMax    : INT := 32767;        (* Feedback at max speed *)
    bEnable         : BOOL := TRUE;        (* Enable control *)
    bReset          : BOOL;                (* Reset error *)
END_VAR
VAR_OUTPUT
    bRunOutput      : BOOL;                (* Run digital output *)
    bDirOutput      : BOOL;                (* Direction output (TRUE=REV) *)
    nAnalogOut      : INT;                 (* Speed ref analog output [0-32767] *)
    rActualSpeed    : REAL;                (* Actual speed [Hz] *)
    bAtSpeed        : BOOL;                (* At target speed (+-2%) *)
    bRunning        : BOOL;                (* Drive is running *)
    bErr          : BOOL;                (* Error active *)
    nErrId          : DINT;                (* 0=OK, 1=VFD fault *)
END_VAR
VAR
    nState          : INT := 0;
    rRampedRef      : REAL := 0.0;
    rRampStep       : REAL;
    rDiff           : REAL;
END_VAR

(* Reset *)
IF bReset AND bErr THEN
    nState := 0;
    bErr := FALSE;
    nErrId := 0;
END_IF

(* VFD fault *)
IF bFault THEN
    bRunOutput := FALSE;
    bRunning := FALSE;
    bErr := TRUE;
    nErrId := 1;
    nState := 10;
END_IF

IF NOT bEnable THEN
    bRunOutput := FALSE;
    bRunning := FALSE;
    rRampedRef := 0.0;
    nState := 0;
END_IF

(* Feedback conversion *)
IF nFeedbackMax > 0 THEN
    rActualSpeed := INT_TO_REAL(nFeedbackHz) / INT_TO_REAL(nFeedbackMax) * rSpeedMax;
ELSE
    rActualSpeed := 0.0;
END_IF

CASE nState OF
0: (* Stopped *)
    bRunOutput := FALSE;
    bRunning := FALSE;
    rRampedRef := 0.0;
    nAnalogOut := 0;

    IF bRun THEN
        bDirOutput := bReverse;
        nState := 1;
    END_IF

1: (* Running — ramping *)
    bRunOutput := TRUE;
    bRunning := TRUE;

    (* Clamp reference *)
    IF rSpeedRef > rSpeedMax THEN rSpeedRef := rSpeedMax; END_IF
    IF rSpeedRef < 0.0 THEN rSpeedRef := 0.0; END_IF

    (* Ramp calculation per scan *)
    rDiff := rSpeedRef - rRampedRef;
    IF rDiff > 0.0 AND rRampUpTime > 0.0 THEN
        rRampStep := rSpeedMax / (rRampUpTime * 1000.0);  (* per ms, approx *)
        rRampedRef := rRampedRef + rRampStep;
        IF rRampedRef > rSpeedRef THEN rRampedRef := rSpeedRef; END_IF
    ELSIF rDiff < 0.0 AND rRampDownTime > 0.0 THEN
        rRampStep := rSpeedMax / (rRampDownTime * 1000.0);
        rRampedRef := rRampedRef - rRampStep;
        IF rRampedRef < rSpeedRef THEN rRampedRef := rSpeedRef; END_IF
    ELSE
        rRampedRef := rSpeedRef;
    END_IF

    (* Convert to analog output *)
    IF rSpeedMax > 0.0 THEN
        nAnalogOut := REAL_TO_INT(rRampedRef / rSpeedMax * 32767.0);
    ELSE
        nAnalogOut := 0;
    END_IF
    IF nAnalogOut < 0 THEN nAnalogOut := 0; END_IF
    IF nAnalogOut > 32767 THEN nAnalogOut := 32767; END_IF

    (* At speed detection *)
    bAtSpeed := ABS(rRampedRef - rSpeedRef) < (rSpeedMax * 0.02);

    IF NOT bRun THEN
        nState := 2;
    END_IF

2: (* Decelerating to stop *)
    bRunning := TRUE;
    IF rRampDownTime > 0.0 THEN
        rRampStep := rSpeedMax / (rRampDownTime * 1000.0);
        rRampedRef := rRampedRef - rRampStep;
    END_IF
    IF rRampedRef <= 0.0 THEN
        rRampedRef := 0.0;
        nState := 0;
    END_IF
    IF rSpeedMax > 0.0 THEN
        nAnalogOut := REAL_TO_INT(rRampedRef / rSpeedMax * 32767.0);
    ELSE
        nAnalogOut := 0;
    END_IF
    IF nAnalogOut < 0 THEN nAnalogOut := 0; END_IF
    bAtSpeed := FALSE;

10: (* Error *)
    bRunOutput := FALSE;
    bRunning := FALSE;
    rRampedRef := 0.0;
    nAnalogOut := 0;

END_CASE

END_FUNCTION_BLOCK
