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

Seven motors across three flange sizes. **Nominal speed ranges from 140 to 1000 rpm and
is not predictable from size** — read the table, never infer from the flange.

| Flange | NEMA | Lengths | Holding torque | Rated output |
|--------|------|---------|----------------|--------------|
| **42 mm** | NEMA 17 | S, L | 0.25–0.63 Nm | 17–56 W |
| **57 mm** | NEMA 23 | M, L | 1.12–1.86 Nm | 86–87 W |
| **87 mm** | NEMA 34 | S, M, L | 2.4–9.4 Nm | 87–159 W |

All variants: 2-phase hybrid, 48 V DC nominal, step angle 1.8° (full step) ±5%,
50 pole pairs.

#### EMMT-ST-42 (NEMA 17)

| Parameter | 42-S | 42-L |
|-----------|------|------|
| **Nominal torque** | 0.24 Nm | 0.54 Nm |
| **Nominal speed** | 600 rpm | 1000 rpm |
| **Max speed** | 2700 rpm | 3200 rpm |
| **Rated output** | 17 W | 56 W |
| Holding torque | 0.25 Nm | 0.63 Nm |
| Peak torque | 0.25 Nm | 0.63 Nm |
| Nominal current | 1.8 A | 3.4 A |
| Continuous stall current | 2 A | 3.7 A |
| Peak current | 2 A | 4 A |
| Motor constant | 0.133 Nm/A | 0.162 Nm/A |
| Phase resistance / inductance | 2.1 Ω / 0.3 mH | 0.6 Ω / 0.8 mH |
| Thermal time constant | 22 min | 16 min |
| Thermal resistance | 3.5 K/W | 2 K/W |
| Max mechanical speed | 9000 rpm | 9000 rpm |

Axial / radial shaft load: 10 N / 28 N. Measuring flange 200 × 200 × 15 mm steel.

#### EMMT-ST-57 (NEMA 23)

| Parameter | 57-M | 57-L |
|-----------|------|------|
| **Nominal torque** | 0.83 Nm | 1.64 Nm |
| **Nominal speed** | 1000 rpm | 500 rpm |
| **Max speed** | 2600 rpm | 1500 rpm |
| **Rated output** | 87 W | 86 W |
| Holding torque | 1.12 Nm | 1.86 Nm |
| Peak torque | 1.1 Nm | 2.1 Nm |
| Nominal current | 5.4 A | 5.2 A |
| Continuous stall current | 6.6 A | 6.1 A |
| Peak current | 8 A | 8 A |
| Motor constant | 0.152 Nm/A | 0.32 Nm/A |
| Phase resistance / inductance | 0.17 Ω / 0.5 mH | 0.26 Ω / 0.95 mH |
| Thermal time constant | 27 min | 30 min |
| Thermal resistance | 1.6 K/W | 1.3 K/W |
| Max mechanical speed | 8000 rpm | 8000 rpm |

Axial / radial shaft load: 15 N / 75 N. Measuring flange 200 × 200 × 15 mm steel.

#### EMMT-ST-87 (NEMA 34)

| Parameter | 87-S | 87-M | 87-L |
|-----------|------|------|------|
| **Nominal torque** | 1.9 Nm | 5.9 Nm | 8.4 Nm |
| **Nominal speed** | **800 rpm** | **140 rpm** | **140 rpm** |
| **Max speed** | **2200 rpm** | **600 rpm** | **430 rpm** |
| **Rated output** | 159 W | 87 W | 126 W |
| Holding torque | 2.4 Nm | 6.6 Nm | 9.4 Nm |
| Peak torque | 2.7 Nm | 6.8 Nm | 9.4 Nm |
| Nominal current | 7.8 A | 7.5 A | 8.4 A |
| Continuous stall current | 9.5 A | 8.2 A | 10 A |
| Peak current | 12 A | 12 A | 10 A |
| Motor constant | 0.24 Nm/A | 0.79 Nm/A | 1.06 Nm/A |
| Phase resistance / inductance | 0.13 Ω / 0.35 mH | 0.27 Ω / 2.3 mH | 0.3 Ω / 2.7 mH |
| Thermal time constant | 35 min | 32 min | 37 min |
| Thermal resistance | 0.89 K/W | 0.83 K/W | 0.75 K/W |
| Max mechanical speed | 7000 rpm | 7000 rpm | 7000 rpm |

