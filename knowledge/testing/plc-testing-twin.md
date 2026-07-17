---
id: plc-testing-twin
title: Testing Structured Text Without Hardware — the Python Twin Method
priority: HIGH
token_estimate: 3500
use_when:
  - you want to test PLC logic before you have the hardware
  - setting up automated tests / CI for Structured Text
  - modelling IEC timers (TON/TOF) deterministically in a simulation
  - deriving safe motion thresholds (anti-collision) by simulation
  - deciding what a PLC unit test should actually assert
  - reviewing whether a station behaves correctly across a whole cycle
never_use_when:
  - you need the CODESYS-native test framework only (this is a language-agnostic method)
  - the task is naming/convention validation (see conventions / plc_validate)
related: [plc-architecture-patterns, plc-alarm-patterns, state-machines]
keywords: [test plc without hardware, plc unit test, structured text testing, twin, digital twin, simulation, python mirror, scan based timer, TON, TOF, time to scans, deterministic test, discriminative test, physical result assertion, regression test, collision detection, swept AABB, continuous collision detection, CCD, tunneling, derive safe threshold, anti-collision, two axis, gantry, offline testing, ci for plc, test before commissioning, how to test ladder logic, verify plc logic]
see_also: [plc-architecture-patterns, plc-alarm-patterns, state-machines]
---

# Testing Structured Text Without Hardware — the Python Twin

> Structured Text only runs on the PLC, so a bug is normally found on the bench,
> late and expensively. The **twin method** moves that feedback to every commit:
> keep a Python mirror of the PLC logic, run it thousands of scans per second in
> CI, and assert the **physical result**. It is language-agnostic (Python here
> only because it is quick to write); the ideas apply to any host language.

## 1. The method in one paragraph

For every `.st` program you write, keep a `.py` mirror that reproduces its logic
**1:1** and is committed **in the same commit**. Tests drive the mirror scan by
scan and assert what the machine physically does (part staged, motor ran, axes
never collided) — not how the code is structured. When a bug is found on the
bench, it becomes a new discriminative test first, so it can never come back.

Four rules make it work:

1. **Mirror in lockstep.** A change to `.st` and the change to its `.py` land
   together. A drift between them is a bug in the test harness, caught in review.
2. **Count scans, not milliseconds.** Timers are deterministic (§2).
3. **Assert the physical result, discriminatively** (§3).
4. **Regression corpus.** Every fixed bug leaves a guard behind (§5).

## 2. Scan-based timers — deterministic time

A real IEC `TON` measures wall-clock time. In a twin you do not have (or want)
wall-clock time — you want determinism. So model **one scan as the unit of time**
and re-implement the timers to count scans. Convert any preset in milliseconds to
a scan count once, using the task's cycle time.

```python
"""IEC 61131-3 scan-based primitives — TON / TOF by scan counting.

In the twin we count scans instead of measuring real time.
1 scan = 1 cycle of the task (e.g. a 4 ms MainTask). time_to_scans()
converts a millisecond preset into a scan count.
"""
from dataclasses import dataclass

SCAN_MS_DEFAULT = 4  # conservative CODESYS MainTask period


def time_to_scans(t_ms: float, scan_ms: float = SCAN_MS_DEFAULT) -> int:
    """Convert a time (ms) into a number of scans (>=1 when t_ms > 0)."""
    if t_ms <= 0:
        return 0
    return max(1, int(round(t_ms / scan_ms)))


@dataclass
class TON:
    """Timer On Delay. Q becomes TRUE after PT scans with IN held TRUE.

    Mirrors the IEC 61131-3 TON. Q=False when IN=False. PT is in SCANS.
    """
    pt: int = 0      # preset, in scans
    et: int = 0      # elapsed, in scans
    q: bool = False

    def __call__(self, in_: bool, pt: int | None = None) -> bool:
        if pt is not None:
            self.pt = pt
        if in_:
            if self.et < self.pt:
                self.et += 1
            self.q = self.et >= self.pt   # PT=0 -> Q rises the same scan IN does
        else:
            self.et = 0
            self.q = False
        return self.q


@dataclass
class TOF:
    """Timer Off Delay. Q rises immediately with IN; holds TRUE for PT scans
    after IN falls."""
    pt: int = 0
    et: int = 0
    q: bool = False

    def __call__(self, in_: bool, pt: int | None = None) -> bool:
        if pt is not None:
            self.pt = pt
        if in_:
            self.q = True
            self.et = 0
        else:
            if self.et < self.pt:
                self.et += 1
            if self.et >= self.pt:
                self.q = False
        return self.q
```

