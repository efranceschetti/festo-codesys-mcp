---
description: Hungarian + PascalCase + abbreviation naming audit over a folder of .st files, plus architectural lint (single-writer, FB isolation, 1-POU-per-file). A composition of plc_validate (batch) + review_st_code + grep-based structural checks + a final checklist.
allowed-tools: mcp__festo-codesys-mcp__plc_validate, mcp__festo-codesys-mcp__review_st_code, mcp__festo-codesys-mcp__plc_lookup, mcp__festo-codesys-mcp__plc_knowledge, Read, Glob, Grep, Bash
argument-hint: <path-to-folder-or-file>
---

Audit naming in `$ARGUMENTS`. Default: `src/pou/` if empty.

## Sequence

1. **List targets** — `Glob` on `$ARGUMENTS/**/*.st`. If zero files, stop and report.
2. **Reference loading** — `plc_knowledge` topic `conventions` (once only, not in a loop).
3. **Per-file review** — for each file:
   - Read
   - `review_st_code` with the content
   - Collect violations
4. **Batch validation** — `plc_validate` action=batch with a list of naming checks derived from the declarations found.
5. **Cross-check abbreviations** — for each variable name that has a word suffix (e.g. `bSensorState` → "Sensor", "State"), verify it is in the canonical list. Use `plc_lookup` action=list_standard if you need the reference.
6. **Architectural lint (beyond naming)** — naming is only half of a clean project. Run these structural checks with `Grep`/`Read` across the same fileset (they catch classes of bug a Python twin or a naming-only pass misses — several are CODESYS compile errors invisible to a simulator). Each is a rule + the "why":

   - **[fb-isolation] An FB must not reference a GVL directly.** No `GVL_` token in any `FB_*.st` (ignore comments). An FB that reads/writes globals is coupled and not unit-testable — data enters through its interface (`VAR_INPUT/OUTPUT/IN_OUT`); only PROGRAMs touch GVLs.
   - **[no-cross-prg-edge] No `R_TRIG`/`F_TRIG` edge used as a handshake between PROGRAMs.** An edge/pulse is a 1-scan event — invisible to a PROGRAM running on a different task rate. Cross-PRG coordination must use a **level** (set/reset) signal on the bus, not an edge. Flag `R_TRIG`/`F_TRIG` in station/coordination PRGs.
   - **[single-writer-bus] One writer per bus signal.** A given `GVL_Handshake.<sig> :=` (or your status-bus GVL) is assigned in **exactly one** file. Two writers = silent clobber (the last POU to run in the scan wins).
   - **[single-writer-output] One writer per physical output.** A given `GVL_IO.q<X> :=` is assigned in **exactly one** POU. Two writers = coil clobber. Multiple assignments **in the same file** (a mode MUX: Manual > Auto) count as one writer and are fine.
   - **[one-pou-per-file] One POU per file, filename == POU name.** Each `.st` declares exactly one `PROGRAM`/`FUNCTION_BLOCK`/`FUNCTION` and the filename equals the POU name. Multi-POU files or a name mismatch break the CODESYS project tree / ObjectId mapping on PLCopen import.
   - **[at-percent-one-file] `AT %` addressing lives in exactly one file.** Only the physical-I/O GVL (`GVL_IO`) carries `AT %` addresses. An `AT %` in any station/FB/type pierces the remappable symbolic-I/O layer and forks the machine by physical address.
   - **[fb-call-params-exist] FB call parameters must exist.** Every `param :=` in a call to an FB instance is a real `VAR_INPUT/OUTPUT/IN_OUT` of that FB. A stray or renamed parameter is a CODESYS compile error (C0037) that a Python twin/sim silently accepts (it takes the kwarg and moves on).

7. **Produce a report** — format:

```markdown
# Naming & Architecture Audit — <folder>

## Summary
- Files analyzed: N
- Hungarian violations: X
- POU prefix violations: Y
- Snake_case: Z
- Non-standard abbreviations: W
- Architectural violations: A (fb-isolation, single-writer-bus/output, one-pou-per-file, at-percent-one-file, no-cross-prg-edge, fb-call-params-exist)

## Per file

### <file1.st>
- [hungarian] line L: ...
- [snake_case] line L: ...
- [fb-isolation] line L: FB references GVL_X directly
- [single-writer-bus] GVL_Handshake.bY_Z written in file1.st AND file2.st

## Recommendation
<approved | redo naming before PR | fix architecture before PR>
```

Output ONLY markdown, no extra chat.
