# CPX-IO Python Setup — Application Note 100688

> Step-by-step guide to set up a computer environment for the `festo-cpx-io` Python library to communicate with CPX-E or CPX-AP systems via Modbus TCP.

## Overview

The `festo-cpx-io` library allows Python scripts to communicate with and control Festo CPX-E and CPX-AP remote I/O modules over **Modbus TCP**. It is published on PyPI and maintained on GitLab.

## Compatible Hardware

| Platform | Description |
|----------|-------------|
| **CPX-E** | Modular I/O system with EtherCAT/Profinet |
| **CPX-AP-A** | Automation Platform variant A |
| **CPX-AP-I** | Automation Platform variant I |

## Software Requirements

| Software | Version |
|----------|---------|
| Python | v3.10+ |
| Visual Studio Code | Any (optional IDE) |
| pip | Latest |
| festo-cpx-io | Latest from PyPI |

## Useful Links

| Resource | URL |
|----------|-----|
| GitLab repository | `https://gitlab.com/festo-research/electric-automation/festo-cpx-io/` |
| Documentation | `https://festo-research.gitlab.io/electric-automation/festo-cpx-io/` |
| PyPI project | `https://www.pepy.tech/projects/festo-cpx-io` |
| Bug reports | `https://gitlab.com/festo-research/electric-automation/festo-cpx-io/-/issues` |

## Installation Steps

### 1. Install Python

Download from [python.org](https://www.python.org/downloads/).

Verify installation:
```bash
python -V
# Should return: Python 3.x.x
```

If `python` is not recognized, add to system PATH:
- `<PATH_TO_PYTHON>` (e.g. `C:\Program Files\Python310`)
- `<PATH_TO_PYTHON>\Scripts` (e.g. `C:\Program Files\Python310\Scripts`)

### 2. Install pip

Verify pip:
```bash
pip -V
```

If not installed:
```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py
```

### 3. Install festo-cpx-io

```bash
pip install festo-cpx-io
```

Verify:
```bash
pip show festo-cpx-io
```

**If blocked by admin rights:**
```bash
C:\Appl\Python\python.exe -m pip install festo-cpx-io
```

### 4. Update festo-cpx-io

```bash
pip install festo-cpx-io --upgrade
```

## Usage Notes

- Communication protocol: **Modbus TCP**
- The library provides direct read/write access to CPX I/O modules
- Useful for testing, data acquisition, and integration with Python-based automation scripts
- Works independently of CODESYS — connects directly to the CPX controller's Modbus TCP interface
