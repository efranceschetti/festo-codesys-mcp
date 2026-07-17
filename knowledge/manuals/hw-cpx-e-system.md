---
id: cpx-e-system
title: CPX-E Automation System — Architecture and Configuration
priority: HIGH
token_estimate: 2500
use_when:
  - user asks about CPX-E system architecture or overview
  - user needs module slot addressing or configuration
  - user asks about CPX-E power supply, wiring, or LED diagnostics
  - creating a new project targeting CPX-E hardware
never_use_when:
  - user asks about specific I/O modules (see cpx-e-io)
  - user asks about EtherCAT communication details (see cpx-e-ethercat)
  - user asks about motion control or servos
depends_on: []
related: [cpx-e-io, cpx-e-cec, cpx-e-ethercat]
keywords: [CPX-E, system, architecture, module, slot, power supply, LED, diagnostics, fail-safe, wiring, configuration]
---

# CPX-E Automation System — Architecture and Configuration

## Quick Facts

| Parameter | Value |
|-----------|-------|
| **System Type** | Modular automation system with bus or controller module + I/O modules |
| **Max Modules** | 11 (including bus module or controller) |
| **Max I/O Data** | 64 input bytes / 64 output bytes |
| **Operating Voltage** | 24 V DC ±25% (UEL/SEN and UOUT) |
| **Mounting** | H-rail 35 mm × 7.5 mm (EN 60715) |
| **Ambient Temperature** | -5°C to +60°C (vertical), -5°C to +50°C (horizontal) |
| **Protection Rating** | IP20 |
| **Max Station Distance** | 50 mm between H-rail mounting screws |
| **Minimum Clearances** | Top 40 mm, Sides 20 mm, Front/Back 30 mm |

---

## System Architecture

### Overview

The CPX-E automation system is a modular platform for electrical peripherals designed for protected environments. It connects to a higher-order controller via fieldbus or operates autonomously.

**Key characteristics:**
- Modular structure: Bus module/controller + up to 10 additional modules
- Configurable behavior via parameterization
- Network-independent diagnostics via I/O diagnostic interface
- Integrated diagnostic memory (40 entries)
- Force, fail-safe, and idle mode support

### Module Types

#### 1. Bus Module

Interface between CPX-E system and fieldbus/network.

**Functions:**
- Connect system to fieldbus/network
- Transfer data between system and higher-order controller
- Transmit control signals to connected modules
- Monitor module functionality
- Provide read/write access to parameters, signals, and diagnostics

**Examples:**
- CPX-E-PB (PROFIBUS DP)
- CPX-E-PN (PROFINET IO)
- CPX-E-EP (EtherNet/IP, Modbus TCP)
- CPX-E-EC (EtherCAT)

**Product structure:**
- LED indicators
- Rotary and DIL switches (not on all modules)
- Network connection
- Terminal strip (coded, removable)
- Module interlock
- Linkage element
- Functional earth contact (FE)

#### 2. Controller

Stand-alone or networked system controller with CODESYS support.

**Examples:**
- CPX-E-CEC-C1 (stand-alone)
- CPX-E-CEC-M1 (stand-alone)
- CPX-E-CEC-C1-EP (EtherNet/IP)
- CPX-E-CEC-M1-EP (EtherNet/IP)
- CPX-E-CEC-C1-PN (PROFINET)
- CPX-E-CEC-M1-PN (PROFINET)

**Product structure:**
- Removable cover
- SD memory card slot
- USB interface
- Ethernet interface
- LED indicators
- Terminal strip (coded, removable)
- Network connection
- Linkage element

#### 3. Input/Output Modules

Process digital or analog signals.

**Examples:**
- CPX-E-16DI (digital input)
- CPX-E-8DO (digital output)
- CPX-E-4AI-U-I (analog input)
- CPX-E-4AO-U-I (analog output)
- CPX-E-4IOL (IO-Link master)
- CPX-E-1CI (counter)

**Product structure:**
- LED indicators
- Terminal strip (coded, removable)
- Module interlock
- Linkage element
- Functional earth contact (FE)
- DIL switches (module-specific)

---

## System Configuration

### Setup Rules

