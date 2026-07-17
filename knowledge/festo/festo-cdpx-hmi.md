---
id: festo-cdpx-hmi
title: Festo CDPX Operator Unit — HMI + PAC (CODESYS)
priority: HIGH
use_when:
  - working with Festo CDPX HMI panels
  - need CDPX visualization (TargetVisu, WebVisu, Designer Studio)
  - integrating CDPX with CPX-E-CEC PLC
  - creating HMI screens for Festo systems
never_use_when:
  - working with third-party HMIs instead of Festo CDPX
  - need PLC-only reference without HMI (see festo-cpx-reference)
keywords: [CDPX, HMI, TargetVisu, WebVisu, Designer Studio, PAC, CANopen, operator unit, touch panel, operator panel, touch screen, visualization, HMI screen, Festo panel, PAC controller, operator interface, screen editor, panel display]
see_also: [hmi-web-architecture, festo-cpx, festo-mqtt]
---

# Festo CDPX Operator Unit — HMI + PAC Reference

> HMI platform reference for FestoCodesysMCP.
> The CDPX can operate as standalone HMI or as PAC (PLC + HMI combined).

---

## Product Overview

The Festo CDPX is a high-performance operator unit (HMI) with optional integrated CODESYS PLC runtime, making it a PAC (Programmable Automation Controller). It combines visualization, control, and I/O in a single device.

## CDPX Variants

| Type Code | Description | Use Case |
|-----------|-------------|----------|
| **CDPX-X-A-W-7** | Original operator unit, 7" | Full HMI + optional CODESYS PLC |
| **CDPX-X-B-W-7** | Browser version, 7" | Web-based visualization (WebVisu client) |
| **CDPX-X-E1-W-7** | Performance version, 7" | Enhanced CPU/RAM for complex visualizations |
| **CDPX-X-E2-W-7** | Field version, 7" | Extended temperature range, harsh environments |

### Type Code Breakdown

```
CDPX-X-[version]-W-[size]
         │         │   │
         │         │   └─ Display size: 7 = 7", 15 = 15"
         │         └───── W = Widescreen 16:9
         └─────────────── A=Original, B=Browser, E1=Performance, E2=Field
```

## Display Specifications

| Parameter | 7" Models | 15" Models |
|-----------|-----------|------------|
| **Display Size** | 7" widescreen | 15" widescreen |
| **Resolution** | 800 x 480 pixels | 1025 x 600 pixels |
| **Colors** | 64k colors | 64k colors |
| **Touch** | Multi-touch PCAP (capacitive) | Multi-touch PCAP |
| **Backlight** | LED backlight | LED backlight |

## Hardware Specifications

