# Manuals Knowledge Base

> Place your converted PDF manuals here as `.md` files.

## How to Add Manuals

1. Convert your PDF manual to Markdown (`.md`) format
2. Save the file in this `knowledge/manuals/` directory
3. The FestoCodesysMCP server will **auto-discover** all `.md` files here
4. Use `plc_knowledge` with action `search` or `list_manuals` to access them

## Recommended File Naming

Use lowercase with hyphens, descriptive names:

| Manual | Suggested Filename |
| ------ | ------------------ |
| Festo CPX-E System Manual | `festo-cpx-e-system.md` |
| Festo CMMT Servo Drive | `festo-cmmt-servo.md` |
| Festo CDPX Designer Studio | `festo-cdpx-designer-studio.md` |
| EtherCAT ESI Files Guide | `ethercat-esi-guide.md` |
| PLCopen Motion Control Part 1 | `plcopen-motion-part1.md` |
| IEC 61131-3 Reference | `iec-61131-3-reference.md` |

## Tips for Conversion

- Focus on the most-consulted sections: parameter tables, state diagrams, error codes
- Keep tables in Markdown format for structured access
- Include section headings that match the original chapter structure
- Code examples should use `iecst` fenced code blocks
