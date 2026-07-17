(* =============================================================
   FB_MqttPublisher — Simplified MQTT Publish with Auto-Reconnect

   Category:     Utilities
   Platform:     CODESYS V3.5 (IEC 61131-3)
   Version:      1.0
   Dependencies: None (standard IEC only, MQTT client concept)

   Simplified MQTT publish wrapper that manages broker connection,
   automatic reconnection on disconnect, and message publishing.
   Uses a state machine with configurable reconnect delay.

   Usage:
     fbMqtt : FB_MqttPublisher;
     fbMqtt(bEnable     := TRUE,
            sBrokerAddr := '192.168.1.50',
            nPort       := 1883,
            sTopic      := 'plc/temperature',
            sPayload    := REAL_TO_STRING(rTemp));
     bOK := fbMqtt.bConnected AND fbMqtt.bPublished;
   ============================================================= *)
FUNCTION_BLOCK FB_MqttPublisher
VAR_INPUT
    bEnable         : BOOL;                (* Enable MQTT connection *)
    sBrokerAddr     : STRING(80);          (* MQTT broker IP or hostname *)
    nPort           : UINT := 1883;        (* MQTT broker port *)
    sClientId       : STRING(80) := 'CODESYS_PLC';  (* MQTT client identifier *)
    sTopic          : STRING(255);         (* Publish topic *)
    sPayload        : STRING(255);         (* Message payload *)
    bPublish        : BOOL;                (* Rising edge: trigger publish *)
    nQos            : INT := 0;            (* QoS level: 0, 1, or 2 *)
    bRetain         : BOOL := FALSE;       (* Retain flag *)
    tReconnectDelay : TIME := T#5S;        (* Delay before reconnect attempt *)
    tPublishTimeout : TIME := T#3S;        (* Publish acknowledgment timeout *)
END_VAR
VAR_OUTPUT
    bConnected      : BOOL;                (* Broker connection active *)
    bPublished      : BOOL;                (* Last publish succeeded *)
    bBusy           : BOOL;                (* Operation in progress *)
    bErr            : BOOL;                (* Error occurred *)
    nErrId          : DINT;                (* Error code: 0=none, 1=connect, 2=publish, 3=timeout, 4=disconnect *)
    nPublishCount   : UDINT;               (* Total successful publishes *)
END_VAR
VAR
    nState          : INT := 0;            (* State machine *)
    rtrigPublish    : R_TRIG;              (* Publish edge detection *)
    tonReconnect    : TON;                 (* Reconnect delay timer *)
    tonPubTimeout   : TON;                 (* Publish timeout timer *)
    tonConnTimeout  : TON;                 (* Connection timeout timer *)
    hClient         : DWORD := 0;          (* MQTT client handle *)
    nResult         : DINT;                (* Operation result *)
    bConnLost       : BOOL := FALSE;       (* Connection lost flag *)
    nReconnectCount : UDINT := 0;          (* Reconnection attempts *)
    bPubPending     : BOOL := FALSE;       (* Publish waiting for connection *)
END_VAR

(* ============================================================
   EDGE DETECTION
   ============================================================ *)

rtrigPublish(CLK := bPublish);

(* Capture publish request even if not yet connected *)
IF rtrigPublish.Q THEN
    bPubPending := TRUE;
    bPublished := FALSE;
END_IF

(* ============================================================
   MAIN STATE MACHINE
   ============================================================ *)

CASE nState OF

0: (* IDLE — waiting for enable *)
    bBusy := FALSE;
    bConnected := FALSE;
    bPublished := FALSE;
    bErr := FALSE;
    nErrId := 0;
    bConnLost := FALSE;
    IF bEnable THEN
        nState := 10;
    END_IF

10: (* CONNECTING — establish MQTT connection *)
    bBusy := TRUE;
    bErr := FALSE;
    nErrId := 0;
    (* Placeholder: hClient := MqttConnect(sBrokerAddr, nPort, sClientId, ADR(nResult)); *)
    tonConnTimeout(IN := TRUE, PT := T#10S);
    IF tonConnTimeout.Q THEN
        tonConnTimeout(IN := FALSE, PT := T#10S);
        bErr := TRUE;
        nErrId := 1;  (* Connection failed *)
        nState := 70;  (* Go to reconnect wait *)
        RETURN;
    END_IF

    (* Simulated: assume connection established *)
    IF TRUE THEN
        hClient := 1;
        bConnected := TRUE;
        bBusy := FALSE;
        tonConnTimeout(IN := FALSE, PT := T#10S);
        nState := 20;
    END_IF

20: (* CONNECTED — monitor connection, wait for publish *)
    IF NOT bEnable THEN
        nState := 80;
        RETURN;
    END_IF

    (* Check connection health *)
    (* Placeholder: bConnLost := NOT MqttIsConnected(hClient); *)
    IF bConnLost THEN
        bConnected := FALSE;
        nErrId := 4;  (* Disconnect detected *)
        nState := 70;  (* Go to reconnect *)
        RETURN;
    END_IF

    (* Process pending publish *)
    IF bPubPending THEN
        nState := 30;
    END_IF

30: (* PUBLISHING — send MQTT message *)
    bBusy := TRUE;
    (* Placeholder: nResult := MqttPublish(hClient, sTopic, sPayload, nQos, bRetain); *)
    tonPubTimeout(IN := TRUE, PT := tPublishTimeout);

    IF tonPubTimeout.Q THEN
        tonPubTimeout(IN := FALSE, PT := tPublishTimeout);
        bErr := TRUE;
        nErrId := 3;  (* Publish timeout *)
        bPubPending := FALSE;
        bBusy := FALSE;
        nState := 20;
        RETURN;
    END_IF

    (* Simulated: assume publish succeeded *)
    IF TRUE THEN
        bPublished := TRUE;
        bPubPending := FALSE;
        nPublishCount := nPublishCount + 1;
        tonPubTimeout(IN := FALSE, PT := tPublishTimeout);
        bBusy := FALSE;
        bErr := FALSE;
        nErrId := 0;
        nState := 20;
    END_IF

70: (* RECONNECT WAIT — delay before retry *)
    bConnected := FALSE;
    bBusy := TRUE;

    IF NOT bEnable THEN
        nState := 80;
        RETURN;
    END_IF

    tonReconnect(IN := TRUE, PT := tReconnectDelay);
    IF tonReconnect.Q THEN
        tonReconnect(IN := FALSE, PT := tReconnectDelay);
        nReconnectCount := nReconnectCount + 1;
        bConnLost := FALSE;
        nState := 10;  (* Retry connection *)
    END_IF

80: (* DISCONNECT — clean shutdown *)
    IF hClient <> 0 THEN
        (* Placeholder: MqttDisconnect(hClient); *)
        hClient := 0;
    END_IF
    bConnected := FALSE;
    bBusy := FALSE;
    bPubPending := FALSE;
    nState := 0;

END_CASE

END_FUNCTION_BLOCK
