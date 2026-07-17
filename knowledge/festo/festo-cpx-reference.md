---
id: festo-cpx
title: Festo CPX-E Platform Overview
priority: HIGH
use_when:
  - starting a new CPX-E project
  - need module list, I/O addressing, or library requirements
  - user asks about CPX-E capabilities
never_use_when:
  - need detailed module specs (see hardware/ docs)
  - need motion FB signatures (see festo-ptp-reference)
keywords: [CPX-E, Festo, CODESYS, modules, EtherCAT, CiA 402, I/O, WebVisu, SM3, CPX-E-CEC, controller, PLC platform, CODESYS runtime, EtherCAT master, module list, I/O addressing, which PLC, target hardware, bus coupler]
see_also: [festo-ptp, festo-vtux-terminal, festo-mqtt, ethercat-cia402]
---

# Festo CPX-E Platform Reference

> Target PLC platform for FestoCodesysMCP.

---

## CPX-E System Overview

- **Runtime**: CODESYS V3.5 (IEC 61131-3)
- **Programming**: ST, LD, FBD, SFC
- **Communication**: EtherCAT master, PROFINET, EtherNet/IP, Modbus TCP
- **I/O System**: Modular CPX terminal
- **Motion**: EtherCAT servo/stepper via CiA 402 (DS402)
- **Import**: PLCopen XML (TC6 0200)

## CPX-E Modules

| Module | Part Number | Description | Type |
|---|---|---|---|
| CPX-E-CEC-C1-PN | 8145338 | Controller (CODESYS), PROFINET | PLC CPU |
| CPX-E-CEC-M1-PN | 8145340 | Controller (CODESYS), PROFINET, Motion | PLC CPU |
| CPX-E-EP | 8062625 | EtherCAT Master module | Fieldbus |
| CPX-E-8DI | 8062620 | 8x Digital Input 24VDC | DI |
| CPX-E-8DO | 8062621 | 8x Digital Output 24VDC/0.5A | DO |
| CPX-E-4AI-U-I | 8062622 | 4x Analog Input (0-10V / 0-20mA) | AI |
| CPX-E-4AO-U-I | 8062623 | 4x Analog Output (0-10V / 0-20mA) | AO |
| CPX-E-2ZE | 8062624 | 2x Counter/Encoder (A/B, SSI) | Counter |
| CPX-E-1CI | 8145342 | 1x CANopen interface | Fieldbus |
| CPX-E-EC-M12 | 8145346 | EtherCAT coupler (M12) | Fieldbus |
| CPX-E-PL | 8062626 | Power supply left-feed | Power |

## CPX-E Specifications

| Parameter | Value |
|---|---|
| Supply voltage | 24 VDC (18..30V) |
| Operating temp | 0..55 C |
| Protection class | IP20 |
| Max modules | 14 per terminal |
| Max EtherCAT slaves | 64 (recommended) |
| Cycle time (min) | 1ms (Motion: 4ms typical) |
| Program memory | 1 MB |
| Data memory | 512 KB retain |
| WebVisu | Built-in (port 8080) |

## EtherCAT Servo (CiA 402)

### Drive State Machine (DS402)

```
NOT_READY_TO_SWITCH_ON --> SWITCH_ON_DISABLED --> READY_TO_SWITCH_ON
--> SWITCHED_ON --> OPERATION_ENABLED --> QUICK_STOP_ACTIVE --> FAULT
```

### Control Word Bits

| Bit | Function |
|---|---|
| 0 | Switch On |
| 1 | Enable Voltage |
| 2 | Quick Stop (inverted) |
| 3 | Enable Operation |
| 4-6 | Operation mode specific |
| 7 | Fault Reset |
| 8 | Halt |

### Status Word Bits

| Bit | Function |
|---|---|
| 0 | Ready to Switch On |
| 1 | Switched On |
| 2 | Operation Enabled |
| 3 | Fault |
| 4 | Voltage Enabled |
| 5 | Quick Stop Active |
| 6 | Switch On Disabled |
| 7 | Warning |
| 10 | Target Reached |
| 12 | Set-point Acknowledge |
| 13 | Following Error |

### Operation Modes

| Mode | Value | Description |
|---|---|---|
| PP | 1 | Profile Position |
| PV | 3 | Profile Velocity |
| HM | 6 | Homing |
| CSP | 8 | Cyclic Synchronous Position |
| CSV | 9 | Cyclic Synchronous Velocity |
| CST | 10 | Cyclic Synchronous Torque |