Because time is discrete, a test that needs "after 8000 ms with a 4 ms scan"
simply runs `2000` scans — no sleeps, no flakiness, and the same result on every
machine. (Deliberately *omit* `R_TRIG`/`F_TRIG` from the primitives: the station
architecture uses persistent set/reset levels, not producer-side edges — see
`plc-architecture-patterns` §4. If a station relies on an edge that a scan-based
twin cannot see, that is a design smell the twin will surface.)

## 3. Discriminative tests — assert the physical result

A weak PLC test asserts structure ("state went to 2"). A **discriminative** test
asserts the outcome and would **fail if the behavior were wrong** — it
discriminates the correct machine from a plausible-but-broken one. Drive the
mirror scan by scan and check the actuator / bus outputs:

```python
def _mk():
    io = GvlIO(); io.i_key_auto = True
    bus = GvlBus(b_safe_ok=True, b_main_soft_stop=False, b_main_auto_mode=True)
    return PRG_Conveyor(), io, bus, GvlConfig()

def test_stops_the_instant_it_is_full():
    prg, io, bus, cfg = _mk()
    io.i_part1 = True
    io.i_part2 = True          # both nest sensors occupied = staged pair
    prg.scan(io, bus, cfg)
    assert io.q_conveyor is False      # motor stopped — the physical result

def test_safety_cuts_the_motor():
    prg, io, bus, cfg = _mk()
    bus.b_safe_ok = False
    prg.scan(io, bus, cfg)
    assert io.q_conveyor is False

def test_jam_becomes_a_sticky_fault_and_reset_clears_it():
    prg, io, bus, cfg = _mk()
    io.i_part1 = True                  # part stuck at sensor 1, belt running
    for _ in range(2100):              # > jam preset (8000 ms = 2000 scans)
        prg.scan(io, bus, cfg)
    assert bus.b_conveyor_fault is True
    assert io.q_conveyor is False      # motor stopped in the fault
    io.i_part1 = False                 # cause cleared
    io.i_reset = True
    prg.scan(io, bus, cfg); io.i_reset = False
    prg.scan(io, bus, cfg)
    assert bus.b_conveyor_fault is False
```

Each test names the physical claim it defends: "stops when full", "safety cuts",
"a jam is a sticky fault that reset clears only once the cause is gone". If the
logic regressed, the assert on the *output* fails — a structural assert on
`nState` might still pass.

## 4. Deriving safe motion thresholds by simulation (swept collision / CCD)

Some safety parameters are hard to get right by hand — for example the minimum
separation two independent axes need so they never share the same space. The twin
can **prove** non-collision and **derive** the safe thresholds, using a
transverse observer that belongs to no station (the PLC itself uses only a simple
1-D threshold; the observer proves that threshold is enough).

Model each moving carriage as an axis-aligned bounding box (AABB) whose center
moves along one global axis. Two AABBs are separated iff **any** axis separates,
so their clearance is the *larger* of the per-axis gaps:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Envelope:
    half_x: float   # half-width of the carriage box, projected on X
    half_y: float

@dataclass(frozen=True)
class AxisGeometry:
    envelope: Envelope
    axis: str            # "X" (Axis A slides on X) or "Y" (Axis B slides on Y)
    cross_offset: float = 0.0   # fixed position on the perpendicular axis

