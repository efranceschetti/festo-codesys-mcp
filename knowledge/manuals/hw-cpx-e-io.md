---
id: cpx-e-io
title: CPX-E I/O Modules — DI, DO, AI, AO
priority: MEDIUM
token_estimate: 1800
use_when:
  - user asks about CPX-E analog or digital inputs/outputs
  - user needs I/O addressing, configuration, or signal ranges
  - creating I/O mapping for a CODESYS project
  - user asks about 4-20mA, 0-10V, wire break detection
never_use_when:
  - user asks about motion control or servos
  - user asks about EtherCAT communication
  - user is writing pure ST logic without I/O reference
depends_on: [cpx-e-system]
related: [festo-cpx, naming-conventions]
keywords: [analog input, digital output, 4-20mA, 0-10V, ADC, resolution, CPX-E-4AI, CPX-E-4AO, CPX-E-8DI, CPX-E-8DO, CPX-E-16DI, wire break, process data]
---

# CPX-E I/O Modules Reference

Festo CPX-E I/O modules for digital and analog signal processing in CODESYS V3.5 applications.

## Quick Facts

| Module | Type | Channels | Resolution | Cycle Time | Features |
|--------|------|----------|------------|------------|----------|
| **CPX-E-16DI** | Digital Input | 16 | Type 3 PNP | — | Debounce 0.1-20ms, signal extension 0.5-100ms |
| **CPX-E-8DO** | Digital Output | 8 | Type 2 PNP | — | 0.5A per channel, slow-blow protection |
| **CPX-E-4AI-U-I** | Analog Input | 4 | 16-bit (15+sign) | ≤500µs | Wire break, smoothing 2^1–2^15 values |
| **CPX-E-4AO-U-I** | Analog Output | 4 | 16-bit (15+sign) | ≤2ms | Wire break/idle detection |

All modules: IP20, 24V DC ±25%, -5…+60°C ambient temperature.

---

## Digital Input Modules

### CPX-E-16DI — 16-Channel Digital Input

**General**
- 16 digital inputs, Type 3 PNP (IEC 61131-2)
- 24V DC logic (≤5V = logic 0, ≥11V = logic 1)
- Sensor supply: 24V DC ±25%, electronically protected (>1.8A slow-blow)
- Max cable length: 30m (shielded recommended)

**Input Debouncing**
Suppresses signal bounce during switching operations. Configurable per module:
- **0.1 ms** — Fast switching (proximity sensors)
- **3 ms** (default) — Standard sensors
- **10 ms** — Electromechanical switches
- **20 ms** — Mechanical contacts with heavy bounce

Edge changes are not detected as logical input until after debounce time expires.

**Signal Extension**
Extends short input pulses to ensure detection by slower cycle times. Configurable per module, activated per channel:
- **0.5 ms** — High-speed event capture
- **15 ms** (default) — Standard intermediate position detection
- **50 ms** — Slow PLC cycles
- **100 ms** — Very slow scan rates

Signal is held for minimum duration even if sensor signal changes within extension time.

**Wiring**
Terminal [X0]…[X7] (each terminal = 2 inputs):
- Pin 0: Input 0, 2, 4, …
- Pin 1: Input 1, 3, 5, …
- Pin 2: +24V DC sensor supply (input 0, 2, 4, …)
- Pin 3: +24V DC sensor supply (input 1, 3, 5, …)
- Pin 4: 0V DC sensor supply (input 0, 2, 4, …)
- Pin 5: 0V DC sensor supply (input 1, 3, 5, …)

**LED Indicators**
- Module error [P] (red): Short circuit/overload on sensor supply
- Input status 0…15 (green): Input active (logic 1) when lit

**Technical Data**
- Current consumption: 15mA @ 24V (UEL/SEN)
- Address space: 16 input bits
- Module code: 29

---

## Digital Output Modules

### CPX-E-8DO — 8-Channel Digital Output

**General**
- 8 digital outputs, Type 2 PNP (IEC 61131-2)
- Positive logic (PNP), 24V DC switching
- Max output current: 0.5A per channel
- Max lamp load: 12W per channel
- Parallel connection: Yes, max 4 outputs per group (0-3, 4-7)
- Max cable length: 30m

**Output Protection**
- Electronic slow-blow short-circuit protection (trigger >0.5A)
- Default behavior: power remains switched off after short circuit (requires reset or power cycle)
- Alternative: automatic restore (parameterizable)
- Voltage drop via output: ≤1V DC
- Inductive switch-off voltage limitation: typically -16V

