---
id: cpx-e-speciality
title: CPX-E Specialty Modules — Counter (1CI) and IO-Link (4IOL)
priority: MEDIUM
token_estimate: 1200
use_when:
  - user asks about encoder/counter inputs on CPX-E
  - user needs IO-Link device integration
  - user asks about CPX-E-1CI or CPX-E-4IOL modules
  - configuring counter or IO-Link process data
never_use_when:
  - user asks about standard analog/digital I/O (see cpx-e-io)
  - user asks about EtherCAT or motion control
  - user asks about controller configuration (see cpx-e-cec)
depends_on: [cpx-e-system]
related: [cpx-e-io, cpx-e-cec]
keywords: [counter, encoder, IO-Link, CPX-E-1CI, CPX-E-4IOL, IODD, process data, counting mode, incremental encoder]
---

# CPX-E Specialty Modules Reference

## Module Overview

### CPX-E-1CI — Counter/Encoder Module
Single-channel counter module for CPX-E automation system supporting:
- Incremental encoders (24V DC or 5V DC, single-ended/differential)
- Pulse generators with optional direction signal
- Counter value range: 0 to 4,294,967,295 (2³² – 1)
- 4 digital inputs (I0-I3) for counter control functions
- Speed measurement and latch functions
- Encoder supply: 5V DC ±5% or 24V DC ±25% (500 mA max)

**Address Space**: 12 bytes input / 2 bytes output

### CPX-E-4IOL — IO-Link Master Module
Four-port IO-Link master for CPX-E automation system supporting:
- 4 IO-Link interfaces (Class B / Type B with load voltage supply)
- Operating modes: Inactive, DI (digital input), IO-Link
- Transmission rates: COM1 (4.8 kbps), COM2 (38.4 kbps), COM3 (230.4 kbps)
- Max cable length: 20 m unshielded per port
- DIL switch configurable address space (2-32 bytes per port)
- Separate operating (UEL/SEN) and load (UOUT) voltage supplies

**Address Space**: 8-32 bytes input / 8-32 bytes output (configurable via DIL switches)

## Counter Module (CPX-E-1CI)

### Encoder Input Types

**24V DC Encoders (single-ended)**
- Incremental encoder with tracks A, B (90° phase offset), optional zero track (0)
- Pulse generator with or without direction signal
- Max frequency: 250 kHz

**5V DC Encoders (differential or single-ended)**
- Incremental encoder with tracks A, B (90° phase offset), optional zero track (0)
- Pulse generator with or without direction signal
- Max frequency (differential): 2 MHz
- Max frequency (single-ended): 250 kHz
- Debounce time (differential): 125 ns
- Debounce time (single-ended): 1 µs

**Connection Requirements**
- For single-ended encoders: Do NOT connect A–, B–, 0– pins (X2.1, X2.3, X2.5)
- Do NOT connect both 5V and 24V encoder supplies simultaneously
- Max cable length: 30 m (shielded)

### Signal Evaluation Modes

**Single Evaluation**: 1 edge per period (track A only)
- Forward: rising edge at A, low at B
- Backward: falling edge at A, low at B

**Double Evaluation**: 2 edges per period (track A rising + falling)
- Level of track B determines direction

**Quadruple Evaluation** (default): 4 edges per period (A and B, rising + falling)
- Levels of both tracks determine direction
- Maximum resolution

**Pulse and Direction**: Rising edges of track A only
- Track B level determines counting direction

### Counting Functions

**Set Counter Function**
- Loads counter with "Load value" parameter
- Trigger sources (selectable):
  - Input I2 (rising edge)
  - Zero pulse (track 0)
  - Process data control bit
- Resets "Upper CL" and "Lower CL" overflow status bits

**Block Counter Function**
- Stops counting (counter value frozen)
- Trigger sources:
  - Input I3 (active high)
  - Process data control bit
- Counting resumes from current value when unblocked

**Latch Function**
- Captures counter value to process data without stopping counter
- Trigger sources:
  - Input I0 (configurable edge)
  - Zero pulse (track 0)
- Trigger events: rising edge, falling edge, or both
- Response modes:
  - Continuous: counter value unchanged
  - Load value: counter reset to load value after latch
