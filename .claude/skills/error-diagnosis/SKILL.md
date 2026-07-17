---
name: error-diagnosis
description: Use when the user reports a PLC error code, fault, alarm, or diagnostic problem — hex codes like 0x7500, IEC codes like 16#8011, CMMT/CMMT-ST drive faults, CODESYS compile or runtime errors, EtherCAT AL status codes, SDO abort codes, CiA 402 fault state, or "axis won't move / drive shows error".
---

# Error Diagnosis

Never interpret an error code from memory — codes overlap between vendors and profiles.

## 1. Decode
- `plc_lookup` action=error_code with the raw code (accepts 0x…, 16#…, decimal) — instant database hit.
- Not found -> `explain_error_code` (deep search across all topics + all 19 manuals).

## 2. Contextualize
- Drive/motion fault -> `plc_knowledge` action=topic `festo-ptp` (library error list) or action=read_manual `hw-cmmt-servo` (recovery procedures, FAQ).
- EtherCAT comms -> topic `ethercat-cia402` (AL status, ESM transitions).
- Anything else -> `plc_knowledge` action=search with the code AND with symptom words.

## 3. CODESYS crashes — is it even a code fault?
Two IDE/runtime failure modes are NOT bugs in the ST — do not chase them as error codes. Full runbook: `plc_knowledge` action=topic `codesys-gotchas`.
- **Cosmetic plugin crash (Festo CPX-E).** A red popup `Exception while changing device editor visibility` / `Fatal error: cannot load module: CPX_E_System` / `Object reference not set to an instance of an object` in `DeviceEditor.OnVisibilityChanged` fires when you click the `Device` or a Festo CPX-E node in the device tree. It does NOT block Build, Download, Run, Watch, or Force — click OK and continue; avoid opening those device tabs. Reinstalling the plugin, changing the CODESYS version, or recreating the project does NOT fix it (compiled vendor DLL bug — wait for a vendor update or ignore).
- **Chronic runtime crash.** Use the triage in `codesys-gotchas`: probe ports (base-firmware port alive while the runtime ports die = runtime process exception, not power/network); read the device Log (`Not matching retain area cleared` = persistents wiped); pull the core dump (`external abort` at erratic addresses = hardware/electrical or compiler↔runtime ABI mismatch, NOT IEC logic — a logic bug logs an IEC exception instead).

## 4. If truly not found locally
Say so explicitly, then search the web — and suggest saving the finding as a .md in knowledge/manuals/ so it is local next time.

## 5. Record
Recurring or hard-won diagnoses -> append to `.claude/memory/errors-solved.md` (code, cause, fix, date).
