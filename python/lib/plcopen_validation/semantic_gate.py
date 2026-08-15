"""
Gate 2: semantic validation — compares the var/init counts between the ST
source and the generated PLCopen XML.

Catches the generator's A/B/E/F bugs (vars disappearing, lost init, ignored
VAR_GLOBAL blocks) that the structural XSD does NOT detect.

Pragmatic regex heuristic — sufficient to catch "half the vars vanished",
which is the real symptom of the bugs. Not meant to be a full ST parser.
"""
from __future__ import annotations

import re
from collections import defaultdict
from hashlib import sha1
from pathlib import Path
from typing import Any

from lxml import etree

from .types import ValidationError, ValidationReport

NS = "{http://www.plcopen.org/xml/tc6_0200}"

# Tolerances were 0.75/0.70 — a 25%/30% slack that was never used: measured against a real
# 27-POU project, ST and XML match 1:1 on every POU, so 1.00 costs zero red and removes room
# for a real loss to hide in. Note the ceiling of what counting can do: renaming a variable
# keeps the count identical and passes at ANY tolerance, 1.00 included — that is what the
# by-name comparison below is for.
DEFAULT_VARS_TOLERANCE = 1.0        # if the XML has FEWER vars than the ST → fail
DEFAULT_INITS_TOLERANCE = 1.0       # idem for initial values


def count_st_vars(st_path: Path) -> dict[str, Any]:
    """
    Count vars/inits/POUs in one .st file via regex.

    Returns a dict with keys:
        _pou_names: list[str]            (real POUs only — PROGRAM/FB/FUNCTION,
                                          NOT TYPE, which goes to dataTypes)
        total_var_decls: int
        vars_with_init: int
        vars_with_array_init: int
        vars_at_addr: int                (vars with AT %IX/QX/IW/QW — Bug A)
        block_var_input/output/in_out/local/constant/global/global_const: int
    """
    text = st_path.read_text(encoding="utf-8", errors="replace")
    # Strip comments (multi-line and single-line) to simplify matches
    text_clean = re.sub(r"\(\*.*?\*\)", "", text, flags=re.DOTALL)
    text_clean = re.sub(r"//.*$", "", text_clean, flags=re.MULTILINE)

    counts: dict[str, Any] = defaultdict(int)

    # Real POUs (does NOT include TYPE — those go to <dataTypes>, not <pous>)
    pous = re.findall(
        r"^\s*(PROGRAM|FUNCTION_BLOCK|FUNCTION)\s+(\w+)",
        text_clean, re.MULTILINE | re.IGNORECASE,
    )
    counts["_pou_names"] = [p[1] for p in pous]

    # VAR_* blocks
    for kind, pattern in [
        ("var_input",    r"\bVAR_INPUT\b(?!\s+CONSTANT)"),
        ("var_output",   r"\bVAR_OUTPUT\b"),
        ("var_in_out",   r"\bVAR_IN_OUT\b"),
        ("var_local",    r"\bVAR\b(?!\s*_)(?!\s+CONSTANT)"),
        ("var_constant", r"\bVAR\s+CONSTANT\b"),
        ("var_global",   r"\bVAR_GLOBAL\b(?!\s+CONSTANT)"),
        ("var_global_const", r"\bVAR_GLOBAL\s+CONSTANT\b"),
    ]:
        counts[f"block_{kind}"] = len(re.findall(pattern, text_clean, re.IGNORECASE))

    # Vars with AT %IX/QX/IW/QW (Bug A target).
    # IEC 61131-3 syntax: `<name> [AT <address>] : <type> [:= <init>] ;`
    # i.e. AT comes AFTER the name and BEFORE the `:`.
    counts["vars_at_addr"] = len(re.findall(
        r"\b\w+\s+AT\s+%[IQ][XWBD]?\d",
        text_clean, re.IGNORECASE,
    ))

    # Total vars via a line-by-line scan inside VAR..END_VAR blocks
    in_var_block = False
    total_vars = 0
    init_vars = 0
    array_init_vars = 0
    var_names: list[str] = []
    for line in text_clean.splitlines():
        s = line.strip()
        # Qualifiers COMBINE: `VAR_GLOBAL PERSISTENT RETAIN` is one block, and IEC 61131-3
        # allows several of them together. Accepting only one silently dropped the whole
        # block — and the variables that live there are the RETAIN ones, the state that
        # survives a power cut. Measured on a real project: 13 variables invisible to the
        # gate, including part counters and the table-slot tracking.
        if re.match(r"^VAR(_\w+)?(\s+(CONSTANT|RETAIN|PERSISTENT|NON_RETAIN))*\s*$",
                    s, re.IGNORECASE):
            in_var_block = True
            continue
        if re.match(r"^END_VAR\s*$", s, re.IGNORECASE):
            in_var_block = False
            continue
        if in_var_block and ":" in s and not s.startswith("(*"):
            total_vars += 1
            if ":=" in s:
                init_vars += 1
                if "[" in s.split(":=")[1] or s.split(":=")[1].strip().startswith("("):
                    array_init_vars += 1
            # Declared names, for comparison BY NAME (not by count).
            # IEC 61131-3: `name [, name2] [AT %addr] : type [:= init] ;`
            decl = s.split(":")[0]
            decl = re.sub(r"\s+AT\s+%[IQM][XWBD]?[\d.]+", "", decl, flags=re.IGNORECASE)
            for nome in decl.split(","):
                nome = nome.strip()
                if re.match(r"^[A-Za-z_]\w*$", nome):
                    var_names.append(nome)
    counts["total_var_decls"] = total_vars
    counts["vars_with_init"] = init_vars
    counts["vars_with_array_init"] = array_init_vars
    counts["_var_names"] = var_names

    return dict(counts)


