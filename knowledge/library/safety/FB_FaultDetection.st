(* =============================================================
   FB_FaultDetection — Multi-Input Fault Consolidation

   Category:     Safety
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only)

   Consolidates up to 16 fault inputs with latching and
   acknowledgment. Each fault is latched on rising edge and
   must be explicitly acknowledged. Provides consolidated
   fault output and active fault count.

   Usage:
     fbFaults : FB_FaultDetection;
     fbFaults(bFault0 := bOverTemp, bFault1 := bOverPress,
              bFault2 := bLowFlow, bAckAll := bBtnAck);
     bAnyFault := fbFaults.bFaultActive;
     nFaults   := fbFaults.nActiveFaults;
   ============================================================= *)
FUNCTION_BLOCK FB_FaultDetection
VAR_INPUT
    bFault0         : BOOL;    (* Fault input 0 *)
    bFault1         : BOOL;    (* Fault input 1 *)
    bFault2         : BOOL;    (* Fault input 2 *)
    bFault3         : BOOL;    (* Fault input 3 *)
    bFault4         : BOOL;    (* Fault input 4 *)
    bFault5         : BOOL;    (* Fault input 5 *)
    bFault6         : BOOL;    (* Fault input 6 *)
    bFault7         : BOOL;    (* Fault input 7 *)
    bFault8         : BOOL;    (* Fault input 8 *)
    bFault9         : BOOL;    (* Fault input 9 *)
    bFault10        : BOOL;    (* Fault input 10 *)
    bFault11        : BOOL;    (* Fault input 11 *)
    bFault12        : BOOL;    (* Fault input 12 *)
    bFault13        : BOOL;    (* Fault input 13 *)
    bFault14        : BOOL;    (* Fault input 14 *)
    bFault15        : BOOL;    (* Fault input 15 *)
    bAckAll         : BOOL;    (* Acknowledge all faults *)
    bResetAll       : BOOL;    (* Reset all latches (clears even if active) *)
END_VAR
VAR_OUTPUT
    bFaultActive    : BOOL;    (* At least one fault is latched *)
    nActiveFaults   : INT;     (* Number of active latched faults *)
    wFaultWord      : WORD;    (* Bitmask of latched faults *)
    wCurrentWord    : WORD;    (* Bitmask of currently active inputs *)
    nFirstFault     : INT;     (* Index of first active fault (-1=none) *)
END_VAR
VAR
    aLatched        : ARRAY[0..15] OF BOOL;
    aInputs         : ARRAY[0..15] OF BOOL;
    i               : INT;
    rtrigAck        : R_TRIG;
END_VAR

rtrigAck(CLK := bAckAll);

(* Map inputs to array *)
aInputs[0] := bFault0;   aInputs[1] := bFault1;
aInputs[2] := bFault2;   aInputs[3] := bFault3;
aInputs[4] := bFault4;   aInputs[5] := bFault5;
aInputs[6] := bFault6;   aInputs[7] := bFault7;
aInputs[8] := bFault8;   aInputs[9] := bFault9;
aInputs[10] := bFault10; aInputs[11] := bFault11;
aInputs[12] := bFault12; aInputs[13] := bFault13;
aInputs[14] := bFault14; aInputs[15] := bFault15;

(* Reset all *)
IF bResetAll THEN
    FOR i := 0 TO 15 DO
        aLatched[i] := FALSE;
    END_FOR
END_IF

(* Process each fault *)
nActiveFaults := 0;
wFaultWord := 0;
wCurrentWord := 0;
nFirstFault := -1;

FOR i := 0 TO 15 DO
    (* Latch on rising edge *)
    IF aInputs[i] THEN
        aLatched[i] := TRUE;
        wCurrentWord := wCurrentWord OR SHL(WORD#1, i);
    END_IF

    (* Acknowledge: clear latch only if input is gone *)
    IF rtrigAck.Q AND aLatched[i] AND NOT aInputs[i] THEN
        aLatched[i] := FALSE;
    END_IF

    (* Count and build word *)
    IF aLatched[i] THEN
        nActiveFaults := nActiveFaults + 1;
        wFaultWord := wFaultWord OR SHL(WORD#1, i);
        IF nFirstFault = -1 THEN
            nFirstFault := i;
        END_IF
    END_IF
END_FOR

bFaultActive := nActiveFaults > 0;

END_FUNCTION_BLOCK
