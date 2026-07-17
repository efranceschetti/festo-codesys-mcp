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
from pathlib import Path
from typing import Any

from lxml import etree

from .types import ValidationError, ValidationReport

NS = "{http://www.plcopen.org/xml/tc6_0200}"

DEFAULT_VARS_TOLERANCE = 0.75       # if XML < 75% of the ST vars → fail
DEFAULT_INITS_TOLERANCE = 0.7       # if XML < 70% of the ST inits → fail


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
    for line in text_clean.splitlines():
        s = line.strip()
        if re.match(r"^VAR(_\w+)?\s*(CONSTANT|RETAIN|PERSISTENT)?\s*$", s, re.IGNORECASE):
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
    counts["total_var_decls"] = total_vars
    counts["vars_with_init"] = init_vars
    counts["vars_with_array_init"] = array_init_vars

    return dict(counts)


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
                if v.find(f"{NS}initialValue") is not None:
                    init_count += 1
        counts[f"{kind}_var_count"] = var_count
        counts[f"{kind}_init_count"] = init_count

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

    for st in st_files:
        st_counts = count_st_vars(st)
        pou_names = st_counts.get("_pou_names", [])
        if not pou_names:
            continue  # pure GVL / TYPE-only file

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
        summary = f"{checked}/{checked} POUs match (source vs XML)"
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