- Must be enabled via input I1 and "Block latch" control bit
- Status: "Latch set" status bit (acknowledge via "Confirm latch" control bit)
- Missed events: "Latch missed" status bit if latch occurs while previous unacknowledged

**Speed Measurement Function**
- Counts encoder pulses within integration time
- Integration times: 1 ms, 10 ms (default), 100 ms
- Value = sum of pulses from track A (rising + falling edges) per integration interval
- Can be used with Latch function (latches counter values, not speed)
- Speed measured even when counter blocked
- Direction change resets speed to 0 and restarts integration

### Counter Limits and Overflow

**Count Range**: Upper count limit (max 2³² – 1) to Lower count limit (min 0)
- Default: 0 to 4,294,967,295

**Overflow Behavior**
- When limit reached, counter wraps to opposite limit without pulse loss
- "Upper CL" or "Lower CL" status bit set until acknowledged
- Acknowledge via "Overflow CL" control bit or "Set counter" function
- Rapid overflows may not be detected as repeated events

### Encoder Diagnostics

**Cable Break Monitoring** (parameter enabled, 2-track encoders only)
- Detects open or short-circuited encoder cables
- Error if signal changes on one track missing compared to other
- Cannot detect simultaneous break on both tracks (indistinguishable from stationary encoder)

**Tracking Error Monitoring** (parameter enabled, 2-track encoders only)
- Detects if max input frequency exceeded
- Detects if encoder edges too close together
- Module error signaled if limit exceeded

**Zero Pulse Monitoring** (parameter enabled, encoders with track 0 only)
- Verifies pulse count between zero pulses matches "Pulses per zero pulse" parameter
- Tolerance: ±3 pulses
- Error if deviation exceeds tolerance

### Digital Inputs (I0-I3)

**Input I0**: Latch trigger
**Input I1**: Block latch (active low = latch enabled)
**Input I2**: Set counter trigger
**Input I3**: Block counter (active high = counter blocked)

**Specifications**
- Type 1 and Type 3 per IEC 61131-2
- 24V DC powered (separate per input)
- Debounce time: 20 µs (default), 100 µs, or 3 ms (configurable)

### Configuration Parameters

**Function Number Format**: 4828 + 64×m + offset (m = module number, left to right from 0)

| Parameter | F No. Offset | Description | Default |
|-----------|--------------|-------------|---------|
| Signal type/encoder type | +6 | 5V differential / 5V single-ended / 24V single-ended | 5V differential |
| Signal evaluation | +7 | Single / Double / Quadruple / Pulse+direction | Quadruple |
| Monitoring cable break | +8 | Active / Inactive | Inactive |
| Monitoring tracking error | +9 | Active / Inactive | Inactive |
| Monitoring zero pulse | +10 | Active / Inactive | Inactive |
| Pulses per zero pulse | +11, +12 | 0 to 65535 (16-bit) | 0 |
| Latch signal | +13 | Digital input I0 / Zero pulse | Digital input I0 |
| Latch event | +14 | Rising / Falling / Both | Rising edge |
| Latch response | +15 | Continuous / Load value | Continuous |
| Upper count limit | +16 to +19 | 0 to 2³²–1 (32-bit) | 4,294,967,295 |
| Lower count limit | +20 to +23 | 0 to 2³²–1 (32-bit) | 0 |
| Load value | +24 to +27 | 0 to 2³²–1 (32-bit) | 0 |
| Debounce time DI | +28 | 20 µs / 100 µs / 3 ms | 20 µs |
| Integration time speed | +29 | 1 ms / 10 ms / 100 ms | 10 ms |

### Process Data Inputs (PDI) — 12 Bytes

**Bytes 0-3**: Counter value / Speed value (32-bit, LSB first)
- Counter value (default) or speed measurement value (if speed enabled)

**Bytes 4-7**: Latch value (32-bit, LSB first)
- Last latched counter value