1. Bus module or controller is **always the first module on the left**
2. Maximum **11 modules total** (bus module + 10 I/O modules)
3. I/O modules can be added in **any sequence**
4. Modules are mounted on **H-rail 35 mm × 7.5 mm** (EN 60715)
5. Distance between H-rail retaining screws: **max 50 mm**
6. H-rail to linkage element clearance: **3 mm minimum**

### Module Numbering

Modules are numbered from **left to right**, starting at **0**.

```
Module 0: Bus module or controller
Module 1: First I/O module
Module 2: Second I/O module
...
Module 10: Last I/O module (max)
```

### Mounting Clearances

| Location | Minimum Clearance |
|----------|-------------------|
| Top (a) | 40 mm |
| Sides (b) | 20 mm |
| Front/Back (c) | 30 mm |
| Total height (d) | 106 mm |
| Total depth (e) | 195 mm |

---

## Power Supply Concept

The CPX-E uses **two separate voltage supplies**:

### 1. Operating Voltage Supply (UEL/SEN)

Supplies electronics and sensors.

**Connection:** XD1, XD2 on bus module/controller

| Pin | Signal |
|-----|--------|
| 0, 1 | +24 V DC (UEL/SEN) |
| 2, 3 | 0 V DC (UEL/SEN) |

**Notes:**
- Pins XDx.0 and XDx.1 are internally connected
- Pins XDx.2 and XDx.3 are internally connected
- Voltage is distributed internally to all modules
- **UL requirement:** For current consumption >4 A, parallel connection to XD1 and XD2 is required

**Specifications:**
- Nominal voltage: 24 V DC ±25%
- Undervoltage detection: 17.5 V DC
- Max terminal strip current: 8 A (4 A for UL if single connection)

### 2. Load Voltage Supply (UOUT)

Supplies outputs separately for each output module.

**Specifications:**
- Nominal voltage: 24 V DC ±25%
- Undervoltage detection: Module-dependent
- Max terminal strip current: 8 A

**Separation:**
- UEL/SEN and UOUT are routed separately within the system
- Both voltages can be supplied from a common source if separation is not required
- Load voltage must be separately disconnectable

---

## LED Diagnostics and Status Indicators

### System-Specific LEDs (on all modules)

#### Power System [PS] — Operating Voltage UEL/SEN (Green)

| LED State | Meaning | Remedy |
|-----------|---------|--------|
| ON | Power present, no error | — |
| FLASHING | Power present but outside tolerance range | Rectify undervoltage |
| FLASHING | Linkage on bus module missing or incomplete | Check linkage |
| FLASHING | Internal fuse tripped | Correct short circuit/overload; automatic or manual reset depending on parameterization |
| OFF | Power supply not present | Check power supply connection |

#### Power Load [PL] — Load Voltage UOUT (Green)

| LED State | Meaning | Remedy |
|-----------|---------|--------|
| ON | Power present, no error | — |
| FLASHING | Power present but outside tolerance range | Rectify undervoltage |
| OFF | Power supply not present | Check power supply connection |

#### System Failure [SF] — System Error (Red)

| LED State | Meaning | Remedy |
|-----------|---------|--------|
| 1× FLASH | Error Class 1 (minor/information) | See error diagnostics |
| 2× FLASH | Error Class 2 (medium error) | See error diagnostics |
| 3× FLASH | Error Class 3 (serious error) | See error diagnostics |
| OFF | No error | — |

#### Modify [M] — Parameterization Status (Yellow)

| LED State | Meaning |
|-----------|---------|
| ON | System start set with saved parameterization and configuration; external parameterization blocked |
| FLASHING | Force function is enabled |
| OFF | System start set with default parameterization; external parameterization possible (factory setting) |

**Note:** Force function indication (flashing) has priority over saved parameterization indication (steady).

---

## Diagnostics Options

### 1. Status Bits

8 internal inputs provide coded diagnostic information (0 or 1 signals).

**Bit allocation:**

| Bit | Diagnostic Information (Logic 1) | Category |
|-----|----------------------------------|----------|
| 0 | Error at valve | Module type |
| 1 | Error at output | Module type |
| 2 | Error at input | Module type |
| 3 | Error in analog/function/technology module | Module type |
| 4 | Undervoltage | Error type |
| 5 | Short circuit/overload | Error type |
| 6 | Wire break | Error type |
| 7 | Other error | Error type |

