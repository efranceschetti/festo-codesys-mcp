# Festo Synchronized Drive Control — Application Note 100364

> Library for synchronizing motion of 2 or more axes using CODESYS SoftMotion on Festo CPX-E-CEC controllers. Provides FB_GEARING (linear coupling) and FB_CAMMING (electronic cam) function blocks.

## Overview

The `FestoSynchronizedDriveControl_V66` library offers function blocks and methods to synchronize motion of 2 or more axes. A **master axis** is actively controlled, and one or more **slave axes** follow synchronously via gearing or camming.

**Key capabilities:**
- Linear master-slave coupling with fixed gear ratio (FB_GEARING)
- Electronic cam plate coupling (FB_CAMMING)
- Centralized axis control (FB_AXIS_CONTROL_SM)
- Centralized error handling (FB_ERROR_HANDLING)
- Built-in visualizations for each FB

## Components

| Component | Version |
|-----------|---------|
| CODESYS V3 | V3.5 SP10 / SP12 |
| CPX-E-CEC-M1-PN | V3.5.12.0 |
| CPX-E-CEC-M1-EP | V3.5.10.0 |
| Library | FestoSynchronizedDriveControl_V66 |
| SoftMotion | V4.5.0.0 |

## Library Installation

1. In CODESYS: **Tools** → **Library Repository**
2. Click **Install**
3. Navigate to `FestoSynchronizedDriveControl_V66.compiled-library`
4. Select and install

---

## FB_AXIS_CONTROL_SM — Base Axis Controller

Central function block for basic motion control. All other FBs (FB_GEARING, FB_CAMMING) inherit from this.

### Functionality
- Enable / Disable drive
- Reset drive (ErrorStop → Standstill)
- Acknowledge errors
- Jogging (continuous / incremental)
- Velocity-controlled movement
- Stop
- Homing
- Relative and absolute positioning
- Superimposed positioning

### Interface

```iecst
FUNCTION_BLOCK FB_AXIS_CONTROL_SM
VAR_INPUT
    pAXIS           : POINTER TO AXIS_REF_SM3; // Axis reference
    uiID            : UINT;                      // Axis ID for error tracking
    stManualDynamic : DYNAMIC;                   // Dynamics for manual/jog ops
END_VAR
VAR_OUTPUT
    xAxisReady      : BOOL;   // Axis is ready
    xReady          : BOOL;   // FB ready to accept commands
    xBusy           : BOOL;   // FB busy executing
    xAxisEnabled    : BOOL;   // Axis is enabled
    xErrorAxis      : BOOL;   // Axis error signal
    dwErrorAxisID   : DWORD;  // Axis error ID from drive
    xError          : BOOL;   // FB error signal
    nErrorID        : UDINT;  // FB error ID
    xIsMoving       : BOOL;   // Axis is in motion
    xAxisInPosition : BOOL;   // Axis reached target
    xHomed          : BOOL;   // Axis is referenced
END_VAR
```

### Methods

#### Enable
```iecst
METHOD Enable
VAR_INPUT
    xEnableAxis : BOOL; // TRUE=enable, FALSE=disable
END_VAR
```

#### Reset
Transition from ErrorStop → Standstill. Resets all axis and FB internal errors.
```iecst
METHOD Reset : BOOL
VAR_INPUT
    xAxisReset : BOOL; // Rising edge triggers reset
END_VAR
VAR_OUTPUT
    xDone : BOOL; // Reset complete
END_VAR
```

#### Acknowledge
```iecst
METHOD Acknowledge
VAR_INPUT
    xACkError : BOOL; // Acknowledge error
END_VAR
```

#### EStop
Controlled motion stop → standstill. Stops any active function block.
```iecst
METHOD EStop : BOOL
VAR_INPUT
    xEStop         : BOOL;  // Trigger emergency stop
    lrDeceleration : LREAL; // Deceleration value
END_VAR
```

#### ExecHome
Homing — method configured in drive. Ends at standstill.
```iecst
METHOD ExecHome
VAR_INPUT
    xExecHome  : BOOL;  // Rising edge starts homing
    lrPosition : LREAL; // Absolute position at reference signal
END_VAR
VAR_OUTPUT
    xHomed      : BOOL; // Homing complete, velocity = 0
    xHomingError : BOOL; // Homing error occurred
END_VAR
```