| Parameter | Value |
|-----------|-------|
| **RAM** | 512 MB (7"/10.1"), 256 MB (4.3") |
| **Operating Voltage** | 24 V DC (10–32 V DC range) |
| **Current** | 0.3 A @ 24V |
| **PoE** | Supported (CAT5 shielded) |
| **Protection** | IP65 (front), IP20 (rear) |
| **Operating Temp** | 0–50°C |
| **Mounting** | Front panel mounting |
| **Dimensions (7")** | 187 x 147 x 34 mm |
| **Mounting Depth** | 29 mm |
| **Max Panel Thickness** | 5 mm |
| **Weight** | 600 g |
| **RTC** | Yes (lithium backup battery) |

## Interfaces

| Interface | Details |
|-----------|---------|
| **Ethernet** | 2x RJ45 (integrated switch), 10/100 Mbps |
| **USB** | USB host for maintenance/data |
| **RS485** | Serial communication |
| **SD Card** | Data storage, recipe, logging |
| **CANopen** | 9-pin Sub-D (optional master module) |
| **I/O Modules** | Up to 2 plug-in modules (DI/DO/AI/AO) |

## CODESYS Integration

### PAC Mode (PLC + HMI)

When CODESYS is installed, the CDPX becomes a PAC:
- **Runtime**: CODESYS V3.5
- **Languages**: ST, LD, FBD, IL, SFC, CFC
- **CANopen Master**: Up to 127 stations
- **I/O Expansion**: 16 DI/DO + 4 AI / 2 AO (plug-in modules)

### Visualization Options

| Method | Description | Use Case |
|--------|-------------|----------|
| **Designer Studio** | Festo's native HMI editor | Primary HMI development for CDPX |
| **TargetVisu** | CODESYS visualization on device display | On-panel visualization (PLC + HMI same device) |
| **WebVisu** | Browser-based remote visualization | Remote monitoring via any HTML5 browser |

### Designer Studio

- Festo's proprietary HMI development tool for CDPX
- Visual screen editor with drag-and-drop
- Variable binding to CODESYS PLC variables
- Supports alarm management, recipes, trends

## Architecture with CPX-E

### CDPX as HMI + CPX-E-CEC as PLC (Recommended)

```
┌──────────────┐     Ethernet     ┌──────────────┐     EtherCAT
│  CDPX-X-B-W-7│◄───────────────►│  CPX-E-CEC   │◄──────────────► Servo Drives
│  (HMI/WebVisu)│                 │  (PLC/CODESYS)│                 (CMMT-AS/ST)
└──────────────┘                  └──────────────┘
                                        │
                                        │ CPX Bus
                                        ▼
                                  ┌──────────────┐
                                  │  CPX-E I/O   │
                                  │  DI/DO/AI/AO │
                                  └──────────────┘
```

### CDPX as Standalone PAC (PLC + HMI)

```
┌─────────────────────────┐
│  CDPX-X-A-W-7 (PAC)    │
│  ┌───────┐  ┌────────┐ │     CANopen
│  │CODESYS│  │Designer │ │◄──────────────► CPX / Valve Terminals
│  │Runtime│  │ Studio  │ │                 (CPV, MPA, VTUX)
│  └───────┘  └────────┘ │
│  ┌───────────────────┐  │
│  │ I/O Modules (opt) │  │
│  │ 16DI/DO + 4AI/2AO │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Communication Protocols

| Protocol | Role | Notes |
|----------|------|-------|
| **Modbus TCP** | Client + Server | Built-in |
| **Modbus RTU** | Client + Server | Via RS485 |
| **CoDeSys 3.x** | Driver | For Festo V3 PLCs (CPX-E-CEC, CECC) |
| **CoDeSys 2.3** | Driver | Legacy Festo PLCs |
| **OPC UA** | Server + Client | Built into Designer Studio runtime |
| **EasyIP** | Driver | Festo proprietary |
| **CANopen** | Master | Via optional CDPX-F-CO module (575301) |

## Connection to CODESYS PLC Variables

### Symbol Configuration (CDPX ↔ CPX-E-CEC)

1. **In CODESYS IDE**: Add "Symbol Configuration" object to PLC project
2. **Select variables**: Mark variables to expose (or use `{attribute 'symbol'}` pragma)
3. **Build & Download**: Symbol XML file is generated and included with PLC application
4. **In Designer Studio**: Add "CoDeSys ETH 3" protocol driver
5. **Import Tags**: Import symbol XML file → PLC variables appear as HMI tags
6. **Set IP address**: Configure CPX-E-CEC IP in Designer Studio connection settings

```
Symbol naming: <application>.<POU>.<variable>
Example:       Application.PRG_Main.fbProcess.rTmpAct
```

### From WebVisu (Remote)

WebVisu runs on the CDPX's integrated web server. Access from any HTML5 browser:
```
URL: http://<CDPX-IP-address>:8080/webvisu.htm
```

## HMI Screen Layout (Standard)

| Screen | Purpose | Key Variables |
|--------|---------|---------------|
| Overview | Machine status, KPIs | `eMchState`, `rOee` |
| Manual | Jog, I/O override | `bJogFwd`, `bJogRev` |
| Automatic | Auto cycle, recipe select | `bRunCmd`, `nRcpIdx` |
| Recipes | Parameter management | `stRcp`, `arRcpData` |
| Alarms | Active / historical | `stAlmData` |
| Settings | System configuration | `stSysCfg` |
| Diagnostics | I/O status, comm status | `stDiag`, `bCommOk` |

## CDPX vs Weintek cMT X Comparison

| Feature | CDPX | Weintek cMT X |
|---------|------|---------------|
| **HMI Editor** | Designer Studio | EasyBuilder Pro |
| **PLC Runtime** | CODESYS V3.5 (optional) | CODESYS V3.5 (separate core) |
| **Visualization** | TargetVisu + WebVisu | EasyBuilder native + WebView |
| **CANopen** | Master (127 stations) | Manager (126 stations) |
| **EtherCAT** | Via CPX-E (Ethernet link) | Direct master (65535 slaves) |
| **I/O Expansion** | 2 plug-in modules | None (external only) |
| **Manufacturer** | Festo (native ecosystem) | Weintek (third-party) |
| **Best For** | All-Festo systems, PAC mode | Multi-vendor, advanced HMI |

## Typical Part Numbers

| Part Number | Description |
|-------------|-------------|
| 574411 | CDPX-X-A-W-7 (original, 7") |
| 8155214 | CDPX-X-B-W-7 (browser, 7") |
