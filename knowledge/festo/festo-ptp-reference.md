---
id: festo-ptp
title: Festo PtP Package — 24 MC_*_Festo FB Signatures
priority: HIGH
use_when:
  - writing motion control code for Festo servos
  - need MC_*_Festo FB signatures, parameters, or error codes
  - configuring EtherCAT servo on CPX-E
never_use_when:
  - simple motors without EtherCAT (use library motor blocks)
  - non-Festo servo drives
keywords: [PtP, MC_Power_Festo, MC_Home_Festo, MC_MoveAbsolute_Festo, CMMT, servo, AXIS_REF, PLCopen, servo motion, MC_Power, MC_MoveAbsolute, axis move, positioning, move axis to position, move a servo axis, Festo motion library, PtP package, PLCopen motion, CMMT-AS, enable axis, home the axis]
see_also: [ethercat-cia402, festo-cmmt-st, motion-patterns]
---

# Festo PtP Package Reference — CMMT-AS / CMMT-ST

> **MANUFACTURER REFERENCE** — These are official Festo function blocks.
> They take precedence over any custom implementation.
> Library: PtP_Package_Festo | PLCopen 2.0 compliant | Date: 2024-01-22
> Supported drives: CMMT-AS, CMMT-ST (EtherCAT CiA 402)

## Axis Reference

All FBs use `AXIS_REF_FESTO` as `VAR_IN_OUT`. In CODESYS, the device name acts as the axis reference — no manual PDO linking needed. In TwinCAT/Omron, manual PDO mapping is required.

```
VAR_IN_OUT
    Axis : AXIS_REF_FESTO;  (* Axis reference — one instance per drive *)
END_VAR
```

## Key Rules

1. **User units**: All position/velocity/acceleration/jerk values use the unit configured in the drive ("Fieldbus" tab). If "Metric" is set, units are mm, mm/s, mm/s², mm/s³.
2. **Zero = device default**: If Acceleration, Deceleration, Jerk, Direction, or BufferMode = 0 at motion start, the drive's parameterized value is used (no SDO write generated).
3. **ErrorID is WORD**: All FBs output `ErrorID : WORD` and `ErrorString : STRING`.
4. **One instance per axis**: Each drive requires its own FB instance. Simultaneous use of multiple FBs on the same axis is not permitted.

---

## PLCopen Function Blocks (24 total)

### MC_Power_Festo — Enable/Disable Output Stage

```
VAR_INPUT
    Enable          : BOOL;     (* TRUE=enable, FALSE=disable output stage *)
VAR_OUTPUT
    Status          : BOOL;     (* TRUE=enabled *)
    Valid           : BOOL;     (* Output status valid *)
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_Home_Festo — Homing

```
VAR_INPUT
    Execute         : BOOL;     (* Rising edge starts homing *)
    Position        : REAL;     (* Axis zero point [user unit] *)
    HomingMethod    : DINT;     (* CiA 402 method, 0=device default *)
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Active          : BOOL;     (* FB has axis control *)
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```
> If HomingMethod=0, device-parameterized method and zero point are used (Position input ignored).

### MC_Stop_Festo — Emergency Stop

```
VAR_INPUT
    Execute         : BOOL;     (* Rising edge stops axis *)
VAR_OUTPUT
    Done            : BOOL;     (* Velocity = 0 *)
    Busy            : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```
> Axis stays in "Stopping" state while Execute=TRUE. Transitions to "Standstill" when Done=TRUE AND Execute=FALSE.

### MC_Halt_Festo — Pause Motion

```
VAR_INPUT
    Execute         : BOOL;     (* Rising edge pauses motion *)
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_MoveAbsolute_Festo — Absolute Positioning

```
VAR_INPUT
    Execute         : BOOL;     (* Rising edge starts motion *)
    ContinuousUpdate : BOOL;   (* Live update of inputs during motion *)
    Position        : REAL;     (* Target position [user unit] *)
    Velocity        : REAL;     (* Max velocity [user unit/s] *)
    Acceleration    : REAL;     (* [user unit/s²], 0=device default *)
    Deceleration    : REAL;     (* [user unit/s²], 0=device default *)
    Jerk            : REAL;     (* [user unit/s³], 0=device default *)
    Direction       : MC_DIRECTION;   (* Modulo direction *)
    BufferMode      : MC_BUFFER_MODE; (* Aborting or Buffered *)
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_MoveRelative_Festo — Relative Positioning

```
VAR_INPUT
    Execute         : BOOL;
    ContinuousUpdate : BOOL;
    Distance        : REAL;     (* Relative distance [user unit] *)
    Velocity        : REAL;
    Acceleration    : REAL;
    Deceleration    : REAL;
    Jerk            : REAL;
    Direction       : MC_DIRECTION;
    BufferMode      : MC_BUFFER_MODE;
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_MoveAdditive_Festo — Additive Positioning

