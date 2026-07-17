---
id: safety-relay-scs
title: Weidmüller SCS P2SIL3ES Safety Relay — Dual-Channel E-Stop / Guard Monitoring
priority: MEDIUM
token_estimate: 1600
use_when:
  - wiring or commissioning a dual-channel safety relay (E-stop, guard door, light curtain)
  - user needs the SCS P2SIL3ES terminal assignment / pinout
  - user asks about SIL 3 / PL e / Cat 4 safety input evaluation
  - external device monitoring (EDM) and reset (manual / auto start) wiring
  - cross-connection (cross-fault) detection between the two safety channels
never_use_when:
  - user asks about a safety PLC / F-CPU (this is a hardwired safety relay, not a fail-safe controller)
  - user asks about Pilz PNOZ, Siemens 3SK, or another vendor (proprietary, different pinout)
  - functional (non-safety) control logic — this device only evaluates the safety chain
related: [festo-cdpx-hmi]
keywords: [safety relay, SCS, P2SIL3ES, Weidmüller, Weidmuller, SIL3, SIL 3, PLe, PL e, Cat4, Category 4, dual-channel, two-channel, E-stop, emergency stop, guard door, light curtain, EDM, external device monitoring, reset, manual start, auto start, cross-connection, cross-fault, short-circuit detection, Stop category 0, EN ISO 13849-1, EN 61508, EN 60204-1, HFT, TÜV, S11, S12, S21, S22, S33, S34, S35, A1, A2, C1, C2]
---

# Weidmüller SCS P2SIL3ES Safety Relay

## Overview

The **Weidmüller SCS 24VDC P2SIL3ES** (part number **1319280000**) is a hardwired
safety relay (safety output module) that evaluates a two-channel safety input — such as
an emergency-stop chain, a guard-door interlock, or a safety light curtain — and switches
two redundant enabling outputs. It targets high safety categories in machine building:

- **SIL 3** per EN 61508
- **PL e** / **Category 4** per EN ISO 13849-1
- **Stop category 0** per EN 60204-1 (immediate de-energization)

The device is a fixed-function relay, **not** a safety PLC/F-CPU: its logic (dual-channel
evaluation, reset behaviour, external device monitoring) is selected entirely by wiring, not
by program. A distinguishing feature versus older two-channel relays is **native
cross-connection detection** between the two input channels (see below), which removes the
need for external test-pulse outputs.

> **Vendor-specific pinout.** The terminal scheme below is proprietary to Weidmüller and
> differs from Pilz PNOZ, Siemens 3SK, and other relays. Do not carry terminology across
> vendors — a "S34 reset" on this device is not the same net as on another manufacturer's part.

## Terminal Assignment (Pinout)

| Terminal | Function |
|----------|----------|
| `A1`, `A2` | 24 VDC logic supply (A1 = +24 V, A2 = 0 V) |
| `C1`, `C2` | Reaction-time bridge (optional). **Jumpered = ~50 ms** (default). **Open = ~20 ms** (faster response) |
| `S11`, `S12` | Safety input, **channel 1** (activation CH1) |
| `S21`, `S22` | Safety input, **channel 2** (activation CH2) — cross-connection to CH1 detected internally |
| `S33`, `S34` | Reset path — **manual start, falling edge** (normally-closed path that briefly opens to trigger the enable) |
| `S33`, `S35` | Reset path — **manual start rising edge**, or **auto start** when `S33`–`S35` are permanently jumpered |
| `13`–`14` | Safety enabling output, **channel A** (NO, max 5 A with external time-lag fuse) |
| `23`–`24` | Safety enabling output, **channel B** (NO, max 5 A with external time-lag fuse) |
| `31`–`32` | Acknowledgement output (NC, **non-safety** signalling / diagnostics only) |

- Both safety inputs are normally-closed loops: opening either channel de-energizes both
  enabling outputs (13–14 and 23–24).
- Terminals 31–32 mirror the state for diagnostics (e.g. a standard PLC digital input) and
  **must not** be used in the safety function.

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Safety integrity | SIL 3 (EN 61508), PL e / Cat 4 (EN ISO 13849-1), certified by TÜV NORD |
| Stop category | 0 (EN 60204-1) |
| Hardware fault tolerance (HFT) | 1 |
| Device type | A |
| Supply | 24 VDC (A1/A2) |
| Minimum guaranteed input current | 35 mA at 24 VDC |
| Switch-on time (TE) | 30 ms |
| Switch-off time (TA) | 15 ms |
| Reset recovery time (TB) | 100 ms minimum on the reset edge |
| Test-pulse immunity | Test pulses up to 1 ms on A1/A2 do not trip the outputs |
| Output rating | Max 5 A per channel, external time-lag (T) fuse required |
| Reset monitoring | Native reset-button monitoring |
| Restart behaviour | Restart lockout — does not self-rearm after a supply interruption |