**Example:** Bit pattern `00100010` = Short circuit at output (bit 5 + bit 1)

### 2. I/O Diagnostics Interface

Network-independent read access to diagnostic information via 16 internal inputs and 16 internal outputs.

#### Output Bits (specify function number)

| Bit Range | Function |
|-----------|----------|
| O0 … O12 | Function number (binary coded) |
| O13, O14 | Reserved |
| O15 | Control bit (rising edge = accept function number) |

#### Input Bits (receive diagnostic data)

| Bit Range | Function |
|-----------|----------|
| I0 … I7 | Diagnostic data |
| I8 … I14 | Reserved |
| I15 | Acknowledgement bit (logic 1 = data valid) |

#### Reading Diagnostic Data Flow

1. Set function number on O0…O12
2. Set control bit O15 to 1 (rising edge)
3. Wait for acknowledgement bit I15 = 1
4. Read diagnostic data from I0…I7
5. Reset control bit O15 to 0
6. Wait for acknowledgement bit I15 = 0

**Key function numbers:**
- **1937**: Module number and diagnostic status
- **1938**: System error number
- **2008 + 4m + 0**: First faulty channel of module m
- **2008 + 4m + 1**: Error number of module m

### 3. Diagnostic Memory

Records error statuses with timestamps for troubleshooting.

**Capacity:** 40 entries (10 bytes per entry)

**Entry structure:**
- Bytes 1-5: Timestamp (days, hours, minutes, seconds, milliseconds from power-on)
- Bytes 6-10: Error information (module code, position, channel, error number)

**Parameterization options:**
- Retention mode: Remanent (survive power-off) or non-remanent
- Memory procedure: First 40 entries (stop after 40) or last 40 entries (continuous, overwrite oldest)
- Error end filter: Record outgoing errors or not
- Run/stop filters: Control when recording starts/stops
- Error number filter: Record only specific error or suppress specific error
- Module/channel filter: Record only specific module/channel

---

## Error Classification

### Error Classes

| Class | LED Flash | Severity | Priority |
|-------|-----------|----------|----------|
| 1 | 1× flash | Minor / Information | Low |
| 2 | 2× flash | Medium | Medium |
| 3 | 3× flash | Serious | High |

**Priority rules:**
- Higher class has precedence
- Within class: lower module number has higher priority

### Common Error Numbers (Error Class 2)

| Error | Meaning | Remedy |
|-------|---------|--------|
| 0 | No error | — |
| 1 | General diagnostics (module-specific) | See module manual |
| 2 | Short circuit/overload in sensor supply or output | Eliminate short circuit/overload |
| 3 | Wire break/idle at current input/output | Check cables and sensors/actuators |
| 4 | Failure of load voltage UOUT (short circuit/overload) | Check actuators and connections |
| 5 | Undervoltage in operating voltage UEL/SEN | Rectify undervoltage |
| 9 | Value below nominal range | Check analog input and limit value |
| 10 | Value exceeds nominal range | Check analog input and limit value |
| 11 | Short circuit at valve | Check valve and pneumatic interface |
| 13 | Wire break at valve (open load) | Check valve and pneumatic interface |
| 15 | Module/channel failed | Check module/peripherals, replace if necessary |
| 16 | Saved configuration differs from actual | Check configuration and save again |
| 17 | Saved I/O length differs from actual | Check configuration and save again |
| 18 | Number of I/O points exceeded | Check DIL switch and configuration |
| 26 | Error in actuator supply | Eliminate short circuit/overload, check actuators |
| 30 | Error in internal communication (no new output data) | Replace module if power cycle fails |
| 31 | Bus connection interrupted | Restore bus connection or check configuration |

### Critical Error Numbers (Error Class 3)

| Error | Meaning | Remedy |
|-------|---------|--------|
| 128 | Hardware defective | Check hardware and replace |
| 129 | Bus module faulty | Replace bus module |
| 130 | System error on bus module | Power cycle; replace if persists |
| 131 | Error in internal communication during start-up | Check system, replace if necessary |
| 135 | Error in internal configuration | Check system, replace if necessary |
| 138 | Error in internal configuration (module not mounted correctly) | Check module mounting/arrangement |
| 140 | Hardware defective | Identify and replace faulty module |