**Wiring**
Terminal [X0]…[X3] (each terminal = 2 outputs):
- Pin 0: +24V DC output 0, 2, 4, …
- Pin 1: +24V DC output 1, 3, 5, …
- Pin 2: 0V DC output 0, 2, 4, …
- Pin 3: 0V DC output 1, 3, 5, …

Terminal [XD] (load voltage supply):
- Pin 0/1: +24V DC UOUT
- Pin 2/3: 0V DC UOUT

**LED Indicators**
- Module error [P] (red): Short circuit/overload or UOUT undervoltage
- Output channel error 0…7 (red): Short circuit/overload at output
- Output status 0…7 (yellow): Output active (logic 1)
- Load voltage supply [PL] (green): UOUT present (≥17V)

**Technical Data**
- Current consumption: 16mA @ 24V (UEL/SEN), 34mA @ 24V (UOUT)
- UOUT undervoltage diagnostic: 14-17V DC
- Output delay (resistive load): ≤200µs (0→1 and 1→0)
- Address space: 8 output bits
- Module code: 31

---

## Analog Input Modules

### CPX-E-4AI-U-I — 4-Channel Analog Input (Voltage/Current)

**General**
- 4 analog inputs, voltage or current per channel
- Internal resolution: 16-bit (15-bit + sign)
- Conversion time: ≤500µs (all 4 channels)
- Conversion principle: Successive approximation
- Sensor supply: 24V DC ±25% (electronically protected, >1.4A slow-blow)
- Max cable length: 30m (shielded)

**Signal Ranges**

| Signal Range | Resolution | Nominal Range | Overload Range | Underflow |
|--------------|------------|---------------|----------------|-----------|
| **Voltage Inputs** | | | | |
| 0…10V | 362µV/LSB (15-bit) | 0…27648 (0…10V) | >27648 (>10V) | <-4864 (<-1.76V) |
| -10…+10V | 362µV/LSB (16-bit) | -27648…+27648 | >27648 (>10V) | <-27648 (<-10V) |
| -5…+5V | 181µV/LSB (16-bit) | -27648…+27648 | >27648 (>5V) | <-27648 (<-5V) |
| 1…5V | 145µV/LSB (15-bit) | 0…27648 (1…5V) | >27648 (>5V) | <-4864 (<0.3V) |
| **Current Inputs** | | | | |
| 0…20mA | 723nA/LSB (15-bit) | 0…27648 (0…20mA) | >27648 (>20mA) | <-4864 (<-3.52mA) |
| 4…20mA | 579nA/LSB (15-bit) | 0…27648 (4…20mA) | >27648 (>20mA) | <-4864 (<1.19mA) |
| -20…+20mA | 723nA/LSB (16-bit) | -27648…+27648 | >27648 (>20mA) | <-27648 (<-20mA) |

**Data Formats**
1. **VZ + 15 bit** (default): Raw ADC value, 15-bit magnitude + sign bit
2. **Linear scaled**: User-defined scaling with lower/upper limits
   - Example: 0…10V → 0…6000 (for 0…6 bar pressure)
   - Minimum range: 100 counts between limits

**Wire Break Detection**
- Available for 4…20mA inputs only
- Detects current <1.2mA
- Output value when wire break detected (diagnostics enabled): 32767 (7FFF hex)
- Output value when wire break detected (diagnostics disabled): -32768 (8000 hex)

**Measured Value Smoothing**
Configurable averaging filter per channel (suppresses signal noise):
- No smoothing (default)
- 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768 values (2^1 to 2^15)

**Wiring**
Terminal [X0]…[X3]:
- Pin 0: Input + (voltage or current)
- Pin 1: +24V DC sensor supply (USEN)
- Pin 2: Input - (reference)
- Pin 3: 0V DC sensor supply (USEN)

Terminal [X4]: Functional earth (FE), pins 0-3 interconnected

**LED Indicators**
- Module error [P] (red): Short circuit/overload on sensor supply, or channel error
- Channel error 0…3 (red): Wire break (4-20mA), value exceeding/falling below limits, parameterization error, overload, overflow/underflow

