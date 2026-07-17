---
id: ethercat-cia402
title: EtherCAT CiA 402 Drive Profile — State Machine, Controlword, Statusword
priority: HIGH
use_when:
  - working with EtherCAT servo drives (any vendor)
  - need CiA 402 state machine transitions
  - decoding controlword/statusword bit patterns
  - debugging servo communication issues
never_use_when:
  - simple motors without EtherCAT
  - need Festo-specific FB signatures (see festo-ptp)
keywords: [CiA 402, DS402, EtherCAT, controlword, statusword, 0x6040, 0x6041, state machine, fault, homing, CSP, CSV, drive fault, axis error, servo state machine, drive wont move, axis will not move, SDO, PDO, AL status, enable drive, quick stop, switch on, fault reset, statusword bits, drive shows error, alias address not set, slave identification, configured station alias, 0x0012, station alias EEPROM, jog not moving, axis reads position but wont move, reads position but does not move, drive health, drive OK fault bit, operation enabled, STO not released, safe torque off, soft limit blocks move]
see_also: [festo-ptp, festo-cmmt-st, motion-patterns]
---

# EtherCAT CiA 402 — Servo Drive Profile Reference

> FestoCodesysMCP EtherCAT reference — the standard for all servo projects.

---

## CiA 402 State Machine

All EtherCAT servo drives (Festo CMMT, Delta ASDA-A3, Beckhoff AX5000, etc.) follow the CiA 402 state machine.

```
                    ┌───────────────────────────┐
                    │                           │
                    ▼                           │
             ┌─────────────┐                   │
             │ NOT READY TO │                   │
             │ SWITCH ON    │                   │
             └──────┬───────┘                   │
                    │ (automatic)               │
                    ▼                           │
             ┌─────────────┐                   │
             │ SWITCH ON    │                   │
             │ DISABLED     │◄──────────────────┤
             └──────┬───────┘     Fault Reset   │
                    │ Shutdown                  │
                    ▼                           │
             ┌─────────────┐                   │
             │ READY TO     │                   │
             │ SWITCH ON    │                   │
             └──────┬───────┘                   │
                    │ Switch On                 │
                    ▼                           │
             ┌─────────────┐                   │
             │ SWITCHED ON  │                   │
             └──────┬───────┘                   │
                    │ Enable Op                 │
                    ▼                           │
             ┌─────────────┐    Fault    ┌──────┴──────┐
             │ OPERATION    │───────────►│   FAULT     │
             │ ENABLED      │            └─────────────┘
             └──────────────┘
```

---

## Controlword (0x6040) — Bit Definition

| Bit | Name | Description |
| --- | ---- | ----------- |
| 0 | Switch On | Ready to switch on → Switched on |
| 1 | Enable Voltage | Enable power stage voltage |
| 2 | Quick Stop | 0 = Quick stop active, 1 = Normal |
| 3 | Enable Operation | Switch on → Operation enabled |
| 4 | Mode specific | Depends on mode of operation |
| 5 | Mode specific | Depends on mode of operation |
| 6 | Mode specific | Depends on mode of operation |
| 7 | Fault Reset | Rising edge resets fault |
| 8 | Halt | 1 = Stop motion (mode specific) |
| 9-15 | Reserved / Manufacturer | Profile/manufacturer specific |

### State Transition Commands

| Transition | Controlword Value | Hex |
| ---------- | ----------------- | --- |
| Shutdown | `0110` | `0x0006` |
| Switch On | `0111` | `0x0007` |
| Enable Operation | `1111` | `0x000F` |
| Disable Voltage | `0000` | `0x0000` |
| Quick Stop | `0010` | `0x0002` |
| Disable Operation | `0111` | `0x0007` |
| Fault Reset | Rising edge bit 7 | `0x0080` |

---

## Statusword (0x6041) — Bit Definition