def extract_st_body(text: str, pou_name: str) -> str | None:
    """The executable body of one POU: from `PROGRAM X` to `END_PROGRAM`, minus the VAR
    blocks (those are already compared declaration by declaration)."""
    m = re.search(
        rf"^\s*(PROGRAM|FUNCTION_BLOCK|FUNCTION)\s+{re.escape(pou_name)}\b(.*?)^\s*END_\1",
        text, re.S | re.M | re.I,
    )
    if not m:
        return None
    body = m.group(2)
    return re.sub(r"^\s*VAR(_\w+)?[^\n]*\n.*?^\s*END_VAR", "", body, flags=re.S | re.M | re.I)


def normalize_body(s: str) -> str:
    """Strip comments and per-line indentation, keep line structure and case.

    Deliberately the STRICTEST normalisation that still survives the generator: measured
    on a real project, all 27 POUs match at this level, so nothing is gained by loosening
    it further — and every loosening is logic the gate stops seeing.
    """
    s = re.sub(r"\(\*.*?\*\)", "", s, flags=re.S)
    s = re.sub(r"//[^\n]*", "", s)
    return "\n".join(line.strip() for line in s.splitlines() if line.strip())


def body_hash(s: str) -> str:
    return sha1(normalize_body(s).encode("utf-8")).hexdigest()


def count_xml_vars(xml_root: etree._Element, pou_name: str) -> dict[str, Any]:
    """
    Count vars/inits in the XML for one specific POU.

    Returns a dict with:
        _missing: True if the POU does not exist in the XML
        total_vars, total_inits
        inputVars_var_count, inputVars_init_count, etc (per kind)
    """
    counts: dict[str, Any] = defaultdict(int)
    pou = xml_root.find(f'.//{NS}pou[@name="{pou_name}"]')
    if pou is None:
        return {"_missing": True}

    interface = pou.find(f"{NS}interface")
    if interface is None:
        counts["total_vars"] = 0
        counts["total_inits"] = 0
        return dict(counts)

    var_names: list[str] = []
    for kind in ["inputVars", "outputVars", "inOutVars", "localVars",
                 "externalVars", "globalVars"]:
        blocks = interface.findall(f"{NS}{kind}")
        counts[f"block_{kind}"] = len(blocks)
        var_count = 0
        init_count = 0
        for block in blocks:
            vars_in_block = block.findall(f"{NS}variable")
            var_count += len(vars_in_block)
            for v in vars_in_block:
                if v.get("name"):
                    var_names.append(v.get("name"))
                if v.find(f"{NS}initialValue") is not None:
                    init_count += 1
        counts[f"{kind}_var_count"] = var_count
        counts[f"{kind}_init_count"] = init_count
    counts["_var_names"] = var_names

    counts["total_vars"] = sum(v for k, v in counts.items() if k.endswith("_var_count"))
    counts["total_inits"] = sum(v for k, v in counts.items() if k.endswith("_init_count"))

    return dict(counts)


