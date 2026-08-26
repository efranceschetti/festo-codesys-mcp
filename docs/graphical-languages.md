# Graphical Languages (SFC / LD / FBD) — Status and Feasibility

Research note, 2026-08-26. Why it exists: the question *"can this server emit SFC or Ladder
instead of ST, so the code reads visually?"* comes up often enough to deserve a measured
answer instead of a fresh investigation each time.

Short version: **the server is ST-only by construction, the PLCopen schema is not the
obstacle, and the one thing that decides the whole question has not been measured yet.**

| | Status |
|---|---|
| Server emits `<SFC>` / `<LD>` / `<FBD>` bodies | **No.** The body tag is hardcoded |
| Bundled PLCopen XSD accepts graphical bodies | **Yes.** Fully, including all SFC and LD elements |
| `ide_*` tools can create a graphical POU | **No** — and the `language` parameter silently lies (see §3) |
| CODESYS Scripting can build an SFC graph | **No.** Textual objects only, officially |
| CODESYS converts ST → SFC or ST → LD | **No.** Not in V3, any version |
| Third-party `<SFC>` body imports into CODESYS | **Unknown.** No evidence either way (see §6) |

---

## 1. What the server does today

Every POU body this server produces goes through one function:

- `src/utils/xml-builder.ts` → `buildPouElement()`

The `<ST>` tag is a string literal inside that template. There is no language parameter
anywhere in the call chain, and `PouDefinition` (same file) carries only `body: string`,
commented `// ST code` — there is no `language` field to set.

`buildProjectXml()` maps every POU through `buildPouElement()` unconditionally.

A search of `src/` for `<SFC>`, `<LD>`, `<FBD>`, `leftPowerRail`, `rightPowerRail`,
`selectionDivergence`, `simultaneousDivergence`, `actionBlock`, `<contact`, `<coil`,
`<step `, `<transition` returns **zero hits in generator code**. The only occurrences in the
repository are in the knowledge topics and in the XSD files — documentation and schema, not
emission.

The input side matches: `src/utils/st-parser.ts` → `extractBody()` takes the raw text between
the last `END_VAR` and `END_PROGRAM` / `END_FUNCTION_BLOCK` / `END_FUNCTION`. It classifies
POU *type* (program / functionBlock / function). It never classifies or produces a *language*.

## 2. What is already in place

Two things are further along than expected:

**The bundled XSD accepts graphical bodies in full.**
`python/lib/plcopen_validation/data/tc6_xml_v200_patched.xsd` is the official PLCopen TC6
schema with the namespace repatched to `tc6_0200`. Its `complexType body` is an
`xsd:choice` of exactly five: `IL`, `ST`, `FBD`, `LD`, `SFC`. It defines `step`, `macroStep`,
`jumpStep`, `transition`, `selectionDivergence`, `selectionConvergence`,
`simultaneousDivergence`, `simultaneousConvergence`, `actionBlock`, `contact`, `coil`,
`leftPowerRail` and `rightPowerRail`.

**A graphical body would pass `validate_plcopen_xsd` today.** The gate is not the blocker;
the emitter is.

**`<coordinateInfo>` is already emitted.** `buildProjectXml()` writes the `fbd` / `ld` / `sfc`
scaling triplet the schema requires, and `validate_plcopen_xml` checks all three are present.
That boilerplate ships in every file we generate, including 100% ST projects.

Note the scaling bases are not arbitrary, and we currently emit `1x1` for all three: per the
PLCopen spec, FBD scaling is the minimum distance between two pins, **LD is the size of a
coil**, and **SFC is the size of a transition** (width for X, height for Y).

## 3. Known gaps — and one silent bug worth fixing regardless

**`ide_create_pou` accepts a `language` it then discards.**
`src/tools/codesys-ide-tools.ts` declares the parameter with enum
`['ST','LD','FBD','SFC','IL','CFC']`. The IronPython template it drives
(`src/utils/codesys-python-templates.ts`) does:

```python
lang_guid = None
print("DEBUG: Setting language to None (will use default).")
```