Same interface as MC_MoveRelative_Festo. Distance is relative to the **currently planned target position** (not actual position) in DiscreteMotion state.

### MC_MoveVelocity_Festo — Velocity Mode

```
VAR_INPUT
    Execute         : BOOL;
    ContinuousUpdate : BOOL;
    Velocity        : REAL;     (* Target velocity [user unit/s] *)
    Acceleration    : REAL;
    Deceleration    : REAL;
    Jerk            : REAL;
    BufferMode      : MC_BUFFER_MODE;
    StrokeLimitation : BOOL;   (* Enable stroke limits for this motion *)
    NegativeStrokeLimit : REAL; (* [user unit], 0=device default *)
    PositiveStrokeLimit : REAL; (* [user unit], 0=device default *)
VAR_OUTPUT
    InVelocity      : BOOL;    (* Target velocity reached *)
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_TorqueControl_Festo — Torque/Force Mode

```
VAR_INPUT
    Execute         : BOOL;
    Torque          : REAL;     (* Setpoint torque at gear shaft [Nm] *)
    ContinuousUpdate : BOOL;
    TorqueRamp      : REAL;     (* [Nm/s] *)
    Velocity        : REAL;     (* Max velocity limit [user unit/s] *)
    BufferMode      : MC_BUFFER_MODE;
    StrokeLimitation : BOOL;
    NegativeStrokeLimit : REAL;
    PositiveStrokeLimit : REAL;
VAR_OUTPUT
    InTorque        : BOOL;    (* Target torque reached *)
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ForceControl_Festo — Force Mode (% of Nominal)

```
VAR_INPUT
    Execute         : BOOL;
    Force           : REAL;     (* % of nominal force, 100=100% *)
    ContinuousUpdate : BOOL;
    ForceRamp       : REAL;     (* [%/s] *)
    Velocity        : REAL;     (* Max velocity [user unit/s] *)
    BufferMode      : MC_BUFFER_MODE;
    StrokeLimitation : BOOL;
    NegativeStrokeLimit : REAL;
    PositiveStrokeLimit : REAL;
VAR_OUTPUT
    InForce         : BOOL;    (* Target force reached *)
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_Jog_Festo — Jog Mode

```
VAR_INPUT
    JogPositive     : BOOL;     (* Jog positive direction *)
    JogNegative     : BOOL;     (* Jog negative direction *)
    JogMode         : MC_JOG_MODE; (* 0=default, 1=vel1 only, 2=vel2 only *)
VAR_OUTPUT
    Velocity1       : BOOL;    (* Jogging at velocity 1 *)
    Velocity2       : BOOL;    (* Jogging at velocity 2 *)
    Busy            : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```
> Axis is stationary if JogPositive = JogNegative.

### MC_RecordTable_Festo — Position Record Execution

```
VAR_INPUT
    Execute         : BOOL;
    ContinuousUpdate : BOOL;
    RecordNumber    : DINT;     (* Position record number in drive *)
    BufferMode      : MC_BUFFER_MODE;
VAR_OUTPUT
    Done            : BOOL;
    ActualRecordNumber : DINT;  (* Currently active record *)
    Busy            : BOOL;
    Active          : BOOL;
    CommandAborted  : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_Reset_Festo — Error Reset

```
VAR_INPUT
    Execute         : BOOL;     (* Rising edge resets errors *)
VAR_OUTPUT
    Done            : BOOL;     (* Errors cleared *)
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadParameter_Festo — Read SDO Value

```
VAR_INPUT
    Enable          : BOOL;     (* TRUE=read continuously *)
    ParameterNumber : UINT;     (* Object index *)
    SubindexNumber  : USINT;    (* Object subindex *)
VAR_OUTPUT
    Valid           : BOOL;
    Busy            : BOOL;
    Value           : LREAL;    (* Read value *)
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```
> **Warning**: Continuous reading generates bus load. Use situationally.

### MC_WriteParameter_Festo — Write SDO Value

```
VAR_INPUT
    Execute         : BOOL;
    ParameterNumber : UINT;
    SubindexNumber  : USINT;
    Value           : LREAL;    (* Value to write *)
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadStringParameter_Festo — Read String SDO