#### ExecPosition
Absolute or relative positioning.
```iecst
METHOD ExecPosition
VAR_INPUT
    xExecute  : BOOL;    // Rising edge starts move
    STPosData : PosData; // Position data structure
    stDyn     : Dynamic; // Dynamic values (vel, acc, dec)
END_VAR
VAR_OUTPUT
    xInPosition : BOOL; // Target position reached
    xStopped    : BOOL;
END_VAR
```

#### ExecMoveVelocity
Continuous velocity movement (infinite until interrupted).
```iecst
METHOD ExecMoveVelocity
VAR_INPUT
    xEnableMove        : BOOL;             // Rising edge starts
    stMoveVelocityData : MoveVelocityData; // Velocity data
END_VAR
VAR_OUTPUT
    xInVelocity : BOOL; // Target velocity reached
END_VAR
```

#### Jogging
Two-speed jog: starts slow, then accelerates after delay.
```iecst
METHOD Jogging
VAR_INPUT
    xJoggPos     : BOOL;       // Jog positive
    xJoggNeg     : BOOL;       // Jog negative
    stManualData : ManualData;  // Jog dynamics structure
END_VAR
VAR_OUTPUT
    xStopped : BOOL;
    xBusy    : BOOL;
END_VAR
```

#### Stepping
Step-by-step gradual motion.
```iecst
METHOD Stepping
VAR_INPUT
    xStepPos      : BOOL;    // Step positive (stops at distance)
    xStepNeg      : BOOL;    // Step negative
    rDistance      : LREAL;   // Distance to travel
    stStepDynamic : DYNAMIC; // Step dynamics
END_VAR
VAR_OUTPUT
    xBusy : BOOL;
END_VAR
```

#### ExecPosSuperimposed
Overlaid relative motion on top of current movement.
```iecst
METHOD xExecPosSuperimposed
VAR_INPUT
    xExecute       : BOOL;          // Rising edge starts
    STSuperImpData : SuperImpData;  // Superimposed parameters
END_VAR
VAR_OUTPUT
    xSuperimposedBusy    : BOOL;
    xSuperimposedDone    : BOOL;
    xSuperimposedAborted : BOOL;
END_VAR
```

#### ReadAxisState
Continuous axis state reading.
```iecst
METHOD ReadAxisState
VAR_OUTPUT
    xReady        : BOOL;  // Communication OK, no errors
    xError        : BOOL;  // FB error
    nErrorID      : UDINT; // FB error ID
    xErrorAxis    : BOOL;  // Axis in error state
    dwErrorAxisID : DWORD; // Drive error ID
END_VAR
```

---

## FB_GEARING — Linear Gear Coupling

Couples a slave axis to a master axis with a **fixed gear ratio**.

### Additional Inputs (beyond FB_AXIS_CONTROL_SM)

```iecst
VAR_INPUT
    pMASTER            : POINTER TO AXIS_REF_SM3; // Master axis reference
    stUserGearData     : GearData;                 // Gear ratio structure
    stUserGearInPosData : GearInPosData;           // GearInPos structure
END_VAR
```

### Methods

#### ExecGearIn
Activates linear gear coupling.
```iecst
METHOD ExecGearIn
VAR_INPUT
    xExecute : BOOL; // Rising edge activates coupling
END_VAR
VAR_OUTPUT
    xInGear         : BOOL; // Coupling successful
    xGearError      : BOOL; // GearIn error
    xCommandAborted : BOOL; // Coupling aborted
    xBusy           : BOOL; // Motion in progress
END_VAR
```

#### ExecGearInPos
Precise synchronization of slave axis with master axis at specific positions.
```iecst
METHOD ExecGearInPos
VAR_INPUT
    xExecute        : BOOL;          // Rising edge
    stGearInPosData : GearInPosData; // Synchronization parameters
END_VAR
VAR_OUTPUT
    xStartSync      : BOOL; // Synchronization started
    xInSync         : BOOL; // Coupling complete
    xCommandAborted : BOOL;
    xBusy           : BOOL;
END_VAR
```

#### ExecGearOut
Decouples slave from master.
```iecst
METHOD ExecGearOut
VAR_INPUT
    xExecute : BOOL; // Rising edge decouples
END_VAR
VAR_OUTPUT
    xDone         : BOOL; // Decoupling successful
    xGearOutError : BOOL; // Error
END_VAR
```

---

## FB_CAMMING — Electronic Cam Plate Coupling

Couples a slave axis to a master axis via a **cam table** (electronic cam plate).

### Additional Inputs (beyond FB_AXIS_CONTROL_SM)

