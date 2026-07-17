(* =============================================================
   ST_EtherCatDiag — EtherCAT Slave Diagnostic Data

   Category:     Types
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0

   Holds diagnostic information for a single EtherCAT slave
   device: AL status, link state, error counters, and
   operational state. Useful for network health monitoring.

   Usage:
     astEcSlaves : ARRAY[0..15] OF ST_EtherCatDiag;
   ============================================================= *)
TYPE ST_EtherCatDiag :
STRUCT
    nAlStatus           : UINT  := 0;      (* AL (Application Layer) status register *)
    nAlStatusCode       : UINT  := 0;      (* AL status error code (0 = no error) *)
    bLinkUp             : BOOL  := FALSE;   (* Ethernet link detected *)
    nRxErrorCounter     : UDINT := 0;       (* Received frame error counter *)
    nTxErrorCounter     : UDINT := 0;       (* Transmitted frame error counter *)
    nLostLinkCounter    : UINT  := 0;       (* Lost link event counter *)
    nState              : UINT  := 0;       (* EtherCAT state: 1=INIT, 2=PREOP, 4=SAFEOP, 8=OP *)
    sDescription        : STRING(80) := ''; (* Slave description / device name *)
END_STRUCT;
END_TYPE
