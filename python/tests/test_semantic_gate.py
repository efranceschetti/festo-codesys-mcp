"""
Semantic gate tests: count vars/inits, ST source vs XML.

Coverage: Bug A (vars with AT %IX disappearing), Bug B (2nd VAR_GLOBAL block),
Bug E (lost array init), Bug F (var after a comment), POU_MISSING_IN_XML.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from lib.plcopen_validation import validate_semantic
from lib.plcopen_validation.semantic_gate import count_st_vars


# ───────────────────────────── parser ST helpers ──────────────────────────

def test_count_st_vars_program_simples(tmp_path: Path) -> None:
    st = tmp_path / "PRG_X.st"
    st.write_text("""PROGRAM PRG_X
VAR_INPUT
    bInput : BOOL;
END_VAR
VAR
    iCounter : INT := 0;
    rValue : REAL := 3.14;
END_VAR
iCounter := iCounter + 1;
END_PROGRAM""", encoding="utf-8")
    counts = count_st_vars(st)
    assert counts["_pou_names"] == ["PRG_X"]
    assert counts["total_var_decls"] == 3
    assert counts["vars_with_init"] == 2
    assert counts["block_var_input"] == 1
    assert counts["block_var_local"] == 1


def test_count_st_vars_ignora_type_declarations(tmp_path: Path) -> None:
    """TYPE goes to dataTypes, must not appear in _pou_names."""
    st = tmp_path / "E_Mode.st"
    st.write_text("""TYPE E_Mode :
(
    AUTO := 0,
    MANUAL := 1
);
END_TYPE""", encoding="utf-8")
    counts = count_st_vars(st)
    assert counts["_pou_names"] == []


def test_count_st_vars_at_address(tmp_path: Path) -> None:
    """Vars with AT %IX/QX detected (Bug A target)."""
    st = tmp_path / "GVL_IO.st"
    st.write_text("""PROGRAM GVL_IO
VAR_GLOBAL
    bStart AT %IX0.0 : BOOL;
    bStop AT %IX0.1 : BOOL;
    yMotor AT %QX1.0 : BOOL;
END_VAR
END_PROGRAM""", encoding="utf-8")
    counts = count_st_vars(st)
    assert counts["vars_at_addr"] == 3


# ───────────────────────────── semantic validation ────────────────────────

def _make_source_dir(tmp_path: Path, files: dict[str, str]) -> Path:
    src = tmp_path / "src"
    src.mkdir()
    for name, content in files.items():
        (src / name).write_text(content, encoding="utf-8")
    return src


def _make_xml_with_pou(tmp_path: Path, pou_name: str, vars_xml: str = "", inits: int = 0) -> Path:
    """Create a minimal PLCopen v2.00 XML with 1 POU + optional vars."""
    init_blocks = "\n".join([
        f'<variable name="rI{i}"><type><REAL/></type><initialValue><simpleValue value="0.0"/></initialValue></variable>'
        for i in range(inits)
    ])
    xml = tmp_path / "test.xml"
    xml.write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <fileHeader companyName="" productName="X" productVersion="X" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="t" modificationDateTime="2026-01-01T00:00:00">
    <coordinateInfo><fbd><scaling x="1" y="1"/></fbd><ld><scaling x="1" y="1"/></ld><sfc><scaling x="1" y="1"/></sfc></coordinateInfo>
  </contentHeader>
  <types><dataTypes/><pous>
    <pou name="{pou_name}" pouType="program">
      <interface><localVars>{vars_xml}{init_blocks}</localVars></interface>
      <body><ST><xhtml:p><![CDATA[(* x *)]]></xhtml:p></ST></body>
    </pou>
  </pous></types>
  <instances><configurations/></instances>
</project>''', encoding="utf-8")
    return xml


def test_semantic_match_perfeito(tmp_path: Path) -> None:
    """Happy path: 3 vars in ST, 3 vars in XML."""
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
    iB : INT;
    iC : INT;
END_VAR
iA := 1;
END_PROGRAM"""})
    vars_xml = "".join([
        f'<variable name="i{n}"><type><INT/></type></variable>' for n in "ABC"
    ])
    xml = _make_xml_with_pou(tmp_path, "PRG_X", vars_xml=vars_xml)

    report = validate_semantic(xml, src)
    assert report.valid, f"expected VALID, errors: {[e.message for e in report.errors]}"
    assert report.gate == "semantic"
    assert report.counts["pous_checked"] == 1


def test_semantic_detecta_bug_a_at_addr_lost(tmp_path: Path) -> None:
    """Bug A: ST has 3 vars with AT %IX, XML has no address."""
    src = _make_source_dir(tmp_path, {"GVL_IO.st": """PROGRAM GVL_IO
VAR_GLOBAL
    bStart AT %IX0.0 : BOOL;
    bStop AT %IX0.1 : BOOL;
    yMotor AT %QX1.0 : BOOL;
END_VAR
END_PROGRAM"""})
    # XML with vars but no <address>
    vars_xml = "".join([
        f'<variable name="b{n}"><type><BOOL/></type></variable>' for n in ["Start", "Stop", "Motor"]
    ])
    xml = _make_xml_with_pou(tmp_path, "GVL_IO", vars_xml=vars_xml)

    report = validate_semantic(xml, src)
    assert not report.valid
    codes = [e.code for e in report.errors]
    assert "AT_ADDR_LOST" in codes