```
VAR_INPUT
    Enable          : BOOL;
    ParameterNumber : UINT;
    SubindexNumber  : USINT;
VAR_OUTPUT
    Valid           : BOOL;
    Busy            : BOOL;
    Value           : STRING(35);
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_WriteStringParameter_Festo — Write String SDO

```
VAR_INPUT
    Execute         : BOOL;
    ParameterNumber : UINT;
    SubindexNumber  : USINT;
    Value           : STRING(35);
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadActualPosition_Festo

```
VAR_INPUT
    Enable          : BOOL;
VAR_OUTPUT
    Valid           : BOOL;
    Position        : REAL;     (* [user unit] *)
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadActualVelocity_Festo

```
VAR_INPUT
    Enable          : BOOL;
VAR_OUTPUT
    Valid           : BOOL;
    Velocity        : REAL;     (* [user unit/s] *)
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadActualTorque_Festo

```
VAR_INPUT
    Enable          : BOOL;
VAR_OUTPUT
    Valid           : BOOL;
    Torque          : REAL;     (* [Nm] *)
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadStatus_Festo — Axis State Query

```
VAR_INPUT
    Enable          : BOOL;
VAR_OUTPUT
    Valid           : BOOL;
    ErrorStop       : BOOL;
    Disabled        : BOOL;
    Stopping        : BOOL;
    Homing          : BOOL;
    Standstill      : BOOL;
    DiscreteMotion  : BOOL;
    ContinuousMotion : BOOL;
    SynchronizedMotion : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadAxisError_Festo — Axis Error Query

