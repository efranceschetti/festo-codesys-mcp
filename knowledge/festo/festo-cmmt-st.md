---
id: festo-cmmt-st
title: Festo CMMT-ST Stepper Drive + EMMT-ST Motor — EtherCAT CiA 402
priority: HIGH
use_when:
  - working with Festo stepper motors (EMMT-ST)
  - configuring CMMT-ST drive over EtherCAT
  - need stepper motor specs (torque, speed, encoder)
  - comparing CMMT-ST vs CMMT-AS servo drive
never_use_when:
  - working with CMMT-AS servo drive + EMMT-AS servo motor (see festo-ptp-reference)
  - need simple motor without EtherCAT (use library motor blocks)
keywords: [CMMT-ST, EMMT-ST, stepper, absolute encoder, BiSS-C, CiA 402, EtherCAT, multi-turn, OCP, stepper motor, stepper drive, homing method 37, closed loop stepper, no physical motion homing, battery-free encoder, move a stepper, stepper positioning]
see_also: [ethercat-cia402, festo-ptp, motion-patterns]
---

# Festo CMMT-ST + EMMT-ST — Stepper Drive & Motor Reference

> Stepper motion reference for FestoCodesysMCP.
> Drive: CMMT-ST (1-axis DC servo drive for stepper/EC motors)
> Motor: EMMT-ST (stepper motor with optional absolute encoder)

---

## System Overview

The CMMT-ST + EMMT-ST is a cost-effective stepper motion solution with servo-grade features. The CMMT-ST drive supports CiA 402 over EtherCAT, and the EMMT-ST motor offers battery-free absolute encoders.

```
┌──────────────┐     EtherCAT     ┌──────────────┐     OCP Cable     ┌──────────────┐
│  CPX-E-CEC   │◄───────────────►│  CMMT-ST     │◄────────────────►│  EMMT-ST     │
│  (PLC)       │   CiA 402       │  (Drive)     │   Single Cable    │  (Motor)     │
└──────────────┘                  └──────────────┘                   └──────────────┘
```

---

## EMMT-ST Stepper Motor

### Motor Specifications

| Flange | NEMA | Lengths | Holding Torque | Rated Output |
|--------|------|---------|----------------|--------------|
| **42 mm** | NEMA 17 | S (Short), L (Long) | 0.25–0.63 Nm | 17–56 W |
| **57 mm** | NEMA 23 | M (Medium), L (Long) | 1.12–1.86 Nm | 86–87 W |
| **87 mm** | NEMA 34 | S, M, L | 2.4–9.4 Nm | 87–159 W |

#### EMMT-ST-42 (NEMA 17)

| Parameter | 42-S (Short) | 42-L (Long) |
|-----------|-------------|-------------|
| **Nominal Voltage** | 48 V DC | 48 V DC |
| **Nominal Current** | 1.8 A | 3.4 A |
| **Peak Current** | 2 A | 4 A |
| **Holding Torque** | 0.25 Nm | 0.63 Nm |
| **Nominal Torque** | 0.24 Nm | 0.54 Nm |
| **Nominal Speed** | 600 rpm | 1000 rpm |
| **Max Speed** | 2700 rpm | 3200 rpm |
| **Rated Output** | 17 W | 56 W |

#### EMMT-ST-57 (NEMA 23)

| Parameter | 57-M (Medium) | 57-L (Long) |
|-----------|-------------|-------------|
| **Nominal Voltage** | 48 V DC | 48 V DC |
| **Nominal Current** | 5.4 A | 5.2 A |
| **Peak Current** | 8 A | 8 A |
| **Holding Torque** | 1.12 Nm | 1.86 Nm |
| **Nominal Torque** | 0.83 Nm | 1.64 Nm |
| **Nominal Speed** | 1000 rpm | 500 rpm |
| **Max Speed** | 2600 rpm | 1500 rpm |
| **Rated Output** | 87 W | 86 W |

#### EMMT-ST-87 (NEMA 34)

