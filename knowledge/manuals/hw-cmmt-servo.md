---
id: cmmt-servo
title: Festo CMMT Servo Drive — EtherCAT Integration and Point-to-Point
priority: HIGH
token_estimate: 2500
use_when:
  - user works with Festo CMMT-AS or CMMT-ST servo drives
  - user needs EtherCAT PDO mapping for CMMT
  - user asks about point-to-point positioning records
  - user needs CMMT error codes or diagnostics
  - commissioning a new CMMT drive
  - user needs PLCopen motion function blocks
never_use_when:
  - user asks about generic PLCopen motion FBs (see festo-ptp-reference)
  - user asks about non-Festo servo drives
  - user asks about simple motors without EtherCAT
depends_on: [ethercat-cia402]
related: [festo-ptp, festo-motion-patterns, motion-library]
keywords: [CMMT, CMMT-AS, CMMT-ST, servo, EtherCAT, CiA 402, PDO, point-to-point, PtP, homing, positioning, commissioning, MC_Power_Festo, MC_Home_Festo, MC_MoveAbsolute_Festo, MC_MoveVelocity_Festo]
---

# Festo CMMT Servo Drive — EtherCAT Integration and Point-to-Point

## Overview

The Festo CMMT (Compact Motion Modular Technology) servo drive family consists of two main variants:
- **CMMT-AS**: Advanced Servo drive with full motion control capabilities
- **CMMT-ST**: Stepper drive variant

Both support EtherCAT communication using CiA 402 profile and can operate in multiple modes including Point-to-Point positioning.

> **📚 Protocol/firmware deep-dive (CMMT-AS-...-S1):** for raw CiA 402 CoE objects, controlword/statusword bit-by-bit, STO/SBC on the S1 variant (hardwired only), internal Festo Px. parameters (Px.300/392/8416/11412…), the EtherCAT state machine (Init/PreOp/SafeOp/Op), Distributed Clocks, CSP sub-modes (CSP-V/T/VT) and the manual enable/fault-reset sequence (without the PtP library), see manual **`hw-cmmt-as-s1-reference`** (Festo 8249086). This document covers the CODESYS/library application layer; that one covers the protocol layer beneath it.

### Key Capabilities
- EtherCAT fieldbus communication (CiA 402 profile)
- Multiple operating modes: Profile Position (PP), Profile Velocity (PV), Homing (HM), Cyclic Synchronous Position (CSP), Cyclic Synchronous Velocity (CSV)
- Point-to-Point positioning with record tables
- Modbus TCP protocol support (via multi-protocol variant CMMT-AS-…-MP)
- Integrated safety features and diagnostics
- Support for linear and rotary axes

### Firmware Requirements
- CMMT-AS: Firmware V33.0.9.10 or higher
- Configuration via Festo Automation Suite (FAS) V2.5.0.635 or higher
- CODESYS V3.5 SP16 Patch 4 or higher for PLC programming

## Hardware Overview

### Connection Interfaces
- **X1**: 24V DC power supply
- **X2**: Motor connection (resolver/encoder feedback)
- **X3**: Safe Torque Off (STO) safety input
- **X4**: Digital I/O and analog inputs
- **X5**: EtherCAT IN
- **X6**: EtherCAT OUT
- **X18**: Parameterization port (Ethernet, for configuration only)
- **X19**: Fieldbus port (EtherCAT/EtherNet/IP/Modbus TCP depending on variant)

### Models
Example: **CMMT-AS-C2-3A-MP-S1**
- C2 = Size class
- 3A = Current rating
- MP = Multi-protocol (supports EtherCAT, EtherNet/IP, Modbus TCP)
- S1 = Feature set

### LED Indicators
- **Green**: Ready, normal operation
- **Yellow/Orange**: Warning state
- **Red**: Error state
- **Flashing patterns**: Indicate specific drive states (refer to diagnostics section)

## EtherCAT Configuration

### Fieldbus Protocol Selection (CMMT-AS-…-MP variant)

The multi-protocol variant supports automatic detection or manual configuration via DIP switches SW1-SW3:

| SW1 | SW2 | SW3 | Protocol |
|-----|-----|-----|----------|
| 0   | 0   | 0   | Automatic detection |
| 1   | 0   | 0   | EtherCAT |
| 0   | 1   | 0   | EtherNet/IP |
| 1   | 1   | 0   | Modbus TCP |

**Recommended**: Use automatic detection (all switches at 0) and configure protocol in FAS software.

### PDO Mapping

The CMMT drives use standard CiA 402 PDO mapping with different telegram options. **Telegram 111** is recommended for Point-to-Point operation.

#### Key PDO Objects (Telegram 111)
**RxPDO (PLC → Drive)**:
- Controlword (0x6040) - 16 bits
- Modes of operation (0x6060) - 8 bits
- Target position (0x607A) - 32 bits
- Target velocity (0x60FF) - 32 bits
- Target torque (0x6071) - 16 bits

