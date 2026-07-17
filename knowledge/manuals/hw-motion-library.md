---
id: motion-library
title: Festo Motion Libraries — CODESYS Motion + FHPP
priority: MEDIUM
token_estimate: 2200
use_when:
  - user asks about Festo CODESYS motion library FBs
  - user needs FHPP function block signatures or parameters
  - user asks about AXIS_REF or motion data types
  - user needs to know which motion library version to use
  - user asks about Festo motor controller programming (CMMD, CMMP, CMMS, CMMT, SFC, MTR, EMCA)
never_use_when:
  - user asks about motor blocks from the FestoCodesysMCP library (those are for simple motors)
  - user asks about EtherCAT configuration (see cpx-e-ethercat)
  - user asks about CMMT drive parameters (see cmmt-servo)
depends_on: [festo-ptp]
related: [cmmt-servo, ethercat-cia402, festo-motion-patterns]
keywords: [motion library, FHPP, PLCopen, MC_Power_Festo, MC_Home_Festo, MC_MoveAbsolute_Festo, AXIS_REF, SoftMotion, SM3, Festo_Motion.lib, Festo_Motion_FHPP_3]
---

# Festo Motion Libraries — CODESYS Motion + FHPP

## Library Overview

Festo provides two motion control libraries for controlling motor controllers via fieldbus:

### Festo_Motion.lib (CODESYS V2.3)
- **Platform**: CODESYS V2.3
- **Supported Controllers**:
  - CMMD-AS (double motor controller)
  - CMMP-AS (motor controller family)
  - CMMS-AS and CMMS-ST (motor controllers)
  - SFC-DC, SFC-LAC, SFC-LACI (motor controller families)
  - MTR-DCI (motor unit)

- **Communication**: CANopen, PROFIBUS
- **Profile**: Festo Handling and Positioning Profile (FHPP)

### Festo_Motion_FHPP_3.library (CODESYS V3.5 and TwinCAT 3)
- **Platform**: CODESYS V3.5, TwinCAT 3
- **Namespace**: `FML`
- **Supported Controllers**:
  - CMMD-AS-C8-3A (double motor controller)
  - CMMO-ST-C5-1-LKP
  - CMMP-AS (motor controller family)
  - CMMS-AS and CMMS-ST
  - CMXH-ST (2-axis motor controller)
  - SFC-DC (motor controller family)
  - EMCA-EC (motor unit)
  - MTR-DCI (motor unit)

- **Communication**: CANopen, IO-Link, Modbus/TCP, PROFIBUS
- **Profile**: Festo Handling and Positioning Profile (FHPP) + FHPP+

### Library Installation

