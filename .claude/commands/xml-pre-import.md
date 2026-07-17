---
description: CODESYS pre-import workflow — generate PLCopen XML from the directory, validate it, and delegate a deep review to the xml-validator subagent. Use ALWAYS before "File → Import" in the CODESYS IDE.
allowed-tools: mcp__festo-codesys-mcp__generate_plcopen_xml, mcp__festo-codesys-mcp__validate_plcopen_xml, Glob, Bash, Task
argument-hint: <source-dir> <output-xml-path>
---

Arguments received: `$ARGUMENTS` (syntax: `<sourceDir> <outputXml>`; defaults: source=`src/pou/`, output=`exports/import.xml` if empty).

Follow the workflow defined in the `plcopen-xml` skill (.claude/skills/plcopen-xml/SKILL.md) using these arguments.