**TxPDO (Drive → PLC)**:
- Statusword (0x6041) - 16 bits
- Modes of operation display (0x6061) - 8 bits
- Position actual value (0x6064) - 32 bits
- Velocity actual value (0x606C) - 32 bits
- Torque actual value (0x6077) - 16 bits

### CiA 402 Controlword and Statusword

The drive follows CiA 402 state machine controlled via controlword bits:

**Controlword (0x6040)**:
- Bit 0: Switch On
- Bit 1: Enable Voltage
- Bit 2: Quick Stop
- Bit 3: Enable Operation
- Bit 4: Operation mode specific
- Bit 5: Operation mode specific
- Bit 6: Operation mode specific
- Bit 7: Fault Reset
- Bits 8-15: Operation mode specific

**Statusword (0x6041)**:
- Bit 0: Ready to Switch On
- Bit 1: Switched On
- Bit 2: Operation Enabled
- Bit 3: Fault
- Bit 4: Voltage Enabled
- Bit 5: Quick Stop
- Bit 6: Switch On Disabled
- Bit 7: Warning
- Bits 8-15: Operation mode specific

## Operating Modes

### Profile Position Mode (PP - Mode 1)
Absolute or relative positioning with trapezoidal/S-curve velocity profiles.

**Key Parameters**:
- Target position (0x607A)
- Profile velocity (0x6081)
- Profile acceleration (0x6083)
- Profile deceleration (0x6084)
- Quick stop deceleration (0x6085)
- Motion profile type (0x6086): 0=trapezoidal, 1=S-curve

**Control Sequence**:
1. Set mode of operation = 1
2. Set target position
3. Set velocity and acceleration
4. Trigger movement via controlword bit 4 (new setpoint)

### Profile Velocity Mode (PV - Mode 3)
Continuous velocity control with acceleration/deceleration ramps.

**Key Parameters**:
- Target velocity (0x60FF)
- Profile acceleration (0x6083)
- Profile deceleration (0x6084)

### Homing Mode (HM - Mode 6)
Reference point search with multiple methods according to CiA 402.

**Common Homing Methods**:
- Method 1-14: Hardware limit switch and index pulse combinations
- Method 17-30: Home switch and index pulse combinations
- Method 33-34: Index pulse only
- Method 35: Current position as home
- Method 37: Actual position (direct homing without movement)

**Homing Sequence**:
1. Set mode of operation = 6
2. Set homing method (0x6098)
3. Set homing speeds (0x6099)
4. Set homing acceleration (0x609A)
5. Trigger homing via controlword bit 4

### Cyclic Synchronous Position (CSP - Mode 8)
Real-time position streaming from PLC, updated every cycle.

**Use Case**: Multi-axis synchronized motion, cam profiles, complex trajectories.

### Cyclic Synchronous Velocity (CSV - Mode 9)
Real-time velocity streaming from PLC, updated every cycle.

**Use Case**: Speed-synchronized applications, winding/unwinding.

## Point-to-Point Positioning

Point-to-Point mode allows pre-configured motion records to be executed via record number selection.

### Record Table Configuration

Records are configured in FAS under **Parameter Pages → Motion → Record Table**.

Each record contains:
- Target position
- Velocity
- Acceleration
- Deceleration
- Jerk (for S-curve profiles)
- Record type (absolute/relative)

Up to **256 records** can be stored (record numbers 0-255).

### Record Execution

**Via Controlword**:
1. Write record number to parameter (depends on implementation)
2. Trigger via controlword bit pattern
3. Monitor statusword for completion

**Via Function Block** (see PLCopen section below):
Use `MC_RecordTable_Festo` to select and execute records programmatically.

## Configuration via Festo Automation Suite (FAS)

### Initial Setup Procedure

#### 1. IP Address Configuration (Parameterization Port X18)

1. Connect PC to CMMT port X18 via Ethernet cable
2. Open Festo Automation Suite
3. Click **Device Scan**
4. Select device with extension **(X18)**
5. Right-click → **Network Setting**
6. Uncheck DHCP, enter IP address and subnet mask (e.g., 192.168.0.10 / 255.255.255.0)
7. Click **Activate New Setting** → **OK**

#### 2. Drive and Axis Configuration

**Step 1: Create/Open Project**
- File → New Project or use Device Scan if drive already configured

**Step 2: Add Drive to Project**
1. Select **EtherNet/IP Device → Electric Drives**
2. Search for part number (e.g., CMMT-AS-C2-3A-MP-S1)
3. Click **Add Device**
4. Select detected device by IP address
5. Click **Add to Project**

**Step 3: Motor Selection**
1. Navigate to **Start first setup → Motor**
2. Select motor model from list (e.g., EMME-AS-40-S-LV-AS)
3. Click **Apply**

**Step 4: Axis Configuration**

**For Linear Axis**:
1. Click **Axis** → Select "User Defined Linear Axis"
2. Enter parameters:
   - Stroke length (e.g., 100 mm)
   - Lead/pitch of ballscrew (e.g., 5 mm)
   - Base velocity (e.g., 0.5 m/s)
