/**
 * gen-synthetic-fixture.mjs
 *
 * Generates a synthetic, fully generic PLCopen TC6 0200 XML fixture used by the
 * Python XSD-gate tests. It reuses the SAME generator that the `generate_plcopen_xml`
 * MCP tool uses (parseStFile + buildProjectXml from build/), so the fixture proves
 * the production pipeline against a large, multi-POU project without shipping any
 * real customer export.
 *
 * Coverage (mirrors the reference project the fixture replaces):
 *   - 20+ Function Blocks (FB_Station01..FB_StationNN) with a 0/10/20/90/99 state
 *     machine, nested FB instances, and bErr/nErrId error interface
 *   - 2 helper FBs used as nested instances (FB_Debounce, FB_Delay)
 *   - 1 cyclic PROGRAM (PRG_Main)
 *   - 2 FUNCTIONs (F_ClampReal, F_ScaleInt)
 *   - 2 GVLs, one of them VAR_GLOBAL CONSTANT with {attribute 'qualified_only'}
 *   - 2 ENUMs (E_StationMode, E_MachineState) + 2 STRUCTs (ST_AxisConfig, ST_StationStats)
 *   - Types exercised: BOOL, INT, DINT, UDINT, REAL, LREAL, TIME, STRING, ARRAY
 *   - Both comment styles: // line comments and (* block comments *)
 *
 * Everything is 100% synthetic — no customer, machine, or personal names.
 *
 * Run: node scripts/gen-synthetic-fixture.mjs
 */

import { writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseStFile } from '../build/utils/st-parser.js';
import { buildProjectXml } from '../build/utils/xml-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT = resolve(REPO_ROOT, 'python/tests/fixtures/synthetic-project-valid.xml');

// Number of FB_StationNN blocks. Minimum 20 per the coverage spec; bump this if
// the generated XML ever drops below the 100 KB XSD-gate threshold.
const N_STATIONS = 24;

/** Two-digit zero-padded station index. */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Build the ST source for one synthetic station Function Block. */
function stationFb(idx) {
  const id = pad(idx);
  return `FUNCTION_BLOCK FB_Station${id}
(* Synthetic station Function Block ${id} — generated for XSD-gate coverage.
   Standard interface: bEnable/bExecute -> bDone/bBusy/bErr/nErrId. *)
VAR_INPUT
    bEnable      : BOOL;                 // Enable this station
    bExecute     : BOOL;                 // Trigger one work cycle
    bReset       : BOOL;                 // Clear latched error
    nMode        : INT := 0;             // Operating mode selector
    rSetpoint    : REAL := 0.0;          // Target setpoint
    tTimeout     : TIME := T#5S;         // Watchdog timeout
    sLabel       : STRING := 'station';  (* Human-readable label *)
    nStationId   : DINT := ${idx};       // Station identifier
END_VAR
VAR_OUTPUT
    bDone        : BOOL;                 // Cycle finished
    bBusy        : BOOL;                 // Cycle running
    bErr         : BOOL;                 // Error latched
    nErrId       : DINT := 0;            // Active error code
    rActPos      : REAL;                 // Actual position feedback
    nCycleCount  : UDINT := 0;           // Completed cycle counter
END_VAR
VAR
    nState       : INT := 0;             // State machine register
    fbSub        : FB_Debounce;          (* Nested FB instance *)
    fbTimer      : FB_Delay;             // Nested FB instance
    anBuffer     : ARRAY[0..9] OF INT;   // Integer ring buffer
    arSamples    : ARRAY[0..7] OF REAL;  (* Sample window *)
    lrAccum      : LREAL := 0.0;         // Long accumulator
    tElapsed     : TIME;                 // Elapsed cycle time
    bInternal    : BOOL;                 // Internal work flag
END_VAR
VAR CONSTANT
    nMaxRetries  : INT := 3;             // Retry limit
    rScale       : REAL := 1.5;          // Setpoint scale factor
END_VAR

// ${id}: main state machine — 0 IDLE / 10-20 WORK / 90 DONE / 99 ERROR
CASE nState OF
    0: // IDLE — wait for enable + execute
        bBusy := FALSE;
        bDone := FALSE;
        IF bEnable AND bExecute THEN
            nState := 10;
        END_IF

    10: // WORK: acquire
        bBusy := TRUE;
        nCycleCount := nCycleCount + 1;
        fbSub(bIn := bEnable);
        nState := 20;

    20: (* WORK: process the sample and compute position *)
        rActPos := rSetpoint * rScale;
        lrAccum := lrAccum + LREAL#TO_LREAL(rActPos);
        fbTimer(bStart := TRUE, tDelay := tTimeout);
        IF fbTimer.bDone THEN
            nState := 90;
        END_IF

    90: // DONE — publish result, return to idle
        bDone := TRUE;
        bBusy := FALSE;
        nState := 0;

    99: // ERROR — latch fault
        bErr := TRUE;
        nErrId := 16#8001;
        bBusy := FALSE;
END_CASE

// Global reset path
IF bReset THEN
    bErr := FALSE;
    nErrId := 0;
    nState := 0;
END_IF
END_FUNCTION_BLOCK`;
}

