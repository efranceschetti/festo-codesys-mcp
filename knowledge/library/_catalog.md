---
id: library-catalog
title: PLC Library — 38 Blocks in 7 Categories (Use When + Combine With)
priority: HIGH
use_when:
  - creating new FBs (check if a reusable block exists first)
  - need block composition patterns
  - looking up "Use When" and "Combine With" for a specific block
never_use_when:
  - EtherCAT servo motion (use MC_*_Festo FBs directly)
keywords: [library, catalog, FB, block, motor, sensor, valve, PID, pump, filter, scale, debounce, hysteresis]
---

# PLC Function Block Library — Catalog

> 38 self-contained blocks across 7 categories.
> Platform: CODESYS V3.5 | Standard: IEC 61131-3 | Naming: PascalCase + Hungarian Notation
> All blocks are 100% generic — usable in any CODESYS project, zero vendor dependencies.

## types (8 Data Types)

| Block | Description | Use When |
|-------|-------------|----------|
| `E_AxisState` | Axis State Machine States | Servo/stepper state tracking, motion sequences |
| `E_CylinderType` | Pneumatic Cylinder Classification | Configuring FB_PneumaticCylinder (single/double acting) |
| `E_DriveType` | Motor/Drive Classification | Configuring motor blocks (DOL, VFD, servo) |
| `ST_AlarmEntry` | Alarm/Event Record | Logging alarms with FB_EventLogger |
| `ST_AxisConfig` | Axis Configuration Parameters | Servo/stepper axis setup (units, limits, speeds) |
| `ST_SensorConfig` | Analog Sensor Configuration | Calibrating FB_TemperatureSensor, FB_AnalogInput, FB_LevelSensor |
| `E_CpxModule` | CPX-E Module Type Enumeration | Identifying CPX-E module types in diagnostic/config routines |
| `ST_EtherCatDiag` | EtherCAT Slave Diagnostic Data | Monitoring EtherCAT slave status, WC errors, comm state |

## motion (4 Function Blocks)

For simple motors with digital/analog I/O. For EtherCAT servo, use PLCopen MC_* FBs instead.

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_StandardMotor` | Direct-On-Line Motor with Contactor | Simple on/off motor, conveyor, fan, pump | FB_FaultDetection (overload), FB_Debounce (feedback) |
| `FB_BrakeMotor` | Motor with Electromagnetic Brake | Hoist, lift, vertical axis, brake motor | FB_FaultDetection (thermal), FB_DelayedOutput (brake delay) |
| `FB_VfdDrive` | Variable Frequency Drive Controller (analog I/O) | Speed-controlled motor, VFD with 0-10V/4-20mA | FB_ScaleReal (speed scaling), FB_AnalogInput (feedback) |
| `FB_AxisScaler` | Axis Unit Conversion (mm/pulses, pitch, gear ratio) | Converting encoder pulses to engineering units | ST_AxisConfig (gear ratio, pitch) |

## actuators (5 Function Blocks)

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_PneumaticCylinder` | Pneumatic Cylinder Controller | Extend/retract cylinder, pneumatic actuator | E_CylinderType (config), FB_Debounce (sensors) |
| `FB_SolenoidValve` | Solenoid Valve Controller | On/off valve, proportional valve, pneumatic control | FB_DelayedOutput (post-flow), FB_PidController (proportional) |
| `FB_ButtonLamp` | Illuminated Pushbutton Controller | Operator buttons with LED feedback, blink on fault | FB_Blink (fault indication), FB_Debounce (button input) |
| `FB_PumpManager` | Dual Pump Coordination with Failover | Redundant pumps, lead/lag alternation, failover | FB_LevelSensor (level control), FB_FaultDetection (pump fault) |
| `FB_TankHeater` | Tank Heater with Thermostat and Freeze Protection | Heated tank, freeze protection, thermal control | FB_TemperatureSensor (feedback), FB_PidController (precise control) |

## sensors (4 Function Blocks)

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_TemperatureSensor` | Universal Temperature Sensor Interface | PT100, thermocouple, NTC/PTC, temperature monitoring | ST_SensorConfig (calibration), FB_PidController (control loop) |
| `FB_AnalogInput` | Generic Analog Input with Scaling and Filtering | 4-20mA, 0-10V inputs, pressure, flow, level | ST_SensorConfig (range), FB_AnalogFilter (noise), FB_ScaleReal |
| `FB_LevelSensor` | Tank Level Sensor with Alarms | Tank level monitoring, high/low alarms | FB_PumpManager (fill/drain), FB_Hysteresis (deadband) |
| `FB_FlowSensor` | Flow Rate Sensor with Totalization | Flow measurement, batch totaling, consumption tracking | FB_Totalizer (volume accumulation), FB_AnalogFilter (signal) |

## safety (2 Function Blocks)

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_FaultDetection` | Multi-Input Fault Consolidation | Overload, thermal, pressure fault aggregation | FB_EventLogger (alarm logging), any motor/actuator block |
| `FB_LightCurtain` | Safety Light Curtain Monitor | Machine guarding, operator protection zone | FB_FaultDetection (safety chain), FB_EventLogger (events) |

