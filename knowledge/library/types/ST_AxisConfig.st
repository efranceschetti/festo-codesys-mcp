(* =============================================================
   ST_AxisConfig — Axis Configuration Parameters

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0

   Usage:
     stCfgZ : ST_AxisConfig := (
       rMaxVel     := 200.0,
       rAccel      := 500.0,
       rDecel      := 500.0,
       rHomingVel  := 50.0,
       rLimitMax   := 1000.0,
       rLimitMin   := 0.0
     );
   ============================================================= *)
TYPE ST_AxisConfig :
STRUCT
    rMaxVel     : REAL := 100.0;    (* Maximum velocity [mm/s] *)
    rAccel      : REAL := 500.0;    (* Acceleration [mm/s2] *)
    rDecel      : REAL := 500.0;    (* Deceleration [mm/s2] *)
    rJerk       : REAL := 0.0;      (* Jerk limit [mm/s3], 0=trapezoidal *)
    rHomingVel  : REAL := 50.0;     (* Homing velocity [mm/s] *)
    rLimitMax   : REAL := 1000.0;   (* Software upper limit [mm] *)
    rLimitMin   : REAL := 0.0;      (* Software lower limit [mm] *)
    rScaleFactor: REAL := 1.0;      (* Encoder scale factor [mm/rev or mm/pulse] *)
    bInvertDir  : BOOL := FALSE;    (* Invert axis direction *)
END_STRUCT;
END_TYPE
