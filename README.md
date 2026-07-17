# festo-codesys-mcp

**An MCP server that turns AI assistants into competent Festo/CODESYS PLC engineers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![PLCopen TC6 XML](https://img.shields.io/badge/PLCopen-TC6%20v2.00-orange)](https://plcopen.org/)

LLMs are strong general programmers but unreliable PLC engineers: they invent
Function Block signatures, hand-write PLCopen XML that CODESYS rejects, and guess
at error codes. This server fixes that by grounding the model in **curated,
manufacturer-accurate knowledge** and forcing every artifact through a
**machine-checked validation pipeline** — so what reaches the CODESYS IDE
actually imports, compiles, and follows one consistent engineering standard.

```text
IEC 61131-3 ST  ──►  conventions enforced  ──►  PLCopen TC6 XML  ──►  3-stage validation  ──►  CODESYS import
     ▲                        ▲                                              │
     │                        │                                              ▼
  38-block library    27 knowledge topics + 19 manuals              official TC6 v2.00 XSD
```

## Highlights

- **18 core tools** — lookup, knowledge search (BM25), library reuse, ST/DUT/GVL
  generation, static analysis, convention review, PLCopen XML generation and a
  three-stage validation chain, ST code intelligence (symbols & where-used).
- **Embedded knowledge base** — 27 curated topics (Festo PtP motion, EtherCAT
  CiA 402, CPX-E, VTUX, CMMT-ST, MQTT/IIoT, PLCopen ground truth, naming
  conventions…) plus 19 reference manuals, all searchable full-text.
- **Teaching modules** that go beyond datasheets: PLC program architecture
  (Input-Process-Output, status-bus coordination), alarm design patterns,
  testing ST without hardware (digital-twin methodology), CODESYS Recipe
  Manager, hard-won CODESYS gotchas, and a complete **custom web HMI + OPC-UA
  gateway** curriculum (three-layer architecture, embedded-panel deployment).
- **38-block reusable ST library** — 30 vendor-neutral Function Blocks plus 8
  shared DUTs (motors, valves, PID, sensors, safety, logging, MQTT), all
  following one strict interface convention.
- **Built for AI agents** — always-on server instructions, prescriptive
  `USE WHEN` tool descriptions, next-step hints appended to every tool result,
  and an `engineering-discipline` topic that encodes non-negotiable quality
  gates (verify before delivering, no regressions, no hardcoded secrets).
- **Optional live surfaces** — 12 `ide_*` tools drive a running CODESYS V3.5
  IDE (create/patch POUs, compile, browse the device tree), and 8 hardware
  tools commission Festo CPX-AP I/O and CMMT drives on the bench.
- **Trustworthy by construction** — ~690 automated tests (676 node:test +
  15 pytest); the generator's output is validated against the official PLCopen
  XSD (v2.01 release, namespace-patched to the tc6_0200 namespace CODESYS emits).

## Quick Start

Requires **Node.js ≥ 20**. No API keys, no accounts, fully offline.

**Claude Code** — add to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "festo-codesys-mcp": {
      "command": "npx",
      "args": ["-y", "festo-codesys-mcp"]
    }
  }
}
```

**Claude Desktop** — add the same block to `claude_desktop_config.json`.
On **Windows**, wrap the command with `cmd /c`:

```json
{
  "mcpServers": {
    "festo-codesys-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "festo-codesys-mcp"]
    }
  }
}
```

**From source:**

```bash
git clone https://github.com/efranceschetti/festo-codesys-mcp.git
cd festo-codesys-mcp
npm ci && npm run build && npm test
# point your MCP client at: node build/index.js
```

Then just ask your assistant:

> *"Create a function block for a conveyor with jam detection, export it as
> PLCopen XML and validate it for CODESYS import."*

The server steers the model through the full pipeline: load conventions → check
the library for an existing block → generate → static-analyse → review naming →
generate XML → validate (heuristics → XSD → semantics) → hand over an
import-ready file.

## Target Platform

| Component | Technology |
| --- | --- |
| **PLC** | Festo CPX-E-CEC (CODESYS V3.5) |
| **Motion** | EtherCAT CiA 402 — CMMT-AS / CMMT-ST drives, Festo PtP library |
| **Pneumatics** | VTUX valve terminals via CPX-AP-A/AP-I |
| **HMI** | Festo CDPX (native WebVisu/TargetVisu) or custom web HMI + OPC-UA gateway |
| **Fieldbus** | EtherCAT (master), Profinet (device), EtherNet/IP, Modbus/TCP |
| **Standards** | IEC 61131-3, PLCopen XML TC6 v2.00 |

Much of the knowledge (IEC 61131-3 conventions, PLCopen XML, CiA 402, program
architecture, alarm patterns, twin testing) applies to any CODESYS V3.5 target,
not only Festo hardware.

## Tools

### Core (18 — always available)

| Tool | What it does |
| --- | --- |
| `plc_lookup` | Instant facts: Hungarian prefixes, POU prefixes, state numbers, error codes, FB patterns |
| `plc_knowledge` | Load any of the 27 topics, or BM25 full-text search across all topics + 19 manuals |
| `plc_library` | Browse, search, and retrieve the 38-block ST library (30 FBs + 8 DUTs) |
| `plc_validate` | Validate ST: naming conventions, FB interface pattern, state machine, batch mode |
| `create_function_block` | Generate an FB (.st + PLCopen XML) with the standard interface built in |
| `create_program` | Generate a cyclic PRG |
| `create_data_type` | Generate ENUM / STRUCT data types (incl. `qualified_only` support) |
| `create_gvl` | Generate Global Variable Lists (CONSTANT / PERSISTENT RETAIN aware) |
| `create_project_structure` | Scaffold a standard project layout |
| `generate_plcopen_xml` | Batch-convert an .st directory into one PLCopen TC6 XML file |
| `validate_plcopen_xml` | Fast sanity gate: well-formedness + 13 structural heuristics (no Python required) |
| `validate_plcopen_xsd` | Strict validation against the official PLCopen XSD (v2.01, tc6_0200-namespace patched) |
| `validate_plcopen_semantic` | Diff source ST vs XML — catches silent variable/initializer loss |
| `debug_plc_code` | Static analysis: unbounded loops, missing error handling, state-machine gaps |
| `review_st_code` | Convention review with quick-reference output |
| `explain_error_code` | Decode Festo / CODESYS / EtherCAT error codes with fix suggestions |
| `st_symbols` | Cross-file ST code intelligence: definitions, types, members |
| `st_find_references` | Where-used analysis for any symbol across the project |

### CODESYS IDE driving (12 — optional, Windows)

Enabled by setting `FESTO_MCP_CODESYS_PATH` to your `CODESYS.exe` **and**
`FESTO_MCP_CODESYS_PROFILE` to the profile name shown in the CODESYS version
selector. Drives a **live CODESYS V3.5 instance** through its scripting engine:
open/create projects, create POUs/methods/properties, read and atomically patch
POU code, compile and surface errors, and walk the project & hardware device
tree as JSON. Use it after the offline pipeline produced validated XML — IDE
changes are irreversible.

### Hardware commissioning (8 — optional, bench only)

Enabled by `FESTO_MCP_ENABLE_HARDWARE=1` (plus Python with the official
`festo-cpx-io` / `festo-edcon` packages). Discover CPX-AP modules, read/write
I/O channels, control CMMT drives (enable, ack faults, position tasks) and
read/write raw PNU/SDO parameters. These tools bypass the PLC and write
directly to devices — **never use them on a machine in production**.

### Prompts (10 guided workflows)

`new-function-block` · `new-motion-fb` · `new-project` · `new-ethercat-slave` ·
`debug-axis` · `decode-error-code` · `audit-naming` · `validate-st-batch` ·
`audit-plcopen-xml` · `convert-manual`

## Knowledge Base

| Area | Topics |
| --- | --- |
| **Conventions & discipline** | `conventions`, `abbreviations`, `hungarian-notation`, `state-machines`, `engineering-discipline` |
| **CODESYS / PLCopen** | `ground-truth`, `xml-rules`, `plcopen-schema`, `plcopen-example`, `plcopen-extensions`, `codesys-recipe-manager`, `codesys-gotchas` |
| **Festo hardware** | `festo-cpx`, `festo-ptp`, `festo-cdpx-hmi`, `festo-vtux-terminal`, `festo-cmmt-st`, `festo-mqtt`, `motion-patterns` |
| **EtherCAT** | `ethercat-cia402` (state machine, controlword/statusword, slave identification, drive-health patterns) |
| **Architecture & testing** | `plc-architecture-patterns`, `plc-alarm-patterns`, `plc-testing-twin` |
| **Web HMI curriculum** | `hmi-web-architecture`, `opcua-websocket-gateway`, `hmi-embedded-deploy` |
| **EPLAN** | `eplan` |

Plus **19 auto-discovered manuals** (CPX-E system/IO/EtherCAT/Profinet, CMMT
servo & CiA 402 protocol reference, motion library, module catalog, CoE
dictionary, data logging/FTP, OPC-DA, safety relay, VFD reference…). Drop your
own converted manuals into `knowledge/manuals/` and they are indexed
automatically at runtime — no rebuild needed.

### The web HMI curriculum

A distinctive part of this knowledge base: a complete, generic curriculum for
building a **custom web HMI** for CODESYS PLCs — the three-layer architecture
(SPA ↔ WebSocket ↔ Python gateway ↔ OPC-UA ↔ PLC), a tag manifest as single
source of truth with five access modes (read/write/pulse/dead-man hold/
heartbeat), hosting the SPA on the PLC's own web server, and deploying to
resource-constrained embedded panels (Chromium 69 on ARMv7) including the
unified panel-installer pattern. Ask your assistant *"how do I show PLC data in
a browser?"* and it will find its way here.

## Built for AI agents

This server is designed so the model **cannot quietly go off the rails**:

- **Server instructions** (always in the client's context) pin the mandatory
  workflow — lookup → learn → reuse → create → verify → export — and five
  hard NEVERs (never invent FB signatures, never hand-write PLCopen XML, …).
- **Prescriptive tool descriptions** (`USE WHEN / ALWAYS BEFORE / DO NOT`)
  make the right next call obvious.
- **Next-step hints**: every successful tool result ends with a one-line
  `Next:` pointing to the next stage of the pipeline.
- **`engineering-discipline` topic**: non-negotiable quality gates — verify
  before delivering, re-validate the whole affected set after any edit, zero
  deferred warnings, no hardcoded credentials or network addresses, and human
  review before anything runs on a machine.
- For **Claude Code** users, the repo ships ready-made skills (ST writing,
  PLCopen pipeline, error diagnosis, motion control, HMI/gateway), review
  subagents, and a project-memory scaffold under `.claude/`.

## Configuration

| Environment variable | Default | Effect |
| --- | --- | --- |
| `FESTO_MCP_CODESYS_PATH` | unset | Path to `CODESYS.exe` — registers the 12 `ide_*` tools |
| `FESTO_MCP_CODESYS_PROFILE` | unset | CODESYS profile name (as shown in the version selector) — **required for `ide_*` calls to execute** |
| `FESTO_MCP_ENABLE_HARDWARE` | unset | `1` enables the 8 `cpx_*` / `edcon_*` bench tools |
| `FESTO_MCP_PYTHON` | bundled venv | Python interpreter used by the XSD/semantic validators and hardware tools (needs `lxml`; hardware also needs `festo-cpx-io` / `festo-edcon`) |
| `FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE` | unset | `1` lets file-writing tools leave the workspace jail |

## Development

```bash
npm ci
npm run build        # tsc → build/
npm test             # node:test
npm run lint         # eslint, zero warnings
npm run inspect      # MCP Inspector against the built server

