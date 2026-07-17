---
description: For a directory of .st files, generate PLCopen XML, validate it, and produce a copy-pasteable markdown checklist of the points to review before importing into the CODESYS IDE.
allowed-tools: mcp__festo-codesys-mcp__plc_validate, mcp__festo-codesys-mcp__generate_plcopen_xml, mcp__festo-codesys-mcp__validate_plcopen_xml, Read, Glob, Bash
argument-hint: [source-dir]
---

Arguments received: `$ARGUMENTS` (target directory; default: `src/pou/` if empty).

Follow the workflow defined in the `plcopen-xml` skill (.claude/skills/plcopen-xml/SKILL.md) using these arguments, and finish with a copy-pasteable pre-import checklist.
