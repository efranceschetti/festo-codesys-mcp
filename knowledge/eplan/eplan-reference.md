---
id: eplan
title: EPLAN Platform — API, Data Portal, EDZ Integration
priority: MEDIUM
use_when:
  - user asks about EPLAN integration with CODESYS/Festo
  - need EPLAN .NET API or Data Portal REST API reference
  - working with EDZ device data format
never_use_when:
  - PLC programming without electrical engineering context
keywords: [EPLAN, CAE, Data Portal, EDZ, REST API, .NET, electrical, schematic, panel design, wiring diagram, control panel, cabinet design, electrical CAD, macro, terminal plan, Electric P8, Pro Panel, device data, part number lookup]
see_also: [festo-cpx]
---

# EPLAN Platform Reference

## Overview

EPLAN is the leading CAE (Computer-Aided Engineering) software suite for electrical engineering, automation, and control panel design. The platform includes:

| Product | Purpose |
|---------|---------|
| **EPLAN Electric P8** | Electrical schematic design (primary product) |
| **EPLAN Pro Panel** | 3D control cabinet/panel design |
| **EPLAN Fluid** | Fluid power (pneumatic/hydraulic) schematics |
| **EPLAN Harness proD** | Wire harness design |
| **EPLAN Preplanning** | Process/instrumentation planning |
| **EPLAN eMANAGE** | Cloud-based project management |

## EPLAN + CODESYS/PLC Integration

EPLAN Electric P8 and CODESYS are complementary tools in automation projects:

- **EPLAN** handles electrical schematics, wiring diagrams, PLC I/O assignment, terminal plans, cable lists
- **CODESYS** handles PLC programming, motion control, visualization
- **Bridge**: EPLAN exports PLC I/O lists, device tags, and signal names that map to CODESYS variables

### Typical Workflow
1. EPLAN: Design electrical schematics with PLC I/O assignments
2. EPLAN: Export I/O lists (CSV/XML) with device tags and addresses
3. CODESYS: Import I/O mapping, create GVLs matching EPLAN signal names
4. CODESYS: Write ST code referencing EPLAN-defined variable names
5. EPLAN: Generate terminal diagrams, cable lists, panel layout

---

## EPLAN .NET API (C#)

### Architecture

The EPLAN API is a .NET-based programming interface for automating EPLAN operations.

