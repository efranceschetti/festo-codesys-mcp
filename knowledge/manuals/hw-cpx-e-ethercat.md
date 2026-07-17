---
id: cpx-e-ethercat
title: CPX-E EtherCAT Master — Network Configuration and Diagnostics
priority: HIGH
token_estimate: 1500
use_when:
  - user sets up EtherCAT network on CPX-E
  - user needs PDO mapping or slave configuration
  - user asks about EtherCAT diagnostics or error states
  - user asks about distributed clocks or startup SDOs
  - user needs to configure CPX-E-EC bus module
never_use_when:
  - user asks about CiA 402 drive profile details (see ethercat-cia402)
  - user asks about CMMT-specific parameters (see cmmt-servo)
  - user asks about PLCopen motion FBs (see festo-ptp-reference)
depends_on: [cpx-e-system]
related: [ethercat-cia402, cmmt-servo, cpx-e-cec]
keywords: [EtherCAT, CPX-E-EC, master, slave, PDO, RxPDO, TxPDO, ESI, SDO, distributed clocks, AL status, diagnostics, topology, modular device profile]
---

# CPX-E EtherCAT Master — Network Configuration and Diagnostics

## Overview

The CPX-E-EC bus module enables operation of a CPX-E system in an EtherCAT network. It operates as an EtherCAT slave and provides master-like capabilities for local I/O modules.

**Key Features:**
- Two RJ45 Ethernet interfaces supporting any topology (line, tree, star)
- EtherCAT address range: 0…4095 (configurable via DIL switches)
- Hot Connect support (coupling/decoupling devices during operation)
- Distributed Clocks (DC) for precise synchronization
- Integrated web server via Ethernet over EtherCAT (EoE)
- Modular Device Profile (MDP) for dynamic I/O configuration

**Product Version:** CPX-E-EC revision 1 or higher
**Vendor ID:** 0x0000001D
**Device Type:** 0x04561389
**Module Code:** 222/37

## EtherCAT Network Setup

### Topology and Cabling

**Supported Topologies:**
- Line (daisy-chain)
- Tree (branch)
- Star (hub)

**Cable Specifications:**
- Type: Ethernet twisted pair cable, shielded
- Category: Cat 5 or higher
- Maximum segment length: 100 m
- Wire cross section: 0.14…0.75 mm² (22 AWG for max length)
- Cable diameter: 6…8 mm
- Transmission rate: 100 Mbps

**Crossover Detection:**
Auto-MDI/MDI-X is supported — use patch cables or crossover cables interchangeably.
**IMPORTANT:** When mixing cable types in the same network, crossover detection must be activated in the EtherCAT master.

### RJ45 Pin Assignment (IN and OUT ports)

| Pin | Signal | Description |
|-----|--------|-------------|
| 1 | TD+ | Transmitted data + |
| 2 | TD– | Transmitted data – |
| 3 | RD+ | Received data + |
| 4 | n.c. | Not connected |
| 5 | n.c. | Not connected |
| 6 | RD– | Received data – |
| 7 | n.c. | Not connected |
| 8 | n.c. | Not connected |
| Shield | — | Functional earth (housing) |

### Address Assignment

**Explicit Device ID Configuration:**
Use three rotary switches (hexadecimal coding) to set EtherCAT address:
- **0** = Auto-increment (master assigns address automatically)
- **1…4095 (1h…FFFh)** = Fixed address (enables Hot Connect)

**Factory Setting:** 0 (auto-increment)

**IMPORTANT:** Changes to rotary/DIL switches take effect only after bus module restart.

### Device Description File (ESI)

The CPX-E-EC is configured in the EtherCAT master using an ESI (EtherCAT Slave Information) file.

**ESI File Location:** Download from Festo Support Portal (www.festo.com/sp)

The ESI file contains:
- Module identification and vendor information
- PDO mapping definitions (RxPDO/TxPDO)
- Startup parameters and SDO configuration
- Diagnostic text IDs (CPX-specific and EtherCAT-specific)

### Distributed Clocks (DC)

The CPX-E-EC supports Distributed Clocks for precise time synchronization across the EtherCAT network.

**DC-Compatible CPX-E Modules:**
- CPX-E-16DI(-P) — Digital input module
- CPX-E-8DO(-P) — Digital output module
- CPX-E-1CI — Counter module

