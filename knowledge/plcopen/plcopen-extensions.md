---
id: plcopen-extensions
title: PLCopen XML Extension Schemas (AddData, Vendor Extensions)
priority: LOW
use_when:
  - need vendor-specific XML extensions (AddData, event tasks)
  - advanced XML generation beyond basic POUs
never_use_when:
  - standard FB/PRG/DUT XML generation
keywords: [PLCopen, extensions, AddData, vendor, event task, body extensions, custom XML, vendor-specific XML, namespace extension, TC6 extension, addData node, advanced XML, metadata element]
see_also: [xml-rules, ground-truth, plcopen-schema]
---

# PLCopen XML Extensions Reference

> Extension schemas for IEC 61131-10 PLCopen XML (TC6).
> These define vendor-specific AddData and Body extensions supported by CODESYS.

## Overview

PLCopen XML TC6 defines extension mechanisms to support vendor-specific features while maintaining interoperability. Extensions fall into two categories:

- **AddData Extensions**: Metadata attached to standard elements via `<addData>` nodes
- **Body Extensions**: New element types extending base classes (e.g., custom task types, graphical elements)

All extensions use namespace prefixes:
- `ppx:` - Core PLCopen namespace (`www.iec.ch/public/TC65SC65BWG7TF10`)
- `rxt:` - Recommendation namespace (`www.iec.ch/public/TC65SC65BWG7TF10/Recommendation`)

---

## 1. FormattedMarkupText Extension

**Purpose**: Provides rich text formatting for comments, documentation, and descriptions using HTML-like markup within PLCopen XML text fields.

### Key Elements

| Element | Attributes | Description |
|---------|-----------|-------------|
| `<font>` | `size`, `color`, `face` | Change font style locally |
| `<bold>` | - | Bold text |
| `<italic>` | - | Italic text |
| `<underline>` | - | Underlined text |
| `<strike>` | - | Strike-through text |
| `<big>` | - | Larger font size |
| `<small>` | - | Smaller font size |
| `<par>` | - | Paragraph container |
| `<headline>` | - | Headline/title container |

### Color Type

Supports sRGB colors in two formats:
- Hex: `#RRGGBB` (e.g., `#FF0000`)
- Named: `Black`, `White`, `Red`, `Blue`, `Green`, `Yellow`, `Gray`, `Silver`, `Maroon`, `Navy`, `Purple`, `Fuchsia`, `Lime`, `Aqua`, `Olive`, `Teal`

### When to Use

- Format FB/POU documentation with headings and styled text
- Highlight important comments in different colors
- Structure complex descriptions with paragraphs
- Add visual hierarchy to technical documentation

### Example
```xml
<documentation>
  <rxt:FormattedMarkupText>
    <headline><bold>Homing Sequence</bold></headline>
    <par>
      This FB performs <italic>CiA 402</italic> homing on a servo axis.
      <font color="Red">WARNING:</font> Ensure hardware limits are configured.
    </par>
  </rxt:FormattedMarkupText>
</documentation>
```

---

## 2. AnchoredComment (AddData)

**Purpose**: Attach floating comments to graphical elements (FBD, LD, SFC) at specific relative positions. Comments have no semantic meaning but improve code readability.

### Schema Structure
```xml
<addData>
  <AnchoredComment>
    <RelPosition x="10.5" y="-5.0"/>
    <Size x="100" y="30"/>
    <Content>Comment text here</Content>
  </AnchoredComment>
</addData>
```

### Key Elements

| Element | Type | Description |
|---------|------|-------------|
| `RelPosition` | `XyDecimalValue` | Offset from parent element (can be negative) |
| `Size` | `XyDecimalValue` | Width/height of comment box (optional) |
| `Content` | `TextBase` | Comment text content |

### When to Use

- Annotate FBD blocks with implementation notes
- Add warnings or maintenance notes to specific network elements
- Document complex ladder logic branches
- Label SFC steps with operational context

### Parent Elements

Applies to any `GraphicalObjectBase` descendant:
- FBD: `<block>`, `<inVariable>`, `<outVariable>`
- LD: `<contact>`, `<coil>`, `<block>`
- SFC: `<step>`, `<transition>`, `<action>`

---

## 3. EvaluationPriority (AddData)

**Purpose**: Define explicit execution order for blocks within a network when default dataflow evaluation is insufficient. Lower numbers execute first.

### Schema Structure
```xml
<block>
  <!-- block definition -->
  <addData>
    <EvaluationPriority priorityInNetwork="1"/>
  </addData>
</block>
```

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `priorityInNetwork` | `unsignedLong` | Execution priority (lower = earlier) |

### Rules

- Scope: Within a single `<FbdNetwork>` (FBD) or `<LadderRung>` (LD)
- Each priority value must be unique within the network
- Applies only to `<block>` elements with priority specified
- Blocks without priority are evaluated by standard dataflow rules

### When to Use

- Force evaluation order when blocks have side effects (e.g., logging, I/O)
- Control timing in networks with parallel execution paths
- Debug race conditions by serializing block execution
- Optimize performance by scheduling heavy computations last

