---
name: writing-st-code
description: Use when writing, editing, or refactoring IEC 61131-3 Structured Text — any .st file, Function Block (FB), PROGRAM (PRG), FUNCTION, GVL, ENUM or STRUCT (DUT) for CODESYS, Festo CPX-E, or any PLC task. Also use when the user says "create an FB", "PLC code", "ladder to ST", or asks for machine/automation logic.
---

# Writing Structured Text

Never write ST from memory. Follow this order:

## 1. Load conventions (once per session)
- `plc_knowledge` action=topic `conventions`, then `abbreviations`.
- Point lookups while coding: `plc_lookup` action=hungarian (type -> prefix).

## 2. Reuse before create
- `plc_library` action=search with keywords from the request (e.g. "motor", "valve", "PID").
- Match found -> `plc_library` action=get, adapt it (rename, adjust IO). Do NOT rewrite from scratch.
- No match -> proceed to create. For a new FB also load topic `state-machines`.

## 3. Create with the right tool
- FB -> `create_function_block` | cyclic logic -> `create_program`
- ENUM/STRUCT -> `create_data_type` | globals -> `create_gvl`
- Servo/stepper motion? STOP — that is the `motion-control` skill (MC_*_Festo blocks, never custom FBs).

## 4. Verify (mandatory, in order)
1. `review_st_code` — naming violations. Fix all.
2. `debug_plc_code` — runtime bugs (WHILE loops, missing bErr handling, safety gaps). Fix Criticals.
3. For a full structured review of a file, delegate to the `plc-reviewer` subagent.

## 5. Record in memory
If the code reveals durable project facts (hardware chosen, a new project FB, a design decision), update `.claude/memory/` per MEMORY.md rules.

Hard rules: PascalCase + Hungarian, English-only identifiers/comments, FB interface bEnable/bExecute -> bDone/bBusy/bErr/nErrId, nState 0/10-80/90/99. IO access only through GVLs — never hardcode %I/%Q addresses in FBs.