**Use Case:** Coordinated actions requiring simultaneous operation (e.g., multi-axis motion, synchronized I/O sampling).

## PDO Mapping (Process Data Objects)

CPX-E uses a modular approach where each I/O module is represented as a separate PDO mapping object.

### RxPDO (Master → Slave, Outputs)

**Object Index:** 0x16xx (xx = module number, 00…48)

Structure:
- Subindex 0: Number of output mappings
- Subindex yy: Output mapping definition → 0x70xx:yy,s

### TxPDO (Slave → Master, Inputs)

**Object Index:** 0x1Axx (xx = module number, 00…48)

Structure:
- Subindex 0: Number of input mappings
- Subindex yy: Input mapping definition → 0x60xx:yy,s

### Module I/O Data Objects

**Inputs (TxPDO):**
- Index: 0x60xx (xx = module number)
- Subindex 0: Number of inputs
- Subindex yy: Input data (RO P = read-only, PDO mappable)

**Outputs (RxPDO):**
- Index: 0x70xx (xx = module number)
- Subindex 0: Number of outputs
- Subindex yy: Output data (RW P = read/write, PDO mappable)

### Address Space Allocation

**Maximum Address Space:**
- 64 bytes for inputs
- 64 bytes for outputs

**Diagnostics Impact:**
- Status bits: occupy 16 inputs (8 used, 8 unused)
- I/O diagnostics interface: occupies 16 inputs + 16 outputs

**System Limits:**
- Maximum I/O modules per CPX-E system: 10 (excluding bus module)
- Maximum modules in MDP: 48

### Addressing Rules

1. Input and output addresses are assigned independently
2. Numbering proceeds left-to-right in the CPX-E stack
3. Bus module counts as 0 inputs / 0 outputs when diagnostics are disabled
4. I/O addresses are assigned in ascending order by module number

### Example Addressing (with Status Bits Enabled)

```
CPX-E System:
[0] CPX-E-EC (status bits) → E0…E7 (8 inputs used, 8 unused)
[1] CPX-E-16DI            → E72…E87
[2] CPX-E-8DO             → A64…A71
[3] CPX-E-8DO             → A72…A79
[4] CPX-E-4AI-U-I         → E8…E71
[5] CPX-E-4AO-U-I         → A0…A63
```

## EtherCAT Diagnostics

### LED Indicators

**Network-Specific LEDs:**

**[Run] LED (green/orange):**
| State | Meaning | Description |
|-------|---------|-------------|
| Green steady | Operational | Normal operating status |
| Flashing green | Pre-operational | Network configuration in progress |
| Single flash green | Safe-operational | Inputs updated, outputs frozen |
| Flickering green | Bootstrap | Firmware update in progress |
| Orange | Bootloader active | Firmware update mode |
| Off | Init | Normal after power-on or restart |

**[Error] LED (red/orange):**
| State | Meaning | Cause / Remedy |
|-------|---------|----------------|
| Red steady | Serious communication error | Application controller failure, watchdog timeout → Contact Festo Service |
| Flashing red | Configuration error | No network connection, line interrupted, master not active → Check cabling and configuration |
| Single flash red | Sync error | State change Operational → Safe-Operational due to synchronization error |
| Double flash red | Application watchdog | Sync Manager watchdog timeout |
| Flickering red | Boot error | Checksum error in flash memory |
| Orange | Bootloader active | Firmware update mode |
| Off | No error | Normal operation |

**[LA IN] / [LA OUT] LEDs (green):**
| State | Meaning |
|-------|---------|
| On | Network connection OK |
| Flickering | Data traffic activity (light intensity varies with traffic) |
| Off | No network connection |

**System-Specific LEDs:**
- [PS] (green) — Operating voltage UEL/SEN present
- [PL] (green) — Load voltage UOUT present
- [SF] (red) — System Fault
- [M] (yellow) — Force mode active

### AL Status Codes (Application Layer)

EtherCAT state machine transitions:
1. **Init** → [Run] LED off, [Error] LED off
2. **Pre-Operational** → [Run] LED flashing green
3. **Safe-Operational** → [Run] LED single flash green
4. **Operational** → [Run] LED green steady