and then calls `create_pou(name=..., type=..., language=lang_guid)`, reporting
`"Language: %s (Defaulted)"`. **Asking for SFC or LD there creates a POU in the CODESYS
default language, and the tool reports success.** The parameter description already concedes
*"only ST is fully supported by Script Engine"* — but an enum that accepts a value and
ignores it is worse than one that rejects it.

The same `lang_guid = None` appears in the `create_property` and `create_method` templates.

Suggested fix, independent of any SFC work: either wire the language GUID through, or
narrow the enum to `['ST']` and fail loudly on anything else.

**`ide_patch_pou_code` already fails correctly on graphical POUs**, with:
`"Target '%s' has no %s attribute (POU likely uses graphical language LD/FBD/SFC/CFC)."`
That is the right behaviour and a good model for the above.

## 4. What the PLCopen schema demands of a graphical body

Anyone writing the emitter needs these, and they are easy to get wrong:

- **`localId` is `use="required"` on every graphical object**, type `xsd:unsignedLong`, and
  must be unique within a POU code body. `globalId` is optional.
- **`position` requires both `x` and `y`** (`xsd:decimal`, `use="required"`). Origin is the
  top-left of the worksheet; +X right, +Y down.
- **Connections carry `refLocalId`, also required** (`connectionPointIn` → `connection`).
- `step`: `localId` and `name` required; optional `initialStep`, `negated`; children
  `position`, `connectionPointIn`, `connectionPointOut`, `connectionPointOutAction` — the last
  two with a **required `formalParameter`** attribute.
- `transition`: optional `priority`, evaluated only when the transition hangs off a
  `selectionDivergence`. Its `condition` child is a choice of `reference name=`,
  `connectionPointIn`, or `inline` — and `inline` is a full `body`, i.e. **ST embedded inside
  the transition**.
- `jumpStep`: `targetName` required.
- `macroStep` nests a whole `body`.
- **`actionBlock` lives in `commonObjects`, not `sfcObjects`.** The schema's own words:
  *"Actions are associated with a step by using an actionBlock element with a connection to
  the step element."* Its `action` child takes a required `localId` and `relPosition`, plus a
  `qualifier` (default `N`) drawn from `P1, N, P0, R, S, L, D, P, DS, DL, SD, SL`.
- An `SFC` body may legally contain `ldObjects` and `fbdObjects` inline; an `LD` body may
  contain `fbdObjects`.
- `addData` is `minOccurs="0"` everywhere — **optional per the schema**.

**The load-bearing escape hatch**, straight from the spec (§3.8): coordinates are mandatory
to *write*, but *"This information on coordinates can be ignored by the importing system, for
instance when an auto-routing / auto-placement system is in place."* An emitter must still
produce plausible coordinates; it may not have to produce *good* ones.

That said, the real work in a graphical emitter is not translation — it is **layout**.
Deciding where each step, branch and contact sits on the sheet is a graph-drawing problem,
and it is most of the job.

## 5. What CODESYS does and does not do

**Import.** CODESYS states plainly: *"PLCopen XML defined a subset of elements which CODESYS
recognizes. Therefore, 100% compatibility cannot be guaranteed."* The Import PLCopenXML
command page lists no language restriction.

**Language conversion.** CODESYS converts **FBD ↔ LD ↔ IL** and nothing else — those three
share an internal representation. ST is outside that set in both directions; CODESYS staff
confirmed on the forge that *"the conversion ST to LD/FBD is not present in V3"* (it existed
in V2.3 and was dropped). No native ST → SFC converter exists in any version, which is
unsurprising: SFC topology cannot be inferred from statements.

Beware the name collision: **"Convert to New Ladder" is not a language conversion** — it
migrates an FBD/LD/IL object to the CODESYS Ladder add-on format (LD2).

**Scripting.** The official position, from the CODESYS Forge scripting snippets:
*"Only Structured Text can be edited directly! … for the graphical languages you have to
import the POU from PLCopenXML or the codesys native format"*, via `importxml()` /
`importnative()` on `IScriptObject2` / `IScriptProject2`.

