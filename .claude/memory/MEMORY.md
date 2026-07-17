# Project Memory — Index

Durable context about the USER'S PLC project (not about this repo).
Read this file at the start of substantial sessions; open theme files on demand.

| File | Contains | Write when… |
|---|---|---|
| hardware.md | PLC model, drives, IO modules, firmware/library versions | hardware is mentioned or configured |
| project-blocks.md | POUs created for this project (name, purpose, file) | any create_* tool succeeds |
| decisions.md | design decisions + rationale | an architectural choice is made |
| errors-solved.md | diagnosed error codes -> cause -> fix | an error diagnosis concludes |

## Rules
- One dated line per fact: `- 2026-07-15: CMMT-AS-S1 drive on EtherCAT slave 1001, homing Method 37`
- Update, don't duplicate — edit the existing line if a fact changes.
- Never store credentials, IP addresses of production systems, or personal data.
- If a file exceeds ~100 lines, compact it (merge/prune stale lines).