Axial / radial shaft load: 60 N / 220 N. Measuring flange **250 × 250 × 15 mm** steel.

### Selection traps

🚨 **1. Holding torque is a standstill number — size by nominal speed.** The 87-L holds
9.4 Nm but its nominal speed is **140 rpm** and it stops at **430 rpm**. Above nominal the
torque falls away steeply (see the M/n curves in catalogue 203023, pp. 11–13).

🚨 **2. Biggest torque is not biggest power.** The 87-L (9.4 Nm holding) is a **126 W**
motor; the 87-**S** (2.4 Nm) is **159 W** — the most powerful in the range — because it
turns at 800 rpm instead of 140. Pick by the torque-speed point the application needs, not
by the headline torque.

🚨 **3. No overload reserve.** Peak torque sits barely above nominal (87-L: 9.4 vs
8.4 Nm), where a servo delivers about 3x for seconds. Inertia-heavy starts belong on
EMMT-AS + CMMT-AS.

🚨 **4. Supply 48 V, not 24 V.** The CMMT-ST accepts 24–48 V DC and the catalogue
curves plot peak torque separately for each: the 48 V curve holds torque to markedly higher
speed. Running 24 V silently costs speed range.

🚨 **5. Two derating traps that invalidate every figure above:**
- **Above 40 °C ambient: −2 %/°C**, up to 80 °C. At 60 °C that is **−40 % torque**.
  Relevant near furnaces, induction heaters or closed panels.
- Continuous ratings assume the motor bolted to the **measuring flange** listed per size
  (a steel plate acting as heatsink). Mounted on anything smaller, derate.

### Encoder Options

| Parameter | Single-turn [S] | Multi-turn [M] |
|-----------|----------------|----------------|
| **Measuring principle** | Magnetic | Magnetic |
| **Interface** | BiSS-C | BiSS-C |
| **Detectable revolutions** | 1 | 65,536 |
| **Positions per revolution** | 65,536 | 131,072 |
| **Resolution** | 16 bit | 17 bit |
| **System accuracy** | ±540 arcsec | ±310 arcsec |
| **Max operating speed** | 5500 rpm | 12,000 rpm |
| **Supply — 42 mm** | 5 V (4.75–5.25 V) | 5 V (4.5–5.5 V) |
| **Supply — 57 / 87 mm** | 5 V (4.75–5.25 V) | 14 V (4.75–15 V) |
| **MTTF** | 106 years | 20 years |
| **Battery** | None (battery-free) | None (battery-free) |

Encoder temperature range −40…105 °C. **Key advantage**: the multi-turn absolute encoder
eliminates homing after a power cycle.

### Holding Brake (`-B` variants)

| Parameter | 42 | 57 | 87 |
|-----------|----|----|----|
| **Brake holding torque** | 0.63 Nm | 1.74 Nm | 4.26 Nm |
| Current / power (24 V DC) | 0.34 A / 8.2 W | 0.38 A / 9 W | 0.49 A / 12 W |
| Coil resistance | 70.9 Ω | 63.8 Ω | 49.2 Ω |
| Separation (release) time | 28 ms | 32 ms | 44 ms |
| Closing time | 41 ms | 97 ms | 110 ms |
| DC response delay | 8 ms | 11 ms | 30 ms |
| Max friction per braking | 1500 J | 6000 J | 14,000 J |
| Brake inertia | 0.006 kgcm² | 0.024 kgcm² | 0.11 kgcm² |

🚨 **On the 87-M and 87-L the brake holds LESS than the motor's nominal torque**
(4.26 Nm vs 5.9 / 8.4 Nm) — it cannot hold a fully loaded shaft. On every other size the
brake exceeds nominal torque. Check this per model; it is not a property of the range.

🚨 **Rated for 1 emergency stop per hour.** It is a holding brake, not a stopping
brake — the operating instructions (8225627, §3.3) say so explicitly. For safety stops use
the drive STO/SS1-t. The 10-million-cycle figure is for **idle** actuation, no friction work.

### Dimensions and Weight