- **Technology**: Microsoft .NET (C#, VB.NET, C++/CLI)
- **IDE**: Visual Studio (recommended)
- **License**: Scripts free; full API requires "EPLAN API Extension" license
- **Types**: Add-ins (plugins) and Offline Applications

### Core Namespaces

| Namespace | Purpose |
|-----------|---------|
| `Eplan.EplApi.ApplicationFramework` | Application lifecycle, actions, menus |
| `Eplan.EplApi.Base` | Settings, system messages, file handling |
| `Eplan.EplApi.DataModel` | Project data model (core namespace) |
| `Eplan.EplApi.Gui` | User interface, dialogs, ribbons |
| `Eplan.EplApi.HEServices` | High-level services (export, print, reports) |
| `Eplan.EplApi.MasterData` | Parts database access |
| `Eplan.EplApi.Scripting` | Script execution framework |

### Data Model Objects

The `Eplan.EplApi.DataModel` namespace contains all project objects:

| Class | Description |
|-------|-------------|
| `Project` | EPLAN project (top-level container) |
| `Page` | Page within a project (contains functions + placements) |
| `Function` | Logical function (device, terminal, PLC channel) |
| `Placement` | Graphical placement on a page |
| `Article` | Part/article reference from parts database |
| `Connection` | Electrical connection between functions |
| `Terminal` | Terminal point in a terminal strip |
| `SymbolReference` | Reference to a symbol in the symbol library |

### Navigation Pattern

```csharp
// Navigate project data using DMObjectsFinder
using Eplan.EplApi.DataModel;

Project project = new Project();
project.Open(@"C:\Projects\MyProject.elk", ProjectManager.OpenMode.Standard);

// Find all pages
DMObjectsFinder finder = new DMObjectsFinder(project);
Page[] pages = finder.GetPages(new PageFilter());

foreach (Page page in pages)
{
    // Get functions on this page
    Function[] functions = page.Functions;
    foreach (Function func in functions)
    {
        string deviceTag = func.Properties.FUNC_DEVICETAG.ToString();
        string address = func.Properties.FUNC_PLCADDRESS.ToString();
        // ... process function
    }
}

project.Close();
```

### EPLAN Properties

EPLAN objects have properties accessed via the `Properties` collection. Key properties:

| Property ID | Name | Description |
|-------------|------|-------------|
| `FUNC_DEVICETAG` | Device Tag | Unique device identifier (e.g., -K1, -Q1) |
| `FUNC_PLCADDRESS` | PLC Address | I/O address (e.g., %IX0.0, %QW100) |
| `FUNC_DESIGNATION_PLANT` | Plant Designation | Higher-level plant structure (=) |
| `FUNC_DESIGNATION_LOCATION` | Location | Installation location (+) |
| `FUNC_DESIGNATION_FUNCTIONALASSIGNMENT` | Functional Assignment | Functional group (==) |
| `ARTICLE_PARTNR` | Part Number | Manufacturer part number |
| `ARTICLE_MANUFACTURER` | Manufacturer | Component manufacturer |

### Scripts (No License Required)

EPLAN scripts are C# or VB.NET source files (`.cs`/`.vb`) that run inside EPLAN without an API license:

```csharp
// Example: Export all pages to PDF
// Save as ExportPDF.cs, run via File > Extras > Scripts > Run

using Eplan.EplApi.ApplicationFramework;
using Eplan.EplApi.Scripting;

public class ExportPdfScript
{
    [Start]
    public void Execute()
    {
        ActionCallingContext ctx = new ActionCallingContext();
        ctx.AddParameter("TYPE", "PDFPROJECTSCHEME");
        ctx.AddParameter("PROJECTNAME", @"C:\Projects\MyProject.elk");
        ctx.AddParameter("EXPORTFILE", @"C:\Output\MyProject.pdf");
        ctx.AddParameter("EXPORTSCHEME", "Default");

        new CommandLineInterpreter().Execute("export", ctx);
    }
}
```

### Offline Application Pattern

```csharp
// Standalone application using EPLAN API
using Eplan.EplApi.System;
using Eplan.EplApi.DataModel;

class Program
{
    static void Main(string[] args)
    {
        EplApplication app = new EplApplication();
        app.Init("", true, true);

        try
        {
            // Open project
            ProjectManager pm = new ProjectManager();
            Project project = pm.OpenProject(@"C:\Projects\MyProject.elk",
                ProjectManager.OpenMode.Standard);

            // Work with project data...

            project.Close();
        }
        finally
        {
            app.Exit();
        }
    }
}
```

### Key API Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `export` | Export project (PDF, DXF, DWG, PXF) | TYPE, PROJECTNAME, EXPORTFILE |
| `reports` | Generate reports (parts list, cable list) | TYPE, PROJECTNAME |
| `XEsProjectActionImport` | Import macro/page | PROJECTNAME, FILENAME |
| `XEsProjectActionInsert` | Insert page from file | PROJECTNAME, FILENAME |
| `XPrjActionProjectCheck` | Run project check | PROJECTNAME |

---

## EPLAN Data Portal REST API

### Overview

The EPLAN Data Portal provides a REST API for searching and downloading component data from 430+ manufacturers (1.5M+ parts).

- **Base URL**: `https://dataportal.eplan.com/api/`
- **Auth**: Bearer Token or Personal Access Token (PAT)
- **Format**: JSON responses, binary downloads (CSV/DXF/E3D)

### Authentication

```
Authorization: Bearer {TOKEN}
# or
Authorization: Bearer PAT:{YOUR_PAT_TOKEN}
```

PATs are generated in the ePulse user profile with configurable expiration.

### Key Endpoints

#### Parts Search
```
GET /parts?search={query}&page[limit]=20&page[offset]=0
```

Parameters:
- `search` — Full-text search (max 100 chars)
- `filter[manufacturer]` — Filter by manufacturer ID
- `filter[catalog_eplan]` — Filter by EPLAN catalog category
- `filter[catalog_eclass]` — Filter by eCl@ss classification
- `sort` — Sort by: part_number, manufacturer.short_name, download_count

#### Part Details
```
GET /parts/{id}
```

#### Part Verification
```
GET /partscheck/{partInfo}
POST /partscheck  (batch)
```

#### Downloads
```
GET /download/commercial_data/part/{partId}    # CSV data
GET /download/dxf_data/part/{partId}            # DXF macro
GET /download/e3d_data/{macroVariantId}          # 3D data
```

#### Macros & Variants
```
GET /macros/{macroId}
GET /macro_variants/{macroVariantId}
```

#### Catalog Navigation
```
GET /eplan_catalog_entries     # EPLAN catalog hierarchy
GET /eclass_catalog_entries    # eCl@ss catalog
GET /manufacturers             # All manufacturers
GET /data_types                # Available data types
```

#### Suggestions
```
GET /suggestions?search={phrase}
GET /suggestions/manufacturers?search={phrase}
```

#### Download List (Basket)
```
GET    /basketitems            # List basket items
POST   /basketitems            # Add to basket
DELETE /basketitems/{id}       # Remove from basket
```

#### Statistics
```
GET /statistics    # Portal stats (parts count, manufacturers count)
```

---

## File Formats

### EPJ (Project Export)
- XML-based project export format
- Contains full project data (pages, functions, connections)
- Proprietary schema — no public XSD

### EDZ (Data Archive Zipped)
- ZIP container with XML parts data and macros
- Used for EPLAN Data Portal exchange
- Contains: parts properties, 2D macros, drilling patterns, images
- Requires "EPLAN EDZ format" license for full export

### Macro Formats
- `.ema` — EPLAN macro (window/page macro)
- `.emp` — EPLAN macro (page-level)
- `.emf` — EPLAN macro file
- DXF export supported for cross-platform use

---

## Integration Patterns: EPLAN + Festo CPX

### I/O Mapping Workflow

1. **EPLAN**: Create PLC rack with Festo CPX-E modules
   - Add CPX-E-EP master module
   - Add I/O modules (CPX-E-8DI, CPX-E-8DO, CPX-E-4AI, CPX-E-4AO)
   - Assign I/O addresses to signals

2. **EPLAN Export**: Generate I/O list
   ```
   Signal Name     | Address  | Type | Module
   bSensor01       | %IX0.0   | BOOL | CPX-E-8DI
   bSensor02       | %IX0.1   | BOOL | CPX-E-8DI
   bValve01        | %QX1.0   | BOOL | CPX-E-8DO
   rPressure01     | %IW100   | REAL | CPX-E-4AI
   ```

3. **CODESYS**: Create GVL from EPLAN I/O list
   ```iecst
   {attribute 'qualified_only'}
   VAR_GLOBAL
       bSensor01    AT %IX0.0 : BOOL;  // Proximity sensor 01
       bSensor02    AT %IX0.1 : BOOL;  // Proximity sensor 02
       bValve01     AT %QX1.0 : BOOL;  // Pneumatic valve 01
       rPressure01  AT %IW100 : REAL;  // Pressure sensor 01
   END_VAR
   ```

### EtherCAT Device Integration

EPLAN can document EtherCAT network topology:
- Master: Festo CPX-E-EP (EtherCAT master coupler)
- Slaves: CMMT servo drives, CPX-E I/O modules
- EPLAN generates cable routing and network diagrams
- CODESYS handles the CiA 402 motion control logic

---

## MCP Integration Opportunity

No EPLAN MCP server exists as of 2026. Potential tools:

| Tool | Purpose | Feasibility |
|------|---------|-------------|
| `search_eplan_parts` | Search Data Portal REST API | HIGH — REST API documented |
| `export_io_list` | Generate I/O mapping from EPLAN CSV | HIGH — CSV parsing |
| `create_gvl_from_eplan` | Auto-generate CODESYS GVL from EPLAN I/O export | HIGH — template generation |
| `validate_eplan_mapping` | Cross-check EPLAN addresses vs CODESYS GVL | MEDIUM — comparison logic |
| `generate_eplan_script` | Create C# scripts for EPLAN automation | MEDIUM — template generation |
| `read_edz` | Parse EDZ archives for parts data | LOW — requires ZIP + XML parsing |

The Data Portal REST API is the most accessible integration point, requiring only HTTP requests and a PAT token.