3. Click **Apply**

**For Rotary Axis**:
1. Click **Axis** → Select "User Defined Rotative Axis"
2. Enter parameters:
   - Maximum rotation (e.g., 1000 revolutions)
   - Base speed (e.g., 1000 RPM)
3. Click **Apply**

**Step 5: Mounting Kit**
1. Select mounting kit type or "User Defined Mounting Kit"
2. Enter mechanical parameters (inertia, mass, etc.)
3. Click **Apply**

**Step 6: Device Settings**
- Select **Activation Via**: "I/O and fieldbus"
- Click **Next**

**Step 7: Fieldbus Configuration**
1. **RTE Configuration**: Select "EtherNet/IP - Modbus" (for MP variant) or "EtherCAT"
2. **Telegram Selection**: Select **Telegram (111)** for Point-to-Point
3. Enter IP address for fieldbus port X19 (e.g., 192.168.1.10 / 255.255.255.0)
   - This is the IP for PLC communication (different from X18 parameterization port)
4. Click **Next**

**Step 8: Application Data**
- Enter load inertia value (depends on application)
- Click **Next**

**Step 9: Hardware Switches**
- Configure limit switch behavior (NC/NO)
- Enable/disable hardware limits
- Click **Next**

**Step 10: Homing Method**
- Select homing method (e.g., "Actual Position (37)" for current position as home)
- Set homing velocity and acceleration
- Click **Next**

**Step 11: Software Limits**
- Enable software position limits if needed
- Set maximum and minimum position values
- Click **Finish**

#### 3. Factor Group Configuration

Factor group defines scaling between internal drive units and fieldbus user units.

Navigate to: **Parameter Pages → Profiles → PROFIdrive → Factor Group**

**Example 1 - Linear axis (metric units)**:
- Position Factor: -6 → means 10⁻⁶ = 1 µm per increment
  - To move 10 mm: send value 10,000
- Velocity Factor: -3 → means 10⁻³ = 1 mm/s per increment
  - For 1 m/s velocity: send value 1,000

**Example 2 - Rotary axis**:
- Position Factor: -6 → means 10⁻⁶ revolution per increment
  - To move 5 revolutions: send value 5,000,000
- Velocity Factor: -3 → means 10⁻³ RPM per increment
  - For 100 RPM: send value 100,000

**Important**: All motion parameters (position, velocity, acceleration, jerk) must use the same factor group base.

#### 4. Save Configuration to Drive

1. Click **Store on device** button (saves parameters to non-volatile memory)
2. If prompted, **Reinitialize drive** (required for certain parameter changes)
3. **Disconnect** from parameterization port
4. Reconnect PC to fieldbus network (via switch) for PLC communication

## PLCopen Function Blocks (PtP_Package_Festo)

The Festo Point-to-Point library provides PLCopen-compliant function blocks with `_Festo` suffix.

### Library Installation

**CODESYS 3.5 (standalone)**:
1. Obtain package from Festo support
2. Install via CODESYS Package Manager (double-click .package file)
3. Restart CODESYS
4. Add drive to EtherCAT master
5. Use device name as AXIS_REF_FESTO

**TwinCAT 3**:
1. Copy ESI file to TwinCAT installation path
2. Install 5 libraries in Library Repository
3. Add libraries to project
4. Instance axis driver and link PDO variables
5. Link WcState_In, SlaveState_In, AdsAddr_In for SDO communication

**Omron Sysmac Studio**:
1. Copy library to `C:\OMRON\Data\Lib`
2. Add library reference in project
3. Instance PTP_AXIS_REF_FESTO structure
4. Map PDOs to structure
5. Instance and call PTP_CIA402_CMMT_AS module cyclically
6. Pass SlaveNodeInfo for SDO communication

### Core Function Blocks

#### MC_Power_Festo
Enables or disables the drive power stage.

```iecst
PROGRAM PRG_Main
VAR
    stAxis : AXIS_REF_FESTO;           // Axis reference (device name)
    fbPwr : MC_Power_Festo;            // Power control FB
    bEnbPwr : BOOL := FALSE;           // Enable power command
END_VAR

// Power control
fbPwr(
    Axis := stAxis,
    Enable := bEnbPwr
);

// Check status
IF fbPwr.Status THEN
    // Drive is powered and ready
END_IF
IF fbPwr.Error THEN
    // Handle error (see fbPwr.ErrorID and fbPwr.ErrorString)
END_IF
```

**Inputs**:
- Enable: BOOL - TRUE = enable power stage, FALSE = disable

**Outputs**:
- Status: BOOL - TRUE = enabled, FALSE = disabled
- Valid: BOOL - Output validity flag
- Error: BOOL - Error occurred
- ErrorID: WORD - Error number (see Diagnostics section)
- ErrorString: STRING - Error description

#### MC_Home_Festo
Executes homing sequence.

