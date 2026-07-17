---
description: Adapt an existing Function Block from the library into the current project. Reads the source, shows it to the user, helps rename/customize, and writes it to the correct destination.
allowed-tools: mcp__festo-codesys-mcp__plc_library, mcp__festo-codesys-mcp__plc_validate, Read, Write, Bash
argument-hint: <FB_name> [destination-dir]
---

Adapt a library FB into the project. Arguments: FB name + (optional) destination folder.

## Sequence

1. **Identify the source** — `plc_library` action=get with `name=$1`. If not found, suggest `plc_library` action=search.
2. **Show the source** — display the full FB content to the user with a short explanation (1-2 lines) of what it does.
3. **Collect customizations** — ask the user (single round):
   - Name in the project (default: same name)
   - Specific types/instances to rename
   - Real I/O ports that will connect (to place as a comment in the header)
4. **Adapt** — generate a customized version with:
   - A personalized header (author, date, machine, target instance)
   - The requested renames
   - Extra comments on the VAR_INPUT/OUTPUT mapping to the real I/O
   - PRESERVE the CASE nState logic and the state machine — do not invent
5. **Validate** — `plc_validate` action=fb_interface on the result.
6. **Save** — `Write` to the destination (default: `src/pou/<name>.st`).
7. **Report** — the saved path + next steps (generate XML, import).

NEVER add logic that was not in the original FB. NEVER break the state machine. Renaming/customizing is mechanical, not inventive.