def validate_semantic(
    xml_path: Path,
    source_dir: Path,
    vars_tolerance: float = DEFAULT_VARS_TOLERANCE,
    inits_tolerance: float = DEFAULT_INITS_TOLERANCE,
) -> ValidationReport:
    """
    Validate the master XML against the ST source files. Detects:
      - Bug A/B/F: missing vars (source count > XML count * tolerance)
      - Bug E: lost inits (source init count > XML init count * tolerance)
      - POU declared in the ST but absent from the XML

    Args:
        xml_path: path to project.xml
        source_dir: root of the .st files (recursive scan)
        vars_tolerance: 0..1 — if XML/ST < tolerance → fail. Default 0.75 = -25%
        inits_tolerance: 0..1 — same. Default 0.7 = -30%
    """
    if not xml_path.is_file():
        return ValidationReport(
            gate="semantic", valid=False,
            summary=f"XML not found: {xml_path}",
            errors=[ValidationError(None, str(xml_path), "FILE_NOT_FOUND", "")],
        )
    if not source_dir.is_dir():
        return ValidationReport(
            gate="semantic", valid=False,
            summary=f"source_dir not found: {source_dir}",
            errors=[ValidationError(None, str(source_dir), "DIR_NOT_FOUND", "")],
        )

    try:
        xml_tree = etree.parse(str(xml_path))
    except etree.XMLSyntaxError as e:
        return ValidationReport(
            gate="semantic", valid=False,
            summary=f"Malformed XML: {e}",
            errors=[ValidationError(getattr(e, "lineno", None), str(xml_path), "XML_PARSE_ERROR", str(e))],
        )
    xml_root = xml_tree.getroot()
    xml_pou_names = {p.get("name") for p in xml_root.findall(f".//{NS}pou")}

    errors: list[ValidationError] = []
    st_files = sorted(source_dir.rglob("*.st"))
    checked = 0

    # Global variable lists live in <globalVars> under <addData>, not in <pous> — so the
    # POU loop below never saw them. On a real project that left 553 declarations
    # unchecked, including the HMI<->PLC contract and the physical I/O map (73 vars, 62
    # of them with an `AT %IX/%QX` address). Those are boundaries: exactly where a lost
    # or renamed identifier stops raising an error and starts silently returning nothing.
    xml_gvls: dict[str, set[str]] = {}
    for el in xml_root.iter():
        if el.tag == f"{NS}globalVars" and el.get("name"):
            xml_gvls[el.get("name")] = {
                v.get("name").lower() for v in el
                if v.tag == f"{NS}variable" and v.get("name")
            }

    for st in st_files:
        st_counts = count_st_vars(st)
        pou_names = st_counts.get("_pou_names", [])
        if not pou_names:
            # No POU declared: it is a GVL or a TYPE-only file. TYPE files have no
            # VAR block, so they fall out on their own.
            nomes = st_counts.get("_var_names") or []
            if not nomes:
                continue
            gvl_xml = xml_gvls.get(st.stem)
            if gvl_xml is None:
                errors.append(ValidationError(
                    line=None, location=st.name, code="GVL_MISSING_IN_XML",
                    message=(f"'{st.stem}' declares {len(nomes)} global var(s) but there is no "
                             f"<globalVars name=\"{st.stem}\"> in the XML — CODESYS will not "
                             f"create the list, and every reference to it breaks"),
                ))
                continue
            faltando = [n for n in nomes if n.lower() not in gvl_xml]
            if faltando:
                amostra = ", ".join(faltando[:8])
                resto = f" (+{len(faltando) - 8})" if len(faltando) > 8 else ""
                errors.append(ValidationError(
                    line=None, location=st.name, code="GVL_VARS_MISSING_BY_NAME",
                    message=(f"{len(faltando)} global var(s) declared in {st.name} are absent "
                             f"from the XML by name: {amostra}{resto}"),
                ))
            checked += 1
            continue

        for pou_name in pou_names:
            if pou_name not in xml_pou_names:
                errors.append(ValidationError(
                    line=None,
                    location=f"{st.name}::{pou_name}",
                    code="POU_MISSING_IN_XML",
                    message=f"POU '{pou_name}' declared in {st.name} but absent from the XML",
                ))
                continue

            xml_counts = count_xml_vars(xml_root, pou_name)
            checked += 1

            st_total = st_counts.get("total_var_decls", 0)
            xml_total = xml_counts.get("total_vars", 0)

            # Comparison BY NAME — catches what counting never will: a renamed or
            # retyped variable keeps the count identical and slips through every
            # tolerance level. Only runs when the .st declares exactly ONE POU,
            # because count_st_vars scans the whole FILE while count_xml_vars scans a
            # single POU; with 2+ POUs the sets are not comparable and we would emit
            # false positives — and a gate that cries wolf is a gate that gets skipped.
            if len(pou_names) == 1:
                st_names = st_counts.get("_var_names") or []
                xml_names = xml_counts.get("_var_names") or []
                # IEC 61131-3 identifiers are case-insensitive; compare folded, report as written.
                xml_fold = {n.lower() for n in xml_names}
                faltando = [n for n in st_names if n.lower() not in xml_fold]
                if faltando:
                    amostra = ", ".join(faltando[:8])
                    resto = f" (+{len(faltando) - 8})" if len(faltando) > 8 else ""
                    errors.append(ValidationError(
                        line=None,
                        location=f"{st.name}::{pou_name}",
                        code="VARS_MISSING_BY_NAME",
                        message=(f"{len(faltando)} var(s) declared in the ST are absent from the "
                                 f"XML by name: {amostra}{resto}"),
                    ))

            # THE BODY — the code that actually reaches the PLC.
            #
            # Everything above compares declarations. Change the logic without
            # regenerating the XML and all of it stays green, while the XML that gets
            # imported still carries the old algorithm. That is not hypothetical: it is
            # the 2026-05-22 incident, where a stale master-final.xml went in and produced
            # 203 CODESYS errors.
            #
            # Comments and indentation are normalised away; line structure and case are
            # NOT. Measured on a real 27-POU project, all 27 bodies match at this level —
            # the generator preserves them faithfully, so there is nothing to gain by
            # loosening further, and every loosening is logic the gate stops seeing.
            pou_el = xml_root.find(f'.//{NS}pou[@name="{pou_name}"]')
            st_body_el = pou_el.find(f"{NS}body/{NS}ST") if pou_el is not None else None
            corpo_st = extract_st_body(st.read_text(encoding="utf-8", errors="replace"), pou_name)
            if corpo_st is not None and st_body_el is not None:
                corpo_xml = "".join(st_body_el.itertext())
                if body_hash(corpo_st) != body_hash(corpo_xml):
                    errors.append(ValidationError(
                        line=None,
                        location=f"{st.name}::{pou_name}",
                        code="POU_BODY_DIFFERS",
                        message=(
                            f"the body of '{pou_name}' differs between the ST source and the "
                            f"XML (ST {len(normalize_body(corpo_st))} chars vs XML "
                            f"{len(normalize_body(corpo_xml))} after normalisation) — the XML "
                            f"is most likely stale: regenerate it before importing"),
                    ))

            if st_total > 0 and xml_total < st_total * vars_tolerance:
                pct = (xml_total * 100 // st_total) if st_total else 0
                errors.append(ValidationError(
                    line=None,
                    location=f"{st.name}::{pou_name}",
                    code="VARS_MISSING",
                    message=f"ST has {st_total} vars, XML has {xml_total} ({pct}%) — Bug A/B/F suspected",
                ))

            # Bug A: vars with AT %
            if st_counts.get("vars_at_addr", 0) > 0:
                pou_node = xml_root.find(f'.//{NS}pou[@name="{pou_name}"]')
                if pou_node is not None and len(pou_node.findall(f".//{NS}address")) == 0:
                    errors.append(ValidationError(
                        line=None,
                        location=f"{st.name}::{pou_name}",
                        code="AT_ADDR_LOST",
                        message=f"ST has {st_counts['vars_at_addr']} vars with AT %IX/QX, XML has 0 addresses — Bug A",
                    ))

            # Bug E: inits
            st_inits = st_counts.get("vars_with_init", 0)
            xml_inits = xml_counts.get("total_inits", 0)
            if st_inits > 0 and xml_inits < st_inits * inits_tolerance:
                errors.append(ValidationError(
                    line=None,
                    location=f"{st.name}::{pou_name}",
                    code="INITS_MISSING",
                    message=f"ST has {st_inits} inits, XML has {xml_inits} — Bug E suspected",
                ))

    valid = len(errors) == 0
    if valid:
        summary = f"{checked}/{checked} POUs and GVLs match (source vs XML)"
    else:
        by_code: dict[str, int] = defaultdict(int)
        for e in errors:
            by_code[e.code] += 1
        summary = f"{len(errors)} issue(s): " + ", ".join(f"{c}={n}" for c, n in by_code.items())

    return ValidationReport(
        gate="semantic",
        valid=valid,
        summary=summary,
        errors=errors,
        counts={
            "st_files": len(st_files),
            "pous_in_xml": len(xml_pou_names),
            "pous_checked": checked,
        },
    )
