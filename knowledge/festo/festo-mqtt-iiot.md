---
id: festo-mqtt-iiot
title: CODESYS MQTT IIoT Library — Festo CPX-E Integration
priority: HIGH
token_estimate: 3000
use_when:
  - user asks about MQTT publish/subscribe from PLC
  - user needs IIoT communication from CPX-E
  - user asks about JSON format in CODESYS
  - connecting PLC to MQTT broker (Mosquitto, AWS, Azure)
  - user needs to send telemetry data from PLC
  - user asks about CODESYS IIoT libraries
never_use_when:
  - user asks about EtherCAT or fieldbus communication
  - user asks about motion control or servo drives
  - user asks about OPC UA (different protocol)
depends_on: [festo-cpx]
related: [festo-cpx, festo-cdpx-hmi]
keywords: [MQTT, IIoT, publish, subscribe, broker, JSON, MQTTClient, MQTTPublish, MQTTSubscribe, Mosquitto, topic, payload, QoS, MQTT_CLIENT_SL, JSON_Utilities_SL, Topic Alias, MQTT v5, telemetry, cloud, publish subscribe, IoT, send data to broker, MQTT broker, JSON payload, send telemetry from PLC, connect PLC to cloud]
see_also: [festo-cpx, festo-cdpx-hmi, hmi-web-architecture]
---

# CODESYS MQTT IIoT Library — Festo CPX-E Integration

> Source: Festo Application Note 100693 v1.10 (2024-09-13)
> Platform: CPX-E-CEC with CODESYS V3.5 SP18+

## Requirements

| Component | Version |
|-----------|---------|
| Festo PLC (CPX-E-CEC) | Firmware 3.3.8+ |
| CODESYS | V3.5 SP18 Patch 4+ |
| MQTT Broker | Mosquitto 2.0.18 (or any MQTT broker) |
| Library | IIoT Libraries SL (via CODESYS Installer) |
| MQTT Explorer | 0.40-beta6 (optional, for debugging) |

## Library Installation

Install via **CODESYS Installer** (requires internet):
1. Open CODESYS Installer
2. Browse Add-ons → find **IIoT Libraries SL**
3. Install (latest version recommended: 1.11.0.0)
4. In project: Library Manager → Add Library → search `mqtt` → select **MQTT Client SL**

The `MQTT_Client_SL` library provides 3 function blocks:
- `MQTT.MQTTClient` — connection to broker
- `MQTT.MQTTPublish` — publish messages
- `MQTT.MQTTSubscribe` — subscribe to topics

## MQTTClient Function Block

Manages connection to the MQTT broker. Must be active for publish/subscribe.

### Key Inputs