### Example
```xml
<FbdNetwork>
  <block localId="1">
    <addData><EvaluationPriority priorityInNetwork="2"/></addData>
  </block>
  <block localId="2">
    <addData><EvaluationPriority priorityInNetwork="1"/></addData>
  </block>
  <!-- Block 2 executes before Block 1 -->
</FbdNetwork>
```

---

## 4. HiddenFormalParameter (AddData)

**Purpose**: Control visibility of formal parameters on FB/FU invocations. Hides both the parameter name and its connected value in graphical views.

### Schema Structure
```xml
<variable formalParameter="Enable">
  <connectionPointIn><!-- connection --></connectionPointIn>
  <addData>
    <HiddenFormalParameter hideable="true" hide="true"/>
  </addData>
</variable>
```

### Key Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `hideable` | `boolean` | `false` | Whether this parameter can be hidden |
| `hide` | `boolean` | - | Whether this parameter is currently hidden |

### Behavior

- Connection (`<connectionPointIn>`) remains valid even when hidden
- Differs from `suppressName` (IEC 61131-10): `suppressName` hides only the label, `hide` hides the entire parameter
- Hidden parameters still transfer data—only the visual representation is suppressed

### When to Use

- Clean up FBD diagrams by hiding default/constant parameters (e.g., `Enable := TRUE`)
- Reduce visual clutter for FBs with many optional inputs
- Show only critical parameters in review/documentation views
- Standardize FB appearance across different invocations

---

## 5. Worksheet (AddData)

**Purpose**: Structure code within a POU into logical sections (worksheets). Each worksheet groups related networks or ST statements for organization and navigation.

### Schema Structure
```xml
<FBD>
  <addData>
    <Worksheet worksheetName="Initialization" evaluationOrder="0"/>
  </addData>
  <!-- networks -->
</FBD>

<FBD>
  <addData>
    <Worksheet worksheetName="MainLoop" evaluationOrder="1"/>
  </addData>
  <!-- networks -->
</FBD>
```

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `worksheetName` | `string` | Unique name within the POU/method |
| `evaluationOrder` | `decimal` | Execution order (lowest first, starting from 0) |

### Structure

- One or more networks/statements form a worksheet
- One or more worksheets form a POU body or method
- Worksheets in a POU must have unique names
- Execution follows `evaluationOrder` (ascending)

### When to Use

- Organize large POUs into logical sections (Init, Main, Error Handling)
- Separate diagnostic code from production logic
- Create multi-phase execution within a single POU
- Improve navigation in complex programs (e.g., state machines with 10+ states)

### Parent Elements

Applies to all graphical and textual body types:
- `<ST>`, `<IL>`, `<FBD>`, `<LD>`, `<SFC>`

---

## 6. InstantScriptBlock Extension

**Purpose**: Embed inline textual code (ST/IL) directly within graphical languages (FBD/LD) as a graphical block element. Enables mixing paradigms without creating separate POUs.

### Schema Structure
```xml
<ScriptBlock localId="5" height="50" width="100">
  <position x="200" y="100"/>
  <Script>
    <ST>
      <xhtml:p>rTemp := rSetpoint * 1.5;</xhtml:p>
      <xhtml:p>bReady := TRUE;</xhtml:p>
    </ST>
  </Script>
  <ConnectionPointIn formalParameter="IN"/>
  <ConnectionPointOut formalParameter="OUT"/>
</ScriptBlock>
```

### Key Elements

| Element | Type | Description |
|---------|------|-------------|
| `Script` | `ProgrammingLanguageBase` | Inline code (ST, IL, etc.) |
| `ConnectionPointIn` | `ConnectionPointIn` | Optional input connections |
| `ConnectionPointOut` | `ConnectionPointOut` | Optional output connections |

### Inheritance

Extends `ppx:FbdObjectBase` - behaves like a standard FBD block with position, size, and connection points.

### When to Use

- Perform quick calculations inline without creating a dedicated FB
- Mix ST expressions within FBD for complex math
- Prototype logic before refactoring into reusable FBs
- Implement one-off conversions or formatting logic

### Limitations

- Scope: Variables must be declared in parent POU
- Debugging: Less traceable than dedicated POUs
- Reusability: Code duplication if logic is repeated

---

## 7. JumpStep Extension

**Purpose**: Implement SFC connectors/jumps—redirect flow from a transition or selection convergence to a non-adjacent step without drawing long connection lines.

### Schema Structure
```xml
<JumpStep localId="10" targetStepName="Step5">
  <position x="150" y="300"/>
  <ConnectionPointIn>
    <relPosition x="0" y="0"/>
    <connection refLocalId="8"/>
  </ConnectionPointIn>
</JumpStep>
```

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `targetStepName` | `string` | Name of the existing step to jump to |

### Behavior

- Replaces a `<step>` as a successor of `<transition>` or `<selectionConvergence>`
- Has no associated `<actionBlock>`
- Has no successor (transition/divergence)
- Acts as a graphical connector to another step

### When to Use