/** Helper FB used as a nested instance inside every station. */
const FB_DEBOUNCE = `FUNCTION_BLOCK FB_Debounce
(* Synthetic debounce helper — used as a nested instance. *)
VAR_INPUT
    bIn      : BOOL;            // Raw input
    tDebounce: TIME := T#20MS;  // Debounce time
END_VAR
VAR_OUTPUT
    bOut     : BOOL;            // Debounced output
END_VAR
VAR
    nState   : INT := 0;        // State machine
    bLast    : BOOL;            // Last raw sample
END_VAR

CASE nState OF
    0: // IDLE
        IF bIn <> bLast THEN
            nState := 10;
        END_IF
    10: // SETTLING
        bLast := bIn;
        bOut := bIn;
        nState := 0;
END_CASE
END_FUNCTION_BLOCK`;

/** Helper FB used as a nested instance inside every station. */
const FB_DELAY = `FUNCTION_BLOCK FB_Delay
(* Synthetic on-delay helper — used as a nested instance. *)
VAR_INPUT
    bStart   : BOOL;           // Start the delay
    tDelay   : TIME := T#1S;   // Delay duration
END_VAR
VAR_OUTPUT
    bDone    : BOOL;           // Delay elapsed
END_VAR
VAR
    nState   : INT := 0;       // State machine
    tElapsed : TIME;           // Accumulated time
END_VAR

CASE nState OF
    0: // IDLE
        bDone := FALSE;
        IF bStart THEN
            nState := 10;
        END_IF
    10: // TIMING
        bDone := TRUE;
        nState := 90;
    90: // DONE
        IF NOT bStart THEN
            nState := 0;
        END_IF
END_CASE
END_FUNCTION_BLOCK`;

/** Cyclic main program that instantiates every station. */
function mainProgram(n) {
  const decls = [];
  for (let i = 1; i <= n; i++) {
    decls.push(`    fbStation${pad(i)} : FB_Station${pad(i)};   // Station ${pad(i)} instance`);
  }
  const calls = [];
  for (let i = 1; i <= n; i++) {
    calls.push(`fbStation${pad(i)}(bEnable := GVL_Machine.bMachineReady, bExecute := bTick, bReset := bClearAll);`);
  }
  return `PROGRAM PRG_Main
(* Synthetic cyclic program — drives every station instance. *)
VAR
${decls.join('\n')}
    nHeartbeat   : UDINT := 0;           // Free-running heartbeat
    bTick        : BOOL;                 // One-shot execute pulse
    bClearAll    : BOOL;                 // Broadcast reset
    rLineSpeed   : REAL := 0.0;          (* Current line speed *)
    tScanTime    : TIME;                 // Measured scan time
    sStatus      : STRING := 'RUN';      // Status text
END_VAR

// Heartbeat + broadcast drive of all stations
nHeartbeat := nHeartbeat + 1;

${calls.join('\n')}

IF GVL_Machine.nActiveStation > GVL_Config.nMaxStations THEN
    bClearAll := TRUE;
END_IF
END_PROGRAM`;
}

