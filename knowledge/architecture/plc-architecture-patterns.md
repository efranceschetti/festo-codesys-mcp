---
id: plc-architecture-patterns
title: PLC Program Architecture — Input-Process-Output, State Machines, Emergent Coordination
priority: HIGH
token_estimate: 3400
use_when:
  - structuring a multi-station machine as separate PROGRAMs
  - deciding how PLC programs coordinate without a central orchestrator
  - choosing between CASE, IF and combinational rungs inside a PROGRAM
  - translating a ladder-logic mindset into readable Structured Text
  - asking "should I use design patterns (Observer/Factory/Strategy) in a PLC?"
  - deciding when logic deserves a Function Block vs staying inline in a PROGRAM
never_use_when:
  - you only need the naming rules (see conventions / hungarian-notation)
  - you need the servo motion FB signatures (see festo-ptp)
  - you need alarm timing categories specifically (see plc-alarm-patterns)
related: [state-machines, conventions, plc-alarm-patterns, plc-testing-twin]
keywords: [PLC architecture, program structure, input process output, E-P-S, scan cycle, state machine, CASE vs IF, combinational logic, rungs, single writer, one writer per output, station coordination, handshake bus, emergent coordination, no orchestrator, publish facts not commands, ladder to structured text, ladder migration, seal-in, latch set reset, mode mux, manual overrides auto, dead-man, when to make a function block, design patterns in PLC, GoF patterns, scan-cyclic determinism, one file one station, machine architecture, how to organize plc code]
see_also: [state-machines, conventions, plc-alarm-patterns, plc-testing-twin, hungarian-notation]
---

# PLC Program Architecture

> How to structure a multi-station machine so each PROGRAM is readable on the
> shop floor, coordinates with the others without a central "brain", and reads
> cleanly to an engineer coming from ladder logic. This is architecture, not
> naming — for identifier rules load `conventions`; for the state-machine value
> convention load `state-machines`.

## 1. The Input-Process-Output (I-P-O) skeleton

Every cyclic PROGRAM (one PROGRAM = one physical station) follows the same four
blocks, in this order. This is the single most important structural rule: once
every file looks the same, any file is readable at a glance.

```
1. INPUT      read raw sensors -> local bits   (bFull := iPart1 AND iPart2;)
2. CASE       decide ONLY where we are (transitions). No outputs here.
3. OUTPUT     derive each actuator command from state + mode. ONE writer/output.
4. PUBLISH    push facts to the shared bus + state to the HMI.
```

Why the `CASE` stays tiny: it only writes `nState`. The block that energizes an
actuator is block 3 — so every output lives in exactly one place (one writer)
and the `CASE` never mixes "where we are" with "what we drive". Splitting *where
we are* (block 2) from *what we drive* (block 3) is what keeps large stations
legible.

### Blank template

```iecst
PROGRAM PRG_Station
VAR
    nState : INT;         (* current FSM state (see constants below) *)
    (* local bits / primitive FB instances / timers (TON) — ALL commented here *)
END_VAR
VAR CONSTANT
    cSTATE_A : INT := 0;  (* describe this state *)
    cSTATE_B : INT := 1;  (* describe this state *)
    cFAULT   : INT := 99; (* stalled/faulted *)
END_VAR

(* OPTIONAL FEATURE GATE (skip the whole station if not fitted) *)
IF NOT GVL_Config.bHasStation THEN RETURN; END_IF

(* === 1. INPUT === read sensors -> local bits *)

(* === 2. CASE === decide ONLY where we are *)
CASE nState OF
  cSTATE_A: IF <transition> THEN nState := cSTATE_B; END_IF
  cSTATE_B: IF <transition> THEN nState := cSTATE_A; END_IF
  cFAULT:   IF <reset> AND NOT <cause> THEN nState := cSTATE_A; END_IF
END_CASE
IF <fault> THEN nState := cFAULT; END_IF   (* a fault overrides any state *)

(* === 3. OUTPUT === derive from state + mode; ONE writer per output *)
(* GVL_IO.qActuator := <command>; *)

(* === 4. PUBLISH === facts to the bus + state to the HMI *)
(* GVL_Bus.bStation_PartReady := ...;  GVL_HMI.nStation_State := nState; *)
END_PROGRAM
```