| Parameter | 87-S (Short) | 87-M (Medium) | 87-L (Long) |
|-----------|-------------|-------------|-------------|
| **Nominal Voltage** | 48 V DC | 48 V DC | 48 V DC |
| **Nominal Current** | 7.8 A | 7.5 A | 8.4 A |
| **Peak Current** | 12 A | 10 A | — |
| **Holding Torque** | 2.4 Nm | 6.6 Nm | 9.4 Nm |
| **Nominal Speed** | — | — | — |
| **Rated Output** | 159 W | 87 W | 126 W |

All variants: Step angle 1.8° (full step), ±5% tolerance.

### Encoder Options

| Parameter | Single-Turn [S] | Multi-Turn [M] |
|-----------|----------------|----------------|
| **Measuring Principle** | Magnetic | Magnetic |
| **Interface** | BiSS-C | BiSS-C |
| **Detectable Revolutions** | 1 | 65,536 |
| **Battery** | None (battery-free) | None (battery-free) |
| **Voltage (42mm)** | 5 V (4.75–5.25 V) | 14 V (4.5–5.5 V) |
| **Voltage (57/87mm)** | 5 V (4.75–5.25 V) | 14 V (4.75–15 V) |

**Key advantage**: Absolute multi-turn encoder eliminates the need for homing after power cycle.

### Motor Features

- **OCP** (One Cable Plug): Single cable for power + encoder signals
- **Swivel connector**: 310° rotatable for flexible cable routing
- **Protection**: IP65 — suitable for harsh production environments
- **Certification**: UL certified

### Motor Part Number Scheme

```
EMMT-ST-[flange]-[length]-[encoder]-[brake]
          │         │        │         │
          │         │        │         └─ B = with holding brake
          │         │        └─────────── S = single-turn, M = multi-turn, R = resolver
          │         └──────────────────── S = short, L = long, M = medium
          └────────────────────────────── 42, 57, 87 (mm flange size)

Example: EMMT-ST-57-M-RMB = 57mm, medium, multi-turn encoder, brake
```

### Motor Part Number Suffix Table

| Suffix | Encoder | Brake | Description |
|--------|---------|-------|-------------|
| **R** | None | No | Base motor |
| **RB** | None | Yes | With holding brake |
| **RS** | Single-turn absolute | No | Single-turn encoder |
| **RSB** | Single-turn absolute | Yes | Single-turn + brake |
| **RM** | Multi-turn absolute | No | Multi-turn encoder |
| **RMB** | Multi-turn absolute | Yes | Multi-turn + brake |

Cable: NEBM-M17G12-EH series (OCP, M17 connector, 0.5–25 m)

**Note**: Holding brake is NOT a safety brake. For safety, use drive STO/SS1-t.

---

## CMMT-ST Stepper Drive

### Drive Specifications

| Parameter | CMMT-ST |
|-----------|---------|
| **Type** | 1-axis DC servo drive for stepper/EC motors |
| **Supply Voltage** | 24–48 V DC |
| **Communication** | Multi-protocol: EtherCAT, PROFINET, EtherNet/IP, Modbus TCP |
| **Device Profile** | CiA 402 (CANopen over EtherCAT — CoE) |
| **Alternative Profile** | FHPP (Festo proprietary — configurable) |
| **Configuration Tool** | Festo Automation Suite (FAS) |
| **Nominal Current** | 8 A |
| **Peak Current** | 20 A (3 sec max) |
| **Continuous Power** | 150 W (24V) / 300 W (48V) |
| **Position Resolution** | 24 bit/rev |
| **Dimensions** | 144 x 88 x 27 mm |
| **Protection** | IP20 |
| **Network** | 2x RJ45 (daisy-chain) |
| **Safety** | STO + SS1-t integrated |
| **ESI File** | Available from Festo Support Portal |

### Part Number Variants

| Part Number Pattern | Protocol |
|---------------------|----------|
| CMMT-ST-C8-1C-**EC**-S0 | EtherCAT |
| CMMT-ST-C8-1C-**EP**-S0 | EtherNet/IP |
| CMMT-ST-C8-1C-**PN**-S0 | PROFINET |
| CMMT-ST-C8-1C-**MP**-S0 | Multi-Protocol (all of above + Modbus TCP) |

