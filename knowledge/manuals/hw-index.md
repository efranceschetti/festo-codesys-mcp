---
id: hardware-index
title: Hardware Documentation Index
priority: MEDIUM
use_when:
  - need to find the right hardware module documentation
  - first time working with CPX-E hardware
keywords: [hardware, CPX-E, modules, index]
---

# Hardware Documentation Index

> AI-optimized rewrites of Festo CPX-E device manuals.
> These replace the raw PDF dumps in `manuals/` with clean, function-organized references.

| Document | Covers | Lines |
|----------|--------|-------|
| `hw-cpx-e-system.md` | CPX-E architecture, power, slots, LEDs, fail-safe | ~760 |
| `hw-cpx-e-cec.md` | CEC controller, CODESYS runtime, network, SD card | ~550 |
| `hw-cpx-e-io.md` | DI (8/16ch), DO (8ch), AI (4ch), AO (4ch) modules | ~600 |
| `hw-cpx-e-ethercat.md` | EtherCAT master (CPX-E-EP), slaves, PDO, diagnostics | ~670 |
| `hw-cpx-e-speciality.md` | Counter (1CI) and IO-Link (4IOL) modules | ~640 |
| `hw-cmmt-servo.md` | CMMT-AS/ST servo drive, EtherCAT, PtP positioning | ~1050 |
| `hw-motion-library.md` | CODESYS Motion + FHPP libraries, MC_*_Festo FBs | ~590 |
| `hw-safety-relay-weidmuller-scs.md` | Weidmüller SCS P2SIL3ES dual-channel safety relay (E-stop/guard, SIL3/PL e/Cat 4) | ~160 |

## How to Choose

- **System setup / overview** → `hw-cpx-e-system.md`
- **Controller / CODESYS runtime** → `hw-cpx-e-cec.md`
- **Analog/digital I/O** → `hw-cpx-e-io.md`
- **EtherCAT network** → `hw-cpx-e-ethercat.md`
- **Counter or IO-Link** → `hw-cpx-e-speciality.md`
- **Servo drive (CMMT)** → `hw-cmmt-servo.md`
- **Motion library FBs** → `hw-motion-library.md`
- **Safety relay (E-stop / guard monitoring)** → `hw-safety-relay-weidmuller-scs.md`