| Bit | Name | Description |
| --- | ---- | ----------- |
| 0 | Ready to Switch On | Drive is initialized |
| 1 | Switched On | Power stage ready |
| 2 | Operation Enabled | Drive is in operation |
| 3 | Fault | Drive is in fault state |
| 4 | Voltage Enabled | HV supply present |
| 5 | Quick Stop | Quick stop is active (0) or inactive (1) |
| 6 | Switch On Disabled | Drive is disabled |
| 7 | Warning | Non-fatal warning active |
| 8 | Manufacturer specific | - |
| 9 | Remote | Drive is controlled via fieldbus |
| 10 | Target Reached | Motion target achieved |
| 11 | Internal Limit Active | SW/HW limit active |
| 12-13 | Mode specific | Depends on operation mode |
| 14-15 | Manufacturer specific | - |

### State Identification via Statusword

| State | Statusword Mask | Statusword Value |
| ----- | --------------- | ---------------- |
| Not Ready to Switch On | `xxxx xxxx x0xx 0000` | `0x0000` |
| Switch On Disabled | `xxxx xxxx x1xx 0000` | `0x0040` |
| Ready to Switch On | `xxxx xxxx x01x 0001` | `0x0021` |
| Switched On | `xxxx xxxx x01x 0011` | `0x0023` |
| Operation Enabled | `xxxx xxxx x01x 0111` | `0x0027` |
| Quick Stop Active | `xxxx xxxx x00x 0111` | `0x0007` |
| Fault Reaction Active | `xxxx xxxx x0xx 1111` | `0x000F` |
| Fault | `xxxx xxxx x0xx 1000` | `0x0008` |

---

## Modes of Operation (0x6060)

| Value | Mode | Description |
| ----- | ---- | ----------- |
| 1 | PP (Profile Position) | Target position with velocity profile |
| 3 | PV (Profile Velocity) | Target velocity with acceleration profile |
| 4 | PT (Profile Torque) | Target torque |
| 6 | Homing | Reference / homing sequence |
| 7 | IP (Interpolated Position) | Position interpolation |
| 8 | CSP (Cyclic Synchronous Position) | Cyclic position from master |
| 9 | CSV (Cyclic Synchronous Velocity) | Cyclic velocity from master |
| 10 | CST (Cyclic Synchronous Torque) | Cyclic torque from master |

> **CODESYS PLCopen FBs use CSP (8) by default** for MC_MoveAbsolute, MC_MoveRelative, etc.

---

## Essential Object Dictionary

| Index | Subindex | Name | Type | Access |
| ----- | -------- | ---- | ---- | ------ |
| 0x6040 | 0 | Controlword | UINT16 | RW |
| 0x6041 | 0 | Statusword | UINT16 | RO |
| 0x6060 | 0 | Modes of Operation | INT8 | RW |
| 0x6061 | 0 | Modes of Operation Display | INT8 | RO |
| 0x6064 | 0 | Position Actual Value | INT32 | RO |
| 0x606C | 0 | Velocity Actual Value | INT32 | RO |
| 0x6077 | 0 | Torque Actual Value | INT16 | RO |
| 0x607A | 0 | Target Position | INT32 | RW |
| 0x60FF | 0 | Target Velocity | INT32 | RW |
| 0x6071 | 0 | Target Torque | INT16 | RW |
| 0x6081 | 0 | Profile Velocity | UINT32 | RW |
| 0x6083 | 0 | Profile Acceleration | UINT32 | RW |
| 0x6084 | 0 | Profile Deceleration | UINT32 | RW |
| 0x6098 | 0 | Homing Method | INT8 | RW |
| 0x6099 | 1 | Homing Speed (fast) | UINT32 | RW |
| 0x6099 | 2 | Homing Speed (slow) | UINT32 | RW |
| 0x605A | 0 | Quick Stop Option | INT16 | RW |
| 0x605B | 0 | Shutdown Option | INT16 | RW |
| 0x605E | 0 | Fault Reaction Option | INT16 | RW |

---

## PDO Mapping — Typical EtherCAT Configuration

### RxPDO (Master → Slave)

```
RxPDO 1 (0x1600):
  0x6040:00  Controlword       (UINT16)
  0x607A:00  Target Position    (INT32)

RxPDO 2 (0x1601):
  0x6060:00  Modes of Operation (INT8)
  0x60FF:00  Target Velocity    (INT32)
```