- Avoid crossing connection lines in complex SFC charts
- Implement backward jumps (loops) to earlier steps
- Connect parallel branches to a common step without visual clutter
- Simplify large SFC diagrams (e.g., batch processes, multi-mode machines)

### Example Flow
```
Step1 → Transition1 → JumpStep(target="Step5") → (jumps to) → Step5 → ...
```

---

## 8. NamedEventTask Extension

**Purpose**: Define system event-driven tasks that execute on PLC lifecycle events (start, stop, reset) rather than cyclic or interrupt-based triggers.

### Schema Structure
```xml
<tasks>
  <rxt:NamedEventTask name="ColdStartInit" priority="1" triggerName="plcColdStart">
    <pouName>InitializeSystem</pouName>
  </rxt:NamedEventTask>
</tasks>
```

### Key Attributes

| Attribute | Type | Values | Description |
|-----------|------|--------|-------------|
| `triggerName` | `NMTOKEN` | `plcColdStart`, `plcWarmStart`, `plcHotStart`, `plcStop` | System event trigger |

### Trigger Types

| Trigger | When Executed |
|---------|---------------|
| `plcColdStart` | Power-on, complete reset, download |
| `plcWarmStart` | Restart with variable retention |
| `plcHotStart` | Resume from breakpoint |
| `plcStop` | PLC stop/shutdown |

### Inheritance

Extends `ppx:TaskBase` - inherits name, priority, and POU assignment.

### When to Use

- Initialize hardware on cold start (e.g., servo homing, I/O configuration)
- Save persistent data on PLC stop
- Restore state after warm restart
- Run diagnostics on hot start (resume from debug)

### Notes

- Implementers may extend the `triggerName` enum with vendor-specific events
- Execution order among same-event tasks follows priority (lower = earlier)

---

## 9. VendorExtensionExample

**Purpose**: Template schema demonstrating how vendors extend IEC 61131-10 with custom types, elements, and behaviors while maintaining standard compliance.

### Example Extension: InstantlyDefinedSubrangeTypeSpec

```xml
<myns:InstantlyDefinedSubrangeTypeSpec>
  <Range lower="0" upper="100"/>
  <BaseType>
    <derived name="INT"/>
  </BaseType>
</myns:InstantlyDefinedSubrangeTypeSpec>
```

### Schema Imports

Shows proper namespace usage:
```xml
<!-- Normative standard -->
<xsd:import namespace="www.iec.ch/public/TC65SC65BWG7TF10"
            schemaLocation="IEC61131_10_Ed1_0.xsd"/>

<!-- Informative recommendations -->
<xsd:import namespace="www.iec.ch/public/TC65SC65BWG7TF10/Recommendation"
            schemaLocation="Extension_FormattedMarkupText.xsd"/>

<!-- Vendor namespace -->
<xsd:schema targetNamespace="http://www.someVendor.com/xml/PLC">
```

### Extension Pattern

1. Define vendor-specific namespace (`myns`)
2. Import core PLCopen schema (`ppx`)
3. Import recommendation extensions (`rxt`)
4. Extend base types (e.g., `InstantlyDefinableTypeSpecBase`)
5. Add vendor-specific attributes/elements

### When to Use

- Reference when creating custom extensions for proprietary features
- Understand how to properly namespace vendor additions
- Learn extension inheritance patterns
- Ensure interoperability with standard PLCopen tools

---

## Summary Table

| Extension | Type | Target Elements | Use Case |
|-----------|------|----------------|----------|
| FormattedMarkupText | Body | Text fields | Rich documentation formatting |
| AnchoredComment | AddData | Graphical objects (FBD/LD/SFC) | Floating annotations |
| EvaluationPriority | AddData | `<block>` (FBD/LD) | Control execution order |
| HiddenFormalParameter | AddData | `<variable>` (FB inputs) | Hide FB parameters |
| Worksheet | AddData | `<ST>`, `<FBD>`, `<LD>`, `<SFC>` | Organize POU sections |
| InstantScriptBlock | Body | FBD/LD networks | Inline ST code in graphical |
| JumpStep | Body | SFC charts | Non-linear step jumps |
| NamedEventTask | Body | Task configuration | Event-driven tasks |
| VendorExtensionExample | Template | - | Extension development guide |

---

## Best Practices

1. **Namespace Management**: Always declare `rxt:` prefix when using recommendation extensions
2. **Validation**: Extensions may cause import failures in non-CODESYS tools—test portability
3. **Documentation**: Use `FormattedMarkupText` for human-readable docs, `AnchoredComment` for implementation notes
4. **Performance**: Avoid excessive `EvaluationPriority`—let dataflow determine order when possible
5. **Maintainability**: Use `Worksheet` for POUs > 5 networks; use `InstantScriptBlock` sparingly (prefer dedicated FBs)

---

## References

- IEC 61131-10 Ed1.0 (PLCopen XML TC6)
- CODESYS V3.5 SP20+ (full extension support)
- PLCopen XML namespace: `www.iec.ch/public/TC65SC65BWG7TF10`