**Byte 8** (Status bits):
- Bit 0: Status DI0 (latch input active = 1)
- Bit 1: Status DI1 (block latch active = 1)
- Bit 2: Status DI2 (set counter active = 1)
- Bit 3: Status DI3 (block counter active = 1)
- Bit 4: Reserved
- Bit 5: Latching missed (missed latch event = 1)
- Bit 6: Latching set (latch event occurred = 1)
- Bit 7: Latching blocked (latch blocked via control bit = 1)

**Byte 9** (Status bits):
- Bit 0: Lower CL (lower count limit exceeded = 1)
- Bit 1: Upper CL (upper count limit exceeded = 1)
- Bit 2: Counting direction (0 = up, 1 = down)
- Bit 3: Counter blocked (blocked via control bit = 1)
- Bit 4: Counter set (set via control bit = 1)
- Bit 5: Enable DI2 (input I2 enabled via control bit = 1)
- Bit 6: Enable zero (zero pulse enabled via control bit = 1)
- Bit 7: Speed measurement (active = 1)

**Bytes 10-11**: Reserved

### Process Data Outputs (PDO) — 2 Bytes

**Byte 0** (Control bits):
- Bit 0: Enable setting DI2 (enable counter set via input I2 = 1)
- Bit 1: Enable setting zero (enable counter set via zero pulse = 1)
- Bit 2: Set counter (set counter to load value = 1)
- Bit 3: Block counter (block counting = 1)
- Bit 4: Overrun CL (acknowledge count limit overflow = 1)
- Bit 5: Speed measurement (enable speed measurement = 1)
- Bit 6: Confirm latching (acknowledge latch event = 1)
- Bit 7: Block latching (block latch function = 1)

**Byte 1**: Reserved

### LED Indicators

**[P] Module Error (red)**
- On: Module error (error 2, 5, 29, or 108)
- Off: Normal operation

**[X0], [X1] Input Status I0-I3 (green)**
- On: Input active (logic 1)
- Off: Input inactive (logic 0)

**[X2] Encoder Normal (green)**
- On: Encoder operating normally
- Off: Encoder error or not initialized

**[X2] Encoder Error (red)**
- On: Cable break / Tracking error / Zero pulse error (error 108)
- Off: Normal operation or not initialized

**[X3] Encoder Supply Normal (green)**
- On: Encoder supply OK
- Off: Supply error or not initialized

**[X3] Encoder Supply Error (red)**
- On: Short circuit or overload (error 2)
- Off: Normal operation or not initialized

## IO-Link Master Module (CPX-E-4IOL)

### Port Configuration

**4 IO-Link Ports** ([X0] to [X3])
- Each port can be configured independently
- Operating modes per port: Inactive / DI / IO-Link
- Class B (Type B): Includes load voltage supply (P24)

**DIL Switch Address Space Configuration**

| Switch 1-5 | Per Port | Total Module | Active Ports |
|------------|----------|--------------|--------------|
| OFF-OFF-OFF-OFF-OFF | 2 I/2 O | 8 I/8 O | All 4 (default) |
| ON-OFF-OFF-OFF-OFF | 4 I/4 O | 16 I/16 O | All 4 |
| OFF-ON-OFF-OFF-OFF | 8 I/8 O | 32 I/32 O | All 4 |
| ON-ON-OFF-ON-OFF | 16 I/16 O | — | Ports 1-2 only |
| OFF-OFF-ON-OFF-ON | 32 I/32 O | — | Port 1 only |

Invalid DIL switch combinations trigger error 204.

### Port Connections

**Ports [X0] to [X3]** (each port has 6-pin terminal):
- Pin 0/1: C/Q — Standard IO (SIO mode) or IO-Link communication (IOL mode)
- Pin 2: L+ — +24V DC operating voltage (UEL/SEN)
- Pin 3: P24 — +24V DC load voltage (UOUT)
- Pin 4: L– — 0V DC operating voltage (UEL/SEN)
- Pin 5: N24 — 0V DC load voltage (UOUT)

**Load Voltage Distribution [XD]**:
- Pins 0, 1: +24V DC UOUT (internally connected)
- Pins 2, 3: 0V DC UOUT (internally connected)

### Operating Modes (Per Port)

**Inactive** (default)
- Port not in use
- No communication or digital I/O

**DI (Digital Input)**
- Port acts as single digital input
- Process signal 0/1
- Yellow LED indicates signal state