### Information Error Numbers (Error Class 1)

| Error | Meaning | Remedy |
|-------|---------|--------|
| 200 | Error in parameterization (transfer failed) | Power cycle; replace if persists |
| 201 | Address incorrect | Check DIL switch position |
| 202 | Initialization of protocol chip defective | Power cycle; replace if persists |
| 204 | Switch setting invalid | Check DIL switch position |
| 254 | Undervoltage of electronics and sensors | Rectify undervoltage |
| 255 | Unknown error | — |

---

## Fail-Safe Behavior

### Overview

Fail-safe parameterization specifies output signal states during communication errors (network interruption, controller failure, communication stop).

### System-Level Fail-Safe (applies to all outputs)

| Setting | Behavior |
|---------|----------|
| Reset outputs (default) | All outputs reset to 0 |
| Hold last state | Outputs retain current signal status |
| Assume fault mode value | Outputs adopt channel-specific fault states |

**Reset outputs means:**
- Monostable valves: Move to initial position
- Bistable valves: Remain in current position
- Mid-position valves: Go to mid-position (pressurized, exhausted, or blocked)

### Channel-Level Fail-Safe (when "Assume fault mode value" is active)

Each output channel can be configured:

| Fault Mode | Fault State | Behavior |
|------------|-------------|----------|
| Hold last state | — | Retain current signal status |
| Fault state (default) | Reset output (default) | Set output to 0 |
| Fault state | Set output | Set output to 1 |

**For analog outputs:**
- Fault state = specific analog value (0 = default)

---

## Idle Mode Behavior

**Note:** Only relevant for certain network protocols (see bus module manual).

### System-Level Idle Mode

| Setting | Behavior |
|---------|----------|
| Reset all outputs (default) | All outputs reset to 0 |
| Hold last state | Outputs retain current signal status |
| Assume idle mode value | Outputs adopt channel-specific idle states |

### Channel-Level Idle Mode (when "Assume idle mode value" is active)

Same structure as fail-safe channel-level configuration.

---

## Force Function

### Overview

Force function enables manipulation of signal states independently of actual operating status.

**Uses:**
- Commissioning phase testing
- Setting signals to desired status when wiring incomplete
- Digital inputs/outputs
- Analog inputs/outputs
- Solenoid coils (with CPX-E-4IOL module)
- I/O diagnostic interface inputs/outputs

### System-Level Force

| Setting | Behavior |
|---------|----------|
| Blocked (default) | Force function disabled |
| Enabled | Force function active (LED [M] flashes) |

### Channel-Level Force (when enabled)

| Force Mode | Force State | Behavior |
|------------|-------------|----------|
| Blocked (default) | — | Force blocked for channel |
| Released | Reset signal (default) | Set input/output to 0 |
| Released | Set signal | Set input/output to 1 |

**For analog signals:**
- Force state = specific analog value (0 = default)

**Important:**
- Input signals: Force does not modify physical input; only internal logical status changes (not visible on LED)
- Output signals: Force modifies physical output (visible on LED)
- Force has **precedence** over fail-safe signals

---

## Parameterization

### System Parameters (apply to entire CPX-E system)

| Parameter | Function Number | Default | Options |
|-----------|----------------|---------|---------|
| **Monitoring** | 4401 | Active | Active / Inactive (short circuit, overload, undervoltage) |
| **Fail safe** | 4402 (bits 0-1) | Reset all outputs | Reset / Hold last state / Assume fault mode |
| **Force mode** | 4402 (bits 2-3) | Blocked | Blocked / Enabled |
| **Idle mode** | 4402 (bits 4-5) | Reset all outputs | Reset / Hold last state / Assume idle mode |
| **System start** | 4402 (bit 6) | Default param + current config | Default / Saved param + saved config |
| **Analog process value representation** | 4402 (bit 7) | INTEL format (LSB-MSB) | INTEL / MOTOROLA (MSB-LSB) |

### Module Parameters (module-specific)

Function number: **4828 + 64m + offset** (m = module number 0-10)