**CODESYS V2.3:**
- Library located in: `...\CoDeSys V2.3\Targets\Festo\...\IOCONFIG\`
- Integration: Via Library Manager → Add Library

**CODESYS V3.5:**
- Integration: Library Manager → Add Library → `Festo_Motion_FHPP_3.library`
- All elements assigned to namespace `FML`

## FHPP Architecture

### Festo Handling and Positioning Profile (FHPP)

FHPP provides uniform control and programming across different fieldbus systems:

**Control and Status Bytes:**
- 8 bytes of I/O data for control
- Control functions triggered via single-bit operations
- Status messages evaluated from motor controller

**Parameter Channel (FPC):**
- Additional 8 bytes of I/O data
- Controller access to all parameter values
- Parameter read/write via dedicated function blocks

**FHPP+ (CODESYS V3.5 only):**
- Supported by CMMP-AS and EMCA-EC only
- Up to 24 additional bytes (10 objects max)
- Cyclic parameter exchange between motor controller and PLC
- Configurable object sizes: 8-bit, 16-bit, or 32-bit

### Operating Modes

**Record Selection:**
- Execute saved positioning records
- Records parameterized via Festo Configuration Tool (FCT)
- Can be taught-in via control panel

**Direct Mode - Position Control:**
- Target positions and velocities transferred directly via control bytes
- No limitations from saved positioning records
- Real-time calculation and specification

**Direct Mode - Force/Torque Control:**
- Direct force or torque specification
- Applicable to force-capable actuators

**Direct Mode - Velocity Control:**
- Direct speed specification
- Continuous velocity control

**Track Mode:**
- Reserved for specific applications

## CODESYS V2.3 Function Blocks (Festo_Motion.lib)

### Control Function Blocks

Function blocks named: `<CONTROLLER>_CTRL`

**Examples:**
- `CMMP_AS_CTRL` - CMMP-AS motor controller
- `CMMS_AS_CTRL` - CMMS-AS motor controller
- `SFC_DC_CTRL` - SFC-DC motor controller
- `MTR_DCI_CTRL` - MTR-DCI motor unit

### Organization Function Blocks

**`<CONTROLLER>_PRM_INIT`** - Organization block for parameterization
- Manages FPC data access
- Required for all parameterization function blocks
- One instance per motor controller

### Parameterization Function Blocks

**`<CONTROLLER>_PRM_SINGLE`** - Transfer individual parameter
- Read/write single FHPP parameter
- Inputs: PNU (parameter number), Subindex, Value
- Supports upper/lower limit reading (CMMD/CMMP/CMMS only)

**`<CONTROLLER>_PRM_MULTI`** - Transfer parameter list
- Reads/writes array of parameters
- Uses `FHPP_PRM_DESCRIPTION` structure array
- Efficient for multiple parameter operations

**`<CONTROLLER>_PRM_DIAG`** - Read diagnostic memory
- Reads error/warning memory
- Returns `FHPP_PRM_DIAGMESSAGE` array
- Supports warning mode (CMMP-AS only)

**`<CONTROLLER>_PRM_DIRMP`** - Direct mode position parameters
- Transfers dynamic parameters: Velocity, Acceleration, Deceleration, JerkLimit, DampingTime, Load
- PNU 540 (velocity), 541 (acceleration), 542 (deceleration), 543/546 (jerk), 1023 (damping), 544 (load)

**`<CONTROLLER>_PRM_KO`** - Communication object transfer
- Transfers device-specific communication objects
- Not compatible with FCT software during use

**`CMMP_AS_CAM_PRM_CAMNUMBER`** - Cam disc selection
- CMMP-AS CAM variant only
- Select/read cam disc number
- Optional feature

### Key Data Structures (V2.3)

**FHPP_PRM_DESCRIPTION:**
```
STRUCT
  PNU      : UINT;   // Parameter number
  SUBINDEX : USINT;  // Subindex
  ACCESS   : USINT;  // 0=read, 1=write
  LENGTH   : USINT;  // Length in bytes
  VALUE    : DINT;   // Value
END_STRUCT
```

**FHPP_PRM_DIAGMESSAGE:**
```
STRUCT
  DiagEvent          : DINT;    // Diagnostic event
  DiagMsgNumber      : DINT;    // Fault number
  DiagTimeStamp      : TOD;     // Timestamp
  DiagMsgDescription : STRING;  // Description