**IO-Link**
- IO-Link communication active
- Point-to-point connection (1 device per port)
- Supports COM1 (4.8 kbps), COM2 (38.4 kbps), COM3 (230.4 kbps)
- Max cable length: 20 m unshielded
- Max process data: 8/16/32 bytes I/O (depends on DIL switch setting)
- Green LED indicates communication status

### IO-Link Configuration Parameters

**Function Number Format**: 4828 + 64×m + offset (m = module number, left to right from 0)

**Module-Wide Parameters**:

| Parameter | F No. Offset | Values | Default |
|-----------|--------------|--------|---------|
| Monitoring Uload | +0 | Inactive / Active | Active |
| Behaviour after SCS | +1 (bit 0) | Leave deactivated / Reactivate | Reactivate |
| Behaviour after SCO | +1 (bit 1) | Leave deactivated / Reactivate | Reactivate |
| PS supply | +6 | Inactive / Active | Active |

**Per-Port Parameters** (Port 1: +8-11, Port 2: +12-15, Port 3: +16-19, Port 4: +20-23):

| Parameter | Port 1 Offset | Description | Default |
|-----------|---------------|-------------|---------|
| Cycle time (low) | +8 | 16-bit, in 100 µs units | 0 (auto) |
| Cycle time (high) | +9 | 16-bit, in 100 µs units | 0 (auto) |
| PL supply | +10 | Inactive / Active | Active |
| Operating mode | +11 | Inactive / DI / IO-Link | Inactive |

**Per-Port Status (Read-Only)**:

| Parameter | Port 1 Offset | Description |
|-----------|---------------|-------------|
| LineState | +24 | Port status (see LineState table) |
| Device error code (low) | +25 | Event code LSB (16-bit hex) |
| Device error code (high) | +26 | Event code MSB (16-bit hex) |

(Port 2: +27-29, Port 3: +30-32, Port 4: +33-35)

### LineState Status Values

| Value (bits 2:1:0) | Name | Description |
|-------------------|------|-------------|
| 000 | Inactive | Port deactivated |
| 001 | DI | Port is digital input |
| 011 | CheckFault | Configuration error |
| 100 | Preoperate | IO-Link communication setup |
| 101 | Operate | IO-Link communication active, process data transfer |
| 110 | Scanning | IO-Link started, device not yet found |
| 111 | DeviceLost | Communication to device interrupted |

### Event Codes (Diagnostics)

IO-Link event codes are 2-byte hexadecimal values returned in "Device error code" parameter.

**Critical Events**:
- `0x0000`: Device OK (error 0)
- `0x1000`: Device NOK, general diagnostics (error 1)
- `0x4000`: Temperature overload (error 1)
- `0x5000`: Hardware error — device replacement (error 1)
- `0x5100`: General power supply error (error 1)
- `0x5110`: Primary voltage too high (error 10)
- `0x5111`: Primary voltage too low (error 5)
- `0x5112`: Undervoltage PL device (error 5, if PL monitoring active)
- `0x6000`: Device software error (error 1)
- `0x6320`: Parameter error (error 29)
- `0x7700`: Wire break at device peripheral (error 3)
- `0x7710`: Short circuit (error 2)
- `0x7711`: Earth error (error 1)
- `0x8C00`: Technology-specific application error (error 1)
- `0x8C10`: Process variable range overflow (error 25)
- `0x8C30`: Process variable range underflow (error 24)

**Internal Module Events** (no event code):
- Short circuit at port (L+, P24): error 88
- Configuration error: error 89
- Device missing/failed: error 57
- Invalid parameters from host: error 29

### Power Supply Configuration

**Operating Voltage (UEL/SEN)**
- 24V DC ±25%
- Intrinsic consumption: 50 mA (without devices)
- Max current per module: 1.8 A
- Undervoltage detection: 17V DC (0.5V hysteresis)
- Mains buffering: 10 ms
- Electronic short-circuit protection per module: 1.8 A
- Thermal short-circuit protection per port: 3.0 A
- Controlled via "PS supply" parameter (applies to all ports)

