(* =============================================================
   E_CylinderType — Pneumatic Cylinder Classification

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   ============================================================= *)
TYPE E_CylinderType :
(
    SINGLE_ACTING   := 0,   (* Spring return, one solenoid *)
    DOUBLE_ACTING   := 1    (* Two solenoids, extend + retract *)
) := DOUBLE_ACTING;
END_TYPE