/** Two synthetic FUNCTIONs (typed return values). */
const F_CLAMP_REAL = `FUNCTION F_ClampReal : REAL
(* Clamp a REAL value into [rMin, rMax]. *)
VAR_INPUT
    rValue   : REAL;   // Value to clamp
    rMin     : REAL;   // Lower bound
    rMax     : REAL;   // Upper bound
END_VAR

IF rValue < rMin THEN
    F_ClampReal := rMin;
ELSIF rValue > rMax THEN
    F_ClampReal := rMax;
ELSE
    F_ClampReal := rValue;
END_IF
END_FUNCTION`;

const F_SCALE_INT = `FUNCTION F_ScaleInt : DINT
(* Scale a raw INT by a signed DINT factor. *)
VAR_INPUT
    nRaw     : INT;    // Raw reading
    nFactor  : DINT;   // Scale factor
END_VAR

F_ScaleInt := DINT#TO_DINT(nRaw) * nFactor;
END_FUNCTION`;

/** Two synthetic ENUM DUTs. */
const E_STATION_MODE = `TYPE E_StationMode :
(
    IDLE := 0,      (* Waiting *)
    ACQUIRE := 10,  // Acquiring
    PROCESS := 20,  // Processing
    DONE := 90,     // Finished
    FAULT := 99     // Error
);
END_TYPE`;

const E_MACHINE_STATE = `TYPE E_MachineState :
(
    OFF := 0,       // Powered off
    INIT := 10,     // Initializing
    READY := 20,    // Ready to run
    RUNNING := 30,  // Producing
    STOPPING := 50, // Stopping
    ERROR := 99     (* Faulted *)
);
END_TYPE`;

/** Two synthetic STRUCT DUTs (exercise REAL/INT/BOOL/DINT/TIME/STRING members). */
const ST_AXIS_CONFIG = `TYPE ST_AxisConfig :
STRUCT
    rMaxVel   : REAL := 100.0;   // Max velocity
    rMaxAcc   : REAL := 500.0;   (* Max acceleration *)
    rMaxDec   : REAL := 500.0;   // Max deceleration
    nAxisId   : INT := 0;        // Axis identifier
    bInverted : BOOL := FALSE;   // Direction inverted
    tTimeout  : TIME := T#10S;   // Motion timeout
END_STRUCT
END_TYPE`;

const ST_STATION_STATS = `TYPE ST_StationStats :
STRUCT
    nTotalCycles : UDINT := 0;   // Total cycles run
    nFaultCount  : DINT := 0;    // Fault count
    lrUptimeSec  : LREAL := 0.0; (* Uptime in seconds *)
    rLastPos     : REAL := 0.0;  // Last actual position
    sLastFault   : STRING := ''; // Last fault text
END_STRUCT
END_TYPE`;

/** Machine GVL (non-constant) with qualified_only attribute. */
const GVL_MACHINE = `{attribute 'qualified_only'}
VAR_GLOBAL
    bMachineReady  : BOOL;                  // Machine ready flag
    bEStop         : BOOL;                  (* Emergency stop active *)
    eMachineMode   : E_MachineState;        // Current machine state
    stAxisCfg      : ST_AxisConfig;         // Shared axis config
    nActiveStation : INT := 0;              // Active station index
    rLineSpeed     : REAL := 0.0;           // Line speed
    lrProduced     : LREAL := 0.0;          // Produced count (long)
    tHeartbeat     : TIME;                  // Heartbeat period
    sMachineName   : STRING := 'LineA';     // Machine name
END_VAR`;

/** Config GVL — VAR_GLOBAL CONSTANT with qualified_only attribute. */
const GVL_CONFIG = `{attribute 'qualified_only'}
VAR_GLOBAL CONSTANT
    nMaxStations   : INT := ${N_STATIONS};  // Max stations
    nBufferSize    : UDINT := 256;          // Buffer size
    rPi            : REAL := 3.14159;        (* Pi constant *)
    lrGravity      : LREAL := 9.80665;      // Gravity constant
    tCycleTimeout  : TIME := T#5S;          // Default cycle timeout
    sVersion       : STRING := '1.0.0';     // Fixture version
END_VAR`;