**Load Voltage (UOUT)**
- 24V DC ±25%
- Max current per port: 1.6 A
- Capacitive load: 363 nF
- Electronic short-circuit protection per module: 1.6 A
- Thermal short-circuit protection per port: 3.0 A
- Controlled individually per port via "PL supply" parameter
- Electrical isolation from UEL/SEN: DC 75V / AC 60V
- No isolation between ports

**Short Circuit Behavior**
- "Behaviour after SCS" parameter: voltage at ports after short circuit (reactivate default)
- "Behaviour after SCO" parameter: load voltage after short circuit (reactivate default)
- Manual recovery: Deactivate then reactivate "PS supply" parameter

### LED Indicators

**[P] Module Error (red)**
- On: General error, channel error, configuration error
- Off: Normal operation
- Flashes once during initialization

**[X0]-[X3] IO-Link Mode (green)**
- On: IO-Link communication active, no errors
- Flashes: Channel diagnostics (device event or connection interrupted)
- Off: IO-Link not active

**[X0]-[X3] Standard IO Mode (yellow)**
- On: Process signal = 1 (in DI mode)
- Off: Process signal = 0 (in DI mode)

**[PL] Load Voltage Supply (green)**
- On: UOUT present and normal
- Flashes: Undervoltage on at least one device
- Off: UOUT not present or undervoltage

### Diagnostic Error Numbers

| Error No. | Meaning | Remedy |
|-----------|---------|--------|
| 0 | Device OK | — |
| 1 | General error (hardware, software, temperature, earth) | Check device, reset, check installation |
| 2 | Short circuit | Check installation |
| 3 | Wire break | Check installation |
| 5 | Power supply error, undervoltage | Check power supply |
| 9 | Below minimum (temperature, battery) | Check installation, battery |
| 10 | Above maximum (temperature, voltage) | Check installation, power supply |
| 24 | Process variable range underflow | Check process data |
| 25 | Process variable range overflow | Check process data |
| 29 | Parameter error | Check parameterization, datasheet, configuration |
| 39 | Service required | Check process data |
| 57 | Device missing/failed | Check configuration |
| 88 | Short circuit at port (L+, P24) | Check installation |
| 89 | Port configuration error | Check configuration |
| 204 | Invalid DIL switch setting | Check DIL switch |

## Process Data Mapping

### Counter Module (CPX-E-1CI) CODESYS Mapping

**Input Variables** (12 bytes):
```st
VAR
  nCounterValue : DINT;        // Bytes 0-3: Counter value or speed
  nLatchValue   : DINT;        // Bytes 4-7: Last latched value
  bStatusDI0    : BOOL;        // Byte 8, Bit 0: Input I0 status
  bStatusDI1    : BOOL;        // Byte 8, Bit 1: Input I1 status
  bStatusDI2    : BOOL;        // Byte 8, Bit 2: Input I2 status
  bStatusDI3    : BOOL;        // Byte 8, Bit 3: Input I3 status
  bLatchMissed  : BOOL;        // Byte 8, Bit 5: Latch event missed
  bLatchSet     : BOOL;        // Byte 8, Bit 6: Latch event occurred
  bLatchBlocked : BOOL;        // Byte 8, Bit 7: Latch blocked
  bLowerCL      : BOOL;        // Byte 9, Bit 0: Lower limit exceeded
  bUpperCL      : BOOL;        // Byte 9, Bit 1: Upper limit exceeded
  bCountDir     : BOOL;        // Byte 9, Bit 2: Count direction (0=up, 1=down)
  bCountBlocked : BOOL;        // Byte 9, Bit 3: Counter blocked
  bCountSet     : BOOL;        // Byte 9, Bit 4: Counter set
  bEnableDI2    : BOOL;        // Byte 9, Bit 5: DI2 set enabled
  bEnableZero   : BOOL;        // Byte 9, Bit 6: Zero pulse set enabled
  bSpeedMeas    : BOOL;        // Byte 9, Bit 7: Speed measurement active
END_VAR
```