`ScriptIecLanguageObjectContainer.create_pou()` does take a `ScriptImplementationLanguage`
that includes SFC, and `ScriptIecLanguageMemberContainer` offers `create_action()` /
`create_transition()`. But there is **no API to create steps, transitions, action blocks or
divergences inside a graphical body**. Documented restriction: SFC cannot be used with
`create_pou(PouType.Function)`, `create_method()`, `create_property()` or
`create_transition()`.

So scripting is the *trigger* for an import, never the builder of the graph. That is
consistent with what this server already does: generate XML offline, let the user import it.

**What CODESYS staff actually recommend**, verbatim from the forge:

> *"You can't do Ladder with Scripting but you can import and export PLCopenXML which
> supports Ladder."* — followed by: create the logic in the editor, export it as PLCopenXML,
> and **read the exported XML to see how it is done and what is possible**.

That recommendation is the next section.

## 6. The experiment that has to come first

**The one unknown that decides everything: does CODESYS accept a graphical body produced by
a foreign tool?**

Evidence found so far:
- **For LD, yes, documented by a third party.** MathWorks documents Simulink PLC Coder
  emitting Ladder as PLCopen XML, imported via *Project → Import PLCOpenXML* into CODESYS 3.5
  and building without errors. Caveats in their own page: the compatible versions they cite
  are old (3.5.4.30–3.5.8.40), and the version number in the XML may need adjusting.
- **For SFC from a foreign tool: nothing.** No success report, no failure report. A gap in
  evidence, not a negative result.
- **Failures do happen with foreign XML.** Forge threads report
  `Creation of object 'X' failed. Reason: The given key was not present in the dictionary.`
  for a particular branched-connection shape, and for POUs exported from another vendor's
  tool.
- **Proprietary `addData` observed in real CODESYS exports** uses the names
  `http://www.3s-software.com/plcopenxml/{projectinformation, tasksettings, datatype, pou,
  attributes, libraries}`, with `handleUnknown` set to `implementation` or `discard`. Whether
  any of it is *required* on import of a graphical body is undocumented.

**The measurement, roughly one afternoon:** build one minimal SFC by hand in CODESYS —
initial step, two steps, a `selectionDivergence`, a `simultaneousDivergence`, a `jumpStep`,
and an `actionBlock` exercising `N`, `S`, `R`, `P`. Export as PLCopen XML. Then re-import it
three times:

1. **intact** — establishes the baseline round-trip;
2. **with every `addData` block stripped** — answers whether proprietary metadata is required;
3. **with every `x`/`y` zeroed** — answers whether auto-placement actually kicks in.

Those three runs settle the emitter's requirements, and the exported file doubles as the
golden template. No amount of further web research substitutes for it.

Worth noting as a weak signal: recent published work generating SFC in PLCopen XML from a
reduced representation reports that *"the missing metadata is regenerated when the PLCopen
file is imported into the intended IDE"* and that they template from minimal nodes of an
example project. Their validation, however, is schema conformance plus ST parsing — **not
import success in an IDE** — and the IDE they show is not CODESYS. Treat it as a hint that
the experiment is worth running, not as an answer.

## 7. If we implement it — design sketch

In dependency order:

1. **Run §6.** Without it, everything below is guesswork.
2. **Add `language` to `PouDefinition`** and branch in `buildPouElement()`. Keep `ST` the
   default so nothing existing changes.
3. **Write an IR → graph emitter.** The hard part is layout: assign `localId`, lay steps on a
   column, place transitions between them, spread divergence branches horizontally, and route
   `connectionPointIn`/`refLocalId`. Start with SFC on a strict single-column skeleton before
   attempting LD rung packing.
4. **Extend `validate_plcopen_semantic`.** It currently compares variable and initializer
   counts between the `.st` source and the XML — it has no notion of a graphical body, so a
   generated SFC would pass it vacuously. It needs a step/transition census to be worth
   anything.
5. **Fix `ide_create_pou`'s language parameter** (§3) — arguably worth doing on its own,
   before any of this.

## 8. When converting an existing ST codebase is *not* worth it

The tooling question and the engineering question are separate, and the second one usually
answers itself first. Signals — measured, not guessed — that a conversion will cost more than
it returns:

