---
id: codesys-ground-truth
title: CODESYS Anti-Hallucination Rules and XML DNA
priority: CRITICAL
use_when:
  - generating or validating PLCopen XML
  - need verified Motion FB signatures
  - checking XML structure rules
  - resolving CODESYS compile or import errors
never_use_when:
  - writing ST code without XML generation
  - working on HMI or I/O only
keywords: [ground truth, anti-hallucination, XML, DNA, connection, coordinates, MC_Power, MC_Home, instances, configurations, do not invent, do not hallucinate, verified rules, golden sample, export to CODESYS, export my code to codesys, codesys import, PLCopen DNA, XML rules, before generating XML, literalism, ObjectId, ProjectStructure, folders in XML, globalVars placement, GVL in root addData, PROGRAM in resource, resource task, Libraries element, CODESYS export structure, reimport identity, generator known gaps, what the generator does not emit]
see_also: [xml-rules, plcopen-schema, plcopen-example, plcopen-extensions]
---

# CODESYS Ground Truth (v3.0)

## Anti-Hallucination Rules
1. LITERALISM: XML must match verified Golden Samples
2. TYPES: Never connect BOOL to numeric ports (INT/REAL)
3. SCHEMAS: Mandatory `<instances><configurations/></instances>` footer
4. ZERO-ID: No id= on connection tags
5. MANDATORY HEADER: contentHeader MUST contain coordinateInfo with fbd/ld/sfc
6. CASE SENSITIVITY: Base types lowercase (`<string/>`, `<wstring/>`)

## XML DNA
- Connections: `<connection refLocalId="X" formalParameter="OUT">`
- Coordinates: Blocks height="60" width="50", steps of 10
- Structure: interface -> body -> LD/ST -> instances

## Motion FB Signatures (Verified)
- MC_Power: Enable, Enable_Positive, Enable_Negative, Axis(InOut), Status(Out), Error(Out)
- MC_Home: Execute, Position, Axis(InOut), Done(Out), Error(Out)
- MC_MoveAbsolute: Execute, Position, Velocity, Acceleration, Deceleration, Axis(InOut), Done(Out)
- MC_MoveRelative: Execute, Distance, Velocity, Axis(InOut), Done(Out)
- MC_MoveVelocity: Execute, Velocity, Axis(InOut), InVelocity(Out)
- MC_Stop: Execute, Deceleration, Axis(InOut), Done(Out)
- MC_Reset: Execute, Axis(InOut), Done(Out), Error(Out)
- MC_ReadStatus: Enable, Axis(InOut), Standstill(Out), Homing(Out), DiscreteMotion(Out), ContinuousMotion(Out), ErrorStop(Out)
- MC_ReadActualPosition: Enable, Axis(InOut), Position(Out), Valid(Out)
- TON: IN(BOOL), PT(TIME), Q(BOOL), ET(TIME)
- TOF: IN(BOOL), PT(TIME), Q(BOOL), ET(TIME)
- R_TRIG: CLK(BOOL), Q(BOOL)
- F_TRIG: CLK(BOOL), Q(BOOL)
- CTU: CU(BOOL), RESET(BOOL), PV(INT), Q(BOOL), CV(INT)
- CTD: CD(BOOL), LOAD(BOOL), PV(INT), Q(BOOL), CV(INT)

## IEC 61131-3 Data Types

| Type    | Size    | Range                              |
|---------|---------|------------------------------------|
| BOOL    | 1 bit   | FALSE / TRUE                       |
| BYTE    | 8 bit   | 0..255                             |
| WORD    | 16 bit  | 0..65535                           |
| DWORD   | 32 bit  | 0..4294967295                      |
| LWORD   | 64 bit  | 0..2^64-1                          |
| SINT    | 8 bit   | -128..127                          |
| INT     | 16 bit  | -32768..32767                      |
| DINT    | 32 bit  | -2147483648..2147483647            |
| LINT    | 64 bit  | -2^63..2^63-1                      |
| USINT   | 8 bit   | 0..255                             |
| UINT    | 16 bit  | 0..65535                           |
| UDINT   | 32 bit  | 0..4294967295                      |
| ULINT   | 64 bit  | 0..2^64-1                          |
| REAL    | 32 bit  | ~1.2E-38..~3.4E+38                 |
| LREAL   | 64 bit  | ~2.2E-308..~1.8E+308               |
| TIME    | 32 bit  | T#0ms..T#49d17h2m47s295ms          |
| LTIME   | 64 bit  | Extended time range                |
| STRING  | Variable| 1..255 chars (default 80)          |
| WSTRING | Variable| 1..255 wide chars                  |

