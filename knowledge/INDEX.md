---
id: index
title: Knowledge Base Index — Semantic Router
priority: CRITICAL
---

# Knowledge Base Index

> This index helps the AI find the right document for each task.
> RULE: Load the MINIMUM required. Never load everything.

## Routing Table

### Engineering Discipline (applies to EVERY code task)
ALWAYS: `engineering-discipline` — the quality gates that decide when work is "done":
verify before delivering (run the validators, don't assume), no regressions (re-validate
the whole affected set), zero pending issues (fix all warnings/violations), secret & safety
hygiene (no hardcoded credentials/IPs; machine-commanding code needs human review), do only
what is asked, plan the complex. Ranks equal to `conventions`.

### Writing ST Code (any kind)
REQUIRED: `conventions` + `abbreviations`
OPTIONAL: `hungarian-notation`, `state-machines`

### Creating a new Function Block
REQUIRED: `conventions`, `abbreviations`, `state-machines`
CHECK: library/_catalog.md (verify whether a similar block already exists)

### Machine / Program Architecture (structuring a multi-station machine)
REQUIRED: `plc-architecture-patterns` (Input-Process-Output skeleton; CASE/IF/rungs rule; emergent coordination via a shared status bus with one writer per signal — no central orchestrator; mode MUX; ladder→ST bridge; why NOT GoF design patterns in ST)
ADD when designing faults/alarms: `plc-alarm-patterns` (STALL vs TIMEOUT vs DEVICE categories by time management; stuck-vs-slow heuristic; station×10+cause fault codes; boot-fault masking with an on-delay)
NOTE: one PROGRAM = one physical station; stations publish FACTS to the bus, never commands

### Testing ST Without Hardware (twin / offline tests)
REQUIRED: `plc-testing-twin` (Python 1:1 mirror committed with the .st; scan-based TON/TOF timers; discriminative physical-result tests; swept-AABB/CCD collision to derive safe motion thresholds; regression corpus)
NOTE: language-agnostic method — count scans, not milliseconds; assert the physical result, not the code structure