## system (5 Function Blocks)

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_SystemMonitor` | System Watchdog and Diagnostics | PLC health monitoring, cycle time, memory usage | FB_EventLogger (system events) |
| `FB_EventLogger` | Circular Event Buffer Logger | Alarm history, event recording, diagnostic log | ST_AlarmEntry (event format), FB_FaultDetection (alarm source) |
| `FB_DataLogger` | Cyclic Data Logger to CSV File | Logging process data, trend recording, CSV export | FB_SystemMonitor (system data), FB_FtpUploader (file upload) |
| `FB_FtpUploader` | FTP File Upload via State Machine | Uploading log files, backup transfer, remote data export | FB_DataLogger (data source), FB_EventLogger (upload events) |
| `FB_PasswordHash` | FNV-1a 64-bit Password Hash with Salt (local ACL) | Local operator login / access-control list, non-networked machine (NOT crypto-safe) | FB_EventLogger (login audit) |

## utilities (10 Function Blocks)

| Block | Description | Use When | Combine With |
|-------|-------------|----------|-------------|
| `FB_Debounce` | Digital Input Debounce Filter | Noisy switches, proximity sensors, button inputs | Any block reading digital inputs |
| `FB_AnalogFilter` | First-Order Low-Pass / Moving Average Filter | Noisy analog signals, sensor smoothing | FB_AnalogInput (pre-filter), FB_PidController (smooth feedback) |
| `FB_Hysteresis` | On/Off Control with Deadband | Level control, temperature on/off, prevent chattering | FB_LevelSensor, FB_TemperatureSensor |
| `FB_Blink` | LED/Output Blink Pattern Generator | Fault indication, status LED, warning light | FB_ButtonLamp (blink on fault) |
| `FB_ScaleReal` | Linear REAL Value Scaling | Engineering unit conversion, 4-20mA to 0-100% | FB_AnalogInput (output scaling) |
| `FB_ScaleInt` | Linear INT Value Scaling | Raw ADC to engineering units, INT range mapping | FB_AnalogInput (raw conversion) |
| `FB_Totalizer` | Flow/Energy Integrator with Reset | Batch counting, flow totalization, energy metering | FB_FlowSensor (flow input) |
| `FB_PidController` | Generic PID Controller with Anti-Windup | Temperature, pressure, flow, level control loops | FB_TemperatureSensor, FB_AnalogInput (feedback), FB_SolenoidValve (output) |
| `FB_DelayedOutput` | Output with Post-Run Timer | Cooling fan post-run, lubrication pump delay-off | FB_StandardMotor (post-run), FB_BrakeMotor (brake delay) |
| `FB_MqttPublisher` | Simplified MQTT Publish with Auto-Reconnect | IIoT telemetry, cloud data push, MQTT broker integration | FB_DataLogger (data source), FB_EventLogger (publish events) |

---

## Block Composition Patterns

- **Temperature control**: FB_TemperatureSensor → FB_PidController → FB_TankHeater
- **Pressure/flow**: FB_AnalogInput → FB_PidController → FB_SolenoidValve
- **Pneumatic**: FB_PneumaticCylinder + FB_SolenoidValve
- **Motor + protection**: FB_StandardMotor + FB_FaultDetection + FB_Debounce
- **EtherCAT servo**: Use Festo PtP MC_*_Festo FBs directly (NOT library blocks)

---

## Usage

Each `.st` file is self-contained with:
1. **Header** — metadata, platform, dependencies, usage example
2. **Interface** — complete VAR_INPUT / VAR_OUTPUT / VAR sections
3. **Implementation** — full state machine / logic

### MCP Tools

```
plc_library action:"list"                  — List all blocks (optional category filter)
plc_library action:"get" name:"FB_X"       — Get complete .st source code
plc_library action:"search" query:"keyword" — Search by name/description/category
```

### MCP Resources

```
library://catalog                          — This catalog
library://{category}/{block_name}          — Individual block source
```