### TxPDO (Slave → Master)

```
TxPDO 1 (0x1A00):
  0x6041:00  Statusword            (UINT16)
  0x6064:00  Position Actual Value  (INT32)

TxPDO 2 (0x1A01):
  0x6061:00  Modes of Op Display   (INT8)
  0x606C:00  Velocity Actual Value  (INT32)
  0x6077:00  Torque Actual Value    (INT16)
```

---

## Common Fault Recovery Pattern (CODESYS ST)

```iecst
// CiA 402 Fault Recovery Sequence
CASE nFaultRecovery OF
  0: // IDLE — monitor for faults
    IF wStatusWord.3 THEN // Fault bit
      nFaultRecovery := 10;
    END_IF

  10: // Assert Fault Reset (rising edge on bit 7)
    wControlWord := wControlWord OR 16#0080;
    tonFaultReset(IN := TRUE, PT := T#100MS);
    IF tonFaultReset.Q THEN
      nFaultRecovery := 20;
    END_IF

  20: // Release Fault Reset
    wControlWord := wControlWord AND NOT 16#0080;
    tonFaultReset(IN := FALSE);
    IF NOT wStatusWord.3 THEN // Fault cleared
      nFaultRecovery := 0; // Return to idle
    ELSE
      nRetryCount := nRetryCount + 1;
      IF nRetryCount >= 3 THEN
        nFaultRecovery := 99; // Give up
      ELSE
        nFaultRecovery := 10; // Retry
      END_IF
    END_IF

  99: // PERMANENT FAULT — requires manual intervention
    bPermanentFault := TRUE;
END_CASE
```

---

## CODESYS PLCopen Motion → CiA 402 Mapping

| PLCopen FB | CiA 402 Action |
| ---------- | -------------- |
| MC_Power (Enable) | Controlword transitions: Shutdown → Switch On → Enable Operation |
| MC_Power (Disable) | Controlword: Disable Voltage (0x0000) |
| MC_Home | Sets Mode 6 (Homing), Controlword bit 4 start |
| MC_MoveAbsolute | Sets Target Position (0x607A), Mode 8 (CSP) |
| MC_MoveRelative | Calculates absolute target, same as MoveAbsolute |
| MC_MoveVelocity | Sets Target Velocity (0x60FF), Mode 9 (CSV) |
| MC_Stop | Controlword: Quick Stop or decel to zero |
| MC_Reset | Controlword: Fault Reset (bit 7 rising edge) |

---

## Slave Identification — Configured Station Alias vs Position

An EtherCAT master must decide *which physical device* each configured slave maps to.
There are two strategies, and the choice has real commissioning consequences.

| Strategy | How the master matches | Robustness | Cost |
| -------- | ---------------------- | ---------- | ---- |
| **By position** (`Identification = Disabled`) | Auto-increment order on the wire (1st, 2nd, 3rd…) | Fine for a **fixed topology** | None — nothing to configure |
| **By alias** (`Configured Station Alias`, ADO **`0x0012`**) | Reads the alias register the device reports | Robust to reordering **and to a missing/optional slave** | Alias must be **written to the drive EEPROM** |

- **By position** is the simplest and needs no per-device setup, but it is fragile: swap the
  cabling order or **remove one slave** and every downstream slave shifts by one — commands then
  go to the wrong device. It also disables any real "optional slave" feature (all configured
  slaves must be present, in order).
- **By alias** is what modular machines want: each drive is identified by *who it is*, not
  *where it sits*, so an absent optional axis does not shift the rest. The price is that the alias
  (e.g. 1001, 1002, …) must actually live in the device.

### Gotcha — "alias address not set" (project correct, still dropped)

> Setting `Identification = Configured station alias` **in the project is not enough.** If the
> alias was never **written to the drive's EEPROM**, the master drops the slave at startup with
> **`alias address not set`** (and often a vendor/product mismatch), even though the project is
> configured correctly.