### CiA 402 Operating Modes

| Mode | Value (0x6060) | Description |
|------|----------------|-------------|
| **PP** | 1 | Profile Position — move to target position |
| **PV** | 3 | Profile Velocity — constant speed |
| **HM** | 6 | Homing — find reference point |
| **CSP** | 8 | Cyclic Synchronous Position — real-time position control |
| **CSV** | 9 | Cyclic Synchronous Velocity — real-time velocity control |
| **CST** | 10 | Cyclic Synchronous Torque — real-time torque/current control |

### Key CiA 402 Objects

| Object | Sub | Name | Data Type |
|--------|-----|------|-----------|
| 0x6040 | 0 | Controlword | UINT16 |
| 0x6041 | 0 | Statusword | UINT16 |
| 0x6060 | 0 | Modes of Operation | INT8 |
| 0x6061 | 0 | Modes of Operation Display | INT8 |
| 0x607A | 0 | Target Position | INT32 |
| 0x60FF | 0 | Target Velocity | INT32 |
| 0x6064 | 0 | Position Actual Value | INT32 |
| 0x606C | 0 | Velocity Actual Value | INT32 |
| 0x6071 | 0 | Target Torque | INT16 |

### Controller Features

- Cascade controller with P position + PI speed + PI current regulators
- Profile operation: record mode and direct mode
- Interpolated mode via fieldbus
- Synchronized operating modes (CSP/CSV/CST)
- Autotuning for motor parameters
- Open-loop operation (stepper without encoder)

### Homing Methods (Object 0x6098)

| Method | Description |
|--------|-------------|
| **37** | Current Position (set current position as home — best for absolute encoder) |
| **33/34** | Current Position with Zero Pulse in Negative/Positive direction |
| **17/18** | Negative/Positive Limit Switch |
| **1/2** | Negative/Positive Limit Switch with Zero Pulse |
| **23/27** | Positive/Negative Reference Switch |
| **7/11** | Positive/Negative Reference Switch with Zero Pulse |
| **-17/-18** | Negative/Positive Mechanical Stop |
| **-1/-2** | Negative/Positive Mechanical Stop with Zero Pulse |

**Tip**: With absolute multi-turn encoder, use Method 37 to avoid physical motion during homing.

### Default PDO Mapping

**RxPDO (Master → Slave, 0x1600):**

| Object | Name | Size |
|--------|------|------|
| 0x6040:00 | Controlword | 16-bit |
| 0x6060:00 | Modes of Operation | 8-bit |
| 0x607A:00 | Target Position | 32-bit |

**TxPDO (Slave → Master, 0x1A00):**

| Object | Name | Size |
|--------|------|------|
| 0x6041:00 | Statusword | 16-bit |
| 0x6061:00 | Modes of Operation Display | 8-bit |
| 0x6064:00 | Position Actual Value | 32-bit |
| 0x606C:00 | Velocity Actual Value | 32-bit |
| 0x6077:00 | Torque Actual Value | 16-bit |

Add 0x60FF (Target Velocity) for CSV, 0x6071 (Target Torque) for CST mode.

---

## CODESYS Integration

### PLCopen Motion Function Blocks

The CMMT-ST uses the **same Festo PtP FBs** as the CMMT-AS:

| FB | Purpose |
|----|---------|
| `MC_Power_Festo` | Enable/disable output stage |
| `MC_Home_Festo` | Execute homing sequence |
| `MC_MoveAbsolute_Festo` | Move to absolute position |
| `MC_MoveRelative_Festo` | Move relative distance |
| `MC_MoveVelocity_Festo` | Continuous velocity motion |
| `MC_Stop_Festo` | Stop axis motion |
| `MC_Reset_Festo` | Reset drive errors |
| `MC_Jog_Festo` | Manual jog operation |

### Axis Reference