| Input | Type | Description | Default |
|-------|------|-------------|---------|
| `xEnable` | BOOL | TRUE = connect to broker | — |
| `uiPort` | UINT | Broker port | 1883 |
| `xUseTLS` | BOOL | TRUE = encrypted connection | FALSE |
| `uiKeepAlive` | UINT | Keep alive interval (seconds) | 5 |
| `xCleanSession` | BOOL | TRUE = new session | TRUE |
| `wsUsername` | WSTRING(255) | Broker username (optional) | '' |
| `wsPassword` | WSTRING(1024) | Broker password (optional) | '' |
| `sClientId` | STRING(255) | Client ID (empty = auto-generated) | '' |
| `tPingInterval` | TIME | Ping interval (T#0s = no ping) | T#0s |
| `eCommunicationMode` | COMMUNICATION_MODE | TCP or WEB_SOCKET | TCP |
| `eMQTTVersion` | MQTT_VERSION | V3.1.1 or V5 | V3.1.1 |
| `udiTimeOut` | UDINT | Connection timeout (µs), 0 = no limit | 0 |

### Key Outputs

| Output | Type | Description |
|--------|------|-------------|
| `xDone` | BOOL | Ready condition reached |
| `xBusy` | BOOL | Connection in progress |
| `xError` | BOOL | Error occurred |
| `eMQTTError` | MQTT_ERROR | Error type (see error table) |
| `xConnectedToBroker` | BOOL | TRUE = connected to broker |
| `eReasonCode` | MQTT_REASON_CODE | V5 only — reason code |

### Input/Output

| I/O | Type | Description |
|-----|------|-------------|
| `sHostname` | STRING(80) | Broker IP or hostname |

### Connection Example

```iecst
VAR
    fbMqttClient : MQTT.MQTTClient;
    sHostname    : STRING(80) := '192.168.0.125';
END_VAR

fbMqttClient(
    xEnable   := TRUE,
    uiPort    := 1883,
    sHostname := sHostname
);

(* Check connection *)
IF fbMqttClient.xConnectedToBroker THEN
    (* Ready to publish/subscribe *)
END_IF
```

## MQTTPublish Function Block

Publishes a message payload to a topic.

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `xExecute` | BOOL | Rising edge = publish message |
| `udiTimeOut` | UINT | Max operating time (µs), 0 = no limit |
| `eQos` | MQTT_QOS | Quality of Service (QoS0, QoS1, QoS2) |
| `xRetain` | BOOL | TRUE = broker stores message |
| `pbPayload` | POINTER TO BYTE | Pointer to message data |
| `udiPayloadSize` | UDINT | Size of payload in bytes |

### Inputs/Outputs

| I/O | Type | Description |
|-----|------|-------------|
| `mqttClient` | MQTT.MQTTClient | Instance of MQTTClient |
| `wsTopicName` | WSTRING(1024) | Topic name |

### Publish Example

```iecst
VAR
    fbMqttPublish : MQTT.MQTTPublish;
    fbMqttClient  : MQTT.MQTTClient;
    sPayload      : STRING := 'Hello from CPX-E';
    wsTopicName   : WSTRING(1024) := "machine/temperature";
    bPublish      : BOOL;
END_VAR

fbMqttPublish(
    xExecute       := bPublish,
    pbPayload      := ADR(sPayload),
    udiPayloadSize := UDINT#(LEN(sPayload)),
    mqttClient     := fbMqttClient,
    wsTopicName    := wsTopicName
);

IF fbMqttPublish.xDone THEN
    bPublish := FALSE;  (* Reset trigger *)
END_IF
```

## MQTTSubscribe Function Block

Subscribes to a topic and receives messages.

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `xEnable` | BOOL | TRUE = activate subscription |
| `eSubscribeQoS` | MQTT_QOS | QoS level for subscription |
| `pbPayload` | POINTER TO BYTE | Pointer to buffer for incoming payload |
| `udiMaxPayloadSize` | UDINT | Max size of incoming payload buffer |

### Key Outputs

| Output | Type | Description |
|--------|------|-------------|
| `xReceived` | BOOL | TRUE for one cycle when message arrives |
| `udiPayloadSize` | UDINT | Size of received payload |
| `xSubscribeActive` | BOOL | TRUE = subscription is active |
| `wsLastTopic` | WSTRING(1024) | Actual topic of received message |

### Inputs/Outputs

| I/O | Type | Description |
|-----|------|-------------|
| `mqttClient` | MQTT.MQTTClient | Instance of MQTTClient |
| `wsTopicFilter` | WSTRING(1024) | Topic filter (supports + and # wildcards) |

### Subscribe Example

```iecst
VAR
    fbMqttSubscribe : MQTT.MQTTSubscribe;
    fbMqttClient    : MQTT.MQTTClient;
    sReceivedPayload : STRING(255);
    wsTopicFilter    : WSTRING(1024) := "machine/#";
END_VAR

fbMqttSubscribe(
    xEnable            := TRUE,
    pbPayload          := ADR(sReceivedPayload),
    udiMaxPayloadSize  := SIZEOF(sReceivedPayload),
    mqttClient         := fbMqttClient,
    wsTopicFilter      := wsTopicFilter
);

IF fbMqttSubscribe.xReceived THEN
    (* Process received message in sReceivedPayload *)
END_IF
```

**Important:** `udiMaxPayloadSize` must be ≥ actual payload size, otherwise data is truncated.

## MQTT_ERROR Enum

| Error | Description |
|-------|-------------|
| `NO_ERROR` | No error |
| `TCP_INIT_ERROR` | Unable to initialize TCP socket |
| `TCP_READ_ERROR` | Error reading response |
| `TCP_WRITE_ERROR` | Error sending request |
| `MAX_RESPONSE_SIZE_EXCEEDED` | Incoming packet exceeds max size |
| `KEEP_ALIVE_TIME_EXCEEDED` | Keep alive timeout |
| `UNACCEPTABLE_PROTOCOL_VERSION` | Broker rejected protocol version |
| `IDENTIFIER_REJECTED` | Broker rejected client ID |
| `SERVER_UNAVAILABLE` | Broker unavailable (bad username/password) |
| `BAD_USER_NAME_PASSWORD` | Bad credentials |
| `NOT_AUTHORIZED` | Not authorized |
| `TOPIC_FILTER_EMPTY` | Topic filter is empty (must be ≥1 char) |
| `TOPIC_NAME_NOT_ALLOWED_WILDCARD` | Topic name contains wildcards (only filter can) |
| `TOPIC_INVALID_LENGTH` | Topic length out of range (1-1024) |
| `SUBSCRIBE_FAILURE` | Subscription failed |
| `ACKNOWLEDGE_TIMEOUT` | Broker did not respond to ping (2× ping interval) |
| `ALLOCATED_PAYLOAD_SIZE_EXCEEDED` | Received payload exceeds allocated memory |
| `CLIENT_NOT_CONNECTED` | MQTT client not connected to broker |
| `RESOLVE_HOSTNAME_FAILED` | Cannot resolve hostname |
| `INVALID_LICENSE` | No valid IIoT license or demo expired |
| `TIME_OUT` | Connection timeout |
| `SEND_QUOTA_LIMIT_REACHED` | V5: send quota limit, retry later |

## Topic Alias (MQTT V5)

Topic Aliases reduce bandwidth by substituting long topic strings with short integers.

**Setup:**
1. Set `eMQTTVersion := MQTT_VERSION.V5` on MQTTClient
2. On first publish, set both `wsTopicName` and `mQTTPublishProperties.uiTopicAlias`
3. On subsequent publishes, use only the alias (integer) — broker maps it

```iecst
(* First publish — establish alias mapping *)
mQTTPublishProperties.uiTopicAlias := 1;
wsTopicName := "Europe/Germany/Esslingen/Festo/CMMT/AS/ActualTorque";
(* After first publish, broker remembers alias 1 = that topic *)

(* Subsequent publishes — only send alias, saves bandwidth *)
mQTTPublishProperties.uiTopicAlias := 1;
sPayload := '1.14';
```

## JSON Utilities (IIoT Library)

The IIoT package includes `JSON_Utilities_SL` for JSON encoding/decoding.

### JSONFileReader

Reads a .json file from PLC filesystem into a JSONData object.

```iecst
VAR
    fbJsonReader   : JSON.JSONFileReader;
    jsonDataFactory : JSON.JSONDataFactory;
    pJSONData      : POINTER TO JSON.JSONData := jsonDataFactory.Create(eError => eError);
    sFileName      : STRING(255) := 'json/data.json';
    bReadJson      : BOOL;
END_VAR

fbJsonReader(
    xExecute  := bReadJson,
    sFileName := sFileName,
    jsonData  := pJSONData^
);
```

### FindFirstValueByKey

Searches for a key in JSONData and returns the corresponding value.

```iecst
VAR
    fbFindValue : JSON.FindFirstValueByKey;
    wsKey       : WSTRING := "temperature";
    wsValue     : WSTRING(JSON.GParams.g_diMaxStringSize);
    element     : JSON.JSONElement;
END_VAR

fbFindValue(
    xExecute    := TRUE,
    wsKey       := wsKey,
    diStartIndex := 0,
    jsonData    := pJSONData^
);

IF fbFindValue.xDone THEN
    wsValue := JSON.JSONElementToString(element := fbFindValue.jsonElement);
    (* wsValue now contains the temperature value *)
END_IF
```

### JSON File Example

```json
{
    "location": "Esslingen",
    "datetime": "2024-04-14 12:01:59",
    "device": "CPX-E",
    "machine": "OP625pump16",
    "temperature": "34.6",
    "pressure": "6"
}
```

JSON file must be stored on PLC filesystem (SD card or `/prj/` directory).
Path: `/prj/json/filename.json` — access via SysFile/CAA.File libraries.

## Typical IIoT Architecture

```
┌──────────────┐     MQTT (TCP 1883)     ┌──────────────┐
│  CPX-E-CEC   │ ──── Publish ─────────► │  MQTT Broker  │
│  (PLC)       │ ◄─── Subscribe ──────── │  (Mosquitto)  │
└──────────────┘                          └──────┬───────┘
                                                 │
                                          ┌──────┴───────┐
                                          │  Cloud/SCADA  │
                                          │  (AWS/Azure)  │
                                          └──────────────┘
```

## QoS Levels

| Level | Name | Guarantee | Use Case |
|-------|------|-----------|----------|
| QoS 0 | At most once | No guarantee, no ACK | Non-critical telemetry, fast |
| QoS 1 | At least once | Guaranteed, may duplicate | Standard monitoring |
| QoS 2 | Exactly once | Guaranteed, no duplicates, 4-way handshake | Critical commands, slow |

## Quick Setup Checklist

1. Install **IIoT Libraries SL** via CODESYS Installer
2. Add **MQTT_Client_SL** library to project (Library Manager)
3. Configure **MQTTClient**: `sHostname`, `uiPort := 1883`, `xEnable := TRUE`
4. Wait for `xConnectedToBroker = TRUE`
5. **Publish**: set `pbPayload`, `udiPayloadSize`, `wsTopicName`, trigger `xExecute`
6. **Subscribe**: set `pbPayload`, `udiMaxPayloadSize`, `wsTopicFilter`, `xEnable := TRUE`
7. Check `xReceived` each cycle for incoming messages

## Mosquitto Broker Commands (Testing)

```bash
# Start broker
net start mosquitto

# Subscribe to topic (monitor)
mosquitto_sub -h 192.168.0.125 -t MyTopic

# Publish test message
mosquitto_pub -h 192.168.0.125 -t MyTopic -m "TestPayload"
```