```iecst
VAR
    fbHome : MC_Home_Festo;
    bStrtHom : BOOL := FALSE;          // Start homing trigger
    rHomPos : REAL := 0.0;             // Zero position after homing
    nHomMeth : DINT := 37;             // Homing method (37 = actual position)
END_VAR

// Homing
fbHome(
    Axis := stAxis,
    Execute := bStrtHom,
    Position := rHomPos,
    HomingMethod := nHomMeth
);

IF fbHome.Done THEN
    bStrtHom := FALSE;                 // Reset trigger
    // Homing complete, axis referenced
END_IF
```

**Inputs**:
- Execute: BOOL - Start homing on rising edge
- Position: REAL - Absolute position to set after finding reference (user units)
- HomingMethod: DINT - CiA 402 homing method (0 = use drive parameter)

**Outputs**:
- Done: BOOL - Homing completed successfully
- Busy: BOOL - Homing in progress
- Active: BOOL - FB has control of axis
- CommandAborted: BOOL - Aborted by another command
- Error: BOOL - Error occurred
- ErrorID: WORD - Error number
- ErrorString: STRING - Error description

**Note**: If HomingMethod = 0, uses method configured in drive. Otherwise, overrides drive configuration.

#### MC_MoveAbsolute_Festo
Absolute positioning movement.

```iecst
VAR
    fbMovAbs : MC_MoveAbsolute_Festo;
    bStrtMov : BOOL := FALSE;
    rTgtPos : REAL := 50.0;            // Target position (mm or user unit)
    rVel : REAL := 100.0;              // Velocity (mm/s or user unit)
    rAcc : REAL := 500.0;              // Acceleration (mm/s² or user unit)
    rDec : REAL := 500.0;              // Deceleration (mm/s² or user unit)
    rJrk : REAL := 5000.0;             // Jerk (mm/s³ or user unit, 0 = use drive param)
END_VAR

fbMovAbs(
    Axis := stAxis,
    Execute := bStrtMov,
    Position := rTgtPos,
    Velocity := rVel,
    Acceleration := rAcc,
    Deceleration := rDec,
    Jerk := rJrk,
    Direction := MC_DIRECTION.mcDirectionPositive,
    BufferMode := MC_BUFFER_MODE.mcAborting
);

IF fbMovAbs.Done THEN
    bStrtMov := FALSE;
    // Movement complete
END_IF
```

**Inputs**:
- Execute: BOOL - Start on rising edge
- ContinuousUpdate: BOOL - Allow parameter updates during motion
- Position: REAL - Absolute target position (user units)
- Velocity: REAL - Maximum velocity (user units)
- Acceleration: REAL - Acceleration (user units, 0 = use drive parameter)
- Deceleration: REAL - Deceleration (user units, 0 = use drive parameter)
- Jerk: REAL - Jerk for S-curve (user units, 0 = use drive parameter)
- Direction: MC_DIRECTION - Movement direction (for modulo axes)
- BufferMode: MC_BUFFER_MODE - Command buffering behavior

**Outputs**: Done, Busy, Active, CommandAborted, Error, ErrorID, ErrorString

#### MC_MoveRelative_Festo
Relative positioning movement (distance from current position).

```iecst
VAR
    fbMovRel : MC_MoveRelative_Festo;
    bStrtRel : BOOL := FALSE;
    rDist : REAL := 10.0;              // Relative distance (mm or user unit)
END_VAR

fbMovRel(
    Axis := stAxis,
    Execute := bStrtRel,
    Distance := rDist,
    Velocity := 50.0,
    Acceleration := 200.0,
    Deceleration := 200.0,
    Jerk := 0.0,                       // Use drive parameter
    Direction := MC_DIRECTION.mcDirectionShortest,
    BufferMode := MC_BUFFER_MODE.mcAborting
);
```

**Note**: Distance is relative to axis position when Execute goes TRUE.

#### MC_MoveVelocity_Festo
Continuous velocity mode (endless movement).

```iecst
VAR
    fbMovVel : MC_MoveVelocity_Festo;
    bEnbVel : BOOL := FALSE;
    rSpd : REAL := 30.0;               // Target velocity (mm/s or user unit)
END_VAR

fbMovVel(
    Axis := stAxis,
    Execute := bEnbVel,
    Velocity := rSpd,
    Acceleration := 100.0,
    Deceleration := 100.0,
    Jerk := 0.0,
    Direction := MC_DIRECTION.mcDirectionPositive,
    BufferMode := MC_BUFFER_MODE.mcAborting
);

// Runs continuously until Execute = FALSE or MC_Stop/MC_Halt called
```

#### MC_Stop_Festo
Emergency stop with configured stop ramp, sets axis to "Stopping" state.

```iecst
VAR
    fbStp : MC_Stop_Festo;
    bStpCmd : BOOL := FALSE;
END_VAR

fbStp(
    Axis := stAxis,
    Execute := bStpCmd
);

IF fbStp.Done THEN
    // Axis stopped (velocity = 0)
END_IF
```

