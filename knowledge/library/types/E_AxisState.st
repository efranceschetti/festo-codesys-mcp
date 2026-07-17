(* =============================================================
   E_AxisState — Axis State Machine States

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   ============================================================= *)
TYPE E_AxisState :
(
    IDLE        := 0,   (* No power, waiting *)
    ENABLING    := 1,   (* Power stage enabling *)
    READY       := 2,   (* Powered, standstill, ready for commands *)
    HOMING      := 3,   (* Homing sequence active *)
    MOVING      := 4,   (* Motion in progress *)
    STOPPING    := 5,   (* Controlled stop active *)
    ERROR       := 6,   (* Error — requires reset *)
    DISABLED    := 7    (* Explicitly disabled by user *)
) := IDLE;
END_TYPE
