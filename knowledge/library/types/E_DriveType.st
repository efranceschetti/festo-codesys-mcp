(* =============================================================
   E_DriveType — Motor/Drive Classification

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   ============================================================= *)
TYPE E_DriveType :
(
    NONE            := 0,   (* No drive configured *)
    STANDARD_MOTOR  := 1,   (* Direct-on-line contactor motor *)
    BRAKE_MOTOR     := 2,   (* Motor with electromagnetic brake *)
    VFD             := 3,   (* Variable Frequency Drive / inverter *)
    SERVO           := 4,   (* Servo motor with position feedback *)
    STEPPER         := 5    (* Stepper motor with pulse/direction *)
) := NONE;
END_TYPE