Two conventions ride along with this skeleton:

- **Comment every variable at its declaration.** An inline `(* ... *)` on every
  `VAR` and `VAR CONSTANT` line, including throw-away temporaries. Opening the
  `VAR` section should explain the whole station. (This mirrors the ladder habit
  of a comment next to every symbol.)
- **`CASE` in every station, even the purely combinational ones.** A conveyor is
  reactive, not sequential — but a `CASE` still costs one enum plus one line and
  buys *named states for the HMI for free* (Filling / Full / Fault). Consistency
  (one way to read any file) beats saving three lines.

## 2. The rule that closes it: CASE(state) × IF(exception) × rungs(combinational)

Each of the three control constructs has exactly one job. Mixing them wrong is
the most common source of unreadable PLC code.

| Construct | Branches on… | Use it for |
|-----------|--------------|------------|
| **`CASE`** | the **values of ONE variable** (the state) | the sequence / "where are we" — the state selector |
| **`IF`** | **separate, orthogonal conditions** | exceptions that overlay any state: a jam, an optional-feature gate, a safety override |
| **rungs** (`AND`/`OR`/`NOT`) | **combinational** truth | "energize IF this and that" — one assignment = one rung |

**Mix all three in their right place — do not pick just one.** `CASE` for the
state, `IF` for the jam/override, rungs for the motor.

Why `CASE` and not `IF/ELSIF` for the state: both compile, but `IF/ELSIF`
repeats `nState = cXXX` in every branch and adds an indentation level. At six
states it becomes a staircase; the `CASE` stays flat with one indentation level
and the state label on the left.

## 3. When does logic deserve a Function Block?

A block survives **only if it passes BOTH tests: (a) used several times AND (b)
non-trivial.** Fail either one and it becomes inline code in the PROGRAM.

| Candidate | Reuse | Complexity | Verdict |
|-----------|-------|------------|---------|
| `FB_ServoAxis` (wraps ~10 vendor motion FBs + soft-limits + drive fault) | ×3 axes | high | keep — non-negotiable |
| `FB_Cylinder` (dual-sensor + move timeout + fault) | ×6 | medium | keep |
| `FB_MotorVFD` (enable + rpm scale) | ×3 | low | optional (either way) |
| Single-station logic (one machine has one of it) | ×1 | — | inline it in the PROGRAM |

The point: **do not create a FB just to have a FB, and do not delete the FB that
protects you.** Wrapping a 3-axis servo by hand in three places is copy-paste,
and copy-paste is how one axis silently drifts from the others. But single-use
station logic hidden behind a FB only adds a `FB<->PRG` hop that makes the code
*harder* to follow. One file = one station keeps the whole station on one screen.

## 4. Emergent coordination — no central orchestrator

The stations do **not** take orders from a sequencer. Coordination *emerges* from
a shared status bus (call it `GVL_Bus`, a "handshake" / "line status" GVL). The
discipline that makes this safe:

- **Stations publish FACTS, never COMMANDS.** A station writes *"my part is
  ready"* (`bConveyor_PartReady`), *"I am picking"* (`bPicker_Picking`), *"I
  faulted"* (`bConveyor_Fault`). It never writes *"conveyor, start now"* into
  another station. Each consumer decides what to do with the facts it reads.
- **One writer per bus signal, N readers.** Every bus bit has exactly one
  PROGRAM that ever assigns it; everyone else only reads. This is the discipline
  that replaces a locking/notification framework — see §6.
- **Status is a LEVEL, not a pulse.** A published fact stays TRUE for as long as
  it is true, held by set/reset with a state guard. It is never a one-scan pulse.
  Programs run in different tasks at different rates; a signal that is TRUE for a
  single scan is *invisible* to a consumer scanning in another task. (This is a
  frequent, painful bug — see `codesys-gotchas`, "edge/pulse handoff is lost".)
  If a consumer needs an event, it derives the edge locally with `R_TRIG` on the
  stable level it reads.