| Parameter | Offset | Default | Options |
|-----------|--------|---------|---------|
| **Module monitoring** | +0 | Active | Active / Inactive (SCS, SCO, UOUT, param errors) |
| **Behavior after short circuit/overload** | +1 | Auto restart | Auto restart / Remain off (SCS, SCO, analog) |
| **Input debounce time** | +1 (bits 0-1) | 3 ms | 0.1 ms / 3 ms / 10 ms / 20 ms |
| **Signal extension time** | +1 (bits 2-3) | 15 ms | 0.5 ms / 15 ms / 50 ms / 100 ms |
| **Data format analog inputs** | +3 | Module-specific | See module manual |
| **Data format analog outputs** | +3 | Module-specific | See module manual |

### Module Parameters (channel-specific)

Function number: **4828 + 64m + 6 + channel** (access via protocol-specific functions)

| Parameter | Options |
|-----------|---------|
| **Signal extension channel x** | Blocked / Enabled |
| **Fault mode channel x** | Hold last state / Fault state (Reset / Set output) |
| **Idle mode channel x** | Hold last state / Idle state (Reset / Set output) |
| **Force mode channel x** | Blocked / Force state (Reset / Set signal) |

### Diagnostic Memory Parameters (trace parameters)

| Parameter | Function Number | Default | Options |
|-----------|----------------|---------|---------|
| **Entries saved retentively** | 3480 | Active | Active / Inactive |
| **Run/stop filter 1** | 3480 (bit 1) | Last 40 entries | First 40 entries / Last 40 entries |
| **Run/stop filter 2** | 3484 (bits 0-2) | Inactive | Inactive / Record up to FN / FN+MN / FN+MN+CN / Record from FN / FN+MN / FN+MN+CN |
| **Fault end filter** | 3484 (bit 3) | Record outgoing | Record outgoing / Do not record outgoing |
| **Error number filter** | 3484 (bits 4-5) | Inactive | Inactive / Record only FN / Do not record FN |
| **Module/channel filter** | 3484 (bits 6-7) | Inactive | Inactive / Record only module / Record only channel |
| **Module number** | 3485 | 0 | 0…47 |
| **Channel number** | 3486 | 0 | 0…63 |
| **Error number** | 3487 | 0 | 0…255 |

---

## System Data (read-only)

### Function Numbers

| Data | Function Number | Description |
|------|----------------|-------------|
| **Configuration** | 0 (bit 0) | 0 = Uniform config, 1 = Non-uniform config |
| **Force mode** | 0 (bit 1) | 0 = Blocked, 1 = Enabled |
| **System start** | 0 (bit 6) | 0 = Default param, 1 = Saved param |
| **Fail safe** | 1 (bits 0-1) | 00 = Reset, 01 = Hold, 10 = Fault mode |
| **Idle mode** | 1 (bits 0-1) | 00 = Reset, 01 = Hold, 10 = Idle mode |
| **System monitoring** | 2 | Bits for SCS, SCO, UOUT monitoring |
| **Status bits** | 1936 | 8-bit diagnostic status |
| **Module number + diagnostic status** | 1937 | Bits 0-5 = module number, bit 6 = diagnostic available |
| **System error number** | 1938 | Current error number (0-255) |

### Module Data

| Data | Function Number | Description |
|------|----------------|-------------|
| **Module code** | 16 + 16m + 0 | Module code (1-245) |
| **Revision code** | 16 + 16m + 13 | Revision code (0-255) |
| **Serial number** | 784 + 4m + (0-3) | 8-digit serial number (hexadecimal) |

### Module Diagnostic Data

| Data | Function Number | Description |
|------|----------------|-------------|
| **First faulty channel** | 2008 + 4m + 0 | Channel number (0-63) + type (output/input/module) |
| **Module error number** | 2008 + 4m + 1 | Error number (0-255) |
| **Info 2** | 2008 + 4m + 2 | Reserved |
| **Info 3** | 2008 + 4m + 3 | Reserved |

### Diagnostic Memory Data

| Data | Function Number | Description |
|------|----------------|-------------|
| **Number of entries** | 3482 | 0-40 |
| **Overflow** | 3483 (bit 0) | 0 = No overflow, 1 = Overflow (>40 errors) |
| **Status** | 3483 (bit 1) | 0 = Recording active, 1 = Recording inactive |
| **Diagnostic memory entry** | 3488 + 10d + (0-9) | 10 bytes per entry (d = entry 0-39) |