```
VAR_INPUT
    Enable          : BOOL;
VAR_OUTPUT
    Valid           : BOOL;
    AxisErrorID     : WORD;     (* Drive error code *)
    AxisErrorString : STRING;   (* Drive error description *)
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_ReadAxisInfo_Festo — Axis Information

```
VAR_INPUT
    Enable          : BOOL;
    UpdateTime      : TIME;     (* Delay between SDO reads, default T#1S *)
VAR_OUTPUT
    Valid           : BOOL;
    Busy            : BOOL;
    HomeAbsSwitch   : BOOL;     (* Home switch active *)
    IsHomed         : BOOL;     (* Axis is homed *)
    IsMoving        : BOOL;     (* Axis is moving *)
    HwLimitSwitchPos : BOOL;   (* Positive HW limit *)
    HwLimitSwitchNeg : BOOL;   (* Negative HW limit *)
    SwLimitSwitchPos : BOOL;   (* Positive SW limit *)
    SwLimitSwitchNeg : BOOL;   (* Negative SW limit *)
    StrokeLimitPos  : BOOL;    (* Positive stroke limit *)
    StrokeLimitNeg  : BOOL;    (* Negative stroke limit *)
    CommunicationReady : BOOL; (* Network ready *)
    PowerOn         : BOOL;    (* Output stage ON *)
    AxisWarning     : BOOL;    (* Warning active *)
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

### MC_DeviceService_Festo — Device Services

```
VAR_INPUT
    Execute         : BOOL;
    DeviceService   : DEVICE_SERVICE;
        (* 0=none, 1=SaveZeroPointOffset, 2=SaveParameterset,
           3=ReinitDrive, 4=ResetDrive, 5=OpenHoldingBrake,
           6=CloseHoldingBrake, 7=StartEventTable, 8=StopEventTable,
           9=SetLedDeviceIdentification, 10=ResetLedDeviceIdentification,
           11=ActivateFirmwareUpdate, 12=ResetReferencingStatus,
           13=ActivateFactoryParameter *)
VAR_OUTPUT
    Done            : BOOL;
    Busy            : BOOL;
    Error           : BOOL;
    ErrorID         : WORD;
    ErrorString     : STRING;
```

---

## Enumerations

### MC_DIRECTION

| Value | Name | Description |
|-------|------|-------------|
| 0 | `mcNormal` | Linear positioning (default) |
| 64 | `mcNegativeDirection` | Force negative direction (modulo) |
| 128 | `mcPositiveDirection` | Force positive direction (modulo) |
| 192 | `mcShortestWay` | Shortest path (modulo, ignores limits) |

### MC_BUFFER_MODE

| Value | Name | Description |
|-------|------|-------------|
| 0 | `mcAborting` | Start immediately, abort current (default) |
| 1 | `mcBuffered` | Queue after current motion completes |

### MC_JOG_MODE

| Value | Name | Description |
|-------|------|-------------|
| 0 | `mcDefault` | Velocity 1, then accelerate to velocity 2 after time |
| 1 | `mcOnlyVelocity1` | Only velocity 1 |
| 2 | `mcOnlyVelocity2` | Only velocity 2 |

---

## Axis Properties (No Bus Load)

Available via `DeviceName.PropertyName` — updated every cycle without SDO communication:

| Property | Type | Description |
|----------|------|-------------|
| `ActualPosition` | REAL | Current position [user unit] |
| `ActualVelocity` | REAL | Current velocity [user unit/s] |
| `ActualTorque` | REAL | Current torque [Nm] |
| `HomingValid` | BOOL | Axis has been homed |
| `TargetReached` | BOOL | Position target reached or no job |
| `AxisError` | BOOL | Drive error active |
| `AxisErrorID` | WORD | Drive error number |
| `AxisErrorString` | STRING | Drive error description |
| `Enabled` | BOOL | Output stage ON |
| `SDOsInitialized` | BOOL | Drive initialized |
| `AxisWarning` | BOOL | Warning active |
| `AxisIsMoving` | BOOL | Axis in motion |
| `SetpointAcknowledge` | BOOL | Motion acknowledged by drive |
| `DeviceControl` | DEVICE_CONTROL | Master control instance |

---

## Method Calls (Alternative to FBs)

Methods are called once (not cyclically). Return BOOL = started successfully. Motion monitoring via Properties.

| Method | Parameters |
|--------|------------|
| `EnableDrive()` | — |
| `DisableDrive()` | — |
| `Home(Position, HomingMethod)` | REAL, DINT |
| `MoveAbsolute(Position, Velocity, Acceleration, Deceleration, Jerk, BufferMode)` | all REAL + enum |
| `MoveRelative(Distance, Velocity, Acceleration, Deceleration, Jerk, BufferMode)` | all REAL + enum |
| `MoveAdditive(Distance, Velocity, Acceleration, Deceleration, Jerk, BufferMode)` | all REAL + enum |
| `MoveVelocity(Velocity, Acceleration, Deceleration, Jerk, BufferMode)` | all REAL + enum |
| `TorqueControl(Torque, TorqueRamp, Velocity, BufferMode)` | all REAL + enum |
| `RecordTable(RecordNumber, BufferMode)` | DINT + enum |
| `Jog(JogPositive, JogNegative, JogMode)` | BOOL, BOOL, enum |
| `Stop()` | — |
| `ResetStop()` | — |
| `Halt()` | — |
| `ResetHalt()` | — |
| `Reset()` | — |
| `SaveZeroPointOffset()` | — |
| `SaveParameterset()` | — |
| `ReinitDrive()` | — |
| `ResetDrive()` | — |
| `OpenHoldingBrake()` | — |
| `CloseHoldingBrake()` | — |

---

## Error Codes — Complete Table

### Error Categories

| Prefix | ErrorID Range | Category |
|--------|--------------|----------|
| `Init:` | < 10 | EtherCAT slave/library initialization |
| `Axis:` | 10–999 | Drive error (see drive manual) |
| `FB:` | > 1000 | PtP library function block error |

### Initialization Errors (0x00–0x08)

| Dec | Hex | Description |
|-----|-----|-------------|
| 0 | 0x00 | No error |
| 1 | 0x01 | Profile library error — PDO pointer NULL |
| 2 | 0x02 | Device library error — EtherCAT master not found |
| 3 | 0x03 | Device library error — EtherCAT slave not found |
| 4 | 0x04 | Fieldbus library — SDO list read error |
| 5 | 0x05 | Fieldbus library — SDO list length read error (Beckhoff only) |
| 6 | 0x06 | EtherCAT slave not in Operational state |
| 7 | 0x07 | EtherCAT slave communication data not valid |
| 8 | 0x08 | EC_PDActive input not active (Omron: system variable _EC_PDActive) |

### EtherCAT Library Errors (0x03E9–0x03EC)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1001 | 0x03E9 | SDO command failed — check write access |
| 1002 | 0x03EA | Other EtherCAT library error |
| 1003 | 0x03EB | Data overflow in EtherCAT library |
| 1004 | 0x03EC | Timeout — check device state and communication |

### Communication Errors (0x041A–0x041E)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1050 | 0x041A | Communication not active — check master/slave state |
| 1051 | 0x041B | Bus error — check cable |
| 1052 | 0x041C | General communication error |
| 1053 | 0x041D | Extended communication error |
| 1054 | 0x041E | Drive not in Operational communication state |

### PtP Library Errors (0x044C–0x045D)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1100 | 0x044C | Axis in wrong state — check AxisState (1=Disabled for enable, 2=Standstill for motion) |
| 1101 | 0x044D | Axis has error — reset with MC_Reset_Festo |
| 1102 | 0x044E | Timeout — MC_Power: check reinit; MC_Reset: error not clearable |
| 1103 | 0x044F | EtherCAT slave not connected to master |
| 1104 | 0x0450 | PLC has no master control — check config tool |
| 1105 | 0x0451 | Library initialization error |
| 1106 | 0x0452 | Requested action not supported by device |
| 1107 | 0x0453 | Incorrect start conditions for action |
| 1108 | 0x0454 | Homing method not supported by drive |
| 1109 | 0x0455 | Output stage no longer energized |
| 1110 | 0x0456 | Homing error/terminated |
| 1111 | 0x0457 | Motion command deletion error |
| 1112 | 0x0458 | Multiple MC_Halt_Festo instances accessing same drive |
| 1113 | 0x0459 | Too many buffered motion commands |
| 1114 | 0x045A | No device service selected |
| 1115 | 0x045B | Unknown device service selected |
| 1116 | 0x045C | Brake control not possible — axis enabled |
| 1117 | 0x045D | Error not acknowledgeable — eliminate cause first |

### Parameter Access Errors (0x0460–0x046E)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1120 | 0x0460 | Dynamic values write failed (accel/decel/jerk) |
| 1121 | 0x0461 | Acceleration write failed (obj 0x6083) |
| 1122 | 0x0462 | Deceleration write failed (obj 0x6084) |
| 1123 | 0x0463 | Jerk write failed (obj 0x60A4) |
| 1124 | 0x0464 | Position option code write failed (obj 0x60F2) |
| 1125 | 0x0465 | Force ramp write failed (obj 0x6087) |
| 1126 | 0x0466 | Velocity limit in force mode write failed (obj 0x2060) |
| 1127 | 0x0467 | Invalid parameter number (0 cannot be read/written) |
| 1128 | 0x0468 | Homing Method read error (obj 0x6098) |
| 1129 | 0x0469 | Homing Method write error (obj 0x6098) |
| 1130 | 0x046A | Home Offset read error (obj 0x607C) |
| 1131 | 0x046B | Home Offset write error (obj 0x607C) |
| 1132 | 0x046C | Stroke limitation activation write error (obj 0x216F.15) |
| 1133 | 0x046D | Negative stroke limit write error (obj 0x216F.11) |
| 1134 | 0x046E | Positive stroke limit write error (obj 0x216F.10) |

### Internal Parameter Handler Errors (0x04B0–0x04B8)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1200 | 0x04B0 | Internal SDO queue full |
| 1201 | 0x04B1 | SDO data type not identifiable |
| 1202 | 0x04B2 | Parameter number not in object directory |
| 1203 | 0x04B3 | Subindex too high |
| 1204 | 0x04B4 | SDO identification error (simple) |
| 1205 | 0x04B5 | Subindex does not exist |
| 1206 | 0x04B6 | SDO identification error (extended) |
| 1207 | 0x04B7 | Unknown data type from drive |
| 1208 | 0x04B8 | Data type is not STRING |

### Record Mode Errors

| Dec | Hex | Description |
|-----|-----|-------------|
| 1300 | 0x0514 | Next position set number write failed (obj 0x216F.20) |

### Parameter File Errors (0x0578–0x057C)

| Dec | Hex | Description |
|-----|-----|-------------|
| 1400 | 0x0578 | Error opening parameter file |
| 1401 | 0x0579 | Error reading parameter file |
| 1402 | 0x057A | Invalid entry (SDO description invalid) |
| 1403 | 0x057B | Invalid entry (parameter number = 0) |
| 1404 | 0x057C | Invalid entry (unknown data type) |

### Hardware Errors

| Dec | Hex | Description |
|-----|-----|-------------|
| 2048 | 0x0800 | Axis error reading in progress (SDO, may take up to 300ms) |
| 2069 | 0x0815 | General error — drive not ready, no Emergency Message |

---

## PLCopen State Diagram

```
                    ┌──────────────┐
                    │   Disabled   │ (AxisState=1)
                    └──────┬───────┘
                     MC_Power │ Enable
                    ┌──────▼───────┐
                    │  Standstill  │ (AxisState=2)
                    └──┬───┬───┬───┘
          MC_Home │    │MC_Move*│    │ MC_MoveVelocity
               ┌──▼──┐ ┌──▼──────────┐ ┌──▼──────────────┐
               │Homing│ │DiscreteMotion│ │ContinuousMotion │
               └──────┘ └─────────────┘ └─────────────────┘
                           MC_Stop → Stopping → Standstill
                           Error   → ErrorStop → MC_Reset → Disabled
```

Query state: `DeviceName.AxisState` or `MC_ReadStatus_Festo`

---

## SDO Communication Notes

- PtP library generates SDO commands during initialization (factor group readout — cannot be disabled)
- Input changes (Accel, Decel, Jerk, Direction, BufferMode) generate SDO writes only when value changes
- Omron limit: max 32 simultaneous SDO instructions (EC_CoESDOWrite, EC_CoESDORead, etc.)
- Minimize continuous `MC_ReadParameter_Festo` / `MC_ReadAxisInfo_Festo` usage
- Use Properties instead of Read FBs when possible (no bus load)

---

## Recommended Library Versions (Festo-tested)

Source: official Festo PLCopen XML example `Festo_PtP_Example_CMMT-AS-MP-S1.xml` (version 3.5.0.11, author `chmm @ Festo`, dated 2025-11-25). These versions are tested by Festo as a known-good set for CMMT-AS-MP-S1 drives on EtherCAT.

| Library | Version | Vendor | Purpose |
|---|---|---|---|
| `Festo_PtP_Base` | **3.5.16.51** | Festo (🔒 green) | Base PtP — common types, `AXIS_REF_FESTO` |
| `Festo_PtP_CiA402` | 3.5.16.51 | Festo | CiA 402 standard motion profile |
| `Festo_PtP_CiA402_ETC` | 3.5.16.51 | Festo | CiA 402 over EtherCAT |
| `Festo_PtP_CiA402_ETC_CMMT_AS_MP_S1` | 3.5.16.51 | Festo | ⭐ Drive-specific (CMMT-AS-MP-S1 firmware) |
| `Festo_PtP_Virtual` | 3.5.16.51 | Festo | Offline simulation (useful for Twin/test) |
| `IODrvEtherCAT` | 3.5.16.0 | 3S (CODESYS) | EtherCAT Master driver |

**Compatibility:** the `3.5.16.51` Festo PtP libraries are forward-compatible with newer CODESYS runtime versions (tested up to runtime 3.5.20.50 on CPX-E-CEC-C1).

**Warning:** install only `(Festo)` 🔒 green entries in Library Repository. Never `(Festo AG & Co. KG)` 🟡 yellow — those are deprecated.

---

## Recommended Task Configuration

Source: same Festo example XML. Tasks for motion control should be configured as:

| Task | Type | Interval | Priority |
|---|---|---|---|
| `MainTask` | Cyclic | **2 ms** | 1 |
| `EtherCAT_Task` | Cyclic | **2 ms** | 1 |

Both at 2 ms — synchronization is critical for motion control. The EtherCAT_Task drives the SDO/PDO exchange with CMMT-AS drives; MainTask runs the user IEC code that calls MC_*_Festo FBs.

**Trade-offs:**
- Slower tasks (5 ms, 10 ms): work but introduce latency in motion response — acceptable for non-critical apps
- Faster tasks (<2 ms): may exceed PLC computing budget — not officially supported by Festo
- Different intervals between MainTask and EtherCAT_Task: causes jitter in PDO writes — avoid

**Watchdog:** disabled in Festo example (`Watchdog Enabled="false"`) — enable in production with conservative timeout (e.g. 4× interval = 8 ms).

---

## Example: PLCopen XML — CMMT-AS-MP-S1

Reference example bundled in MCP at `knowledge/plcopen/Festo_PtP_Example_CMMT-AS-MP-S1.xml`. Demonstrates instantiation and cyclic call of all 24 MC_*_Festo FBs on a single CMMT-AS-MP-S1 axis, with the recommended task config and library set above.

To import in CODESYS: `Project > Import PLCopen XML > select file`.