**Technical Data**
- Current consumption: 70mA @ 24V (UEL/SEN)
- Input impedance: ≥100kΩ (voltage), ≤100Ω (current)
- Approved input voltage: -30…+30V DC
- Approved input current: max 60mA continuous (internally limited)
- Fault limits: ±0.3% usage error (Tmin…Tmax), ±0.2% basic error (25°C)
- Temperature fault: ±0.01%/K
- Linearity error: ±0.025% @ 25°C
- Repetition accuracy: ±0.1% @ 25°C
- Address space: 64 input bits
- Module code/submodule: 142/1

**Conversion Examples**

4-20mA pressure sensor (0-10 bar):
```
Raw value at 4mA  = 0      (0 bar)
Raw value at 12mA = 13824  (5 bar)
Raw value at 20mA = 27648  (10 bar)

1 LSB = 579 nA = (20mA - 4mA) / 27648 = 0.579 µA per count
```

0-10V temperature sensor (-20…+80°C), linear scaled format with limits -200 / +800:
```
0V   → -200 (represents -20.0°C)
5V   → +300 (represents +30.0°C)
10V  → +800 (represents +80.0°C)
```

---

## Analog Output Modules

### CPX-E-4AO-U-I — 4-Channel Analog Output (Voltage/Current)

**General**
- 4 analog outputs, voltage or current per channel
- Internal resolution: 16-bit (15-bit + sign)
- Conversion time: ≤2ms per module
- Conversion principle: Successive approximation
- Actuator supply: 24V DC ±25% (electronically protected, >2.7A slow-blow, max 2A continuous)
- Load voltage supply (UOUT): 24V DC ±25% (external)
- Max cable length: 30m (shielded)

**Signal Ranges**

| Signal Range | Resolution | Nominal Range | Overdrive Range | Output at Overflow |
|--------------|------------|---------------|-----------------|-------------------|
| **Voltage Outputs** | | | | |
| 0…10V | 362µV/LSB (15-bit) | 0…27648 (0…10V) | 27649…32511 (>10V) | 11.76V |
| -10…+10V | 362µV/LSB (16-bit) | -27648…+27648 | ±27649…±32511 | ±11.76V |
| -5…+5V | 181µV/LSB (16-bit) | -27648…+27648 | ±27649…±32511 | ±5.88V |
| 1…5V | 145µV/LSB (15-bit) | 0…27648 (1…5V) | 27649…32511 (>5V) | 5.7V |
| **Current Outputs** | | | | |
| 0…20mA | 723nA/LSB (15-bit) | 0…27648 (0…20mA) | 27649…32511 (>20mA) | 23.52mA |
| 4…20mA | 579nA/LSB (15-bit) | 0…27648 (4…20mA) | 27649…32511 (>20mA) | 22.81mA |
| -20…+20mA | 723nA/LSB (16-bit) | -27648…+27648 | ±27649…±32511 | ±23.52mA |

**Data Formats**
1. **VZ + 15 bit** (default): Raw DAC value, 15-bit magnitude + sign
2. **Linear scaled**: Direct engineering units (e.g., 0…10000 for 0…10V)

Linear scaled value ranges:

| Analog Output | Min Value | Max Value | Resolution |
|---------------|-----------|-----------|------------|
| 0…10V | 0 | 10000 | 1LSB ≈ 1mV |
| -10…+10V | -10000 | 10000 | 1LSB ≈ 1mV |
| -5…+5V | -5000 | 5000 | 1LSB ≈ 1mV |
| 1…5V | 1000 | 5000 | 1LSB ≈ 1mV |
| 0…20mA | 0 | 20000 | 1LSB ≈ 1µA |
| 4…20mA | 4000 | 20000 | 1LSB ≈ 1µA |
| -20…+20mA | -20000 | 20000 | 1LSB ≈ 1µA |

**Settling Time** (to 1% of full scale)
- Resistive load (voltage output): ≤0.9ms (min 1kΩ)
- Resistive load (current output): ≤0.1ms (max 500Ω)
- Capacitive load (voltage output): ≤1.8ms (max 1µF)
- Inductive load (current output): ≤0.07ms (max 1mH)

**Wire Break / Idle Detection**
- Detects open circuit or idle output condition
- Error safe incoming: load resistance ≤5Ω (output >2mA)
- Error safe outgoing: load resistance ≥10Ω (output >2mA)

**Wiring**
Terminal [X0]…[X3]:
- Pin 0: Output + (voltage or current)
- Pin 1: +24V DC output (from actuator supply)
- Pin 2: Output - (reference)
- Pin 3: 0V DC output (from actuator supply)

