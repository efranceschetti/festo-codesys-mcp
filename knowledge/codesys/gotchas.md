---
id: codesys-gotchas
title: CODESYS Gotchas — Cosmetic Crashes, Lost Edges, PersistentVars, Runtime-Crash Triage
priority: HIGH
token_estimate: 2600
use_when:
  - a CODESYS device-editor exception pops up but Build/Run still work
  - a signal handed between two PROGRAMs is intermittently missed
  - persistent variables reset to defaults after a power-cycle or download
  - the PLC runtime crashes chronically and you need a triage method
  - "Add all instance paths" did not add the persistent variables you expected
never_use_when:
  - you need to decode a specific numeric error code (see explain_error_code)
  - the question is the alarm timing model (see plc-alarm-patterns)
related: [codesys-recipe-manager, plc-architecture-patterns, ground-truth]
keywords: [codesys gotcha, device editor exception, OnVisibilityChanged, cannot load module CPX_E_System, cosmetic crash, plugin crash, edge lost, pulse lost, R_TRIG missed, handoff between programs, different task rates, level not pulse, persistent variables reset, PersistentVars list, Add all instance paths, retain not saved, persistence dropped, runtime crash triage, chronic crash, port 4840 8080 11740, Not matching retain area cleared, external abort, core dump, watchdog Codesys died, PLC keeps crashing, symbol configuration stale]
see_also: [codesys-recipe-manager, plc-architecture-patterns, ground-truth]
---

# CODESYS Gotchas

> Four failure modes that are expensive to rediscover on the bench. Each entry is
> the *rule* plus the *why*, so you recognize it fast and stop chasing the wrong
> cause.

## 1. A cosmetic device-editor crash that does not block real work

**Symptom.** A red popup such as `Exception while changing device editor
visibility`, or `Fatal error: cannot load module: CPX_E_System`, or `Object
reference not set to an instance of an object` in
`...DeviceEditor.OnVisibilityChanged(Boolean bVisible)`. It fires when you click
the `Device` node or a specific vendor device node (e.g. a Festo CPX-E device) in
the Devices tree.

**Rule.** This is a **cosmetic** bug in the vendor's compiled device-editor
plugin (a WPF binding race in a .NET DLL). It does **not** block real work.
Click **OK** and continue.

**What still works despite the popup** (proven end-to-end): Build (F11) with 0
errors, Online → Login, Download, Online → Start (RUN), the watch list, forcing
values, opening POUs/GVLs, and Symbol Configuration via the Application menu. The
popup only fires when you open the graphical *Device* tab or the device's I/O
mapping tab.

**Do NOT waste hours "fixing" it.** Reinstalling the plugin, changing the CODESYS
service-pack version, recreating the project from scratch, or swapping the base
template all **reproduce** the crash — it is a closed-source vendor DLL, so the
only real fix is a vendor plugin update. Workarounds: read the device tree via the
scripting interface (e.g. an `ide_*` tool) instead of the UI editor; use the
vendor's own configuration suite; or, for advanced card changes, edit the
`.project` XML directly. To simply avoid triggering it, do not click the device
nodes in the tree.

## 2. An edge/pulse handoff between PROGRAMs is silently lost

**Rule.** A status signal one PROGRAM produces for **another** PROGRAM to consume
must be a **LEVEL** (persistent, held by set/reset with a state guard) — **never**
a one-scan pulse and never an `R_TRIG` on the *producer* side.

**Why.** PROGRAMs run in **different tasks at different rates** (e.g. Safety 5 ms /
Main 20 ms / HMI 50 ms / Slow 100 ms). A signal that is TRUE for a **single scan**
(set TRUE and back to FALSE in the same episode) is **missed** by a consumer
scanning in another task or another order. The consumer simply never sees the
window in which it was TRUE.

**Signature of this bug.** A downstream action fires intermittently or "sometimes
does not happen": a done-flag that a slower task misses, a slot marker that never
sets, a re-trigger/oscillation because the consumer lost the pulse and the
producer fired it again. It typically *works in simulation* (single-task) and
fails on the multi-task PLC.

**How to apply.**
- Producer holds the signal TRUE **by level** until the downstream condition
  consumes it (e.g. the part left the position, the next stage took over). Set/reset
  with a state guard, not a producer edge.
- The **consumer** may derive an edge locally (`R_TRIG` on a stable level it reads)
  if it needs an event — a reader-side edge is fine.
- The safe handshake: producer holds level → consumer acts and changes the shared
  state → that change drops the producer's condition → producer releases.

**Edges ARE allowed** only when producer and consumer are the **same owner and
scan**: a momentary HMI button consumed by `R_TRIG` in the same PROGRAM that owns
it, or a one-shot local to a single PROGRAM. When in doubt, use a level.