```iecst
VAR_INPUT
    pMASTER     : POINTER TO AXIS_REF_SM3; // Master axis reference
    pCamRefVisu : POINTER TO MC_CAM_REF;   // Cam reference pointer
END_VAR
VAR_OUTPUT
    pActCam : POINTER TO MC_CAM_REF; // Pointer to active cam
END_VAR
```

### Methods

#### ExecCamIn
Activates master-slave coupling with cam table.
```iecst
METHOD ExecCamIn
VAR_INPUT
    xExecute    : BOOL;          // Rising edge activates
    xCamReset   : LREAL;         // Reset CamIn error
    stCammingData : CammingData; // Cam dynamics
    CamTableID  : MC_CAM_ID;    // Table ID to use
END_VAR
VAR_OUTPUT
    xInSync         : BOOL; // Coupling successful
    EndOfProfile    : BOOL; // End of cam reached (pulsed for periodic)
    xCamError       : BOOL; // CamIn error
    xCommandAborted : BOOL; // Coupling aborted
    xBusy           : BOOL;
END_VAR
```

#### ExecCamOut
Deactivates cam coupling.
```iecst
METHOD ExecCamOut
VAR_INPUT
    xExecute : BOOL;
END_VAR
VAR_OUTPUT
    xDone  : BOOL; // Decoupling successful
    xError : BOOL;
END_VAR
```

> **Note**: The cam table must be created and executed (via FB_AutoList_InternalCam) before CamIn can be started.

---

## FB_AutoList_InternalCam — Cam Table Scanner

Automatically scans all available CAM tables from the CODESYS CAM editor and lists them.

### Interface

```iecst
VAR_INPUT
    uiSelCAM   : UINT;     // Selected CAM index
    arpCamUser : POINTER TO ARRAY[1..256] OF POINTER TO MC_CAM_REF;
END_VAR
VAR_OUTPUT
    uiSelectCAM : UINT;    // Currently selected CAM
    pActCam     : POINTER TO MC_CAM_REF; // Pointer to selected CAM
    sActCamName : STRING;  // Name of selected CAM
    uiMaxCamNo  : UINT;    // Total available CAMs
    arsCam      : ARRAY[1..256] OF STRING; // All CAM names
END_VAR
```

> **Usage**: Call FB_AutoList_InternalCam **before** FB_CAMMING to populate cam references.

---

## FB_ERROR_HANDLING — Centralized Error Management

Collects errors from all axis function blocks dynamically.

### Interface

```iecst
VAR_INPUT
    aiMotionFB   : ARRAY[1..MAX_ITF_AXIS_CONTROL] OF ITF_AXIS_CONTROL;
                   // Interface for flexible access to all axis FBs
    xAckALLError : BOOL; // Acknowledge all errors
    xGetAxesErrors : BOOL; // Trigger error collection
END_VAR
```

---

## Typical Usage Pattern

```iecst
// 1. Declare instances
VAR
    fbMaster  : FB_AXIS_CONTROL_SM;
    fbSlave   : FB_GEARING;         // or FB_CAMMING
    fbErrors  : FB_ERROR_HANDLING;
    fbCamList : FB_AutoList_InternalCam;

    refMaster : AXIS_REF_SM3;
    refSlave  : AXIS_REF_SM3;
END_VAR

// 2. Configure master
fbMaster(pAXIS := ADR(refMaster), uiID := 1);
fbMaster.Enable(xEnableAxis := TRUE);
fbMaster.ExecHome(xExecHome := TRUE, lrPosition := 0.0);

// 3. Configure slave with gearing
fbSlave(pAXIS := ADR(refSlave), pMASTER := ADR(refMaster), uiID := 2);
fbSlave.Enable(xEnableAxis := TRUE);
fbSlave.ExecHome(xExecHome := TRUE, lrPosition := 0.0);

// 4. Activate gear coupling
fbSlave.ExecGearIn(xExecute := TRUE);

// 5. Move master — slave follows automatically
fbMaster.ExecMoveVelocity(xEnableMove := TRUE, stMoveVelocityData := stVelData);

// 6. Error handling
fbErrors(
    aiMotionFB := [fbMaster, fbSlave],
    xGetAxesErrors := TRUE
);
```

## Important Notes

- Each FB has its own **built-in visualization** (add via frame configuration in CODESYS)
- **Control authority**: Can be switched between visualization and PLC to avoid conflicting signals — user must implement this logic
- The library requires **CODESYS SoftMotion V4.5.0.0** license
- All FBs use `AXIS_REF_SM3` references (SoftMotion 3 standard)
- `DYNAMIC` struct contains velocity, acceleration, deceleration, and jerk parameters
