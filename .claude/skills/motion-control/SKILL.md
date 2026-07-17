---
name: motion-control
description: Use when programming servo or stepper motion — EtherCAT axis, CiA 402, MC_Power / MC_Home / MC_MoveAbsolute, PLCopen Motion, Festo CMMT-AS or CMMT-ST drives, homing methods, PDO mapping, controlword/statusword, axis commissioning, or "make the axis move".
---

# Motion Control (EtherCAT / CiA 402)

Inventing MC_* FB signatures is the most damaging failure mode of this domain. Exact names only.

## 1. Load the references (both, always)
- `plc_knowledge` action=topic `festo-ptp` — all 24 MC_*_Festo blocks with exact signatures, tested library versions, task configuration.
- `plc_knowledge` action=topic `ethercat-cia402` — state machine, controlword/statusword bits.
- Stepper (CMMT-ST) -> also topic `festo-cmmt-st`. Absolute encoder homing = Method 37 (no motion).

## 2. Hard rules
- Festo blocks end in `_Festo` (MC_Power_Festo, MC_Home_Festo, MC_MoveAbsolute_Festo, MC_Stop_Festo) — NEVER generic MC_Power.
- Do NOT use `plc_library` motion blocks for servo — those are for simple motors. Servo = Festo PtP library directly.
- Canonical sequence: MC_Power_Festo -> MC_Home_Festo -> MC_Move*_Festo -> MC_Stop_Festo.
- Every axis FB needs fault handling: read bError/nErrorID, reset via MC_Reset_Festo.

## 3. Troubleshooting: axis reads position but won't move
Very common at commissioning — the watch shows actual position updating, but a jog/move does nothing. Position feedback arrives on the input PDO **even with power off**, so "it reads position" only proves EtherCAT input mapping works; motion needs the drive in **Operation Enabled**. Walk the ordered checklist in `plc_knowledge` action=topic `ethercat-cia402` ("Axis Reads Position but Won't Move"): STO not released (suspect #1) -> power stage unpowered -> drive in fault (`MC_Reset`) -> slave not fully Operational (OP, not SafeOP) -> soft-limit blocking that direction (test the opposite direction first). Diagnose from the servo FB's own state / `MC_Power.Status`, not the sequence/choreography state shown on the HMI.

## 4. Deep protocol questions
Raw CoE objects, STO/SBC, enable-without-library -> `plc_knowledge` action=read_manual `hw-cmmt-as-s1-reference`.

## 5. Then continue as normal ST work
Follow the `writing-st-code` skill for conventions/validation, and `plcopen-xml` for export. Record axis configuration (drive model, homing method, gear ratios) in `.claude/memory/hardware.md`.