END_STRUCT
```

## CODESYS V3.5 Function Blocks (Festo_Motion_FHPP_3.library)

### Basic Program Structure

**Required sequence:**
1. `FML_Read` or `FML_Read_CMXH` - Prepare incoming data
2. `FHPP_CTRL` or `FHPP_CTRL_CMXH` - Control motor controller
3. Optional: `FPC_xxx` - Parameterization blocks
4. `FML_Write` or `FML_Write_CMXH` - Prepare outgoing data

### Transfer Function Blocks

**`FML.FML_Read`** - Prepare input data from motor controller
- Normalizes big/little endian fieldbus data
- Normalizes Modbus/TCP data format
- Handles FHPP+ objects (if enabled)
- Stores prepared data in `DT_FML_REF` structure

Inputs:
- `DeviceType` - E_FML_DEVICE_TYPE (CMMO_ST=10, EMCA_EC=20, CMMP_AS=30, CMMS_AS=40, CMMS_ST=50, CMMD_AS=60, SFC_DC=70, MTR_DCI=80, CMXH_ST=90)
- `Modbus` - TRUE if Modbus/TCP used
- `HighByteFirst` - Byte order (TRUE=big endian)
- `FPC_active` - TRUE if parameter channel used
- `FHPP_PLUS_active` - TRUE if FHPP+ used
- `FHPP_Source` - 8-byte control input data
- `FPC_Source` - 8-byte parameter input data
- `FHPP_PLUS_Source1/2/3` - FHPP+ packages (if used)

**`FML.FML_Read_CMXH`** - Prepare input data for CMXH-ST
- Similar to FML_Read but for 2-axis CMXH-ST controller
- `FHPP_Source` is 16 bytes (2 axes)

**`FML.FML_Write`** - Prepare output data to motor controller
- Byte arrangement for big/little endian
- Word arrangement for Modbus/TCP
- Prepares FHPP+ output objects (if enabled)

**`FML.FML_Write_CMXH`** - Prepare output data for CMXH-ST
- Similar to FML_Write but for 2-axis controller

### Control Function Blocks

**`FML.FHPP_CTRL`** - Control motor controller

Key Inputs:
- `EnableDrive` - Enable/disable drive
- `Stop` - Enable operation or emergency stop
- `Brake` - Release/engage brake (manual control when disabled)
- `ResetFault` - Acknowledge fault (rising edge)
- `HMIAccessLocked` - Block FCT/web access
- `OPM` - Operating mode (0=Record, 1=Direct Position, 5=Direct Force, 9=Direct Velocity)
- `Halt` - Controlled stop with ramp (keeps positioning task)
- `StartTask` - Start positioning task (rising edge)
- `StartHoming` - Start homing sequence
- `JoggingPos/JoggingNeg` - Manual jogging
- `TeachActualValue` - Teach current position (falling edge)
- `ClearRemainingPosition` - Delete remaining path in Halt state
- `Relative` - Absolute (FALSE) or relative (TRUE) positioning
- `RecordNo` - Record number (record mode)
- `SetValuePosition` - Position setpoint (direct position mode)
- `SetValueVelocity` - Velocity setpoint (%)
- `SetValueForce` - Force/torque setpoint (direct force mode)
- `SetValueRotSpeed` - Velocity setpoint (direct velocity mode)

Key Outputs:
- `DriveEnabled` - Controller enabled status
- `Ready` - Operation enabled
- `Warning/Fault` - Status indicators
- `SupplyVoltagePresent` - Load voltage status
- `StateOPM` - Active operating mode
- `HaltActive` - Halt status
- `AckStart` - Start acknowledged
- `MC` - Motion complete
- `DriveIsMoving` - Axis in motion
- `FollowingError` - Following error active
- `HomingValid` - Valid homing position
- `ActualPosition/Velocity/Force/RotSpeed` - Actual values

**`FML.FHPP_CTRL_CMXH`** - Control CMXH-ST (2-axis)
- Similar inputs/outputs but for X and Y axes
- `JoggingPosX/Y`, `JoggingNegX/Y`
- `SetValuePositionX/Y`, `ActualPositionX/Y`

### Parameterization Function Blocks (V3.5)

**`FML.FPC_DIAG`** - Get active error
- Reads most recent error from controller
- Outputs: MessageNumber, MessageDescription

**`FML.FPC_DIAG_BUFFER`** - Read diagnostic memory
- Reads full diagnostic buffer
- Buffer sizes: CMMO-ST/CMXH-ST/EMCA-EC=200, CMMP-AS=32, SFC-DC/MTR-DCI=16, CMMS/CMMD=4
- Outputs: ValidEntries, DiagBuff array

**`FML.FPC_DIRMP`** - Dynamic parameters for direct mode
- Read/write velocity, acceleration, deceleration
- PNU 540.1 (velocity), 541.1 (acceleration), 542.1 (deceleration)

**`FML.FPC_FILE`** - Transfer parameter sets (CMMO-ST, EMCA-EC only, CODESYS 3.5 only)
- Upload: Save full parameter set to PLC file system
- Download: Transfer parameter set from PLC file to controller
- Folder names: "CMMOparameter" or "EMCAparameter"
- Multi-minute transfer time

**`FML.FPC_FILE_ARRAY`** - Transfer parameter sets to byte array (CMMO-ST, EMCA-EC)
- Upload/Download parameter sets to/from byte array
- Recommended array size: 24000 bytes
- Alternative to FPC_FILE

**`FML.FPC_MULTI`** - Transfer multiple parameters
- Reads/writes parameter list
- Uses `DT_FML_PRM_DESCRIPTION` array
- Sequential transfer with progress tracking

**`FML.FPC_DATA_OBJECT`** - Object transfer (CMMD-AS, CMMP-AS, CMMS only)
- Transfer device-specific communication objects
- Objects not published - contact Festo Service

**`FML.FPC_PNU`** - Transfer single FHPP parameter
- Read/write individual parameter
- Inputs: PNU, Subindex, Value
- Most commonly used parameterization block

### Key Data Structures (V3.5)

**DT_FML_REF** - Main reference structure
- `FHPP` - Control data management
- `FPC` - Parameter data management
- `FHPP_PLUS` - FHPP+ object management
- `Modbus`, `HighByteFirst`, `FPC_active`, `DeviceType` - Configuration flags
- `MemberID` - Consecutive number for multi-controller management

**DT_FML_PRM_DESCRIPTION:**
```
STRUCT
  PNU      : INT;   // Parameter number
  SUBINDEX : INT;   // Subindex
  ACCESS   : INT;   // 0=read, 1=write
  VALUE    : DINT;  // Value