cd python            # PLCopen XSD + semantic validation gates
uv sync && uv run pytest -q
```

The synthetic test fixture (`python/tests/fixtures/synthetic-project-valid.xml`,
~200 KB, 29 POUs) is generated by the server's own pipeline
(`scripts/gen-synthetic-fixture.mjs`) and must always validate against the
official TC6 v2.00 schema — regenerate it after generator changes and re-run the XSD gate to catch regressions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for style rules and known future work
(MCP SDK v2 migration, PLCopen ObjectId round-trip identity).

## Safety notice

This project generates logic that can command real machinery. It is a
**reference implementation and engineering assistant** — generated code must be
reviewed by a qualified automation engineer before it runs on any machine that
can cause physical harm, and safety functions must be implemented and validated
per the applicable standards. See [SECURITY.md](SECURITY.md).

## Acknowledgments

This project stands on the shoulders of excellent open work, and is grateful to:

- **[codesys-mcp-toolkit](https://github.com/johannesPettersson80/codesys-mcp-toolkit)**
  by **Johannes Pettersson** (MIT) — the foundation for the `ide_*` CODESYS
  Scripting-Engine driving tools and their script templates.
- **[Festo SE & Co. KG](https://github.com/Festo-se)** — the official
  [`festo-cpx-io`](https://github.com/Festo-se/festo-cpx-io) and
  [`festo-edcon`](https://github.com/Festo-se/festo-edcon) Python SDKs, which the
  `cpx_*` / `edcon_*` commissioning tools wrap.
- **[PLCopen](https://plcopen.org/)** — the TC6 XML interchange standard and the
  reference schema/example that the generator and validators are built against.
- **[Model Context Protocol](https://modelcontextprotocol.io/)** and the
  [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
  — the protocol and TypeScript SDK this server is built on.

Full third-party copyright and license notices are preserved in
[NOTICE.md](NOTICE.md).

## License & attribution

[MIT](LICENSE) — © 2026 **E3 Engenharia Industrial** · Eduardo Franceschetti.

Built from real-world Festo/CODESYS machine engineering practice.

*Festo® and CODESYS® are trademarks of their respective owners. This is an
independent open-source project, not affiliated with or endorsed by
Festo SE & Co. KG or CODESYS GmbH.*