Diagnosis on the slave's online page: the alias shows `Value = 1004` (from the project) but
**`Actual address = 0`** — proof the alias is not in the EEPROM. Two fixes:

1. **Write the alias to EEPROM** on each drive (vendor commissioning tool / "write station alias
   to EEPROM"), then keep `Identification = Configured station alias`. This is the correct choice
   for machines with optional axes.
2. **Switch `Identification = Disabled`** (identify by position) if the topology is fixed and you
   do not need optional slaves — the alias EEPROM value then becomes irrelevant.

---

## Drive Health from the Statusword (no dedicated diagnostic DI)

You do **not** need to wire dedicated "drive OK / drive fault" digital inputs to know a servo's
health. The CiA 402 **statusword Fault bit (bit 3)** already carries it, delivered every scan on
the cyclic input PDO. Read `AxisError` / `AxisErrorID` from the motion FB each cycle and publish a
single `bFault_<axis>` status bit to the rest of the program.

This is valid **provided the safety function (STO / SBC) is hardwired and certified in the drive
itself** — e.g. two-channel, self-monitored STO wired through a safety relay, PL-rated in the
drive. In that architecture the machine's safety integrity does **not** depend on the PLC reading
those bits; the statusword Fault bit is purely a *health/status* indication, not a safety signal.

### If you need the real STO / SBC state (not just OK/fault)

The plain statusword Fault bit tells you "the drive faulted", not "STO is currently active". If
you need the actual safety-function state over the bus, most drives expose it as vendor-specific,
PDO-mappable CoE objects — read over EtherCAT with **no extra DI wiring**. On Festo CMMT drives,
for example:

- **`0x2164:3` bit 3** — "safe state reached" (STO status)
- **`0x2165:2`** — SBC (Safe Brake Control) status

Map those into the input PDO if the application must display or interlock on live STO/SBC state.
For a simple "drive OK vs faulted" indication, the standard statusword Fault bit is sufficient.

---

## Troubleshooting — Axis Reads Position but Won't Move

A very common commissioning symptom: the HMI/watch shows the **actual position updating** (the
axis clearly "sees" the encoder), yet a jog or move command does **nothing**.

> **Key insight:** position feedback arrives on the **input PDO regardless of the power stage.**
> The encoder value (`0x6064`) is published even with power off and the drive not enabled — so
> "it reads position" proves only that EtherCAT input mapping works. **Motion requires the drive
> in `Operation Enabled`**, which is a separate condition. A servo-axis FB typically will not
> accept a jog until its internal state reaches "ready", and that state is gated on
> `MC_Power.Status = TRUE`; until then it sits in "enabling" and silently ignores move commands.

Work the checklist **in this order, ordered by probability** — stop at the first that fails:

1. **STO not released (suspect #1).** The drive's hardware Safe-Torque-Off input is not released,
   so it can never reach Operation Enabled. A PLC "safe OK" bit is **not** the drive STO — STO is a
   physical circuit (safety relay → the drive's STO terminals). Check the drive LED/state, not a
   software flag.
2. **Power stage without energy.** 24 V control present (so it communicates and reads position)
   but the DC-bus / power supply is off. Communication ≠ powered.
3. **Drive in fault.** Read the drive error code (`AxisErrorID` / statusword bit 3). If non-zero,
   issue a fault reset (`MC_Reset`) before anything else.
4. **EtherCAT not fully Operational for that axis.** In the device tree the slave must be
   **`Operational` (OP)**, not `SafeOP`/`PreOP`. In SafeOP the outputs (controlword) are not
   applied, so the drive never enables.
5. **Software limit blocks the commanded direction.** If the target is beyond a configured
   soft-limit, the move in *that* direction is rejected while the opposite direction still works.
   **Test the opposite direction first** to isolate this from a genuine enable failure.

> UI trap: a "machine state" or "sequence state" shown on the HMI is often the *choreography*
> state, not the *drive* state — it can read "idle/stopped" while the real blocker is that the
> drive never enabled. Surface the servo FB's own state (or `MC_Power.Status`) to diagnose this.