### Controlword State Transitions

| Transition | Controlword (hex) | Description |
|---|---|---|
| Shutdown | 0x0006 | Fault -> Ready to Switch On |
| Switch On | 0x0007 | Ready -> Switched On |
| Enable | 0x000F | Switched On -> Operation Enabled |
| Disable | 0x0007 | Operation Enabled -> Switched On |
| Quick Stop | 0x0002 | Any -> Quick Stop Active |
| Fault Reset | 0x0080 | Fault -> Switch On Disabled |

## Festo CMMT Servo Drives

| Model | Type | Motor | Features |
|---|---|---|---|
| CMMT-AS | Servo drive | EMMS-AS | 0.05-6kW, absolute encoder |
| CMMT-ST | Stepper drive | EMMT-ST | 0.3-8Nm, optional encoder |

- Profile: CiA 402
- Communication: EtherCAT
- ESI file available from Festo
- Compatible with PLCopen Motion FBs (PtP Festo package)

## Required CODESYS Libraries

| Library | Version | Purpose |
|---|---|---|
| SysTypes2_Itf | V3.5 | System types |
| CmpApp | V3.5 | Application management |
| IoStandard | V3.5 | I/O access |
| SM3_Basic | V3.5 | SoftMotion base |
| SM3_Drive_CiA402 | V3.5 | CiA 402 drive integration |
| Festo_PtP | V3.5 | Festo motion FBs |

## EtherCAT Network Setup

1. Add CPX-E-EP module to device tree
2. Right-click EtherCAT Master -> "Scan for Devices"
3. Or manually: Add Device -> EtherCAT -> Festo -> CMMT-AS/ST
4. Import ESI XML if device not in catalog
5. Configure PDO mapping (usually default is fine)
6. Set operation mode (CSP recommended for SoftMotion)
7. Map Axis in SoftMotion pool

## I/O Addressing Best Practices

- NEVER use direct addresses (%IX0.0, %QX0.0) in application code
- Map I/O to GVL variables with symbolic names
- Use `AT %I*` / `AT %Q*` only in GVL declarations
- Example:

```iecst
VAR_GLOBAL
    bStartBtn AT %IX0.0 : BOOL;  // GVL only
    bMotorOut AT %QX0.0 : BOOL;  // GVL only
END_VAR
```

## Project Setup Checklist

1. Device: Festo CPX-E-CEC (select correct variant)
2. Add EtherCAT master module (CPX-E-EP)
3. Scan/add servo drives (CMMT-AS or CMMT-ST)
4. Install required libraries (SM3_Basic, SM3_Drive_CiA402, Festo_PtP)
5. Configure Task: MainTask (4ms typical for motion)
6. Add SlowTask (20ms) for HMI/diagnostics
7. Map I/O symbolically in GVL (no %IX/%QX in code)
8. Create SoftMotion axis pool and map drives
9. Import PLCopen XML for application logic
10. Test with simulation before deploying to hardware

---

## Official Python SDKs (Commissioning & Diagnostics)

Festo provides official Python packages for direct hardware interaction outside CODESYS:

### festo-cpx-io (CPX-E and CPX-AP)

- **Repo:** github.com/Festo-se/festo-cpx-io
- **Install:** `pip install festo-cpx-io`
- **CPX-E:** Setup modules by typecode string — `CpxE("<typecode>", ip_address="192.168.0.1")`
- **CPX-AP:** Auto-discovery — modules built at runtime from device description files
- **CLI:** `festo-cpx-io cpx-e -t TYPECODE -i IP_ADDRESS -m MODULE_INDEX`
- **Features:** Read/write I/O channels, ISDU access for IO-Link (CPX-E-4IOL), module diagnostics
- **Use case:** Commissioning, I/O testing, diagnostic scripts independent of CODESYS runtime

### festo-edcon (Electric Drives via PROFIDRIVE)

- **Repo:** github.com/Festo-se/festo-edcon
- **Install:** `pip install festo-edcon`
- **Protocols:** EtherNet/IP and Modbus/TCP (Telegram 111 — same as SinaPos)
- **CLI:** `festo-edcon -i IP_ADDRESS position` or `festo-edcon -i IP pnu`
- **GUI:** `pip install 'festo-edcon[gui]'` → `festo-edcon-gui`
- **Features:** Motion positioning, PNU parameter access, drive commissioning
- **Use case:** Drive setup, parameter tuning, motion testing without CODESYS