def center(geo, pos_mm):
    return (pos_mm, geo.cross_offset) if geo.axis == "X" else (geo.cross_offset, pos_mm)

def clearance(geo_a, pa, geo_b, pb):
    """Gap between the two boxes (mm). >0 separated, <0 penetrating."""
    ax, ay = center(geo_a, pa)
    bx, by = center(geo_b, pb)
    gap_x = abs(ax - bx) - (geo_a.envelope.half_x + geo_b.envelope.half_x)
    gap_y = abs(ay - by) - (geo_a.envelope.half_y + geo_b.envelope.half_y)
    return max(gap_x, gap_y)
```

Checking only the *end-of-scan* positions is not enough: at high speed two boxes
can pass through each other **between** two sampled points ("tunneling"), and the
simulation would report a false "safe". Use a **swept / continuous collision
check (CCD)**: test the whole segment each axis sweeps during the scan. Each axis
projection yields a time sub-interval of `t ∈ [0,1]` in which it overlaps; a
collision exists iff those intervals intersect.

```python
def _t_interval_abs_lt(a, b, h):
    """Sub-interval of t in [0,1] where |a + b*t| < h, or None if empty."""
    if h <= 0.0:
        return None
    if abs(b) < 1e-12:
        return (0.0, 1.0) if abs(a) < h else None
    t1, t2 = (-h - a) / b, (h - a) / b
    lo, hi = (t1, t2) if t1 <= t2 else (t2, t1)
    lo, hi = max(lo, 0.0), min(hi, 1.0)
    return (lo, hi) if lo < hi else None

def swept_collide(geo_a, a0, a1, geo_b, b0, b1):
    """True if the boxes overlap at ANY instant while Axis A sweeps a0->a1
    and Axis B sweeps b0->b1 (linear motion within the scan)."""
    hx = geo_a.envelope.half_x + geo_b.envelope.half_x
    hy = geo_a.envelope.half_y + geo_b.envelope.half_y
    tx = _t_interval_abs_lt((a0) - geo_b.cross_offset, a1 - a0, hx)   # A on X, B fixed
    if tx is None: return False
    ty = _t_interval_abs_lt(geo_a.cross_offset - (b0), -(b1 - b0), hy)  # A fixed, B on Y
    if ty is None: return False
    return max(tx[0], ty[0]) < min(tx[1], ty[1])
```

From worst-case geometry (deliberately generous half-widths, all marked "MEASURE
on the bench") plus the max velocities and one scan of E-P-S latency, derive the
minimum safe threshold and home per axis:

```python
def derive_safe_threshold(geo_a, geo_b, v_a_mm_s, v_b_mm_s,
                          clearance_mm, scan_ms=4.0, n_scans_latency=1):
    """threshold = sum of the two half-widths on the axis + clearance +
       (velocity x one scan of E-P-S latency). home = threshold + own half-width
       + a stopping margin (axis fully out of the other's reach)."""
    hx = geo_a.envelope.half_x + geo_b.envelope.half_x
    lat = v_a_mm_s * (scan_ms / 1000.0) * n_scans_latency
    return hx + clearance_mm + lat
```

A `CollisionSentinel` plugged into the scan loop runs `swept_collide` between the
previous and current scan on every step, records the minimum clearance ever
reached, and flags the first scan of any overlap. Run it across your whole
scenario/property test corpus: if it never trips at the derived threshold, the
threshold is proven safe *in simulation* — then confirm the measured geometry on
the bench.

## 5. Regression corpus — a bug caught never returns

Keep a growing file of tests where **each entry is a real incident** turned into
a discriminative guard. When a bench bug is diagnosed, the first artifact is the
failing test that reproduces it; the fix makes it pass. Examples of classes worth
locking down: a fault that must be sticky until reset, a handoff that must be a
level and not a one-scan pulse (see `codesys-gotchas`), a mode that must be
dead-man (release-to-stop). Run the whole corpus on every commit so the machine's
hard-won behavior is defended for good.