```iecst
VAR
    stAxisStepper : AXIS_REF_FESTO;  (* Axis reference — maps to CMMT-ST in device tree *)
    fbPwr         : MC_Power_Festo;
    fbHome        : MC_Home_Festo;
    fbMoveAbs     : MC_MoveAbsolute_Festo;
    fbStop        : MC_Stop_Festo;
    fbReset       : MC_Reset_Festo;
END_VAR
```

### Point-to-Point Setup in CODESYS

1. Open Festo Automation Suite (FAS) → configure CMMT-ST drive + EMMT-ST motor
2. In CODESYS, add CMMT-ST as EtherCAT slave under CPX-E-EP master
3. In `IoConfig_Globals`, the axis appears as `CMMT_ST` (or configured name)
4. Use `Festo_PtP_Base` library → find `MC_Power_Festo`, `MC_Home_Festo`, etc.
5. Bind the axis from `IoConfig_Globals` to `AXIS_REF_FESTO` on each FB

### FPosCR Library (Advanced)

For advanced motion (CNC, robotics), use the **FPosCR** application library:
- Based on CODESYS SoftMotion Library V4.12.0.0+
- PLCopen Motion Control Part 4 compliant
- Supports: system config, power, homing, jogging, stepping, PTP, CNC, robotics
- Compatible with: CMMT-AS, CMMT-ST, EMCX

---

## CMMT-ST vs CMMT-AS Comparison

| Feature | CMMT-ST (Stepper) | CMMT-AS (Servo) |
|---------|-------------------|-----------------|
| **Motor Type** | Stepper (EMMT-ST) / EC motor | Servo (EMMT-AS / EMMT-EC) |
| **Supply Voltage** | 24–48 V DC | 100–230 V AC or 24–72 V DC |
| **Power Range** | Low power (up to ~200W) | Medium power (up to ~2kW) |
| **CiA 402 Modes** | PP, PV, HM, CSP, CSV, CST | PP, PV, HM, CSP, CSV, CST |
| **PLCopen FBs** | MC_*_Festo (same library) | MC_*_Festo (same library) |
| **Encoder Support** | BiSS-C (absolute) | EnDat 2.2, BiSS-C, resolver |
| **Precision** | Good (1.8° step / encoder) | High (sinusoidal commutation) |
| **Cost** | Lower | Higher |
| **Best For** | Positioning, conveying, handling | High-precision, high-speed servo |

### When to Use CMMT-ST

- Budget-conscious applications
- Lower speed/precision requirements
- Simple positioning and conveying
- Applications where absolute encoder eliminates homing delay
- Extra-low voltage (24–48 V DC) environments

### When to Use CMMT-AS

- High precision and dynamic response required
- High-speed applications
- Multi-axis interpolated motion
- Higher power requirements

---

## Absolute Encoder Advantage (No Homing Required)

With the EMMT-ST multi-turn absolute encoder:
- Position is retained through power cycles (battery-free)
- No homing sequence needed after power-on
- Faster machine startup
- In CODESYS: set `HOME_ABSOLUTE_ENCODER = 2` to skip homing motion

```iecst
(* With absolute multi-turn encoder, homing only sets the reference offset *)
(* The motor knows its exact position immediately on power-up *)
fbPwr(Axis := stAxisStepper, Enable := TRUE);
IF fbPwr.Status THEN
    (* Axis is ready — no homing needed, position already known *)
    fbMoveAbs(Axis := stAxisStepper, Execute := TRUE, Position := 100.0);
END_IF
```

## Configuration Checklist

1. **Festo Automation Suite**: Configure CMMT-ST drive + EMMT-ST motor pairing
2. **Motor autotuning**: Run autotuning in FAS for optimal performance
3. **Profile selection**: Set CiA 402 (not FHPP) for PLCopen compatibility
4. **ESI file**: Install in CODESYS EtherCAT master configuration
5. **Add slave**: CMMT-ST appears under CPX-E-EP in device tree
6. **Axis name**: Set meaningful name in IoConfig (e.g., `Axis_Conveyor`)
7. **PtP library**: Import `Festo_PtP_Base` library in CODESYS
8. **Test**: MC_Power_Festo → MC_Home_Festo → MC_MoveAbsolute_Festo