- **The state machine is a small fraction of the code.** Measure the share of lines inside
  `CASE` blocks. When it is a quarter or less, the rest — input derivation, FB calls, mode
  MUX, fault chains, bus publication — is untouched by SFC, so most of the file looks exactly
  the same afterwards.
- **The branches are long.** A `CASE` branch of fifty lines does not become a picture; it
  becomes a box whose action is written in ST. The gain is the diagram of the boxes, which a
  generated state diagram delivers for far less.
- **The code carries dense prose.** Comment-to-code ratios near 1:1 usually mean the comments
  record *why a guard exists*, which is the most expensive asset in the file. Graphical
  editors have no good home for prose at that density.
- **Transitions leave from any state.** `IF <fault> THEN nState := cFAULT; END_IF` after
  `END_CASE` is one line in ST and N arrows across the sheet in SFC.
- **Outputs are published in one block, keyed by state.** That pattern is how single-writer
  discipline gets enforced. SFC pushes it toward qualified actions scattered across steps —
  the opposite.
- **Nested sub-state-machines.** A second `CASE` inside a branch, or one running before the
  main one in the same scan, becomes a separate POU or a macro step.
- **Tooling parses the `.st` text.** This one is decisive and easy to miss. Lint gates that
  regex for single-writer violations, codegen that derives documentation or commissioning
  artefacts from `CASE nState OF` labels, structural parity gates comparing an ST AST against
  a simulator — all of them read the *body*. Move the body into a graphical XML and they do
  not degrade, they **vanish**, and some fail open: a "no orphan globals" check that
  concatenates POU text will report every global as orphaned once the text is gone.
- **The pipeline is one-way.** If `.st` files are the source and the project file is a build
  artefact, hand-drawn graphical bodies reverse that. The source becomes a binary project, and
  the text diff — the mechanism by which anyone knows what changed between two site visits —
  goes with it.

**The cheaper answer, when the goal is comprehension rather than notation:** generate state
diagrams *from* the ST and keep the firmware textual. If the code already publishes a state
number and a state name to the HMI or to OPC UA — most well-structured station code does —
then a live diagram outside the PLC shows what an SFC in online mode would show, on the
machine rather than in the IDE, and costs no firmware risk at all.

**And when it *is* worth it:** genuinely sequential processes with short branches, few
cross-cutting aborts, and no text-coupled tooling. PLCopen's own guidance is that whenever a
sequential process is to be controlled, SFC should be considered the most suitable structure
for a POU, and that mixing SFC skeletons with ST actions is the canonical use, not a
compromise.

## 9. SFC semantics a validator should catch

If we ever emit or validate SFC, these are the traps. Sources are PLCopen's SFC guidelines
and the CODESYS SFC documentation.

**Execution order is not intuitive.** CODESYS processes, per cycle: reset of internal action
control flags → exit actions of deactivated steps → entry actions → time/step-action check →
**IEC actions in alphabetical order**, in two passes (deactivated steps first, then active) →
transition checks. Using the same IEC action at different chart levels yields unpredictable
results and raises an error.

**IEC actions execute twice** — once when the step activates, once when it deactivates —
whereas step actions do not. With qualifier `P`, CODESYS executes the action exactly twice.

**"Final scan" is implementation-dependent, by standard.** IEC 61131-3 3rd ed. Table 60
defines *with final scan* and *without final scan* as mutually exclusive features: an
implementation supports one. PLCopen's guidelines demonstrate an action running for two or
three cycles for a single-cycle condition, and two actions executing in the same cycle with
no parallel branch in the graph — with the concluding remark that a result *"may be equal to
x or equal to x-1, depending on the implementation of the SFC, and depending on the order of
execution of the actions."* Anything timing-sensitive must not live in an SFC action.

**PLCopen's coding rules worth encoding as checks:**
- parallel sequences must not be linked; each has exactly one initial and one final step;
- a sequence leaving a `simultaneousDivergence` may only end at a `simultaneousConvergence`,
  and never at two or more of them;
- prefer mutually exclusive transition conditions; *"Avoid using priorities for the different
  transitions. The risk of mistakes is very high"*;
- *"it must be ensured that all the actions that can be executed at a given scan cycle are
  mutually independent"* — the standard gives **no** rule on action execution order;