## Common CODESYS Errors

### Compile Errors
| Code     | Meaning                                      | Fix                                    |
|----------|----------------------------------------------|----------------------------------------|
| C0032    | Undeclared identifier                        | Declare variable or add library        |
| C0046    | Type mismatch in assignment                  | Use explicit type conversion           |
| C0061    | Missing END_* statement                      | Check matching IF/END_IF, CASE/END_CASE|
| C0131    | Too many arguments for function              | Check FB signature, remove extra args  |
| C0164    | Cannot convert type X to type Y              | Use TO_INT(), TO_REAL(), etc.          |

### Runtime Errors
| Code     | Meaning                                      | Fix                                    |
|----------|----------------------------------------------|----------------------------------------|
| 3001     | Watchdog timeout                             | Remove WHILE/REPEAT or reduce cycle    |
| 3002     | Hardware watchdog                            | Reduce task cycle time or code load    |
| 3500     | Division by zero                             | Add zero-check before division         |
| 3504     | Array index out of bounds                    | Validate index before access           |

### PLCopen XML Import Errors
| Symptom                          | Cause                               | Fix                                    |
|----------------------------------|-------------------------------------|----------------------------------------|
| "Invalid namespace"              | Missing PLCopen TC6 0200 namespace  | Add xmlns to project element           |
| "Invalid structure"              | Self-closing contentHeader          | Use open+close contentHeader tags      |
| "coordinateInfo required"        | Missing fbd/ld/sfc children         | Add all three coordinate sections      |
| "Import failed silently"         | Missing instances footer            | Add instances/configurations footer    |

## Compiler Directives

| Directive                             | Purpose                                           |
|---------------------------------------|---------------------------------------------------|
| `{attribute 'qualified_only'}`        | GVL requires prefix (GVL_Sys.bReady)              |
| `{attribute 'no_assign'}`            | Prevents assignment of FB instances                |
| `{attribute 'pack_mode' := '1'}`     | Byte-aligned struct packing                        |
| `{attribute 'init' := '0'}`          | Force initial value                                |
| `{attribute 'monitoring' := 'call'}` | Enable call monitoring in online mode              |
| `{attribute 'reflection'}`           | Enable reflection for OPC UA / Visu               |

## PLCopen XML Mandatory Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader companyName="" productName="" productVersion=""
              creationDateTime="..." />
  <contentHeader name="ProjectName">
    <coordinateInfo>
      <fbd><scaling x="1" y="1"/></fbd>
      <ld><scaling x="1" y="1"/></ld>
      <sfc><scaling x="1" y="1"/></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes><!-- DUTs here --></dataTypes>
    <pous><!-- POUs here --></pous>
  </types>
  <instances>
    <configurations/>
  </instances>
</project>
```

## CODESYS Exported XML — Real-World Structure

The mandatory structure above is the minimum a valid import needs. A **full project exported by
CODESYS** (`Project → Export PLCopen XML…`) carries more, and knowing the anatomy matters when you
want a generated file to reimport with a stable identity. Macro layout of a real export:

```text
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader .../>
  <contentHeader name="Project.project"> <coordinateInfo>…</coordinateInfo> </contentHeader>

  <types>                                  <!-- pure types + FB/FUNCTION bodies -->
    <dataTypes> <dataType name="E_…">…</dataType> </dataTypes>
    <pous>      <pou name="FB_…" pouType="functionBlock">…</pou> </pous>  <!-- NOT programs -->
  </types>

  <instances>                              <!-- hardware + application + tasks + PROGRAMS -->
    <configurations>
      <configuration name="Device">
        <resource name="Application">
          <task name="MainTask" interval="PT0.02S" priority="20">
            <pouInstance name="PLC_PRG" typeName=""/>
          </task>
          <addData>
            <data name="…/pou">                <!-- PROGRAMs live HERE, inside <resource> -->
              <pou name="PLC_PRG" pouType="program">…</pou>
            </data>
            <data name="…/libraries"> <Libraries> <Library .../> … </Libraries> </data>
            <data name="…/objectid"> <ObjectId>UUID</ObjectId> </data>
          </addData>
        </resource>
        <addData> <data name="Device"> <Device>…hardware…</Device> </data> </addData>
      </configuration>
    </configurations>
  </instances>

  <addData>                                 <!-- root-level: GVLs + folder tree -->
    <data name="…/globalvars"> <globalVars name="GVL_…">…</globalVars> </data>
    <data name="…/projectstructure"> <ProjectStructure> …folders + objects… </ProjectStructure> </data>
  </addData>