**Diagnostic memory entry structure (10 bytes):**
- Byte 1: Days (0-255)
- Byte 2: Hours (0-23)
- Byte 3: Minutes (0-59)
- Byte 4: Seconds (0-59)
- Byte 5: 10-millisecond units (0-99; bit 7 set if first entry after power-on)
- Byte 6: Module code
- Byte 7: Module position (0-47; 63 = not module-related)
- Byte 8: Channel number or error type (bits 6-7: 00=output, 01=input, 10=module, 11=reserved)
- Byte 9: Error number (0-255)
- Byte 10: Number of subsequent channels with same error (0-63)

---

## Technical Specifications

### General

| Parameter | Value |
|-----------|-------|
| **Mounting position** | Vertical / Horizontal |
| **Ambient temperature (vertical)** | -5°C to +60°C |
| **Ambient temperature (horizontal)** | -5°C to +50°C |
| **Storage temperature** | -20°C to +70°C |
| **Humidity (non-condensing)** | 0-95% |
| **Max setup altitude** | 2000 m above sea level |
| **Degree of protection** | IP20 (EN 60529) |
| **Pollution degree** | 2 |
| **Protection against electric shock** | PELV circuits (Protected Extra-Low Voltage) |

### Electrical

#### Operating Power Supply UEL/SEN

| Parameter | Value |
|-----------|-------|
| **Nominal voltage** | 24 V DC ±25% |
| **Undervoltage trigger level** | 17.5 V DC |
| **Max terminal strip current** | 8 A (4 A UL if single connection) |
| **Mains buffering time** | Module-dependent |

#### Load Voltage Supply UOUT

| Parameter | Value |
|-----------|-------|
| **Nominal voltage** | 24 V DC ±25% |
| **Undervoltage trigger level** | Module-dependent |
| **Max terminal strip current** | 8 A |

### Vibration and Shock Resistance (EN 60068)

**H-rail mounting: Severity Level 1 (SL1)**

| Test Type | Specification |
|-----------|---------------|
| **Vibration** | 2-8 Hz: ±3.5 mm, 8-27 Hz: 10 m/s², 27-58 Hz: ±0.15 mm, 58-200 Hz: 10-20 m/s² |
| **Shock** | ±150 m/s², 11 ms, 5 shocks per direction |
| **Continuous shock** | ±150 m/s², 6 ms, 1000 shocks per direction |

### Terminal Strip Connection Data

#### 4-pin and 6-pin Terminal Strips

| Conductor Type | Cross Section (mm²) | Wire Ferrule Length (mm) |
|----------------|---------------------|--------------------------|
| **Solid** | 0.14 - 1.5 | — |
| **Flexible** | 0.14 - 2.5 (4-pin) / 0.14 - 1.5 (6-pin) | — |
| **Wire ferrule without sleeve** | 0.14 - 1.5 | 8-10 (0.14-1.0 mm²) / 8-10 (1.5 mm²) |
| **Wire ferrule with sleeve** | 0.14 - 1.5 (4-pin) / 0.14 - 1.0 (6-pin) | 8-10 (all sizes) |

**Standards:**
- Without plastic sleeve: DIN 46228-1
- With plastic sleeve: DIN 46228-4

### UL Certification

| Parameter | Value |
|-----------|-------|
| **Product category code** | NRAQ/NRAQ7 |
| **File number** | E239998 |
| **Standards** | UL 61010-1, UL 61010-2-201, CSA-C22.2 No. 61010-1-12, CSA-C22.2 No. 61010-2-201:14 |
| **Pollution degree** | 3 |
| **Installation site** | Indoor use only |
| **Max installation height** | 2000 m |
| **Max current (single XD connection)** | ≤ 4 A |
| **Max current (XD1 + XD2 parallel)** | > 4 A … 8 A |

**UL Requirements:**
- Supply by limited-energy circuit (IEC/EN/UL/CSA 61010-1) or Limited Power Source (LPS) per IEC/EN/UL/CSA 60950-1 / 62368-1 or Class 2 circuit (NEC/CEC)
- Ethernet modules: Operate only in networks where all components are PELV or equivalent

