---
id: plcopen-xml-protocol
title: PLCopen XML Mandatory Rules for CODESYS Import
priority: HIGH
use_when:
  - generating PLCopen XML files
  - auditing XML for CODESYS import compatibility
  - need XML structure rules (namespace, header, footer)
never_use_when:
  - writing ST code without XML export
keywords: [PLCopen, XML, namespace, contentHeader, coordinateInfo, instances, configurations, LD, ST, FBD, export to CODESYS, import XML, File Import, TC6 0200, XML structure, valid XML, POU XML, generate XML, importable file, CODESYS import compatibility]
see_also: [ground-truth, plcopen-schema, plcopen-example, plcopen-extensions]
---

# PLCopen XML Protocol — Definitive Rules

> Mandatory rules for generating valid PLCopen XML importable by CODESYS V3.5+.

---

## 1. Project Global Structure

- **Root Namespace**: `<project xmlns="http://www.plcopen.org/xml/tc6_0200" xmlns:xhtml="http://www.w3.org/1999/xhtml">`
- **Instances Block**: MUST end with `<instances><configurations /></instances>`
- **No ID Attributes**: No `id="..."` on `<connectionPointIn>` or `<connectionPointOut>` tags

## 2. Header Structure

```xml
<fileHeader companyName="" productName="CODESYS"
            productVersion="CODESYS V3.5 SP21"
            creationDateTime="2026-01-01T00:00:00" />
<contentHeader name="ProjectName"
               modificationDateTime="2026-01-01T00:00:00">
  <coordinateInfo>
    <fbd><scaling x="1" y="1" /></fbd>
    <ld><scaling x="1" y="1" /></ld>
    <sfc><scaling x="1" y="1" /></sfc>
  </coordinateInfo>
</contentHeader>
```

- **contentHeader**: NEVER self-closing. Always `<contentHeader>...</contentHeader>`
- **coordinateInfo**: MUST have `<fbd>`, `<ld>`, `<sfc>` children in that order

## 3. Type Declarations

### Simple Types (lowercase)
```xml
<BOOL />  <INT />  <DINT />  <UINT />  <UDINT />
<REAL />  <LREAL />  <WORD />  <DWORD />
<TIME />  <string />  <wstring />
```

### Derived Types (for FBs, STRUCTs, ENUMs)
```xml
<!-- CORRECT -->
<variable name="fbTimer"><type><derived name="TON" /></type></variable>

<!-- WRONG — will fail import -->
<variable name="fbTimer"><type><TON /></type></variable>
```

### Arrays
```xml
<variable name="arValues">
  <type>
    <array>
      <dimension lower="0" upper="9" />
      <baseType><REAL /></baseType>
    </array>
  </type>
</variable>
```

## 4. Initial Values

```xml
<variable name="nState">
  <type><INT /></type>
  <initialValue><simpleValue value="0" /></initialValue>
</variable>
```

## 5. Structured Text Body

```xml
<body>
  <ST>
    <xhtml xmlns="http://www.w3.org/1999/xhtml">
      // ST code here (with XML escaping)
      // &lt; for <  |  &gt; for >  |  &amp; for &
    </xhtml>
  </ST>
</body>
```

## 6. Block Element Order (Ladder)

```xml
<block localId="1" typeName="TON" instanceName="fbTmr"
       height="60" width="40">
  <position x="60" y="80" />
  <inputVariables>...</inputVariables>
  <inOutVariables />        <!-- MANDATORY even if empty -->
  <outputVariables>...</outputVariables>
</block>
```

## 7. Connection Rules

- Use `<connection refLocalId="X">` to link elements
- For block outputs: `<connection refLocalId="X" formalParameter="Q">`
- Coordinates: blocks `height="60" width="50"`, position in steps of 10
- PowerRail: NEVER connect directly to numeric ports

## 8. Mandatory Footer

Every PLCopen XML file MUST end with:
```xml
  <instances>
    <configurations />
  </instances>
</project>
```