### Motion Control / Servo / EtherCAT
REQUIRED: `festo-ptp`, `ethercat-cia402`
OPTIONAL: `motion-patterns`
REFERENCE EXAMPLE: `plcopen/Festo_PtP_Example_CMMT-AS-MP-S1.xml` (Festo official, v3.5.0.11, dated 2025-11-25)
LIBRARY MANUAL (CMMT-AS): `manuals/hw-cmmt-servo` — MC_*_Festo FBs, step-by-step FAS commissioning, library error codes, FAQ. Use this to PROGRAM via the Festo PtP library.
PROTOCOL MANUAL (CMMT-AS-S1): `manuals/hw-cmmt-as-s1-reference` — raw CoE objects, bit-by-bit controlword/statusword, STO/SBC S1, internal parameters, ESM/DC, CSP sub-modes, enable sequence without the library. Use this when speaking CiA 402 directly or for STO / deep diagnostics.
DO NOT USE: library/motion/* (those are for simple motors, not servo)
RULE: Use Festo FBs with the manufacturer's EXACT names (MC_Power_Festo, MC_Home_Festo, etc.) — NEVER generic names without _Festo
TESTED VERSIONS: see the "Recommended Library Versions" section in `festo-ptp` (Festo_PtP_* 3.5.16.51 + IODrvEtherCAT 3.5.16.0)
TASKS: MainTask 2ms + EtherCAT_Task 2ms (see the "Recommended Task Configuration" section in `festo-ptp`)

### Generating PLCopen XML
REQUIRED: `ground-truth`, `xml-rules`
REFERENCE: `plcopen-schema`, `plcopen-example`
VALIDATE: always run validate_plcopen_xml after generating

### Recipes / Parameter Persistence
REQUIRED: `codesys-recipe-manager` (RecipeManCommands API; ReturnValues/InfoValues codes hex+dec; .txtrecipe format; gotchas: wildcard `[*]` rejected by the compiler, storage path outside PlcLogic rejected silently, Recipe Manager does NOT export via PLCopen XML, unreliable auto-save)
NOTE: use the Recipe Manager for operator-selectable parameter SETS; for values that just need to survive power-off use VAR_GLOBAL PERSISTENT RETAIN (see `codesys-gotchas` for the PersistentVars pitfall)

### Hardware / CPX-E Modules
CHECK: manuals/ (pick the module-specific manual)
USE TOOL: plc_knowledge action 'search' for full-text search

### HMI / Festo CDPX + WebVisu
REQUIRED: `festo-cdpx-hmi`
NOTE: CDPX uses Designer Studio + CODESYS-native TargetVisu/WebVisu
NOTE: for a CUSTOM web HMI (React/JS SPA over a gateway, not native WebVisu) see the HMI Web section below

### HMI Web / OPC-UA Gateway (custom SPA)
REQUIRED: `hmi-web-architecture` (three-layer design: SPA ↔ WebSocket ↔ Python gateway ↔ OPC-UA ↔ PLC; tag manifest; PLC-hosted SPA)
ADD when building the Python gateway: `opcua-websocket-gateway` (layered backends, asyncio loops, dynamic OPC-UA browse, WebSocket JSON protocol, robustness)
ADD when packaging for an embedded panel: `hmi-embedded-deploy` (Chromium 69 / ARMv7 constraints, unified panel installer, cross-arch build)
NOTE: the browser NEVER speaks OPC-UA directly — always via the gateway. Expose PLC data through a dedicated GVL_HMI.

### Pneumatics / Valves / VTUX
REQUIRED: `festo-vtux-terminal`
NOTE: Valves via CPX-AP-A/AP-I + EtherCAT, not direct control

### Stepper Motor / CMMT-ST + EMMT-ST
REQUIRED: `festo-cmmt-st` + `ethercat-cia402`
NOTE: Uses the SAME Festo PtP FBs as the CMMT-AS (MC_Power_Festo, etc.)

### MQTT / IIoT / Telemetry
REQUIRED: `festo-mqtt`
NOTE: Uses the MQTT_Client_SL library (IIoT Libraries SL) — 3 FBs: MQTTClient, MQTTPublish, MQTTSubscribe
NOTE: JSON via JSON_Utilities_SL (JSONFileReader, FindFirstValueByKey)
NOTE: Default MQTT port = 1883, TLS = 8883

### Debug / Errors
USE TOOL: explain_error_code (filtered lookup)
CHECK: plc_knowledge action 'search' (full-text search)
FALLBACK: manuals/ module-specific docs
CODESYS PITFALLS: `codesys-gotchas` (cosmetic device-editor crash that does NOT block Build/Run; edge/pulse handoff lost between PROGRAMs in different tasks; PersistentVars list vs the PERSISTENT attribute; chronic runtime-crash triage — ports, retain-wipe log, core-dump signature)

### EPLAN / Electrical Project
REQUIRED: `eplan`

### Brand-New Project from Scratch
SEQUENCE:
1. `conventions` (naming rules)
2. `festo-cpx` (target platform)
3. create_project_structure (scaffolding)
4. library/_catalog.md (available blocks)
5. `ground-truth` (XML rules)

### Converting PDF / Office Manuals to the Knowledge Base
WORKFLOW:
1. Use a companion MCP (document-loader or markitdown) to read the PDF/DOCX
2. Use the `convert-manual` prompt of FestoCodesysMCP to convert it to .md
3. Save under knowledge/manuals/ (available after restarting the server)
RECOMMENDED: Configure one of the document MCPs alongside FestoCodesysMCP:
- AWS Document Loader: `uvx awslabs.document-loader-mcp-server@latest`
- Microsoft MarkItDown: `uvx markitdown-mcp`

## Priority Legend
- CRITICAL: Rules that can NEVER be violated
- HIGH: Technical reference essential to the task
- MEDIUM: Supplementary information (load if context allows)
- LOW: Rarely needed

## Recommended Companion MCP Servers

FestoCodesysMCP is specialized for PLC/CODESYS. Configure these alongside
FestoCodesysMCP in your MCP client for a complete automation engineering stack.

### TIER 1 — Essential (always install)

| Server | Function | Install |
|--------|----------|---------|
| Microsoft MarkItDown | Converts 29+ formats (PDF, Office, HTML, audio) to Markdown | `uvx markitdown-mcp` |
| Memory (Knowledge Graph) | Persistent memory across sessions — entities, relations, observations | `npx -y @modelcontextprotocol/server-memory` |
| CODESYS MCP Toolkit | Compiles, deploys and edits CODESYS V3 projects via the IDE Scripting Engine | `npm install -g codesys-mcp-toolkit` |

**MarkItDown**: Converts PDF/DOCX manuals to Markdown, ready for ingestion into the knowledge base.
**Memory**: Remembers project context across sessions (configured axes, design decisions, resolved errors).
**CODESYS MCP Toolkit**: Complements FestoCodesysMCP — we generate ST code + PLCopen XML (offline, any OS), the toolkit imports it into the CODESYS IDE, compiles and deploys (requires CODESYS V3.5+ on Windows). Repo: github.com/johannesPettersson80/codesys-mcp-toolkit

### TIER 2 — Recommended (install for complex projects)

| Server | Function | Install |
|--------|----------|---------|
| Sequential Thinking | Step-by-step reasoning with thought revision/branching | `npx -y @modelcontextprotocol/server-sequential-thinking` |

**Sequential Thinking**: Useful for complex debugging, multi-axis state machine design, and architecture planning.

### TIER 3 — Optional (already covered by Claude Code)

| Server | Function | Install |
|--------|----------|---------|
| Filesystem | File read/write/search | `npx -y @modelcontextprotocol/server-filesystem /path` |
| AWS Document Loader | PDF, DOCX, XLSX, PPTX, images | `uvx awslabs.document-loader-mcp-server@latest` |

**Note**: Filesystem and Git are covered natively by Claude Code. AWS Document Loader is an alternative to MarkItDown (pick one).

### Festo Official Python SDKs (commissioning and diagnostics)

Festo's official Python tools (github.com/Festo-se) for hardware commissioning and diagnostics:

| Tool | Function | Install |
|------|----------|---------|
| festo-cpx-io | Python SDK for CPX-E and CPX-AP — typecode setup, I/O read, CLI diagnostic | `pip install festo-cpx-io` |
| festo-edcon | Python SDK for Festo electric drives via PROFIDRIVE (EtherNet/IP + Modbus) | `pip install festo-edcon` |

**festo-cpx-io**: Automatic setup of CPX-E modules by typecode, I/O read/write, IO-Link support (CPX-E-4IOL). CLI: `festo-cpx-io cpx-e -t TYPECODE -i IP`.
**festo-edcon**: Motion module (replicates SinaPos/Telegram 111), PNU (Parameter Number) access, GUI for drive configuration. CLI: `festo-edcon -i IP position`.

### Complete Configuration

Example `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "festo-codesys-mcp": {
      "command": "npx",
      "args": ["-y", "festo-codesys-mcp"]
    },
    "markitdown": {
      "command": "uvx",
      "args": ["markitdown-mcp"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "codesys-toolkit": {
      "command": "codesys-mcp-tool",
      "args": []
    }
  }
}
```