**Common Error States:**
- **0x0011:** Sync Manager invalid address
- **0x0012:** Sync Manager invalid I/O size
- **0x0013:** Sync Manager invalid configuration
- **0x000F:** Calculate bus cycle time failed (local timer too slow)

### Diagnostics History (Object 0x10F3)

The CPX-E-EC stores the last 64 diagnostic messages in a circular buffer.

**Object Structure:**

| Subindex | Description | Data Type | Access |
|----------|-------------|-----------|--------|
| 0 | Number of subindexes | U8 | RO |
| 1 | Maximum Messages | U8 (64) | RO |
| 2 | Newest Message | U8 | RO |
| 3 | Newest Acknowledged Message | U8 | RW |
| 4 | New Message Available | BOOL | RO P |
| 5 | Flags | U16 | RW |
| 6…70 | Message entries | BYTE[23] | RO |

**Flags (Subindex 5):**
- Bit 0: Emergency message enable (0=disabled, 1=enabled)
- Bit 4: Operating mode (0=overwrite, 1=acknowledge)

**Operating Modes:**
- **Overwrite mode (default):** When buffer full, oldest messages are overwritten
- **Acknowledge mode:** New messages discarded if buffer full and unacknowledged

### Diagnostic Message Format (23 bytes)

**Example Message:**
```
02 00 00 E1 | 02 02 | 02 37 | 1F C5 9D 61 31 00 00 00 | 05 00 | 02 | 05 00 | 80
[Diag Code] [Flags][TextID][Timestamp (8 bytes)      ][FlagP1][P1][FlagP2][P2]
```

**Field Breakdown:**

| Bytes | Field | Example | Description |
|-------|-------|---------|-------------|
| 0-3 | Diag Code | 02 00 00 E1 | CPX-E error code (E1 suffix) or DS401 error (E8 suffix) |
| 4-5 | Flags | 02 02 | Byte 4: Number of parameters (2), Byte 5: Type (2=error) |
| 6-7 | Text ID | 02 37 | Reference to ESI text string |
| 8-15 | Time Stamp | 1F C5 9D 61 31 00 00 00 | Local or DC time since boot |
| 16-17 | Flags Param 1 | 05 00 | Data type UNSIGNED8 |
| 18 | Parameter 1 | 02 | Module number |
| 19-20 | Flags Param 2 | 05 00 | Data type UNSIGNED8 |
| 21 | Parameter 2 | 80 | Channel number (80h = 128d) |

**Text ID Ranges:**
- **0x3700…0x37FF:** CPX error numbers (0…255) — see CPX-E System Manual
- **0x3800:** Ident check failed for configured module
- **0x3801:** Ident check skipped (PLC not written to 0xF030)

### Emergency Messages

Emergency messages are sent immediately when an error occurs (if enabled).

**Structure (8 bytes):**

| Byte | Field | Description |
|------|-------|-------------|
| 0-1 | Error Code | DS301/DS401 error code |
| 2 | Error Register | Index 0x1001 |
| 3 | Status Bits | CPX-E status bits (Index 0x1002) |
| 4 | Module Number | CPX-E module with error |
| 5 | CPX Error Number | See CPX-E manual |
| 6 | Reserved | — |
| 7 | Additional Info | Channel number or node ID |

**Error Codes (DS401):**

| Byte 1 | Byte 0 | Meaning |
|--------|--------|---------|
| 00 | 00 | No error |
| 10 | 00 | General error |
| 23 | 20 | Short circuit at outputs |
| 23 | 30 | Load dump (wire break) |
| 31 | 20 | Input voltage too low |
| 33 | 20 | Output voltage too low |
| 50 | 00 | Hardware error (CPX errors >128) |

**Error Register (Byte 2):**

| Bit | Meaning | Errors |
|-----|---------|--------|
| 0 | Generic Error | Set for all errors |
| 1 | Current | Short circuit sensor supply (SCS), output overload (SCO) |
| 2 | Voltage | Undervoltage UOUT, load voltage failure |
| 3 | — | Reserved |
| 4 | Communication | Node guard, heartbeat, fieldbus timeout |
| 5-6 | — | Reserved |
| 7 | Manufacturer | Wire break, other errors |

**Status Bits (Byte 3):**

| Bit | Meaning |
|-----|---------|
| 0 | Error at valve |
| 1 | Error at output |
| 2 | Error at input |
| 3 | Error at analogue/function module |
| 4 | Undervoltage |
| 5 | Short circuit/overload |
| 6 | Wire break |
| 7 | Other error |