Terminal [X4]: Functional earth (FE), pins 0-3 interconnected

Terminal [XD] (load voltage supply):
- Pin 0/1: +24V DC UOUT (external supply)
- Pin 2/3: 0V DC UOUT

**LED Indicators**
- Module error [P] (red): Short circuit/overload on actuator supply, UOUT undervoltage, or channel error
- Channel error 0…3 (red): Wire break/idle, short circuit/overload, parameterization error
- Load voltage supply [PL] (green): UOUT present

**Technical Data**
- Current consumption: 65mA @ 24V (UEL/SEN), 15mA @ 24V (UOUT)
- Output impedance: ≥1kΩ (voltage), ≤500Ω (current)
- Approved output voltage: -30…+30V DC
- Short-circuit current (voltage output): 15mA
- Open circuit voltage (current output): ≤19V
- Fault limits: ±0.3% usage error (Tmin…Tmax), ±0.1% basic error (25°C)
- Temperature fault: ±0.01%/K
- Linearity error: ±0.025% @ 25°C
- Repetition accuracy: ±0.05% @ 25°C
- Address space: 64 output bits
- Module code/submodule: 142/2

---

## Process Data Mapping

CPX-E I/O modules map to CODESYS variables via the CPX-E bus controller. Addressing is automatic when modules are added in the CODESYS device tree.

**General Pattern**
```iecst
// Digital inputs (CPX-E-16DI)
GVL_IO.bDI_Ch0  AT %IX0.0 : BOOL;  // Input channel 0
GVL_IO.bDI_Ch1  AT %IX0.1 : BOOL;  // Input channel 1
...
GVL_IO.bDI_Ch15 AT %IX1.7 : BOOL;  // Input channel 15

// Digital outputs (CPX-E-8DO)
GVL_IO.bDO_Ch0  AT %QX0.0 : BOOL;  // Output channel 0
...
GVL_IO.bDO_Ch7  AT %QX0.7 : BOOL;  // Output channel 7

// Analog inputs (CPX-E-4AI-U-I)
GVL_IO.nAI_Ch0  AT %IW0 : INT;     // Channel 0 raw value (-32768...+32767)
GVL_IO.nAI_Ch1  AT %IW2 : INT;     // Channel 1 raw value
GVL_IO.nAI_Ch2  AT %IW4 : INT;     // Channel 2 raw value
GVL_IO.nAI_Ch3  AT %IW6 : INT;     // Channel 3 raw value

// Analog outputs (CPX-E-4AO-U-I)
GVL_IO.nAO_Ch0  AT %QW0 : INT;     // Channel 0 output value
GVL_IO.nAO_Ch1  AT %QW2 : INT;     // Channel 1 output value
GVL_IO.nAO_Ch2  AT %QW4 : INT;     // Channel 2 output value
GVL_IO.nAO_Ch3  AT %QW6 : INT;     // Channel 3 output value
```

**Diagnostic Data**
Each module provides diagnostic status via CPX-E system variables (mapped automatically by controller):
- Short circuit/overload flags
- Wire break detection flags (AI/AO modules)
- Limit violation flags (AI modules)
- Parameterization error flags

---

## CODESYS Integration Examples

### Example 1: Analog Input Scaling (4-20mA Pressure Sensor, 0-10 bar)

Using library block FB_AnalogInput for automatic scaling:

```iecst
PROGRAM PRG_Main
VAR
    fbPressure : FB_AnalogInput;
    rPressure  : REAL;  // Scaled pressure in bar
END_VAR

// 4-20mA sensor connected to CPX-E-4AI channel 0
fbPressure(
    nRawValue := GVL_IO.nAI_Ch0,
    nRawMin   := 0,        // 4mA = 0 counts (start of nominal range)
    nRawMax   := 27648,    // 20mA = 27648 counts (end of nominal range)
    rScaleMin := 0.0,      // 4mA represents 0 bar
    rScaleMax := 10.0      // 20mA represents 10 bar
);
rPressure := fbPressure.rScaledValue;

// Wire break detection
IF GVL_IO.nAI_Ch0 = 32767 THEN
    // Wire break detected (if diagnostics enabled in module parameters)
    rPressure := 0.0;  // Safe fallback value
END_IF
```

### Example 2: Analog Input with Filtering

