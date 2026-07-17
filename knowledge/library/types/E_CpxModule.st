(* =============================================================
   E_CpxModule — CPX-E Module Type Enumeration

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0

   Enumerates all Festo CPX-E system module types including
   digital/analog I/O, IO-Link masters, counter modules,
   EtherCAT coupler, CEC controller, motion controllers,
   and valve terminals.
   ============================================================= *)
TYPE E_CpxModule :
(
    UNKNOWN         := 0,   (* Unknown or unidentified module *)
    DI_8CH          := 1,   (* CPX-E-8DI — 8-channel digital input *)
    DI_16CH         := 2,   (* CPX-E-16DI — 16-channel digital input *)
    DO_8CH          := 3,   (* CPX-E-8DO — 8-channel digital output *)
    AI_4CH          := 10,  (* CPX-E-4AI-U-I — 4-channel analog input *)
    AO_4CH          := 11,  (* CPX-E-4AO-U-I — 4-channel analog output *)
    IOL_1CH         := 20,  (* CPX-E-1IOL — 1-channel IO-Link master *)
    IOL_2CH         := 21,  (* CPX-E-2IOL — 2-channel IO-Link master *)
    IOL_4CH         := 22,  (* CPX-E-4IOL — 4-channel IO-Link master *)
    CI_1CH          := 30,  (* CPX-E-1CI — 1-channel counter/encoder input *)
    EC_COUPLER      := 40,  (* CPX-E-EC — EtherCAT bus coupler *)
    CEC_CONTROLLER  := 41,  (* CPX-E-CEC — CODESYS embedded controller *)
    MOTION_CMMT     := 50,  (* CMMT-AS/ST — servo/stepper drive *)
    MOTION_CMMP     := 51,  (* CMMP-AS — positioning drive *)
    VALVE_MPA       := 60,  (* MPA-S — modular valve terminal *)
    VALVE_VTSA      := 61,  (* VTSA — valve terminal slim *)
    VALVE_VTEM      := 62   (* VTEM — Motion Terminal digital pneumatics *)
) := UNKNOWN;
END_TYPE
