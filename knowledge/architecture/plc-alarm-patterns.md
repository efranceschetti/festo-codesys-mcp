---
id: plc-alarm-patterns
title: PLC Alarm Design — Stall, Timeout, Device Categories and Boot-Fault Masking
priority: HIGH
token_estimate: 2600
use_when:
  - designing the alarm / fault catalogue for a machine
  - deciding how to detect that a motion did not happen
  - distinguishing a stuck axis from a merely slow one
  - encoding fault codes so the HMI can decode them with one table
  - suppressing phantom boot alarms (drive in STO while enabling)
never_use_when:
  - you need to decode a specific vendor error code (see explain_error_code / error-diagnosis)
  - the question is the overall program skeleton (see plc-architecture-patterns)
related: [plc-architecture-patterns, plc-testing-twin, ethercat-cia402]
keywords: [alarm design, fault detection, alarm categories, stall detection, timeout alarm, device fault, watchdog, non-progress, stuck axis, slow axis, deadline TON, statusword fault bit, DI fault, fault code encoding, station code, decode alarm on HMI, alarm table, boot phantom alarm, false fault, STO during enable, on-delay alarm, drive fault delay, TimeoutWatch, alarm timing, how to detect a jam, motion did not complete, fault persistence, alarm naming]
see_also: [plc-architecture-patterns, plc-testing-twin, ethercat-cia402]
---

# PLC Alarm Design

> A machine's alarms are only as good as the *timing model* behind each one. The
> useful way to organize alarms is not by which station raised them, but by **how
> the condition is watched over time**. Three categories cover almost everything,
> and a single encoding lets the HMI decode any alarm with one table.

## 1. The three categories — organized by how time is managed

The **category** defines the shape of the watchdog; each alarm still has its own
name (the HMI text). Apply categories by *relevance*: a station only publishes
the categories its hardware can actually detect.

| Category | Code | Detects | How |
|----------|------|---------|-----|
| **STALL** | `1` | "I commanded motion and there is **no movement**" | fast non-progress watchdog: blocked / jammed / stuck partway |
| **TIMEOUT** | `2` | "I commanded and it **did not complete in time**" | a deadline `TON`: catches the slow / partial case the stall misses |
| **DEVICE** | `≥3` | a fault **reported by the hardware itself** | direct read of a DI / drive statusword: drive fault, overcurrent, sensor wiring |

STALL and TIMEOUT are the standard **pair** for anything that moves; DEVICE is
instantaneous (no timing).

## 2. The stall-vs-timeout heuristic

STALL and TIMEOUT are complementary because they discriminate two different
failure modes of the same motion:

- An axis that is **blocked** (mechanically stuck, jammed) shows **no progress** →
  the STALL watchdog fires quickly (it watches "commanded but not moving").
- An axis that is **merely slow** (under-powered, dragging, high load) *is* moving,
  so it never trips the STALL — but it blows the **TIMEOUT** deadline for
  completing the move.

Using only a timeout means a hard block is reported late; using only a stall
means a slow move is never reported. Use both:

```iecst
(* STALL: commanded to move but the encoder/position is not progressing *)
fbStall(IN := bMoveCmd AND NOT bIsProgressing, PT := GVL_Config.tStallTimeout);
IF fbStall.Q THEN nFaultCode := cFLT_STALL; nState := cFAULT; END_IF   // 1

(* TIMEOUT: commanded and still not at target after the deadline *)
fbMove(IN := bMoveCmd AND NOT bAtTarget, PT := GVL_Config.tMoveTimeout);
IF fbMove.Q THEN nFaultCode := cFLT_TIMEOUT; nState := cFAULT; END_IF  // 2
```

Where "is progressing" is derived from a change in the actual position over a few
scans. A pump has no position feedback, so it publishes no STALL — only a DEVICE
fault (overcurrent DI) and perhaps a flow TIMEOUT. A simple conveyor may collapse
to a single TIMEOUT (jam) with one cause.

## 3. Rules that keep the catalogue consistent

