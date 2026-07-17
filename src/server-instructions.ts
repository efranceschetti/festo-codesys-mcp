/**
 * MCP Server Instructions — injected into the client's system prompt.
 * Keep under ~450 words: this text is ALWAYS in context, so every line
 * must earn its place. Detailed references live in plc_knowledge topics.
 */
export function buildServerInstructions(opts: {
  ideToolsEnabled: boolean;
  hardwareToolsEnabled: boolean;
}): string {
  const core = `FestoCodesysMCP generates IEC 61131-3 Structured Text and PLCopen XML for Festo/CODESYS PLCs. It embeds 27 curated knowledge topics, 19 device manuals, and a 38-block ST library (30 Function Blocks + 8 shared DUTs). It is the source of truth for everything Festo, CODESYS, EtherCAT/CiA 402, and PLCopen: do NOT answer PLC questions from memory and do NOT search the web before checking these tools.

MANDATORY WORKFLOW (in order):
1. LOOKUP — plc_lookup for instant facts: Hungarian prefixes, state numbers, error codes.
2. LEARN — plc_knowledge BEFORE writing any ST code. Always load topics 'conventions' + 'abbreviations' first; then task-specific topics (motion: 'festo-ptp' + 'ethercat-cia402'; XML: 'ground-truth' + 'xml-rules'). Use action=search when unsure of the topic.
3. REUSE — plc_library BEFORE creating any new Function Block. If a similar block exists, retrieve and adapt it.
4. CREATE — create_function_block / create_program / create_data_type / create_gvl / create_project_structure.
5. VERIFY — review_st_code + plc_validate (conventions), debug_plc_code (runtime bugs).
6. EXPORT — generate_plcopen_xml, then the validation chain: validate_plcopen_xml (fast) -> validate_plcopen_xsd (schema) -> validate_plcopen_semantic (content). Never import unvalidated XML into CODESYS.

Tool results end with a "Next:" hint — follow it.

NEVER:
- Never invent FB signatures, parameters, or object addresses. Topic 'festo-ptp' lists every MC_*_Festo block with exact names — Festo blocks always end in _Festo.
- Never generate or hand-write PLCopen XML without loading topic 'ground-truth' first.
- Never create a new FB without searching plc_library first.
- Never decode an error code from memory — use plc_lookup action=error_code or explain_error_code.
- Never present generated XML as import-ready before the validation chain passes.

CONVENTIONS (machine-enforced by the validators): PascalCase + Hungarian notation, English-only identifiers and comments. FB interface: bEnable/bExecute inputs -> bDone/bBusy/bErr/nErrId outputs. State machine: nState 0=IDLE, 10-80=work, 90=DONE, 99=ERROR. Full reference: plc_knowledge topic 'conventions'.

DISCIPLINE (non-negotiable, ranks equal to conventions): verify before delivering — never call ST/XML "done" until the validators actually pass; no regressions — re-validate the whole affected set after any edit; fix every warning/violation, defer nothing silently; never hardcode credentials or real IP addresses, and machine-commanding logic must be reviewed by an engineer before it runs; do only what is asked. Full checklist: plc_knowledge topic 'engineering-discipline'.`;

  const ide = `

IDE TOOLS (ide_*): drive a live CODESYS instance. Only use AFTER the offline pipeline produced validated XML. Always ide_open_project before ide_set_pou_code. Changes are irreversible.`;

  const hardware = `

HARDWARE TOOLS (cpx_*, edcon_*): talk to real Festo hardware — bench commissioning only, never production. Always edcon_pnu_read before edcon_pnu_write.`;

  return core
    + (opts.ideToolsEnabled ? ide : '')
    + (opts.hardwareToolsEnabled ? hardware : '');
}