- avoid `S` and `R` qualifiers; if used, every `S` must be matched by an `R` on the same
  action;
- avoid `stepname.X` / `stepname.T` inside actions — it couples action code to graph topology.

**A design consequence for interlocks.** Continuous safety and anti-collision conditions must
hold on every scan and in every mode. Given undefined action ordering and the final-scan
ambiguity, putting an interlock *inside* an SFC action bets on an execution order the standard
does not guarantee. The interlock belongs in a permissive layer evaluated every scan, outside
the SFC; the SFC only reads the permissive as a transition condition and as an output guard.

**SFC flags** are declared implicitly: `SFCInit`, `SFCReset`, `SFCError`, `SFCEnableLimit`,
`SFCErrorStep`, `SFCErrorPOU`, `SFCQuitError`, `SFCPause`, `SFCTrans`, `SFCCurrentStep`,
`SFCTip`/`SFCTipMode`, `SFCErrorAnalyzation`. `SFCEnableLimit` must be TRUE for `SFCError`
timeout control to work. Silent trap: declaring a flag in a GVL without disabling "Declare" in
the SFC settings creates a local implicit flag that is **used instead of the global one**,
with no error.

**Qualifier support is narrower than the schema.** The XSD enumerates `P1`, `P0` and `DL`;
the CODESYS qualifier documentation lists `N, R, S, L, D, P, SD, DS, SL` and does not mention
those three. An emitter should not assume the schema's full set is accepted.

**Version control.** Graphical bodies carry mandatory `x`, `y`, `localId` and `refLocalId`,
so **any reposition in the editor produces a diff**, mixing logic changes with layout noise
and ID renumbering. That is a consequence of the schema, not an opinion about CODESYS.
CODESYS File-Based Storage (from V3.5.22.0, Professional Developer Edition) stores IEC source
as plain text and metadata as JSON, but states that *"for certain object types, the xml-based
export format is used"* — without saying which. There is no published claim that SFC bodies
become readable text.

---

## Sources

Schema and specification:
- PLCopen, *XML Formats for IEC 61131-3*, v2.01, 2009-05-08 —
  <https://www.plcopen.org/technical-activities/xml-exchange>
- `tc6_xml_v201.xsd` / the patched `tc6_xml_v200` bundled at
  `python/lib/plcopen_validation/data/`
- PLCopen, *Software Construction Guidelines: Structuring with SFC — do's and don'ts*, v1.0,
  2018-07-03 — <https://plcopen.org/sites/default/files/downloads/plcopen_structuring_with_sfc.pdf>
- Since 2019 the exchange format is standardised as IEC 61131-10.

CODESYS documentation:
- Exporting and Importing Projects — <https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_project_export_import.html>
- Import PLCopenXML — <https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_import_plcopenxml.html>
- FBD/LD/IL editor (the three interconvertible languages) — <https://content.helpme-codesys.com/en/CODESYS%20LD%20FBD/_cds_edt_fbd_ld_il_editor.html>
- SFC action qualifiers — <https://content.helpme-codesys.com/en/CODESYS%20SFC/_cds_sfc_action_qualifier.html>
- SFC processing order — <https://content.helpme-codesys.com/en/CODESYS%20SFC/_cds_sfc_sequence_of_processing.html>
- SFC flags — <https://content.helpme-codesys.com/en/CODESYS%20SFC/_cds_sfc_sfc_flags.html>
- Scripting: `ScriptIecLanguageObjectContainer` — <https://content.helpme-codesys.com/en/ScriptingEngine/ScriptIecLanguageObjectContainer.html>
- Forge scripting snippet #3 ("Only Structured Text can be edited directly!") — <https://forge.codesys.com/tol/scripting/snippets/3/>

Third-party evidence:
- MathWorks, *Import Ladder Diagram Code to CODESYS 3.5 IDE* — <https://www.mathworks.com/help/plccoder/ug/import-ladder-diagram-to-codesys-3-5-ide.html>
- CODESYS Forge threads on failed third-party PLCopen XML imports and on the absent ST→LD/FBD
  conversion in V3.

---

*Nothing in this note has been implemented. It records what was measured so the next attempt
starts from §6 instead of from scratch.*
