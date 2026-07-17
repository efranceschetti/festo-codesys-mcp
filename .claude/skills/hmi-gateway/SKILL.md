---
name: hmi-gateway
description: Use for HMI and gateway tasks — web HMI, HTML/JS dashboard, WebVisu, TargetVisu, Festo CDPX panel, OPC UA server or client, OPC UA to WebSocket gateway, Node-RED/embedded gateway, "show PLC data in a browser", SCADA screens, or deploying an HMI to Festo hardware.
---

# HMI & OPC UA Gateway

## 1. Pick the architecture reference
- Web HMI (browser-based, HTML/JS) -> `plc_knowledge` action=topic `hmi-web-architecture`
- OPC UA <-> WebSocket bridge -> topic `opcua-websocket-gateway`
- Deploying to embedded targets (CDPX browser, panel constraints) -> topic `hmi-embedded-deploy`
- Native CDPX / TargetVisu / WebVisu -> topic `festo-cdpx-hmi`

## 2. PLC side
- Expose data through a dedicated `GVL_HMI` (create_gvl) — HMI never touches FB internals.
- OPC UA symbol exposure and MQTT alternatives -> topic `festo-mqtt` for the IIoT library stack.

## 3. Web side
Follow the loaded architecture topic for the stack choice, update rates, and security notes. Do not invent OPC UA node-id conventions — take them from the gateway topic.

## 4. Record
HMI stack choice, gateway endpoints, and tag-naming scheme -> `.claude/memory/decisions.md`.
