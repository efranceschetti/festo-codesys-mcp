---
name: plcopen-xml
description: Use when generating, validating, fixing, or importing PLCopen XML (TC6 0200) — "export to CODESYS", "import XML", "PLCopen file", .xml project files, CODESYS File -> Import, or any XML for PLC POUs.
---

# PLCopen XML Pipeline

PLCopen XML is the #1 hallucination risk in this project. Never hand-write it; never trust it unvalidated.

## 1. Ground truth first
- `plc_knowledge` action=topic `ground-truth` (anti-hallucination rules), then `xml-rules`.
- Skip only if already loaded this session.

## 2. Generate — never hand-write
- `generate_plcopen_xml` with the .st source directory. Fix the .st sources and regenerate rather than editing XML by hand.

## 3. Validation chain (all three, in order)
1. `validate_plcopen_xml` — fast 13-rule sanity gate.
2. `validate_plcopen_xsd` — official TC6 v2.00 schema (needs python venv with lxml).
3. `validate_plcopen_semantic` — confirms no variables/initializers silently dropped vs the .st sources.

Any failure -> fix sources, regenerate, restart the chain. NEVER tell the user the file is import-ready before all three pass.

## 4. Delegate the final check
Before the user imports into the CODESYS IDE, delegate to the `xml-validator` subagent (fast, cheap) for the copy-pasteable verdict report.

## 5. Import checklist for the user
CODESYS -> File -> Import PLCopen XML -> resolve namespace conflicts -> Build -> Generate Code (expect 0 errors).