```iecst
PROGRAM PRG_TempControl
VAR
    fbTempSensor : FB_AnalogInput;
    fbTempFilter : FB_AnalogFilter;
    rTemperature : REAL;  // Filtered temperature in °C
END_VAR

// 0-10V temperature sensor (-20...+80°C) on channel 1
fbTempSensor(
    nRawValue := GVL_IO.nAI_Ch1,
    nRawMin   := 0,
    nRawMax   := 27648,
    rScaleMin := -20.0,
    rScaleMax := 80.0
);

// Apply moving average filter (smoothing factor = 16 in module parameters)
fbTempFilter(
    rInput     := fbTempSensor.rScaledValue,
    nFilterLen := 16  // Matches hardware smoothing
);
rTemperature := fbTempFilter.rOutput;
```

### Example 3: Analog Output (0-10V Control Valve)

```iecst
PROGRAM PRG_FlowControl
VAR
    rValveCmd    : REAL;  // Valve command 0-100%
    nAO_RawValue : INT;
END_VAR

// Convert 0-100% to 0-10V output (linear scaled format)
// Module configured for linear scaled, 0…10V → 0…10000
nAO_RawValue := REAL_TO_INT(rValveCmd * 100.0);

// Clamp to valid range
IF nAO_RawValue > 10000 THEN
    nAO_RawValue := 10000;
ELSIF nAO_RawValue < 0 THEN
    nAO_RawValue := 0;
END_IF

GVL_IO.nAO_Ch0 := nAO_RawValue;
```

### Example 4: Digital Input with Debouncing

```iecst
PROGRAM PRG_PushButton
VAR
    fbDebounce : FB_Debounce;
    bButtonRaw : BOOL;
    bButton    : BOOL;  // Debounced button state
END_VAR

// CPX-E-16DI configured with 3ms hardware debounce
// Additional software debouncing for critical applications
bButtonRaw := GVL_IO.bDI_Ch0;

fbDebounce(
    bInput       := bButtonRaw,
    tDebounceOn  := T#50MS,   // 50ms on-delay
    tDebounceOff := T#50MS    // 50ms off-delay
);
bButton := fbDebounce.bOutput;
```

### Example 5: Digital Output with Fault Detection

```iecst
PROGRAM PRG_ValveControl
VAR
    fbFaultDetection : FB_FaultDetection;
    bValveCmd        : BOOL;
    bValveFault      : BOOL;
END_VAR

// Solenoid valve on CPX-E-8DO channel 0
GVL_IO.bDO_Ch0 := bValveCmd;

// Monitor for short circuit (requires diagnostic module variable)
// Assuming GVL_Diag.bDO_Ch0_ShortCircuit is mapped from CPX-E diagnostics
fbFaultDetection(
    bInput      := GVL_Diag.bDO_Ch0_ShortCircuit,
    tFaultDelay := T#100MS
);
bValveFault := fbFaultDetection.bFault;

IF bValveFault THEN
    bValveCmd := FALSE;  // Disable output on fault
    // Log error, trigger alarm, etc.
END_IF
```

---

## Parameterization Guide

### Analog Input Module (CPX-E-4AI-U-I)

**Critical Parameters**
1. **Analogue Input** (per channel): Select signal range (0-10V, 4-20mA, etc.)
   - Must match connected sensor type
2. **Data Format** (module): VZ+15bit (raw) or linear scaled (engineering units)
3. **Smoothing Factor** (per channel): 0 (none) to 2^15 values
   - Higher values = more filtering, slower response
4. **Wire Break Diagnostics** (per channel): Enable for 4-20mA inputs only
5. **Lower/Upper Limit** (per channel): Define alarm thresholds (optional)

**Recommended Settings**
- 4-20mA sensors: Enable wire break diagnostics, smoothing = 2^4 (16 values)
- 0-10V sensors: Disable wire break, smoothing = 2^3 (8 values) or 0 (fast signals)
- Thermocouples/RTDs: Higher smoothing (2^8 to 2^12) for stable readings

### Analog Output Module (CPX-E-4AO-U-I)

**Critical Parameters**
1. **Analogue Input** (per channel): Select output signal range
2. **Data Format** (module): VZ+15bit (raw) or linear scaled
3. **Wire Break/Idle Diagnostics** (per channel): Enable to detect open circuit
4. **Actuator Power Supply** (module): Enable (default)

### Digital Input Module (CPX-E-16DI)