| Size | Shaft ø (D1, h6) | Bolt circle (B3) | Flange (B1) | Pilot ø (D3, h8) | Height H1 |
|------|------------------|------------------|-------------|------------------|-----------|
| **42** | **5 mm** | 31 mm | 42 mm | 22 mm | 73.3 mm |
| **57** | **6.35 mm** | 47.1 mm | 56.4 mm | 38.1 mm | 88 mm |
| **87** | **11 mm** | 69.5 mm | 85.9 mm | 73 mm | 118 mm |

⚠️ **The 87 shaft is 11 mm, not the 14 mm a generic NEMA 34 gearbox expects.** Any
coupling or planetary gearbox must be ordered for the actual shaft — check before pairing
with a gear unit specified for another motor family.

Connector on all sizes: M17. Overall length L1 (without / with brake): 42-S 94/124,
42-L 112/142, 57-M 110.1/138.6, 57-L 131.1/159.6, 87-S 121/149.5, 87-M 154.5/183,
87-L 184.5/213 mm.

| Weight [g] | None | With brake |
|------------|------|-----------|
| 42-S | 370 | 590 |
| 42-L | 560 | 770 |
| 57-M | 900 | 1300 |
| 57-L | 1260 | 1660 |
| 87-S | 2050 | 2890 |
| 87-M | 3490 | 4320 |
| 87-L | 4660 | 5490 |

Total output inertia (multi-turn encoder, with brake): 42-S 0.043, 42-L 0.09, 57-M 0.33,
57-L 0.51, 87-S 1.116, 87-M 2.016, 87-L 3.116 kgcm².

### Environmental

| Parameter | Value |
|-----------|-------|
| **Degree of protection** | **IP40 at the shaft**, IP65 motor housing incl. connection system |
| **Ambient temperature** | −15…40 °C (42-S: 0…40 °C); to 80 °C with −2 %/°C derating |
| Storage temperature | −20…70 °C |
| Max winding temperature | 130 °C (temperature class B) |
| Rating class (EN 60034-1) | S1 (continuous) |
| Mounting (EN 60034-7) | IM B5, IM V1, IM V3 — any orientation |
| Temperature monitoring | Digital, via BiSS-C (encoder variants only) |
| Relative humidity | 0–90 %, non-condensing |
| Approvals | UL E342973 (c UL us, Recognised), RCM, CE, UKCA |
| LABS (PWIS) | VDMA24364 zone III |

> **Source for this whole section:** Festo catalogue **203023** (2026/06), datasheet pages
> 4–14, cross-checked against the product datasheet for EMMT-ST-87-L-RMB (part 8156202,
> retrieved 2026-08-27) and operating instructions **8225627** (2024-10a). The torque/speed
> curves live in the catalogue, pp. 11–13; they are not reproduced here.

### Motor Features

- **OCP** (One Cable Plug): Single cable for power + encoder signals
- **Swivel connector**: 290° rotatable for flexible cable routing
- **Protection**: **IP40 at the shaft**, IP65 motor housing incl. connection system
- **Certification**: UL certified

### Motor Part Number Scheme

```
EMMT-ST-[flange]-[length]-[connection][encoder][brake]
          │         │         │           │       │
          │         │         │           │       └─ B = holding brake (omit = none)
          │         │         │           └─────── M = multi-turn abs., S = single-turn abs. (omit = none)
          │         │         └─────────────────── R = angled connector, adjustable
          │         └───────────────────────────── S = short, M = medium, L = long
          └─────────────────────────────────────── 42, 57, 87 (mm flange size)

Example: EMMT-ST-87-L-RMB = 87 mm flange, long, angled connector, multi-turn encoder, brake
Per Festo type code (catalogue 203023): fields 005/006/007 are connection, measuring
unit, brake. **There is no resolver option** — the measuring unit is absolute
(single- or multi-turn) or none.
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

🚨 **Closed-loop ("Servo-Light") requires the `-MP` variant.** The EMMT-ST operating
instructions (8225627, §5.2) state it plainly: *"'Servo-Light' operation (closed loop
control) is available in combination with the servo drive CMMT-ST-MP."* Pairing an
encoder-equipped EMMT-ST with a non-MP drive gives absolute homing but **open-loop**
motion — you pay for the encoder and do not get closed-loop control. Check the suffix
on the order.

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