### Diagnostics via SDO Access

Module-specific diagnostic information can be read via SDO (Service Data Object) access to the Modular Device Profile objects.

**Key Diagnostic Objects:**

| Index | Subindex | Description | Type | Access |
|-------|----------|-------------|------|--------|
| 0x1001 | 0 | Error Register | U8 | RO |
| 0x10F1 | 1 | Local Error Reaction | U32 | RO |
| 0x10F1 | 2 | Sync Error Counter Limit | U32 | RO |
| 0x10F3 | — | Diagnostics History | — | RO/RW |
| 0x5000 | 1 | Modules Count | U8 | RO |
| 0x5000 | 2 | Input Length (bytes) | U8 | RO |
| 0x5000 | 3 | Output Length (bytes) | U8 | RO |
| 0xF050 | 1…48 | Detected Module List | U32 | RO |

## Startup Configuration (SDO)

### Module Parameters (0x20xx)

Index: 0x20xx (xx = module number, 00…48)
Contains module-specific and channel-specific parameters.

**Access:** Read via ESI or controller software to determine parameter structure.

### Fail-Safe Mode Values (0x21xx)

Index: 0x21xx (xx = module number)
Subindex yy = channel number

**Purpose:** Define output states when CPX-E enters safe mode (communication loss, error).

**Access:** RW (read/write)

### Global CPX Settings (0x2400)

| Subindex | Parameter | Type | Default | Description |
|----------|-----------|------|---------|-------------|
| 1 | Filter alarm VOUT/VSEN | U8 | 0x00 | Voltage alarm filter time |
| 2 | Monitor SCS | BOOL | TRUE | Monitor sensor supply short circuit |
| 3 | Monitor SCO | BOOL | TRUE | Monitor output short circuit |
| 4 | Monitor VOUT | BOOL | TRUE | Monitor output voltage |
| 5 | Monitor VVEN | BOOL | TRUE | Monitor valve voltage |
| 6 | Monitor SCV | BOOL | TRUE | Monitor valve short circuit |
| 7 | Fail safe | U8 | 0x00 | Safe mode behavior |
| 8 | System Start | U8 | 0x00 | Startup behavior |

### Modular Device Profile (0xF000)

| Subindex | Description | Value |
|----------|-------------|-------|
| 1 | Index Distance | 1 |
| 2 | Maximum Number Of Modules | 48 |

**Module Detection:** Object 0xF050 lists all detected modules (product codes).

## Web Server Access (EoE)

The CPX-E-EC includes an integrated web server for diagnostics and parameter viewing.

**Access Requirements:**

1. **Enable Ethernet over EtherCAT (EoE)** in EtherCAT master configuration
2. **Enable IP Routing** on master controller
3. **Assign IP addresses:**
   - PC: 192.168.2.100
   - Master EtherCAT ↔ PC connection: 192.168.2.10
   - Master EtherCAT ↔ CPX-E connection: 172.16.1.1 / 255.255.0.0
   - CPX-E-EC: 172.16.1.100 / 255.255.0.0
4. **Add routing table entry (Windows cmd.exe):**
   ```
   route add 172.16.0.0 mask 255.255.0.0 192.168.2.10
   ```

**IMPORTANT:** Subnet masks on master and CPX-E must match.

**Access URL:** http://172.16.1.100 (or configured IP)

## DIL Switch Configuration

The CPX-E-EC has 2 DIL switches for diagnostics and bootloader mode.

| DIL 1 | DIL 2 | Function |
|-------|-------|----------|
| OFF | OFF | No diagnostics (factory setting) |
| OFF | ON | Status bits activated |
| ON | OFF | I/O diagnostic interface activated |
| ON | ON | Bootloader activated (firmware recovery) |

**IMPORTANT:** Changes take effect only after restart.

## Technical Specifications

### General

| Parameter | Value |
|-----------|-------|
| Dimensions (L×W×H) | 125.8 × 37.8 × 76.5 mm |
| Weight (with linkage) | 145 g |
| Mounting position | Vertical/horizontal |
| Ambient temp (vertical) | –5…+60 °C |
| Ambient temp (horizontal) | –5…+50 °C |
| Storage temperature | –20…+70 °C |
| Humidity (non-condensing) | 0…95% |
| Protection class | IP20 |
| EMC | EN 61000-6-2/-4 |

