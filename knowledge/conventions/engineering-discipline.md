---
id: engineering-discipline
title: Engineering Discipline & Quality Gates (non-negotiable)
priority: CRITICAL
use_when:
  - before delivering any generated ST code or PLCopen XML
  - deciding whether a task is "done"
  - editing existing POUs (regression risk)
  - committing, or telling the user something is ready
never_use_when:
  - answering a pure factual lookup that produces no code or file change
keywords: [discipline, quality gate, definition of done, verify before deliver, no regressions, test before and after, dont break the build, lint clean, no warnings, fix everything, secret hygiene, no hardcoded credentials, no hardcoded ip, safety review, physical harm, no over-engineering, do only what is asked, plan first, commit checklist, pre-commit, is it done, ready to ship, when is code finished, working rules]
see_also: [conventions, ground-truth, state-machines]
---

# Engineering Discipline & Quality Gates

These rules govern **how** to produce PLC code with this server, not what to write.
They rank equal to the naming conventions: apply them on every task that emits or
edits code. They are non-negotiable — a task is not done until all gates below pass.

## 1. Verify before you deliver (never assume — check)

Never present generated Structured Text or PLCopen XML as "done", "ready", or
"import-ready" until the tools have actually confirmed it:

- ST code → `review_st_code` (naming) + `plc_validate` (FB interface, state machine)
  + `debug_plc_code` (runtime bugs). Fix every finding.
- PLCopen XML → the full chain: `validate_plcopen_xml` → `validate_plcopen_xsd`
  → `validate_plcopen_semantic`. All three must pass before the user imports.

If a validator was not run, the work is unverified — say so; do not claim success.
Report outcomes faithfully: if a check fails, state it with the output; if a step
was skipped, say that. State "done" only for what was verified.

## 2. No regressions — test before AND after every change

A change must never break something that worked before.

- Before editing an existing POU or a shared type/GVL, know what currently passes.
- After the edit, re-validate the **whole affected set**, not just the file you touched
  (a changed ENUM or GVL can break every POU that references it).
- If a change turns a previously-valid POU red, fix it before moving on — do not
  leave the project in a worse state than you found it. When in doubt, revert and
  redo the change more carefully.

## 3. Zero pending issues — fix everything, leave nothing "for later"

"Done" means clean, not "mostly clean":

- Zero naming violations, zero unresolved `plc_validate` findings, zero XML
  validation errors, zero unaddressed `debug_plc_code` criticals.
- Do not defer warnings, TODOs, or "known small issues" to a later pass. If it is
  worth flagging, it is worth fixing now or explicitly surfacing to the user as a
  decision — never silently swallowing it.

## 4. Secret & safety hygiene (physical-harm domain)

This code can move real machinery. Treat it accordingly.

- **Never hardcode** credentials, tokens, API keys, or real network addresses
  (drive IPs, PLC IPs, broker hosts) into ST code, GVLs, or comments. Use
  parameters/config, and use placeholder example addresses in documentation.
- **Never echo a secret** back into output. If a real secret ever appears, stop,
  warn the user it was exposed, and recommend rotating it.
- **Human review before running.** Generated logic that commands motion, heaters,
  valves, or any actuator MUST be reviewed by a qualified engineer before it runs
  on hardware. Never imply generated code is safe to deploy unreviewed. Keep safety
  interlocks (E-stop, STO, limits) explicit — never optimize them away.

## 5. Do exactly what is asked — no over-engineering

Implement the requested logic and its required safety, and stop there.

- No speculative features, no extra abstraction layers, no "while I'm here" refactors
  the user did not ask for.
- Prefer reusing an existing library block (`plc_library`) over inventing a new one.
- Simpler, verifiable code beats clever code in a scan-cyclic, safety-relevant system.

## 6. Plan the complex; track the multi-step

- For anything spanning multiple POUs or several steps, outline the approach before
  generating — types first, then GVLs, then FBs, then programs, then XML.
- Keep the user oriented on multi-step work; finish what you start before reporting
  completion. A promise of future work ("I'll also…") is not a completed task.

---

**Definition of done (checklist):** conventions pass · FB interface & state machine
valid · runtime analysis clean · XML validation chain green (when XML is produced) ·
no hardcoded secrets/addresses · only the requested scope · nothing deferred silently.