---

## Troubleshooting FAQ

### Q1: System Failure LED flashes 2× — what does this mean?

**Answer:** Error Class 2 (medium severity) is active. Check:
1. Read function number **1937** via I/O diagnostic interface to identify faulty module number
2. Read function number **1938** to get system error number
3. For module-specific error, read function number **2008 + 4m + 1** (where m = module number)
4. Consult error number table above for remedy

**Common Class 2 errors:**
- Error 2: Short circuit/overload in sensor supply or output
- Error 5: Undervoltage in UEL/SEN
- Error 16: Saved configuration differs from actual

---

### Q2: Power System LED [PS] is flashing — why?

**Answer:** Flashing indicates one of three conditions:
1. **Power present but outside tolerance range** → Check that UEL/SEN voltage is within 18-30 V DC (nominal 24 V ±25%)
2. **Linkage on bus module missing or incomplete** → Verify linkage elements are properly seated between bus module and first I/O module
3. **Internal fuse tripped** → Short circuit or overload detected. Eliminate fault, then check parameterization:
   - Function number **4828 + 64m + 1** controls auto-restart behavior
   - If set to "remain off", power cycle system to reset
   - If set to "auto restart" (default), fuse will reset automatically

---

### Q3: How do I determine which module and channel has an error?

**Answer:** Use I/O diagnostic interface:

**Step 1 — Check if diagnostic data available:**
- Read function number **1937** (module number and diagnostic status)
- If bit 6 = 1, diagnostic data available
- Bits 0-5 contain module number of first faulty module

**Step 2 — Get module error details:**
- Calculate function number: **2008 + (4 × module_number) + 0**
- Read this function number to get first faulty channel number
- Bits 0-5 = channel number (0-63)
- Bits 6-7 indicate type: 00=output, 01=input, 10=module error

**Step 3 — Get error number:**
- Calculate function number: **2008 + (4 × module_number) + 1**
- Read this function number to get error number (0-255)

**Example:**
- Function 1937 returns `01000101` → Bit 6=1 (diagnostic available), bits 0-5 = 5 (module 5)
- Function 2008 + 4×5 + 0 = 2028 returns `01000010` → Output channel 2 (bits 6-7 = 00)
- Function 2008 + 4×5 + 1 = 2029 returns `00000010` → Error 2 (short circuit/overload)
- **Result:** Short circuit/overload on output channel 2 of module 5

---

### Q4: What is the difference between fail-safe and force functions?

**Answer:**

**Fail-safe:**
- **Purpose:** Define safe output states during communication errors (network failure, controller loss)
- **Trigger:** Automatic when communication error detected
- **Scope:** Output signals only
- **Priority:** Lower than force

**Force:**
- **Purpose:** Override signals for commissioning/testing (independent of controller)
- **Trigger:** Manual via parameterization
- **Scope:** Input and output signals
- **Priority:** Higher than fail-safe (force overrides fail-safe)
- **Visibility:** Input force not visible on LED (internal only); output force visible on LED

**Example scenario:**
- Fail-safe configured: Output 3 → Set to 1 during communication error
- Force configured: Output 3 → Set to 0
- Result: Output 3 = 0 (force has precedence)

---

### Q5: How do I save my parameterization permanently?

**Answer:**

**Set system start parameter (function number 4402, bit 6):**
- **Bit 6 = 0 (default):** System start with factory defaults and current configuration
  - External parameterization possible
  - All parameters reset to factory defaults on power cycle
  - LED [M] = OFF
- **Bit 6 = 1:** System start with saved parameterization and saved configuration
  - Current parameters and configuration saved to non-volatile memory
  - External parameterization blocked
  - LED [M] = ON (steady)

**Steps to save permanently:**
1. Configure all desired system and module parameters
2. Set function number **4402, bit 6 = 1**
3. Verify LED [M] is ON (steady, not flashing)
4. Power cycle to confirm parameters persist

**Caution:** When replacing a system with saved parameterization:
- The new system will NOT automatically receive parameterization from controller
- You must manually restore parameters or set bit 6 = 0 to allow external parameterization

**Recommendation:** Use default parameterization (bit 6 = 0) and configure parameters via interface module/scanner/master during start-up phase for easier system replacement.