**Behavior**: Uses stop deceleration configured in drive. Axis remains in "Stopping" state while Execute = TRUE. No other motion commands accepted until Execute = FALSE and Done = TRUE.

#### MC_Halt_Festo
Controlled stop with set deceleration, allows new commands after stopping.

```iecst
VAR
    fbHlt : MC_Halt_Festo;
    bHltCmd : BOOL := FALSE;
END_VAR

fbHlt(
    Axis := stAxis,
    Execute := bHltCmd
);
```

**Difference from MC_Stop**: Axis goes to "Standstill" after stopping, ready for new motion commands.

#### MC_Jog_Festo
Manual jogging mode (typically used with HMI buttons).

```iecst
VAR
    fbJog : MC_Jog_Festo;
    bJogFwd : BOOL := FALSE;           // Jog forward button
    bJogRev : BOOL := FALSE;           // Jog reverse button
END_VAR

fbJog(
    Axis := stAxis,
    JogForward := bJogFwd,
    JogBackwards := bJogRev,
    Velocity := 20.0,
    Acceleration := 100.0,
    Deceleration := 100.0,
    Jerk := 0.0
);

// Moves while button held, stops when released
```

#### MC_RecordTable_Festo
Execute pre-configured motion records from drive memory.

```iecst
VAR
    fbRec : MC_RecordTable_Festo;
    bExcRec : BOOL := FALSE;
    nRecNum : DINT := 5;               // Record number (0-255)
END_VAR

fbRec(
    Axis := stAxis,
    Execute := bExcRec,
    RecordNumber := nRecNum
);

IF fbRec.Done THEN
    bExcRec := FALSE;
    // Record execution complete
END_IF
```

**Use**: Executes position, velocity, and dynamic parameters stored in record table (configured via FAS).

#### MC_ReadParameter_Festo / MC_WriteParameter_Festo
Read/write drive parameters via SDO (Service Data Object).

```iecst
VAR
    fbRdPrm : MC_ReadParameter_Festo;
    fbWrPrm : MC_WriteParameter_Festo;
    bRdExc : BOOL := FALSE;
    bWrExc : BOOL := FALSE;
    nPrmNum : DWORD := 16#60810000;    // Parameter address (e.g., 0x6081 = profile velocity)
    rPrmVal : REAL;                    // Parameter value
END_VAR

// Read parameter
fbRdPrm(
    Axis := stAxis,
    Execute := bRdExc,
    ParameterNumber := nPrmNum,
    Value => rPrmVal
);

// Write parameter
fbWrPrm(
    Axis := stAxis,
    Execute := bWrExc,
    ParameterNumber := nPrmNum,
    Value := rPrmVal
);
```

**ParameterNumber Format**: 32-bit value = (Index << 16) | (SubIndex << 8) | 0x00
- Example: 0x60810000 = Index 0x6081, SubIndex 0x00 (Profile velocity)

#### MC_ReadActualPosition_Festo / MC_ReadActualVelocity_Festo / MC_ReadActualTorque_Festo
Read current axis values.

```iecst
VAR
    fbRdPos : MC_ReadActualPosition_Festo;
    fbRdVel : MC_ReadActualVelocity_Festo;
    fbRdTrq : MC_ReadActualTorque_Festo;
    bEnbRd : BOOL := TRUE;
    rActPos : REAL;
    rActVel : REAL;
    rActTrq : REAL;
END_VAR

fbRdPos(Axis := stAxis, Enable := bEnbRd, Position => rActPos);
fbRdVel(Axis := stAxis, Enable := bEnbRd, Velocity => rActVel);
fbRdTrq(Axis := stAxis, Enable := bEnbRd, Torque => rActTrq);
```

#### MC_ReadStatus_Festo
Query axis state information.

```iecst
VAR
    fbRdSts : MC_ReadStatus_Festo;
    bEnbSts : BOOL := TRUE;
END_VAR

fbRdSts(
    Axis := stAxis,
    Enable := bEnbSts
);

IF fbRdSts.ErrorStop THEN
    // Axis in error state
END_IF
IF fbRdSts.Disabled THEN
    // Axis disabled (power off)
END_IF
IF fbRdSts.Homed THEN
    // Axis is referenced
END_IF
```

**Outputs**: ErrorStop, Disabled, Stopping, StandStill, DiscreteMotion, ContinuousMotion, SynchronizedMotion, Homing, ConstantVelocity, Accelerating, Decelerating

#### MC_ReadAxisError_Festo / MC_Reset_Festo
Error diagnostics and reset.

```iecst
VAR
    fbRdErr : MC_ReadAxisError_Festo;
    fbRst : MC_Reset_Festo;
    bEnbErr : BOOL := TRUE;
    bRstExc : BOOL := FALSE;
    bAxisErr : BOOL;
    nErrId : WORD;
END_VAR

// Read error status
fbRdErr(
    Axis := stAxis,
    Enable := bEnbErr,
    AxisErrorID => nErrId
);

bAxisErr := fbRdErr.Error;

// Reset error
IF bAxisErr THEN
    bRstExc := TRUE;
END_IF

fbRst(
    Axis := stAxis,
    Execute := bRstExc
);

IF fbRst.Done THEN
    bRstExc := FALSE;
    // Error cleared
END_IF
```