END_STRUCT
```

**DT_FML_STATUS** - Status and error reporting
```
STRUCT
  Err : BOOL;    // Error active
  Cat : DINT;    // Category (0=OK, 1=FB error, 3=FPC error)
  ID  : DINT;    // Error/status ID
  Msg : STRING;  // Description
END_STRUCT
```

**E_FML_DEVICE_TYPE:**
```
CMMO_ST  := 10
EMCA_EC  := 20
CMMP_AS  := 30
CMMS_AS  := 40
CMMS_ST  := 50
CMMD_AS  := 60
SFC_DC   := 70
MTR_DCI  := 80
CMXH_ST  := 90
```

## Configuration and Setup

### I/O Configuration for PROFIBUS (V2.3)

Two settings supported:
- **FHPP Standard**: Control function block only
- **FHPP Standard + FPC**: Control + parameterization function blocks

### Fieldbus Configuration (V3.5)

**CANopen:**
- `Modbus := FALSE`
- `HighByteFirst := FALSE`
- Typical controllers: CECC, CPX-CEC

**IO-Link:**
- `Modbus := FALSE`
- `HighByteFirst := FALSE`
- Requires IO-Link specification 1.1
- IODD device description from Festo Support Portal

**Modbus/TCP:**
- `Modbus := TRUE`
- `HighByteFirst := TRUE`
- Firmware requirements vary by controller
- Channel configuration via FCT software

### FHPP+ Configuration

**Configuration Steps:**
1. Use FCT "FHPP+ Editor" page
2. Configure objects in "Answer to PLC" folder (inputs)
3. Configure objects in "Message from PLC" folder (outputs)
4. Note PLC Configuration value (e.g., 44224)
5. Assign to `PlcConfigFHPP_PLUS_IN` / `PlcConfigFHPP_PLUS_OUT`

**PLC Configuration Format:**
- Each digit = object width
- 1 = 8-bit object
- 2 = 16-bit object
- 4 = 32-bit object
- Example: 44224 = two 32-bit objects, one 16-bit object, two placeholders

**Access to FHPP+ Objects:**
- Input: `<DT_FML_REF>.FHPP_PLUS.IN.Object<1..10>`
- Output: `<DT_FML_REF>.FHPP_PLUS.OUT.Object<1..10>`

## Integration with CMMT Drives

The FHPP libraries control Festo motor controllers, which interface with CMMT servo drives via EtherCAT and CiA 402 protocol. For direct CMMT drive integration using PLCopen Motion function blocks, see the `festo-ptp` knowledge resource.

**Key Differences:**
- **FHPP Libraries**: Use FHPP profile with Festo motor controllers (CMMO-ST, CMMP-AS, etc.)
- **PLCopen Motion**: Use standard MC_*_Festo function blocks directly with CMMT drives
- **Do NOT mix**: FHPP libraries are for motor controllers; PLCopen is for EtherCAT servo drives

## Common Usage Patterns

### Basic Control Sequence (V3.5)

```
// 1. Read input data
fbReadData(
  FML_REF       := struAxis,
  DeviceType    := CMMO_ST,
  Modbus        := FALSE,
  HighByteFirst := FALSE,
  FPC_active    := TRUE,
  FHPP_Source   := FHPP_IN,
  FPC_Source    := FPC_IN
);