Handshake shape: producer holds the level → consumer acts and changes the shared
state (e.g. marks the slot consumed) → that change drops the producer's
condition → producer releases the level. No orchestrator ever sequenced them.

## 5. Mode multiplexing — Manual overrides Auto

A station derives its final actuator command by muxing the auto cycle against a
manual (jog) request, gated by safety. Because the mode switch already makes the
two branches mutually exclusive, a simple OR is correct:

```iecst
(* AUTO only runs in the working state, honoring the cycle's soft-stop *)
bAutoRun := (nState = cFILLING) AND GVL_IO.iKeyAuto AND NOT GVL_Bus.bMain_SoftStop;

(* MANUAL is a dead-man: the operator must hold the jog input — no latch *)
bManual  := GVL_Bus.bMain_ManualMode AND GVL_IO.iJog;

(* Safety cuts everything, always *)
bRun     := (bAutoRun OR bManual) AND GVL_Bus.bSafe_Ok;
GVL_IO.qConveyor := bRun;   (* the single writer for this output *)
```

Manual is a **dead-man**: releasing the jog input stops the motion — there is no
seal-in on a manual command. Safety (`bSafe_Ok`) is `AND`-ed last so it can veto
any source.

## 6. The ladder → Structured Text bridge

For an engineer who thinks in rungs, ST maps directly:

- **One assignment (`:=`) = one rung (coil).** `AND` = series contacts,
  `OR` = parallel branch, `NOT` = a normally-closed `/` contact.
- **A fault latch = seal-in** (set/reset, **not** `R_TRIG` — a fault is a level,
  not an event):
  ```iecst
  bFault := (bFault OR <cause>) AND NOT (<reset> AND NOT <cause>);
  ```
  This is the classic seal-in/reset rung: the fault seals itself in, and only
  clears when reset is pressed *and the cause is already gone*.
- **A mode MUX = two OR branches gated by the switch** (which already makes them
  exclusive), exactly as in §5.

Reactive/combinational stations (conveyors, pumps, cooling) are *predominantly
rungs*; sequential stations (pick-and-place, a scan/heat cycle) are
*predominantly CASE*; but the four-block I-P-O skeleton applies to all of them.

## 7. Why NOT the classic (GoF) design patterns in Structured Text

It is tempting to "modernize" PLC code with Observer, Abstract Factory,
Decorator, Strategy. **Do not.** This is a deliberate, documented decision, not
an oversight. The Gang-of-Four patterns were designed for object-oriented,
**event-driven** systems with a **dynamic heap**. A PLC is the opposite: a
**scan-cyclic, deterministic** engine with **static memory** and state that
persists between scans. Applying OO patterns fights the paradigm.

| Pattern | Why it is the wrong tool here | What to do instead |
|---------|-------------------------------|--------------------|
| **Observer** | `Subject.NotifyAll()` is event-push with call overhead | the shared status bus (§4): one writer / N readers is Subject/Observer with correct scan-cyclic semantics — persistent state, not a fired event |
| **Abstract Factory** | `FB_Factory.Create()` *hides* the 1:1 relation to the physical BOM | separate PROGRAMs with an early-return feature gate: `IF NOT GVL_Config.bHasFeature THEN RETURN;` — explicit, and mirrors the machine |
| **Decorator** | decorating a base FB with N optional behaviors instantiates extra FBs (memory cost) | a conditional inside the base FB: `IF GVL_Config.bMonitorEnergy THEN ...` — cheaper on a memory-limited PLC |
| **Strategy** | swapping algorithms at runtime | a typed recipe / parameter set already selects behavior (see `codesys-recipe-manager`) — same result, less code |

Two deeper reasons: (1) the audience is automation/maintenance technicians, not
software developers — patterns raise the barrier to understanding a machine on
the shop floor; (2) hiding the physics behind an abstraction breaks the "one
block per physical thing" mapping that makes a machine's code auditable against
its mechanical BOM.

**Rule:** do not suggest GoF patterns when refactoring PLC Function Blocks, and
do not "modernize" an I-P-O program with Observer/Strategy. The I-P-O + shared-bus
architecture is the pattern language for this paradigm.
