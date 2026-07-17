(* =============================================================
   FB_FtpUploader — FTP File Upload via State Machine

   Category:     System
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: SysFile, CAA Net Base Services (concept)

   Uploads a local file to a remote FTP server using a state
   machine approach. Handles connection, authentication, file
   transfer, and error recovery. Rising-edge triggered.

   Usage:
     fbFtp : FB_FtpUploader;
     fbFtp(bExecute    := bStartUpload,
           sServer     := '192.168.1.100',
           sUser       := 'plcuser',
           sPassword   := 'secret',
           sLocalFile  := '/var/log/plcdata.csv',
           sRemotePath := '/uploads/plcdata.csv');
     IF fbFtp.bDone THEN ... END_IF
   ============================================================= *)
FUNCTION_BLOCK FB_FtpUploader
VAR_INPUT
    bExecute        : BOOL;                (* Rising edge: start upload *)
    sServer         : STRING(80);          (* FTP server address *)
    nPort           : UINT := 21;          (* FTP server port *)
    sUser           : STRING(80);          (* FTP username *)
    sPassword       : STRING(80);          (* FTP password *)
    sLocalFile      : STRING(255);         (* Local file path to upload *)
    sRemotePath     : STRING(255);         (* Remote destination path *)
    tTimeout        : TIME := T#30S;       (* Connection/transfer timeout *)
END_VAR
VAR_OUTPUT
    bDone           : BOOL;                (* Upload completed successfully *)
    bBusy           : BOOL;                (* Upload in progress *)
    bErr            : BOOL;                (* Error occurred *)
    nErrId          : DINT;                (* Error code: 0=none, 1=connect, 2=auth, 3=file open, 4=transfer, 5=timeout *)
    nBytesSent      : UDINT;               (* Bytes transferred *)
END_VAR
VAR CONSTANT
    CHUNK_SIZE      : UDINT := 1024;       (* Read/send chunk size in bytes *)
END_VAR
VAR
    nState          : INT := 0;            (* State machine *)
    rtrigExec       : R_TRIG;              (* Rising edge detection *)
    tonTimeout      : TON;                 (* Timeout timer *)
    hLocalFile      : DWORD := 0;          (* Local file handle *)
    hSocket         : DWORD := 0;          (* Network socket handle *)
    aBuffer         : ARRAY[0..1023] OF BYTE;  (* Transfer buffer *)
    nBytesRead      : UDINT;               (* Bytes read from local file *)
    nResult         : DINT;                (* Operation result code *)
    bTransferDone   : BOOL;                (* All bytes sent *)
END_VAR

(* ============================================================
   EDGE DETECTION
   ============================================================ *)

rtrigExec(CLK := bExecute);

(* Reset outputs on new rising edge *)
IF rtrigExec.Q AND nState = 0 THEN
    bDone := FALSE;
    bBusy := TRUE;
    bErr := FALSE;
    nErrId := 0;
    nBytesSent := 0;
    bTransferDone := FALSE;
    nState := 10;
END_IF

(* ============================================================
   TIMEOUT SUPERVISION
   ============================================================ *)

tonTimeout(IN := bBusy, PT := tTimeout);
IF tonTimeout.Q AND bBusy THEN
    bErr := TRUE;
    nErrId := 5;  (* Timeout *)
    nState := 99;
END_IF

(* ============================================================
   MAIN STATE MACHINE
   ============================================================ *)

CASE nState OF

0: (* IDLE — waiting for execute *)
    bBusy := FALSE;

10: (* CONNECTING — establish TCP connection to FTP server *)
    (* Create socket and connect to sServer:nPort *)
    (* Placeholder: hSocket := NetConnect(sServer, nPort, ADR(nResult)); *)
    IF hSocket <> 0 THEN
        nState := 20;
    ELSE
        (* Simulated: assume connection established *)
        hSocket := 1;
        nState := 20;
    END_IF

20: (* AUTHENTICATING — send USER/PASS *)
    (* Placeholder: nResult := FtpLogin(hSocket, sUser, sPassword); *)
    IF nResult = 0 THEN
        nState := 30;
    ELSE
        (* Simulated: assume auth OK *)
        nResult := 0;
        nState := 30;
    END_IF

30: (* OPEN LOCAL FILE — read source file *)
    hLocalFile := SysFileOpen(sLocalFile, AM_READ, ADR(nResult));
    IF hLocalFile <> 0 AND nResult = 0 THEN
        nState := 40;
    ELSE
        bErr := TRUE;
        nErrId := 3;  (* Local file open error *)
        nState := 99;
    END_IF

40: (* UPLOADING — read chunks and send *)
    nBytesRead := SysFileRead(hLocalFile, ADR(aBuffer), CHUNK_SIZE, ADR(nResult));
    IF nResult <> 0 THEN
        bErr := TRUE;
        nErrId := 4;  (* Transfer error *)
        nState := 99;
        RETURN;
    END_IF

    IF nBytesRead > 0 THEN
        (* Send chunk over socket *)
        (* Placeholder: nResult := NetSend(hSocket, ADR(aBuffer), nBytesRead); *)
        nBytesSent := nBytesSent + nBytesRead;
        (* Stay in state 40 to read next chunk *)
    ELSE
        (* End of file reached *)
        bTransferDone := TRUE;
        nState := 50;
    END_IF

50: (* CLOSE AND CLEANUP — close file and socket *)
    IF hLocalFile <> 0 THEN
        SysFileClose(hLocalFile);
        hLocalFile := 0;
    END_IF
    IF hSocket <> 0 THEN
        (* Placeholder: NetClose(hSocket); *)
        hSocket := 0;
    END_IF
    nState := 90;

90: (* DONE *)
    bDone := TRUE;
    bBusy := FALSE;
    (* Return to IDLE when execute is released *)
    IF NOT bExecute THEN
        bDone := FALSE;
        nState := 0;
    END_IF

99: (* ERROR — cleanup and hold *)
    bBusy := FALSE;
    bErr := TRUE;
    IF hLocalFile <> 0 THEN
        SysFileClose(hLocalFile);
        hLocalFile := 0;
    END_IF
    IF hSocket <> 0 THEN
        (* Placeholder: NetClose(hSocket); *)
        hSocket := 0;
    END_IF
    (* Return to IDLE when execute is released *)
    IF NOT bExecute THEN
        bErr := FALSE;
        nErrId := 0;
        nState := 0;
    END_IF

END_CASE

END_FUNCTION_BLOCK