### Power Supply

| Parameter | Value |
|-----------|-------|
| Operating voltage UEL/SEN | 24 V DC ±25% |
| Intrinsic current | 50 mA @ 24 V |
| Reverse polarity protection | Yes (24V ↔ 0V) |
| Mains buffering time | 20 ms |

**UL Requirement:** For current >4 A, parallel connection to both XD1 and XD2 required.

### Network

| Parameter | Value |
|-----------|-------|
| Protocol | EtherCAT (IEC 61158, 61784, 61918) |
| Transmission rate | 100 Mbps |
| Max cable length/segment | 100 m |
| Cable type | Shielded twisted pair, Cat 5+ |
| Wire cross section | 0.14…0.75 mm² (22 AWG) |

## Structured Text Examples

### Reading Diagnostics History

```iecst
PROGRAM PRG_EtherCATDiagnostics
VAR
    fbDiagRead : FB_EtherCATDiagnostics;
    bReadDiag : BOOL;
    nNewestMsg : BYTE;
    bNewMsgAvail : BOOL;
    stDiagMsg : ST_EtherCATDiagMsg;
END_VAR

// Trigger diagnostic read
IF bReadDiag THEN
    fbDiagRead(
        bExecute := TRUE,
        nModuleIdx := 0,    // Bus module = 0
        nMsgIndex := 0      // Read newest message
    );

    IF fbDiagRead.bDone THEN
        stDiagMsg := fbDiagRead.stMessage;
        bReadDiag := FALSE;
    END_IF
END_IF
```

### Emergency Message Handler

```iecst
TYPE ST_EmergencyMsg :
STRUCT
    nErrCode : WORD;          // Bytes 0-1
    nErrReg : BYTE;           // Byte 2
    nStatusBits : BYTE;       // Byte 3
    nModuleNum : BYTE;        // Byte 4
    nCpxErrNum : BYTE;        // Byte 5
    nAddInfo : BYTE;          // Byte 7
END_STRUCT
END_TYPE

PROGRAM PRG_EmergencyHandler
VAR
    stEmerg : ST_EmergencyMsg;
    bEmergActive : BOOL;
    sErrText : STRING(80);
END_VAR

// Decode emergency message
IF stEmerg.nErrCode <> 16#0000 THEN
    bEmergActive := TRUE;

    CASE stEmerg.nErrCode OF
        16#2320:
            sErrText := 'Short circuit at outputs';
        16#2330:
            sErrText := 'Load dump (wire break)';
        16#3120:
            sErrText := 'Input voltage too low';
        16#3320:
            sErrText := 'Output voltage too low';
        16#5000:
            sErrText := 'Hardware error';
        ELSE
            sErrText := 'Unknown error';
    END_CASE
ELSE
    bEmergActive := FALSE;
END_IF
```

### PDO Mapping Configuration

```iecst
// Define mapped variables for module 1 (CPX-E-16DI)
VAR_INPUT
    {attribute 'TcLinkTo' := '.Module_1_Inputs'}
    nDI_Module1 AT %I* : WORD;  // Maps to 0x6001
END_VAR

VAR_OUTPUT
    {attribute 'TcLinkTo' := '.Module_2_Outputs'}
    nDO_Module2 AT %Q* : BYTE;  // Maps to 0x7002
END_VAR

// Access individual inputs
bSensor01 := nDI_Module1.0;
bSensor02 := nDI_Module1.1;

// Set outputs
nDO_Module2.0 := bValve01;
nDO_Module2.1 := bValve02;
```

### Status Bits Monitoring

```iecst
TYPE ST_CPX_StatusBits :
STRUCT
    bErrValve : BOOL;         // Bit 0
    bErrOutput : BOOL;        // Bit 1
    bErrInput : BOOL;         // Bit 2
    bErrAnalog : BOOL;        // Bit 3
    bErrUndervolt : BOOL;     // Bit 4
    bErrShortCkt : BOOL;      // Bit 5
    bErrWireBreak : BOOL;     // Bit 6
    bErrOther : BOOL;         // Bit 7
END_STRUCT
END_TYPE

PROGRAM PRG_StatusMonitor
VAR
    nStatusBits AT %I* : BYTE;
    stStatus : ST_CPX_StatusBits;
    bSystemErr : BOOL;
END_VAR

// Map status byte to struct
stStatus := nStatusBits;

// Check for any error
bSystemErr := (nStatusBits <> 0);

IF bSystemErr THEN
    // Determine error type
    IF stStatus.bErrShortCkt THEN
        // Handle short circuit
    ELSIF stStatus.bErrUndervolt THEN
        // Handle undervoltage
    END_IF
END_IF
```