**Output Variables** (2 bytes):
```st
VAR
  bEnableSetDI2  : BOOL;       // Byte 0, Bit 0: Enable set via I2
  bEnableSetZero : BOOL;       // Byte 0, Bit 1: Enable set via zero pulse
  bSetCounter    : BOOL;       // Byte 0, Bit 2: Set counter to load value
  bBlockCounter  : BOOL;       // Byte 0, Bit 3: Block counter
  bOverrunCL     : BOOL;       // Byte 0, Bit 4: Acknowledge limit overflow
  bSpeedMeas     : BOOL;       // Byte 0, Bit 5: Enable speed measurement
  bConfirmLatch  : BOOL;       // Byte 0, Bit 6: Acknowledge latch event
  bBlockLatch    : BOOL;       // Byte 0, Bit 7: Block latch function
END_VAR
```

### IO-Link Module (CPX-E-4IOL) CODESYS Mapping

Process data structure depends on connected IO-Link devices and DIL switch configuration.

**Example for 4-port configuration (2 I/2 O per port, 8 I/8 O total)**:
```st
VAR
  // Port 1 process data
  arrPort1_In  : ARRAY[0..1] OF BYTE;   // 2 bytes input
  arrPort1_Out : ARRAY[0..1] OF BYTE;   // 2 bytes output

  // Port 2 process data
  arrPort2_In  : ARRAY[0..1] OF BYTE;   // 2 bytes input
  arrPort2_Out : ARRAY[0..1] OF BYTE;   // 2 bytes output

  // Port 3 process data
  arrPort3_In  : ARRAY[0..1] OF BYTE;   // 2 bytes input
  arrPort3_Out : ARRAY[0..1] OF BYTE;   // 2 bytes output

  // Port 4 process data
  arrPort4_In  : ARRAY[0..1] OF BYTE;   // 2 bytes input
  arrPort4_Out : ARRAY[0..1] OF BYTE;   // 2 bytes output
END_VAR
```

**DI Mode Mapping** (when port configured as digital input):
```st
VAR
  bPort1_DI : BOOL AT %IX0.0;  // Port 1 digital input (example address)
  bPort2_DI : BOOL AT %IX0.1;  // Port 2 digital input
  bPort3_DI : BOOL AT %IX0.2;  // Port 3 digital input
  bPort4_DI : BOOL AT %IX0.3;  // Port 4 digital input
END_VAR
```

Process data layout for IO-Link mode determined by connected device's IODD (device description).

## Technical Specifications Summary

### CPX-E-1CI Counter Module

| Specification | Value |
|---------------|-------|
| Dimensions (L×W×H) | 124.3 × 18.9 × 76.6 mm |
| Weight | 88 g (with linkage) |
| Operating voltage | 24V DC ±25% |
| Current consumption | 15 mA at 24V |
| Encoder supply | 5V DC ±5% or 24V DC ±25%, 500 mA max |
| Max encoder frequency (differential) | 2 MHz |
| Max encoder frequency (single-ended) | 250 kHz |
| Digital inputs | 4 (Type 1/3 per IEC 61131-2) |
| Counter range | 0 to 4,294,967,295 |
| Ambient temperature | –5 to +60°C (–5 to +50°C horizontal mount) |
| Protection class | IP20 |
| Module code | 174/10 |

### CPX-E-4IOL IO-Link Master

| Specification | Value |
|---------------|-------|
| Dimensions (L×W×H) | 124.3 × 18.9 × 76.6 mm |
| Weight | 96 g (with linkage) |
| Operating voltage | 24V DC ±25% |
| Current consumption | 50 mA (without devices) |
| Max operating current | 1.8 A per module |
| Load voltage | 24V DC ±25% |
| Max load current | 1.6 A per port |
| Number of ports | 4 |
| IO-Link specification | V1.1, Class B (Type B) |
| Transmission rates | COM1 (4.8), COM2 (38.4), COM3 (230.4 kbps) |
| Max cable length | 20 m unshielded per port |
| Max process data | 32 I/32 O per port |
| Ambient temperature | –5 to +60°C (–5 to +50°C horizontal mount) |
| Protection class | IP20 |
| Module code | 174 |

## Troubleshooting / FAQ

### Counter Module (CPX-E-1CI)

