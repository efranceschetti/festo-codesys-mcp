---
description: Wrapper to create a new Function Block with a prior duplicate check against the library and loading of the conventions.
allowed-tools: mcp__festo-codesys-mcp__plc_library, mcp__festo-codesys-mcp__plc_knowledge, mcp__festo-codesys-mcp__plc_lookup, mcp__festo-codesys-mcp__create_function_block, AskUserQuestion
argument-hint: [FB name] [description]
---

Arguments received: `$ARGUMENTS` (expected: FB name + one-line description; if empty, ask the user).

Follow the workflow defined in the `writing-st-code` skill (.claude/skills/writing-st-code/SKILL.md) using these arguments.