/**
 * P2.0 coverage: persistent GVL — exercises retain="true" persistent="true"
 * emission (bug A1) against the official TC6 XSD.
 */
const GVL_PERSIST = `VAR_GLOBAL PERSISTENT RETAIN
    nPowerCycles   : UDINT := 0;            // Power-cycle counter
    rTotalRuntime  : LREAL := 0.0;          // Accumulated runtime [h]
    nLastRecipeId  : INT := 0;              // Recipe restored on boot
END_VAR`;

/**
 * P2.0 coverage: qualified_only DUT — exercises the addData attribute block
 * on a dataType (bug A3) against the official TC6 XSD.
 */
const E_ALARM_CLASS = `{attribute 'qualified_only'}
TYPE E_AlarmClass :
(
    None    := 0,   // No alarm
    Warning := 1,   // Warning — production continues
    Fault   := 2,   // Fault — station stops
    Safety  := 3    (* Safety — machine trips *)
) INT := None;
END_TYPE`;

// ── Assemble the synthetic source set ──────────────────────────────────
/** @type {Array<{ file: string; code: string }>} */
const sources = [];

// DUTs
sources.push({ file: 'E_StationMode.st', code: E_STATION_MODE });
sources.push({ file: 'E_MachineState.st', code: E_MACHINE_STATE });
sources.push({ file: 'E_AlarmClass.st', code: E_ALARM_CLASS });
sources.push({ file: 'ST_AxisConfig.st', code: ST_AXIS_CONFIG });
sources.push({ file: 'ST_StationStats.st', code: ST_STATION_STATS });

// GVLs (file name becomes the GVL name)
sources.push({ file: 'GVL_Machine.st', code: GVL_MACHINE });
sources.push({ file: 'GVL_Config.st', code: GVL_CONFIG });
sources.push({ file: 'GVL_Persist.st', code: GVL_PERSIST });

// Helper FBs (nested instances)
sources.push({ file: 'FB_Debounce.st', code: FB_DEBOUNCE });
sources.push({ file: 'FB_Delay.st', code: FB_DELAY });

// Station FBs
for (let i = 1; i <= N_STATIONS; i++) {
  sources.push({ file: `FB_Station${pad(i)}.st`, code: stationFb(i) });
}

// FUNCTIONs
sources.push({ file: 'F_ClampReal.st', code: F_CLAMP_REAL });
sources.push({ file: 'F_ScaleInt.st', code: F_SCALE_INT });

// Cyclic program
sources.push({ file: 'PRG_Main.st', code: mainProgram(N_STATIONS) });

// ── Parse + build (same pipeline as generate_plcopen_xml) ──────────────
const pous = [];
const dataTypes = [];
const gvls = [];

for (const { file, code } of sources) {
  const parsed = parseStFile(code, file);
  if (parsed.kind === 'pou') pous.push(parsed.pou);
  else if (parsed.kind === 'dataType') dataTypes.push(parsed.dataType);
  else if (parsed.kind === 'gvl') gvls.push(parsed.gvl);
}

const xml = buildProjectXml('SyntheticProject', pous, dataTypes, gvls);
writeFileSync(OUTPUT, xml, 'utf-8');

const sizeBytes = statSync(OUTPUT).size;

console.log(`Wrote: ${OUTPUT}`);
console.log(`Size:  ${sizeBytes} bytes`);
console.log(`POUs:  ${pous.length}  (${N_STATIONS} stations + 2 helpers + 1 PRG + 2 FUNCTIONs)`);
console.log(`DUTs:  ${dataTypes.length}  |  GVLs: ${gvls.length}`);

if (sizeBytes <= 100000) {
  console.error(`ERROR: fixture is ${sizeBytes} bytes (<= 100000). Increase N_STATIONS.`);
  process.exit(1);
}
