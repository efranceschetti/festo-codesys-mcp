---
description: Decode Festo / CODESYS / EtherCAT error codes using the embedded references. Suggests next steps.
allowed-tools: mcp__festo-codesys-mcp__explain_error_code, mcp__festo-codesys-mcp__plc_knowledge, mcp__festo-codesys-mcp__plc_lookup
argument-hint: <error-code> [context]
---

Arguments received: `$ARGUMENTS` (expected: code + optional context, e.g. `0x8001 CMMT-AS startup` or `16#FF87`; if no clear code, ask the user).

Follow the workflow defined in the `error-diagnosis` skill (.claude/skills/error-diagnosis/SKILL.md) using these arguments.