1. **The number IS the category, identical in every station:** `1=STALL`,
   `2=TIMEOUT`, `≥3=DEVICE`. The HMI decodes the *category* with **one** table;
   the station bit says *where*.
2. **Apply by relevance, case by case.** Only publish the categories the hardware
   can detect (no position feedback → no STALL; no protection DI → the fault is a
   single cause, just a `bFault` + text, no sub-code).
3. **Constant names in English; the description/HMI text is localized.** Name the
   *phenomenon*, not the device: `cFLT_OVERCURRENT`, `cFLT_SENSOR`, `cFLT_DRIVE` —
   never name a specific breaker/part in the alarm (the part is hardware; the
   alarm is the phenomenon).
4. **Every watchdog time is a parameter in a persistent config GVL** (e.g.
   `GVL_Config`, `VAR_GLOBAL PERSISTENT RETAIN`) so it is tunable from the HMI.
   DEVICE alarms have no time.
5. **A legend in each program header** lists its typed alarms (`code : category :
   time`) so the catalogue's source of truth is the code itself.

## 4. One global code the HMI decodes with a single table

Encode each published fault as `station * 10 + localCause`. The HMI (or the alarm
history log) decodes any code with one small table — the tens digit is the
station, the units digit is the category/cause.

```
code = station * 10 + cause

  72  -> station 7, cause 2  ->  Station 7 TIMEOUT
  83  -> station 8, cause 3  ->  Station 8 DEVICE (drive)
  12  -> station 1, cause 2  ->  Station 1 TIMEOUT
```

Publish it on the bus as a level (`GVL_Bus.nStation_FaultCode`), and clear it to
`0` when the station is healthy so the code never goes stale. Each station is one
writer of its own code (see `plc-architecture-patterns` §4). A tiny worked set:

| Station (bit) | Local codes | Watchdog times |
|---------------|-------------|----------------|
| Conveyor (1) | `2` jam (TIMEOUT, single cause) | `tJamLimit` |
| Servo axis (2) | `1` stalled (STALL) · `2` did not reach target (TIMEOUT) · `3` drive fault (DEVICE) | `tStallTimeout` / `tMoveTimeout` |
| Pump (3) | `2` low flow (TIMEOUT) · `3` overcurrent (DEVICE) | `tFlowDelay` |

## 5. Mask phantom boot alarms with an on-delay (STO-during-enable)

A very common false alarm: at power-up a servo drive sits in **STO** (Safe Torque
Off) until it is enabled, which can take several seconds. If the drive's
`bError`/fault bit is latched into a station fault **in the same scan**, the
operator sees two or three alarms at boot that vanish on reset — real complaint,
structural cause.

The fix is **not** a global boot-grace hack that masks the alarm screen (that
couples every station to a startup flag and hides real faults). The fix is to
give the drive fault the **same on-delay treatment the other alarms already
have**: a `bError` only becomes a station fault if it **persists** for a
configurable time (e.g. 8000 ms). A transient STO-during-enable clears well
before that; a genuine drive fault stays and alarms.

```iecst
(* Drive fault is only real if it persists past the alarm on-delay.       *)
(* At boot the drive is in STO until enabled (~5-8 s): a transient bError  *)
(* self-clears; a genuine fault stays and trips.                          *)
fbDriveWatch(IN := fbAxis.bError,
             PT := GVL_Config.tDriveFaultAlarmDelay);   (* default 8000 ms *)
IF fbDriveWatch.Q THEN
    nFaultCode := cFLT_DRIVE;      (* DEVICE, code 3 *)
    nState := cFAULT;
END_IF
```

Make the delay a single tunable parameter (one value shared by all servo axes
saves persistent memory) exposed on the HMI "timeouts" screen. This attacks the
real cause — the *immediate* latch — instead of cosmetically hiding it, and a
real STO fault still alarms after the delay. Prove both halves in the twin: a
transient `bError` shorter than the delay never faults; one that persists past it
does (see `plc-testing-twin`).
