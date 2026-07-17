# FestoCodesysMCP — CODESYS PLC Programming Server

MCP server that generates IEC 61131-3 Structured Text and PLCopen XML for
Festo/CODESYS PLCs. Embedded knowledge base (BM25 search), 19 device manuals,
and a 38-block ST library (30 Function Blocks + 8 shared DUTs).

## Golden Rules
1. **Local first.** Every Festo/CODESYS/EtherCAT/PLCopen fact comes from the MCP
   tools (`plc_lookup`, `plc_knowledge`, `plc_library`) — never from memory,
   never from the web without checking locally first.
2. **Follow the "Next:" hints** appended to tool results — they encode the pipeline.
3. **Reuse before create; validate before deliver.** (Enforced by the skills below.)

## Task Routing
| Task | Skill (auto) / entry point |
|---|---|
| Write/edit any ST code, create FB/PRG/DUT/GVL | `writing-st-code` skill · `/start-fb` |
| Generate/validate/import PLCopen XML | `plcopen-xml` skill · `/xml-pre-import` |
| Error codes, faults, diagnostics | `error-diagnosis` skill · `/error-decode` |
| Servo/stepper, EtherCAT, CiA 402 | `motion-control` skill |
| Web HMI, OPC UA, gateways, CDPX | `hmi-gateway` skill |
| Adapt a library block | `/fb-from-library` |
| Naming audit of a folder | `/audit-naming` |
| End-to-end smoke test of the MCP | `/cycle-test` |

## Subagents
- `plc-reviewer` (sonnet) — structured review of .st/.xml files; delegate after
  creating or editing POUs.
- `xml-validator` (haiku) — fast import-gate verdict on PLCopen XML; delegate
  before any CODESYS import.

## Project Memory
`.claude/memory/` accumulates durable project context. Read `MEMORY.md` at the
start of substantial sessions. Write when you learn something durable:
- hardware present (PLC, drives, IO) -> `hardware.md`
- FBs/POUs created for THIS project -> `project-blocks.md`
- design decisions and their why -> `decisions.md`
- diagnosed error codes + fixes -> `errors-solved.md`
Keep entries dated, one line each. Never store credentials or personal data.

## Contributing to the server itself
- Build `npm run build` · test `npm test` (676 tests) · lint `npm run lint`
- VSCode: Ctrl+Shift+B build task; ST snippets (`fbnew`, `state`, `errfb`).
- Tool descriptions follow the USE WHEN / ALWAYS BEFORE / DO NOT pattern
  (src/tools/*.ts). Next-step hints live in src/utils/next-steps.ts.
- Server instructions (src/server-instructions.ts) are the client-agnostic
  contract; this file covers Claude-Code-specific layers only. Do not duplicate
  content between them.