// 2. Control motor
fbControl(
  FML_REF       := struAxis,
  EnableDrive   := bEnable,
  Stop          := bStop,
  OPM           := nMode,
  StartTask     := bStart,
  SetValuePosition := nTargetPos,
  SetValueVelocity := nVel
);

// 3. Write output data
fbWriteData(
  FML_REF     := struAxis,
  FHPP_Target => FHPP_OUT,
  FPC_Target  => FPC_OUT
);
```

### Achieving Ready State

```
Action                    Feedback
----------------------    -------------------------
(power on)                SupplyVoltagePresent = TRUE
EnableDrive := TRUE       DriveEnabled = TRUE, MC = TRUE
Stop := TRUE              Ready = TRUE
Halt := TRUE              HaltActive = FALSE
```

### Homing Sequence

```
Action                    Feedback
----------------------    -------------------------
StartHoming := TRUE       AckStart = TRUE, MC = FALSE
                          DriveIsMoving = TRUE
(wait for completion)     MC = TRUE, HomingValid = TRUE
                          DriveIsMoving = FALSE
```

### Record Selection Mode

```
Action                    Feedback
----------------------    -------------------------
OPM := 0                  StateOPM = 0
RecordNo := 4             ActualRecordNo = 4
StartTask := TRUE         AckStart = TRUE, MC = FALSE
                          DriveIsMoving = TRUE
(positioning complete)    MC = TRUE, DriveIsMoving = FALSE
```

### Direct Position Mode

```
Action                    Feedback
----------------------    -------------------------
OPM := 1                  StateOPM = 1
SetValueVelocity := 50    ActualVelocity updated
SetValuePosition := 1000  ActualPosition updated
StartTask := TRUE         AckStart = TRUE, MC = FALSE
                          DriveIsMoving = TRUE