**Q: Counter value jumps unexpectedly or counts erratically**
- Check encoder cable shielding and grounding (max 30 m shielded cable)
- Verify correct "Signal type/encoder type" parameter (5V vs 24V, differential vs single-ended)
- Verify correct "Signal evaluation" parameter (single/double/quadruple/pulse+direction)
- Enable "Monitoring tracking error" if frequency too high (reduce speed or change evaluation mode)
- Check for cable break via "Monitoring cable break" parameter (2-track encoders only)

**Q: Zero pulse monitoring reports errors (error 108)**
- Verify "Pulses per zero pulse" parameter matches encoder specification exactly
- Check that encoder has zero track (track 0) connected
- Tolerance is ±3 pulses — verify encoder mechanical alignment
- Disable zero pulse monitoring if zero track not used

**Q: Latch function not capturing values**
- Verify input I1 is LOW (latch not blocked)
- Verify "Block latch" control bit is not set (PDO byte 0, bit 7 = 0)
- Check "Latch signal" parameter matches trigger source (I0 or zero pulse)
- Check "Latch event" parameter matches edge type (rising/falling/both)
- Acknowledge previous latch via "Confirm latch" control bit before new latch

**Q: Speed measurement returns zero or incorrect values**
- Verify "Speed measurement" control bit is set (PDO byte 0, bit 5 = 1)
- Wait for full integration time (1/10/100 ms) before reading first valid value
- Direction changes reset speed to zero — ensure unidirectional motion for stable readings
- Convert raw value: speed = (pulse count / integration time) × (60 / encoder resolution) for RPM

**Q: Counter does not increment despite encoder connected**
- Check encoder supply voltage (5V or 24V) on terminal [X3]
- Verify encoder supply LED [X3] is green (not red)
- Verify "Block counter" not active (input I3 low, control bit 3 = 0)
- Check encoder cable connections (A+, B+, 0+ for differential; do not connect A–, B–, 0– for single-ended)
- Verify debounce time parameter not too long for encoder frequency

### IO-Link Module (CPX-E-4IOL)

**Q: Port shows "DeviceLost" LineState after previously working**
- Check cable connections at port terminals
- Verify load voltage UOUT present (green [PL] LED on or flashing)
- Check device power consumption does not exceed 1.6 A per port
- Read "Device error code" parameter for event code from device
- Verify "PL supply" parameter enabled for port (should be active)

**Q: Port stuck in "Scanning" LineState, device not detected**
- Verify IO-Link device connected (not standard digital I/O device)
- Check device supports COM1/COM2/COM3 baud rate (230.4/38.4/4.8 kbps)
- Verify cable length under 20 m unshielded
- Check "Operating mode" parameter set to "IO-Link" (bits 1:0 = 11)
- Ensure PS supply (L+) and PL supply (P24) both enabled
- Try setting "Cycle time" parameter to 0 (auto-detect minimum device cycle time)

**Q: Error 204 (Invalid DIL switch setting)**
- Verify DIL switch 1-5 matches valid configuration (see DIL switch table)
- Power cycle CPX-E system after changing DIL switches
- Switches 6-8 must be OFF

**Q: Load voltage supply error (error 5 or 88)**
- Check total load current does not exceed 1.6 A per port or 1.8 A per module
- Verify no short circuit between P24 and N24 terminals
- Check "Monitoring Uload" parameter (if active, undervoltage triggers error)
- Verify "Behaviour after SCS/SCO" parameters (if "leave deactivated", manually restore via "PS supply")
- Check external 24V supply voltage within 24V DC ±25% range

**Q: Process data size mismatch with connected device**
- Verify DIL switch setting provides sufficient address space for device
- Example: Device needs 10 bytes I/O, set DIL to 16 I/16 O per port or higher
- Module does NOT support IODD (device description files) — manual configuration required
- Check device datasheet for exact process data length requirements

**Q: Multiple ports share data or interfere with each other**
- Verify no electrical isolation between ports (grounding issue possible)
- Check address space allocation does not overlap in CODESYS configuration
- Ensure each port has independent parameter configuration (cycle time, PL supply, operating mode)
- UEL/SEN and UOUT are electrically isolated (DC 75V / AC 60V) — verify proper grounding