## Troubleshooting / FAQ

### Q1: EtherCAT network not detected — [Run] LED off, [Error] LED flashing red

**Cause:** No connection to master, cable interrupted, or incorrect addressing.

**Solutions:**
1. Verify RJ45 cables are properly seated in [IN] and [OUT] ports
2. Check [LA IN] / [LA OUT] LEDs — should be on or flickering when connected
3. Verify EtherCAT master is operational and scanning for slaves
4. If using fixed addressing (rotary switches ≠ 0), verify address doesn't conflict
5. Check ESI file is loaded in master configuration tool
6. Ensure cable length <100 m per segment and Cat 5+ specification

### Q2: Module detected but wrong I/O size — [Error] LED flashing red, text ID 0x0012

**Cause:** Sync Manager invalid I/O size — mismatch between configured and actual CPX-E topology.

**Solutions:**
1. Verify ESI file matches CPX-E firmware revision
2. In master software, rescan EtherCAT network to detect actual module configuration
3. Check object 0x5000 (subindex 2/3) to read actual input/output byte counts
4. Verify no modules are missing or added vs. configuration
5. Ensure diagnostics mode (DIL switches) matches configuration (status bits or I/O diag interface)

### Q3: Distributed Clocks synchronization error — [Error] LED single flash red

**Cause:** DC synchronization lost, state change from Operational → Safe-Operational.

**Solutions:**
1. Verify DC is enabled in master configuration for CPX-E-EC
2. Check DC-compatible modules (CPX-E-16DI, CPX-E-8DO, CPX-E-1CI) are configured for sync mode
3. Ensure bus cycle time is achievable (check text ID 0x000F for timer errors)
4. Reduce DC jitter by minimizing network load or increasing cycle time
5. Verify cable quality — poor shielding causes timing errors

### Q4: Web server unreachable via EoE

**Cause:** Ethernet over EtherCAT not configured, routing missing, or IP address mismatch.

**Solutions:**
1. Verify EoE is enabled in EtherCAT master settings
2. Enable IP routing on master controller
3. Check IP address assignment:
   - CPX-E subnet (172.16.x.x) must differ from PC subnet (192.168.x.x)
   - Subnet masks must match between master EoE interface and CPX-E
4. Add Windows routing entry: `route add 172.16.0.0 mask 255.255.0.0 192.168.2.10`
5. Ping CPX-E IP address from PC to verify connectivity
6. Check firewall settings on PC

### Q5: Diagnostics history not updating — object 0x10F3 shows old messages

**Cause:** Acknowledge mode enabled and buffer full with unacknowledged messages.

**Solutions:**
1. Read object 0x10F3, subindex 5, bit 4:
   - If bit 4 = 1 → Acknowledge mode active
   - Set bit 4 = 0 to switch to overwrite mode
2. Acknowledge newest message by writing to subindex 3
3. Check subindex 4 (New Message Available) — if FALSE, no new errors occurred
4. Consider mapping subindex 4 to process data for real-time monitoring

### Q6: Emergency messages flooding the network

**Cause:** Transient errors (e.g., intermittent wire breaks) generate excessive emergency telegrams.

**Solutions:**
1. Disable emergency messages via object 0x10F3, subindex 5, bit 0 = 0
2. Use diagnostics history (0x10F3) instead for error logging
3. Enable filtering via object 0x2401 (filter "no error" messages)
4. Fix root cause: check wiring, sensor connections, and power supply stability
5. Adjust global settings (0x2400) to disable monitoring for specific error types

---

**References:**
- Automation System CPX-E Manual (general CPX-E diagnostics and error codes)
- CPX-E-EC Operating Instructions (safety, installation, maintenance)
- Festo Support Portal: www.festo.com/sp (ESI files, firmware updates)