(positioning complete)    MC = TRUE, DriveIsMoving = FALSE
```

### Reading Parameters

```
fbReadPNU(
  FML_REF    := struAxis,
  Execute    := TRUE,
  Write      := FALSE,
  PNU        := 1011,  // Homing method
  Subindex   := 1
);
// Result in fbReadPNU.ActValue
```

### Writing Parameters

```
fbWritePNU(
  FML_REF    := struAxis,
  Execute    := TRUE,
  Write      := TRUE,
  PNU        := 1013,  // Homing acceleration
  Subindex   := 1,
  Value      := 5000
);
```

### Saving Parameters to Non-Volatile Memory

```
// Parameters volatile until saved with PNU 127.2
fbSavePNU(
  FML_REF    := struAxis,
  Execute    := TRUE,
  Write      := TRUE,
  PNU        := 127,
  Subindex   := 2,
  Value      := 1
);
```

## Troubleshooting / FAQ

### Q1: My motion function block returns errors after calling Execute. What should I check?

**A:** Verify the call sequence:
1. `FML_Read` must be called BEFORE control/parameter FBs
2. Control/parameter FBs execute in middle
3. `FML_Write` must be called AFTER all FBs
4. Check `Error` output and `Status.Msg` for error description
5. Ensure `FPC_active := TRUE` in FML_Read if using parameter FBs

### Q2: Which library should I use: Festo_Motion.lib or Festo_Motion_FHPP_3.library?

**A:**
- **CODESYS V2.3**: Use `Festo_Motion.lib`
- **CODESYS V3.5 / TwinCAT 3**: Use `Festo_Motion_FHPP_3.library`
- V3.5 library has better features (FHPP+, Modbus/TCP, improved error handling)
- V3.5 uses namespace `FML` prefix on all blocks

### Q3: The motor controller is powered on but DriveEnabled remains FALSE. Why?

**A:** Check these conditions:
1. `EnableDrive := TRUE` must be set
2. Load voltage must be present (`SupplyVoltagePresent = TRUE`)
3. PLC must have control priority (not FCT/HMI)
4. Some controllers require additional digital inputs (e.g., CMMO-ST needs DIN6)
5. Check for active faults via `Fault` output or `FPC_DIAG` block

### Q4: How do I use PLCopen Motion function blocks (MC_Power_Festo, MC_Home_Festo, etc.) with my Festo system?

**A:** PLCopen Motion function blocks are for direct EtherCAT servo drive control (CMMT drives), NOT for FHPP motor controllers. These are two different control architectures:
- **For CMMT servo drives via EtherCAT**: Use MC_*_Festo function blocks (see `festo-ptp` reference)
- **For motor controllers (CMMO-ST, CMMP-AS, etc.) via CANopen/Modbus**: Use FHPP function blocks described here

### Q5: My parameter read returns Error=TRUE with Cat=3, ID=0. What does this mean?

**A:** Status category 3 errors are FPC (parameter channel) errors:
- **ID=0**: Non-permitted PNU (parameter doesn't exist for this controller)
- **ID=1**: Parameter is read-only (cannot write)
- **ID=2**: Value exceeds limits
- **ID=3**: Wrong subindex
- **ID=20**: Non-permitted value

Check the controller's FHPP parameter documentation for valid PNU numbers and subindices.

### Q6: Can I control multiple motor controllers simultaneously?

**A:** Yes, create separate instances of all function blocks for each controller:
- Each controller needs its own `DT_FML_REF` structure
- Each needs separate `FML_Read`, `FHPP_CTRL`, `FML_Write` instances
- Parameter FBs automatically manage multi-controller access via `MemberID`
- Use separate I/O arrays for each controller's fieldbus data

---

**Important Notes:**

1. **Function Block Naming**: In CODESYS V3.5, all function blocks use the `FML` namespace prefix (e.g., `FML.FHPP_CTRL`). In V2.3, controller-specific prefixes are used (e.g., `CMMP_AS_CTRL`).

2. **Never Skip FML_Read/Write**: These blocks are mandatory in V3.5 for proper data preparation. Skipping them will cause communication failures.

3. **FHPP+ Limitations**: Only CMMP-AS and EMCA-EC support FHPP+. Do not enable for other controllers.

4. **FCT Compatibility**: When using `FPC_DATA_OBJECT` or `PRM_KO` blocks, FCT software cannot communicate with the controller.

5. **Parameter Persistence**: Written parameters are volatile and lost on power cycle unless saved with PNU 127 Subindex 2 := 1.

6. **Visualizations Available**: Each function block has a corresponding `VIS_*` visualization element for easier commissioning and debugging.

7. **File Transfer Duration**: `FPC_FILE` and `FPC_FILE_ARRAY` operations can take several minutes. Ensure adequate timeout settings.