The reaction time depends on the `C1`–`C2` bridge: leave it jumpered (~50 ms) for the
default behaviour, or remove it (~20 ms) when a faster stop is required.

## Operating Modes

The reset/start behaviour is selected by how `S33`, `S34`, and `S35` are wired:

1. **Manual start — falling edge (`S33`/`S34`)** — the reset path is a normally-closed loop
   held closed at rest; it opens briefly (≥ 100 ms) to trigger the enable. This is the usual
   mode for E-stop chains and integrates cleanly with an external EDM loop (mirror NC contacts
   of the downstream contactors in series). Recommended default for supervised restart.
2. **Manual start — rising edge (`S33`/`S35`)** — a normally-open path closes briefly to
   trigger the enable.
3. **Auto start (`S33`–`S35` permanently jumpered)** — the relay closes its outputs as soon
   as A1/A2 is energized and the input channels are closed. **Use only where a risk
   assessment permits automatic restart.** For machines where an operator must acknowledge
   the hazard before restart, auto start is not allowed — use a manual-start mode instead.
4. **Start via safety PLC (through A1/A2)** — requires a certified safety-PLC digital output;
   only applicable when a fail-safe controller is present in the system.

## Native Cross-Connection Detection

The key differentiator versus simpler two-channel relays: the SCS P2SIL3ES detects a
short-circuit **between** channel 1 and channel 2 by **internal hardware**, without any
external test-pulse (clock) outputs on the input wiring.

Practical consequences:

- No dedicated test-pulse outputs are needed to qualify the two input channels.
- The cross-fault exclusion normally argued via EN ISO 13849-2 Annex D (cable fault exclusion)
  is not required: the two channels may share the same conduit/cable duct without a special
  fault-exclusion note, because a cross-connection is diagnosed, not excluded.
- This simplifies both the wiring and the safety validation documentation.

## Application Notes (Generic Wiring)

The following is a generic application pattern; adapt terminal counts and device names to your
own machine. Do **not** hardcode PLC addresses — read them from your I/O mapping.

**Two-channel safety inputs** — wire all safety devices (E-stops, guard switches) in series on
each channel independently:

```text
Channel 1:  +24V -> [E-stop A NC1] -> [E-stop B NC1] -> [Guard NC1] -> S11 / S12
Channel 2:  +24V -> [E-stop A NC2] -> [E-stop B NC2] -> [Guard NC2] -> S21 / S22
```

**External device monitoring (EDM) + reset** — put the normally-closed mirror contacts of the
downstream safety contactors (K1, K2) in series in the reset loop, so a welded contactor blocks
the next enable. A dedicated reset relay pulsed by a (standard) PLC output can drive the
falling edge:

```text
S33 -> [K1 mirror NC] -> [K2 mirror NC] -> [reset relay NC] -> S34
```

**Safety outputs** — the two enabling outputs drive the two redundant contactor coils:

```text
13-14 -> coil K1 (channel A)
23-24 -> coil K2 (channel B, in series with the load)
31-32 -> PLC digital input (diagnostic "safety OK", non-safety)
```

## Design Notes / Common Pitfalls

- **Do not import other vendors' terminology.** The `S33`/`S34` falling-edge reset is correct
  for this Weidmüller device; the identical label on a different relay may mean something else.
- **`S35` is only for rising-edge or auto start.** Leave it unconnected in falling-edge manual
  mode.
- **Distinguish a dedicated EDM input from the reset chain.** On this device the EDM mirror
  contacts live in the reset loop, not on a separate EDM terminal — series them with the reset
  path, not elsewhere.
- **Restart lockout is intrinsic.** After a supply interruption the relay stays open until the
  reset edge is applied again; do not add extra latching logic expecting the relay to self-arm.

## References

- Manufacturer manual: Weidmüller SCS 24VDC P2SIL3ES, document `1438130000` (verify the pinout
  and timing against the current revision on the manufacturer's site).
- Applicable standards: EN 61508 (SIL), EN ISO 13849-1 / -2 (PL, fault exclusion),
  EN 60204-1 (stop categories).