### Complete Motion Sequence Example

```iecst
PROGRAM PRG_CmmtMotion
VAR
    stAxis : AXIS_REF_FESTO;

    // Function blocks
    fbPwr : MC_Power_Festo;
    fbHome : MC_Home_Festo;
    fbMovAbs : MC_MoveAbsolute_Festo;
    fbRdSts : MC_ReadStatus_Festo;
    fbRst : MC_Reset_Festo;

    // Control variables
    bEnbPwr : BOOL := FALSE;
    bStrtHom : BOOL := FALSE;
    bMovToPos : BOOL := FALSE;
    rTgtPos : REAL := 100.0;           // Target: 100 mm

    // State machine
    nState : INT := 0;
    bErr : BOOL := FALSE;
END_VAR

// State machine for motion sequence
CASE nState OF
    0:  // IDLE - Wait for enable
        IF bEnbPwr THEN
            nState := 10;
        END_IF

    10: // ENABLE POWER
        fbPwr(Axis := stAxis, Enable := TRUE);
        IF fbPwr.Status AND fbPwr.Valid THEN
            nState := 20;
        ELSIF fbPwr.Error THEN
            bErr := TRUE;
            nState := 99;
        END_IF

    20: // START HOMING
        bStrtHom := TRUE;
        fbHome(
            Axis := stAxis,
            Execute := bStrtHom,
            Position := 0.0,
            HomingMethod := 37                 // Actual position = home
        );
        IF fbHome.Done THEN
            bStrtHom := FALSE;
            nState := 30;
        ELSIF fbHome.Error THEN
            bStrtHom := FALSE;
            bErr := TRUE;
            nState := 99;
        END_IF

    30: // READY - Wait for move command
        IF bMovToPos THEN
            nState := 40;
        END_IF

    40: // EXECUTE ABSOLUTE MOVE
        fbMovAbs(
            Axis := stAxis,
            Execute := TRUE,
            Position := rTgtPos,
            Velocity := 200.0,                 // 200 mm/s
            Acceleration := 500.0,             // 500 mm/s²
            Deceleration := 500.0,
            Jerk := 0.0,                       // Use drive parameter
            Direction := MC_DIRECTION.mcDirectionPositive,
            BufferMode := MC_BUFFER_MODE.mcAborting
        );
        IF fbMovAbs.Done THEN
            fbMovAbs(Axis := stAxis, Execute := FALSE);  // Reset
            bMovToPos := FALSE;
            nState := 30;                      // Return to READY
        ELSIF fbMovAbs.Error THEN
            fbMovAbs(Axis := stAxis, Execute := FALSE);
            bErr := TRUE;
            nState := 99;
        END_IF

    99: // ERROR STATE
        fbRst(Axis := stAxis, Execute := TRUE);
        IF fbRst.Done THEN
            fbRst(Axis := stAxis, Execute := FALSE);
            bErr := FALSE;
            nState := 0;                       // Return to IDLE
        END_IF
END_CASE

// Always read status
fbRdSts(Axis := stAxis, Enable := TRUE);
```

## Error Codes and Diagnostics

### Error ID Structure

Error IDs are 16-bit WORD values. Common error categories:

| Error ID Range | Description |
|----------------|-------------|
| 0x0000 | No error |
| 0x1000-0x1FFF | Communication errors |
| 0x2000-0x2FFF | Motion errors |
| 0x3000-0x3FFF | Drive-specific errors |
| 0x4000-0x4FFF | Parameter errors |
| 0x5000-0x5FFF | I/O errors |
| 0x6000-0x6FFF | Safety errors |
| 0x8000-0x8FFF | Initialization errors |

### Common Error Codes

| ErrorID | Description | Cause | Solution |
|---------|-------------|-------|----------|
| 0x0800 | Init error - Factor group not read | Drive communication issue during startup | Check EtherCAT connection, verify PDO mapping |
| 0x0811 | Init error - Axis type unknown | Drive parameter mismatch | Verify drive configuration in FAS |
| 0x1001 | Communication timeout | Lost connection to drive | Check cable, verify IP address, check bus state |
| 0x2044 | Position limit exceeded | Target position outside software limits | Check target position, verify software limits in FAS |
| 0x2045 | Velocity limit exceeded | Commanded velocity too high | Reduce velocity, check drive max velocity parameter |
| 0x2069 | Axis not homed | Movement command before homing | Execute MC_Home_Festo before motion commands |
| 0x2081 | Following error | Axis cannot follow commanded trajectory | Reduce dynamics, check mechanical load, tune controller |
| 0x3210 | Overcurrent | Motor current too high | Check motor connection, reduce load, check motor size |
| 0x3220 | Overvoltage | DC bus voltage too high | Check power supply, reduce deceleration ramp |
| 0x3230 | Undervoltage | DC bus voltage too low | Check 24V power supply connection |
| 0x4001 | Invalid parameter | Parameter write failed | Check parameter number, verify value range |
| 0x6050 | STO triggered | Safety input activated | Check STO wiring (X3), ensure safety circuit closed |

