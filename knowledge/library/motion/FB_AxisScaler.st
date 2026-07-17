(* =============================================================
   FB_AxisScaler — Axis Unit Conversion (mm/pulses, mm-s/Hz)

   Category:     Motion
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Converts between user units (mm, degrees) and machine units
   (encoder pulses, frequency Hz). Handles gear ratio and
   lead screw pitch calculations.

   Usage:
     fbScaler : FB_AxisScaler;
     fbScaler(rPitch := 5.0, nPulsesPerRev := 10000, rGearRatio := 1.0);
     nPulses := fbScaler.fnPosToPulses(rPositionMm := 100.0);
     rMm     := fbScaler.fnPulsesToPos(nPulses := 200000);
   ============================================================= *)
FUNCTION_BLOCK FB_AxisScaler
VAR_INPUT
    rPitch          : REAL := 5.0;         (* Lead screw pitch [mm/rev] or [deg/rev] *)
    nPulsesPerRev   : DINT := 10000;       (* Encoder pulses per revolution *)
    rGearRatio      : REAL := 1.0;         (* Gear ratio (motor/load) *)
END_VAR
VAR_OUTPUT
    rMmPerPulse     : REAL;                (* Conversion factor: mm per pulse *)
    rPulsesPerMm    : REAL;                (* Conversion factor: pulses per mm *)
END_VAR

(* Calculate conversion factors *)
IF nPulsesPerRev > 0 AND ABS(rGearRatio) > 0.0001 THEN
    rMmPerPulse := rPitch / (DINT_TO_REAL(nPulsesPerRev) * rGearRatio);
    IF ABS(rMmPerPulse) > 0.0 THEN
        rPulsesPerMm := 1.0 / rMmPerPulse;
    ELSE
        rPulsesPerMm := 0.0;
    END_IF
ELSE
    rMmPerPulse := 0.0;
    rPulsesPerMm := 0.0;
END_IF

END_FUNCTION_BLOCK