**Critical Parameters**
1. **Input Debounce Time** (module): 0.1ms (fast) to 20ms (mechanical contacts)
2. **Signal Extension Time** (module): 0.5ms to 100ms
3. **Selection of Signal Extension** (per channel): Activate/deactivate

**Typical Configurations**
- Inductive sensors: Debounce 3ms, no signal extension
- Reed switches: Debounce 10ms, signal extension 15ms
- Mechanical limit switches: Debounce 20ms, signal extension 50ms
- High-speed counters: Debounce 0.1ms, no signal extension

### Digital Output Module (CPX-E-8DO)

**Critical Parameters**
1. **Behaviour after SCO** (module): Leave power switched off (safe) vs automatic restore
2. **Diagnostics of Short Circuit**: Enable (recommended)

**Recommended Settings**
- Safety-critical outputs: Leave power switched off
- Non-critical outputs (indicators, pilot lights): Automatic restore

---

## Troubleshooting / FAQ

### Q1: Analog input shows 32767 (7FFF hex) or -32768 (8000 hex) constantly

**Cause**: Wire break detected (4-20mA input), or sensor disconnected/powered off.

**Solution**:
1. Check sensor wiring and power supply (pins 1 and 3 on terminal [X0]-[X3])
2. Verify sensor is configured for current output (4-20mA)
3. If intentional (sensor not connected), disable wire break diagnostics in channel parameters
4. For voltage inputs showing extreme values, check sensor power and signal ground

### Q2: Analog input value fluctuates excessively / noisy signal

**Cause**: Electrical noise, improper grounding, or insufficient filtering.

**Solution**:
1. Use shielded cable (max 30m), connect shield to functional earth terminal [X4]
2. Increase smoothing factor (start with 2^4 = 16 values, increase if needed)
3. Check for nearby interference sources (motors, VFDs, welders)
4. Verify sensor power supply is stable and clean
5. In CODESYS, add software filtering using FB_AnalogFilter

### Q3: Digital output LED shows error (red), module error LED on

**Cause**: Short circuit or overload at output (>0.5A).

**Solution**:
1. Check connected load (solenoid, contactor, lamp) for short circuit
2. Verify load current does not exceed 0.5A per channel
3. For parallel outputs, max 4 outputs per group (channels 0-3 or 4-7)
4. After fault cleared:
   - If "Behaviour after SCO" = power remains off: Reset output or cycle power
   - If "Behaviour after SCO" = automatic restore: Power resumes automatically
5. For inductive loads (solenoids), verify load voltage does not exceed 24V DC

### Q4: Analog input reading is offset or scaled incorrectly

**Cause**: Incorrect signal range selection, wrong data format, or module not calibrated.

**Solution**:
1. Verify "Analogue Input" parameter matches sensor type (e.g., 4-20mA for current sensor, 0-10V for voltage sensor)
2. Check "Data Format":
   - **VZ + 15 bit**: Raw ADC counts, requires manual scaling in CODESYS
   - **Linear scaled**: Use lower/upper limit parameters to define engineering units
3. For 4-20mA sensors:
   - 4mA should read 0 (start of nominal range)
   - 20mA should read 27648 (end of nominal range)
4. Check sensor calibration and output signal with multimeter
5. Review FB_AnalogInput scaling parameters (nRawMin, nRawMax, rScaleMin, rScaleMax)

### Q5: Digital input does not respond to fast signals / misses pulses

**Cause**: Input debounce time too long, or signal shorter than cycle time.

**Solution**:
1. Reduce input debounce time (try 0.1ms for fast sensors)
2. Enable signal extension to hold short pulses (15-50ms typical)
3. Verify sensor output pulse width is longer than debounce + signal extension time
4. For high-speed counting, consider using CPX-E counter module instead of standard DI
5. Check PLC cycle time — if cycle is slower than pulse width, signal may be missed

---

## Related Documentation

- **CPX-E System Manual**: System architecture, wiring, power supply
- **CODESYS V3.5 Manual**: I/O mapping, variable addressing, diagnostics
- **Festo CPX-E Online Configurator**: Automatic GSD/ESI file generation for device tree
- **Library Blocks**: FB_AnalogInput, FB_AnalogFilter, FB_Debounce, FB_ScaleReal

For detailed module parameterization via CODESYS, refer to function numbers (F no.) in parameter tables. Parameter access uses formula: `4828 + 64 × m + offset` where m = module number (0-indexed from left).