### Drive Status via Statusword

Query statusword bits to diagnose drive state:

**Statusword Bit Patterns**:
- `xxxx xxxx x0xx 0000` = Not ready to switch on
- `xxxx xxxx x1xx 0000` = Switch on disabled
- `xxxx xxxx x01x 0001` = Ready to switch on
- `xxxx xxxx x01x 0011` = Switched on
- `xxxx xxxx x01x 0111` = Operation enabled
- `xxxx xxxx x00x 0111` = Quick stop active
- `xxxx xxxx x0xx 1111` = Fault reaction active
- `xxxx xxxx x0xx 1000` = Fault

**Checking for Fault**:
```iecst
IF (stAxis.NcToPlc.StatusWord AND 16#0008) <> 0 THEN
    // Bit 3 set = Fault state
    // Read error code and reset
END_IF
```

### LED Diagnostics

| LED State | Meaning | Action |
|-----------|---------|--------|
| Solid Green | Operating normally | None |
| Flashing Green | Power enabled, waiting for commands | Normal standby state |
| Solid Yellow | Warning active (bit 7 in statusword) | Check diagnostics, may continue operation |
| Flashing Red | Fault state | Read error code, resolve issue, reset drive |
| Off | No power or firmware issue | Check 24V supply, check X1 connection |

## Key Parameters Reference

Common parameters accessed via MC_ReadParameter_Festo / MC_WriteParameter_Festo:

| Parameter | Index | SubIndex | Description | Unit | Access |
|-----------|-------|----------|-------------|------|--------|
| Profile velocity | 0x6081 | 0x00 | Maximum velocity for profile modes | User units/s | RW |
| Profile acceleration | 0x6083 | 0x00 | Acceleration for profile modes | User units/s² | RW |
| Profile deceleration | 0x6084 | 0x00 | Deceleration for profile modes | User units/s² | RW |
| Quick stop deceleration | 0x6085 | 0x00 | Emergency stop deceleration | User units/s² | RW |
| Motion profile type | 0x6086 | 0x00 | 0=trapezoidal, 1=S-curve | - | RW |
| Homing method | 0x6098 | 0x00 | CiA 402 homing method number | - | RW |
| Homing speed (search) | 0x6099 | 0x01 | Speed during switch search | User units/s | RW |
| Homing speed (zero) | 0x6099 | 0x02 | Speed during zero pulse search | User units/s | RW |
| Homing acceleration | 0x609A | 0x00 | Acceleration during homing | User units/s² | RW |
| Position window | 0x6067 | 0x00 | In-position tolerance | User units | RW |
| Position window time | 0x6068 | 0x00 | Time in window before "in position" | ms | RW |
| Software limit min | 0x607D | 0x01 | Minimum software position limit | User units | RW |
| Software limit max | 0x607D | 0x02 | Maximum software position limit | User units | RW |
| Max motor speed | 0x6080 | 0x00 | Maximum motor speed | RPM | RO |
| Motor rated current | 0x6075 | 0x00 | Rated motor current | mA | RO |
| Motor rated torque | 0x6076 | 0x00 | Rated motor torque | mNm | RO |

**Parameter Number Format for FB**:
```iecst
// To access 0x6081 subindex 0x00:
nParamNum := 16#60810000;  // (0x6081 << 16) | (0x00 << 8)
```

## Commissioning Procedure

### Step-by-Step Checklist

**1. Hardware Installation**
- [ ] Mount drive on DIN rail with adequate ventilation
- [ ] Connect 24V DC power to X1 (observe polarity!)
- [ ] Connect motor to X2 (resolver/encoder)
- [ ] Connect STO safety circuit to X3 (bridge if not used - see manual)
- [ ] Connect I/O if needed to X4
- [ ] Connect EtherCAT cable to X5 (IN) and X6 (OUT)
- [ ] Power up drive (check LED indicators)

**2. Initial Configuration via FAS**
- [ ] Connect PC to X18 (parameterization port)
- [ ] Configure X18 IP address (see Configuration section)
- [ ] Create project and add drive
- [ ] Select motor model
- [ ] Configure axis (linear/rotary, stroke, base speed)
- [ ] Select mounting kit
- [ ] Set fieldbus protocol (EtherCAT or Modbus TCP)
- [ ] Configure telegram (recommend Telegram 111)
- [ ] Set fieldbus IP address for X19
- [ ] Configure homing method
- [ ] Set software limits if needed
- [ ] Set factor group for position/velocity scaling
- [ ] Store configuration on device
- [ ] Reinitialize drive if prompted

**3. PLC Integration**
- [ ] Install PtP library in PLC project
- [ ] Add CMMT drive to EtherCAT master (or configure Modbus TCP)
- [ ] Map PDO variables to axis structure
- [ ] Verify communication (check EtherCAT state, PDO exchange)

