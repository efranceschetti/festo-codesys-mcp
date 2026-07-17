# CODESYS OPC DA Server — Application Note 100306

> Festo Application Note describing OPC DA server licensing, installation, and alternatives for CODESYS >= V3.5 SP12.

## Overview

The CODESYS OPC DA Server allows OPC-DA (OLE for Process Control — Data Access) communication between CODESYS PLCs and SCADA/HMI systems. Starting with CODESYS V3.5 SP12 (2017-Dec-20), 3S changed the licensing model — the OPC server now **requires a USB dongle license**.

## Key Facts

| Item | Detail |
|------|--------|
| Applies to | CODESYS Development System >= V3.5 SP12 |
| License required | Yes — USB dongle (CODESYS Key) or Softcontainer |
| Demo license | 30-day demo available from CODESYS Store |
| Festo CpbF version | V3.5 SP12 Patch 6 (2019-07-22) |
| OPC server NOT installed by default | Must be explicitly selected during Festo CpbF installation |

## Licensing

- **Before SP12** (2017-Dec-20): OPC server was **free** and included with CODESYS
- **SP12 and later**: Requires a **paid license** (USB dongle or Softcontainer)
- **Any OPC server prior to V3.5 SP12 does NOT need a license** (but may have security vulnerabilities)
- Demo/full licenses: [CODESYS Store — OPC DA Server SL Bundle](https://store.codesys.com/codesys-opc-da-server-sl-bundle.html)

### Missing License Error

Without a valid license, starting `WinCoDeSysOPC.exe` shows a "Missing License" error dialog.

## Installation — Festo CpbF V3.5 SP12 Patch 6

The CODESYS OPC Server 3 is **not activated by default** in Festo's CpbF installer. To install it:

1. Re-run `Setup_CODESYSV35SP12Patch6.exe`
2. Select **"Modify, Repair or Remove the program"** → Next → **"Modify"** → Next
3. **Activate** "CODESYS OPC Server 3"
4. (Optional) Activate "AE Configurator" for Alarm & Events (requires .NET 3.5)
5. Select **"install files and install services"**
   - If a newer CODESYS version is already installed, select "install files, but do not install as a service"

## Default Installation Paths

### 32-bit Windows (or 32-bit component on 64-bit)

| Vendor | CODESYS Version | Path |
|--------|----------------|------|
| Festo | SP12 Patch 6 CpbF | `C:\Program Files (x86)\Festo\CODESYSV3.5.12.6\CODESYS OPC Server 3` |
| Festo | SP10 Patch 4 CpbF | `C:\Program Files (x86)\Festo\CODESYSV3\CODESYS OPC Server 3` |
| 3S | SP15 Patch 3 | `C:\Program Files (x86)\CODESYS 3.5.15.30\CODESYSV3\CODESYS OPC Server 3` |
| 3S | SP12 Patch 6 | `C:\Program Files (x86)\3S CODESYS\CODESYSV3\CODESYS OPC Server 3` |

### 64-bit Windows (native 64-bit)

| Vendor | CODESYS Version | Path |
|--------|----------------|------|
| 3S | SP15 Patch 3 | `C:\Program Files\CODESYS 3.5.15.30\CODESYSV3\CODESYS OPC Server 3` |
| 3S | SP12 Patch 6 | `C:\Program Files\3S CODESYS\CODESYSV3\CODESYS OPC Server 3` |

> Newer 3S versions (>= SP13) include version number in the directory path.

## Checking OPC Server Version

1. Right-click on `WinCoDeSys.exe` → Properties
2. Switch to **Details** tab
3. Check **Product version**

## Alternatives

### OpenOPC for Python

Open-source OPC-DA toolkit for Python: [openopc.sourceforge.net](http://openopc.sourceforge.net)

```python
import OpenOPC

opc = OpenOPC.client()
opc.connect('Matrikon.OPC.Simulation')
print(opc['Square Waves.Real8'])
opc.close()
```

Features: easy API, cross-platform (Windows/Linux/macOS), wildcard reads, functional style.

### Legacy OPC Server (< SP12)

Copy the `CODESYS OPC Server 3` directory from any CODESYS installation prior to V3.5 SP12 — these versions do **not** require a license. Beware of potential security vulnerabilities in older versions.