</project>
```

Key placement rules that surprise people:

- **`ObjectId` on every object.** Each `<dataType>`, `<pou>`, `<globalVars>`, `<task>`,
  `<Library>`, and the Device gets its own `<addData><data name="…/objectid"><ObjectId>UUID-v4
  </ObjectId></data></addData>`. The `<ProjectStructure>` folder tree references objects **by
  ObjectId** — and on reimport, a *stable* ObjectId is what lets CODESYS update the existing object
  instead of creating a duplicate.
- **`<globalVars>` lives at root-level `<addData>`**, NOT inside `<types>`. A GVL under `<types>`
  is wrong and can be dropped on import.
- **PROGRAMs live inside `<instances>/<configuration>/<resource>/<addData>`**, not in the global
  `<types><pous>`. Only FBs and FUNCTIONs go in `<pous>`.
- **`<instances>` carries the real hardware/application tree** — Device, resource, tasks, and the
  `pouInstance` bindings — plus `<Libraries>` (which drives the Library Manager).
- **`<ProjectStructure>`** defines the folder hierarchy shown in the device tree; each `<Object>`
  in a `<Folder>` is only a *reference* by name/ObjectId — the real body stays in
  `<dataTypes>`/`<pous>`/`…/globalvars`.

### What this MCP's generator emits vs. the full export (known gaps)

This server's `generate_plcopen_xml` targets a **valid, importable** file, not a byte-for-byte
CODESYS export. Be honest about the difference:

| Aspect | This generator | Full CODESYS export |
| ------ | -------------- | ------------------- |
| Valid PLCopen import | ✅ yes | ✅ yes |
| `<globalVars>` at root `<addData>` | ✅ correct placement | ✅ |
| `<ProjectStructure>` (flat folders) | ✅ emitted | ✅ (supports nesting) |
| Retain / persistent / `qualified_only` | ✅ preserved | ✅ |
| **`ObjectId` per object** | ❌ not emitted | ✅ required for 1:1 reimport identity |
| **`<Libraries>` block** | ❌ not emitted | ✅ controls Library Manager |
| **Populated `<instances>` (Device/Task)** | ❌ empty `<configurations/>` | ✅ full hardware tree |
| **PROGRAMs inside `<resource>`** | ❌ placed in global `<pous>` | ✅ inside `<resource>` |
| Nested folder paths (`A/B/C`) | ❌ flat only | ✅ |

Practical consequence: a generated file **imports cleanly and CODESYS assigns fresh ObjectIds**,
but because those IDs are not carried in the XML, a re-import is not guaranteed to update objects
1:1 (it may re-create). Deterministic `ObjectId` and a populated `<instances>` tree are a **known
gap / future enhancement**, not a claim this generator already makes. When byte-level export
fidelity matters, export from CODESYS itself.

---

## Type Conversion Functions

| From → To | Function        | Example                          |
|-----------|-----------------|----------------------------------|
| INT→REAL  | INT_TO_REAL()   | rVal := INT_TO_REAL(nCount);     |
| REAL→INT  | REAL_TO_INT()   | nVal := REAL_TO_INT(rTemp);      |
| BOOL→INT  | BOOL_TO_INT()   | nVal := BOOL_TO_INT(bFlag);     |
| INT→STRING| INT_TO_STRING() | sVal := INT_TO_STRING(nCode);    |
| ANY→ANY   | TO_<type>()     | nVal := TO_INT(rTemp);           |

## Task Configuration (Typical)

| Task Name | Priority | Cycle Time | Purpose                    |
|-----------|----------|------------|----------------------------|
| MainTask  | 1        | 4ms        | Motion control, fast I/O   |
| SlowTask  | 10       | 20ms       | HMI update, diagnostics    |
| InitTask  | 0        | Event      | One-shot initialization    |