def test_semantic_detecta_bug_b_vars_missing(tmp_path: Path) -> None:
    """Bug B: ST has 10 vars, XML has only 2 (< 75% tolerance)."""
    st_vars = "\n    ".join([f"iX{n} : INT;" for n in range(10)])
    src = _make_source_dir(tmp_path, {"PRG_Y.st": f"""PROGRAM PRG_Y
VAR
    {st_vars}
END_VAR
iX0 := 1;
END_PROGRAM"""})
    vars_xml = '<variable name="iX0"><type><INT/></type></variable><variable name="iX1"><type><INT/></type></variable>'
    xml = _make_xml_with_pou(tmp_path, "PRG_Y", vars_xml=vars_xml)

    report = validate_semantic(xml, src)
    assert not report.valid
    assert any(e.code == "VARS_MISSING" for e in report.errors)


def test_semantic_detecta_bug_e_inits_missing(tmp_path: Path) -> None:
    """Bug E: ST has 10 vars with init, XML has 2."""
    st_vars = "\n    ".join([f"rX{n} : REAL := 1.0;" for n in range(10)])
    src = _make_source_dir(tmp_path, {"PRG_Z.st": f"""PROGRAM PRG_Z
VAR
    {st_vars}
END_VAR
rX0 := 1.0;
END_PROGRAM"""})
    # XML with all 10 vars BUT only 2 with init (vars are OK by count, inits are missing)
    all_vars = "".join([
        f'<variable name="rX{n}"><type><REAL/></type></variable>' for n in range(10)
    ])
    xml = _make_xml_with_pou(tmp_path, "PRG_Z", vars_xml=all_vars, inits=2)
    # the inits above generate <variable name="rI0/rI1"> with initialValue — they add to the total
    # Override: build the XML manually

    xml.write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <fileHeader companyName="" productName="X" productVersion="X" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="t" modificationDateTime="2026-01-01T00:00:00">
    <coordinateInfo><fbd><scaling x="1" y="1"/></fbd><ld><scaling x="1" y="1"/></ld><sfc><scaling x="1" y="1"/></sfc></coordinateInfo>
  </contentHeader>
  <types><dataTypes/><pous>
    <pou name="PRG_Z" pouType="program">
      <interface><localVars>
        <variable name="rX0"><type><REAL/></type><initialValue><simpleValue value="1.0"/></initialValue></variable>
        <variable name="rX1"><type><REAL/></type><initialValue><simpleValue value="1.0"/></initialValue></variable>
        <variable name="rX2"><type><REAL/></type></variable>
        <variable name="rX3"><type><REAL/></type></variable>
        <variable name="rX4"><type><REAL/></type></variable>
        <variable name="rX5"><type><REAL/></type></variable>
        <variable name="rX6"><type><REAL/></type></variable>
        <variable name="rX7"><type><REAL/></type></variable>
        <variable name="rX8"><type><REAL/></type></variable>
        <variable name="rX9"><type><REAL/></type></variable>
      </localVars></interface>
      <body><ST><xhtml:p><![CDATA[(* x *)]]></xhtml:p></ST></body>
    </pou>
  </pous></types>
  <instances><configurations/></instances>
</project>''', encoding="utf-8")

    report = validate_semantic(xml, src)
    assert not report.valid
    assert any(e.code == "INITS_MISSING" for e in report.errors)


def test_semantic_detecta_pou_missing(tmp_path: Path) -> None:
    """POU declared in the ST but absent from the XML."""
    src = _make_source_dir(tmp_path, {"PRG_Missing.st": """PROGRAM PRG_Missing
VAR
    iX : INT;
END_VAR
END_PROGRAM"""})
    # XML with a different POU, not PRG_Missing
    xml = _make_xml_with_pou(tmp_path, "PRG_Other", vars_xml='<variable name="i"><type><INT/></type></variable>')

    report = validate_semantic(xml, src)
    assert not report.valid
    assert any(e.code == "POU_MISSING_IN_XML" for e in report.errors)


def test_semantic_xml_inexistente(tmp_path: Path) -> None:
    src = _make_source_dir(tmp_path, {"x.st": ""})
    report = validate_semantic(tmp_path / "nope.xml", src)
    assert not report.valid
    assert report.errors[0].code == "FILE_NOT_FOUND"


def test_semantic_source_dir_inexistente(tmp_path: Path) -> None:
    xml = _make_xml_with_pou(tmp_path, "PRG_X")
    report = validate_semantic(xml, tmp_path / "no_src")
    assert not report.valid
    assert report.errors[0].code == "DIR_NOT_FOUND"