**4. Functional Test**
- [ ] Enable drive with MC_Power_Festo
- [ ] Execute homing with MC_Home_Festo
- [ ] Test jog mode (MC_Jog_Festo) in both directions
- [ ] Verify limit switches stop motion
- [ ] Test absolute positioning (MC_MoveAbsolute_Festo)
- [ ] Test relative positioning (MC_MoveRelative_Festo)
- [ ] Verify error handling and reset

**5. Tuning (if needed)**
- [ ] Check following error during motion
- [ ] Adjust controller gains if necessary (via FAS)
- [ ] Optimize acceleration/deceleration for application
- [ ] Test emergency stop behavior

## Technical Specifications

### CMMT-AS Performance
- **Position resolution**: Up to 1 µm (depending on configuration)
- **Max velocity**: Depends on motor and axis configuration (typically up to 2 m/s for linear axes)
- **EtherCAT cycle time**: 1-4 ms typical
- **Current control loop**: 62.5 µs (16 kHz)
- **Position control loop**: EtherCAT cycle time
- **Supported motors**: EMME-AS series (brushless servo motors with resolver)

### Electrical Ratings
- **Supply voltage**: 24V DC ±20% (X1)
- **Motor voltage**: 24V-48V DC (model dependent)
- **Continuous current**: 1.5A-10A (model dependent, see order code)
- **Peak current**: 3x continuous current for 1s
- **Power consumption (logic)**: < 5W
- **STO safety input**: 24V DC, PNP

### Environmental
- **Operating temperature**: 0°C to +50°C
- **Storage temperature**: -25°C to +70°C
- **Humidity**: 5% to 95% non-condensing
- **Vibration resistance**: 1g (IEC 60068-2-6)
- **Shock resistance**: 15g (IEC 60068-2-27)
- **IP rating**: IP20 (standard enclosure)

## Troubleshooting / FAQ

### Q1: Drive shows communication timeout (ErrorID 0x1001) after power-up
**Cause**: EtherCAT slave not reaching OP state or PDO mapping mismatch.

**Solution**:
1. Check EtherCAT cable connections (X5, X6)
2. Verify drive appears in EtherCAT master scan
3. Check telegram selection matches configuration (Telegram 111 recommended)
4. Verify PDO mapping in PLC project matches drive configuration
5. Check EtherCAT cycle time (should be 1-4 ms)
6. Verify WcState_In and SlaveState_In linked (TwinCAT only)

### Q2: MC_Home_Festo reports error 0x2069 (axis not homed) even after successful homing
**Cause**: Drive internal homing flag not set correctly, or communication issue.

**Solution**:
1. Verify homing method is supported by drive (check manual)
2. For method 37 (actual position), ensure Position parameter is set
3. Check that Done output goes TRUE before proceeding to next motion
4. Read statusword bit 12 (homing attained) to verify drive acknowledges homing
5. If using HomingMethod = 0, ensure homing is configured correctly in FAS

### Q3: Motion stops with ErrorID 0x2081 (following error)
**Cause**: Axis cannot maintain commanded position within following error window.

**Solution**:
1. Reduce velocity and acceleration parameters
2. Check mechanical load - may be too high for motor size
3. Verify motor coupling is secure (no slipping)
4. Check for mechanical binding or friction
5. Tune position controller gains in FAS (under Controller Parameters)
6. Increase following error window (parameter 0x6065) if acceptable for application

### Q4: How do I switch between different operating modes (PP, PV, HM)?
**Answer**: The PLCopen function blocks automatically handle mode switching:
- MC_Home_Festo → Sets mode to 6 (Homing)
- MC_MoveAbsolute_Festo / MC_MoveRelative_Festo → Sets mode to 1 (Profile Position)
- MC_MoveVelocity_Festo → Sets mode to 3 (Profile Velocity)

You don't need to manually write the "Modes of operation" object. The FB manages this internally.

**Important**: Complete current motion before switching modes (check Done or CommandAborted outputs).

### Q5: Can I use multiple CMMT drives on one EtherCAT segment?
**Answer**: Yes, CMMT drives can be daisy-chained on the same EtherCAT network:
1. Connect first drive X5 to EtherCAT master OUT
2. Connect first drive X6 to second drive X5
3. Continue chain to additional drives
4. Each drive needs unique EtherCAT slave address (auto-assigned by topology)
5. Each drive needs unique axis reference (AXIS_REF_FESTO) in PLC

**Limitation**: Minimize acyclic SDO commands (parameter read/write) when using many drives to avoid bus overload. See library documentation section 2.2 for details.

---

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Festo Part Numbers**: CMMT-AS-C2-3A-MP-S1, CMMT-AS-C2-7A-MP-S1, CMMT-ST series
**Compatible Firmware**: V33.0.9.10 and higher

For detailed electrical diagrams, safety instructions, and complete parameter lists, refer to the official CMMT user manual available at www.festo.com.