## 3. Persistence lives in the PersistentVars list, not (only) in the attribute

**Rule.** Do not assume that declaring `VAR_GLOBAL PERSISTENT RETAIN` in a GVL is
enough to make it persist after an import round-trip. If your build pipeline
generates the project from **PLCopen XML**, be aware the standard PLCopen schema
has no portable `persistent` attribute — a generator may emit a plain
`<globalVars>` and CODESYS then imports the GVL as an ordinary `VAR_GLOBAL`, and
persistence **silently disappears**. Actual persistence is governed by the
application's separate **PersistentVars** object (the list of instance paths).

**The trap: "Add all instance paths" does not help here.** That button only
collects variables the compiler *already sees as* `PERSISTENT`. If the GVL was
imported as plain `VAR_GLOBAL`, the button finds nothing to add. The variables
already in the list got there when the GVL genuinely was persistent. The only
thing that works then is to **add each new instance path to PersistentVars by
hand** (`GVL_Config.rMyNewParam : REAL := 0;`) — it works even against a plain
`VAR_GLOBAL` GVL, which is exactly how the existing entries coexist.

**Consequence if missed.** New config parameters silently fail to persist and
reset to their initializer on power-cycle; the values you *thought* were persisted
were actually the **baked-in defaults**. Whenever you add a persistent member to a
config GVL, add its instance path to PersistentVars in the same change (bumping a
config schema-version constant is a good signal that this is due). Two robust
mitigations: keep a canonical `PersistentVars.txt` versioned in the repo, or have
the build's finalize step re-inject `retain="true"` into the fully-persistent
GVLs' `<globalVars>` (the pure `PERSISTENT` stamp lives in a vendor `<addData>`
outside the standard schema — confirm on the target that the import shows the GVL
as RETAIN/PERSISTENT). Related: a renamed/removed variable also leaves the Symbol
Configuration with stale (red) entries — rebuild the Symbol Configuration after
GVL edits so an OPC-UA gateway/HMI can still bind.

## 4. Triaging a chronic runtime crash — a method, not a cause

When a PLC runtime "falls over every so often", separate a **runtime-process**
crash from power/network and from an **IEC logic** fault before you theorize.

**Step 1 — Probe ports to localize the failure.** On many controllers the base
firmware and the IEC runtime serve different ports:

| Port | Served by | On a runtime crash |
|------|-----------|--------------------|
| 80 | base firmware (ping + web admin) | **stays alive** |
| 4840 | OPC-UA (runtime) | dies |
| 8080 | embedded web server / dist (runtime) | dies |
| 11740 | online / gateway (runtime) | dies |

If the three runtime ports die **together** while port 80 stays up, the **runtime
process** crashed (an exception) — it is **not** cable/switch/power (those would
drop port 80 too). A custom web HMI dies with it because it depends on the runtime
ports.

**Step 2 — Read the boot log for a retain wipe.** In the device log after a crash,
a line like `Not matching retain area cleared for application [...]. Retains will
be initialized.` means the runtime **erased all persistent data** and reverted to
defaults — that explains config/users/positions resetting. But note: it can also
appear **benignly once** after a legitimate layout-changing download, so it is a
clue, not a verdict. Decisive test: power-cycle **without** downloading a new app;
if the "cleared" line reappears on a plain restart, the retain NVRAM is not holding
(reduce the persistent footprint); if retains survive, the wipe was the one benign
post-download boot and the crash is elsewhere.

**Step 3 — Classify the crash from the core dump.** If a core dump / crash bundle
is available, the dmesg signature tells you the layer:
- `Unhandled ... external abort ...` at **erratic** addresses (kernel, user,
  peripheral, garbage), a watchdog line like `(watchdog) ERROR: Codesys died`,
  and a random time-to-crash → points to **hardware/electrical or an ABI
  mismatch**, not IEC logic: marginal DRAM/flash, a noisy/brown-out 24 V rail, or
  a compiler-version-vs-runtime-version mismatch. A pure IEC logic bug would raise
  a **logged IEC exception**, not a raw external abort. (A frequent culprit for
  erratic aborts: the project was compiled on a newer service pack than the
  runtime firmware — pin the compiler version to the runtime's and rebuild clean.)
- Confirm it is not OOM (check free memory) or a full disk before blaming logic.

**The takeaway.** Localize (ports) → check for a retain wipe (log) → classify
(core dump). An external abort at scattered addresses with two unrelated processes
dying is a hardware/ABI signature; a logged IEC exception is a logic signature.
Chase the matching cause, not the first guess.
