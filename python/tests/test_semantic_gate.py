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


def _make_xml_with_pou(tmp_path: Path, pou_name: str, vars_xml: str = "", inits: int = 0,
                       body: str = "(* x *)") -> Path:
    """Create a minimal PLCopen v2.00 XML with 1 POU + optional vars.

    `body` must mirror the ST body: since the body-hash gate landed, an XML whose body
    does not match the source is exactly what the gate exists to reject."""
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
      <body><ST><xhtml:p><![CDATA[{body}]]></xhtml:p></ST></body>
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
    xml = _make_xml_with_pou(tmp_path, "PRG_X", vars_xml=vars_xml, body="iA := 1;")

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


# ───────────────────────── the POU body (not just declarations) ───────────
#
# Everything else compares declarations. Change the logic without regenerating the XML
# and all of it stays green while the XML being imported still carries the old algorithm
# — which is the 2026-05-22 incident, 203 CODESYS errors from a stale master-final.xml.


def test_corpo_divergente_e_acusado(tmp_path: Path) -> None:
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
END_VAR
iA := iA + 1;
END_PROGRAM"""})
    xml = _make_xml_with_pou(
        tmp_path, "PRG_X",
        vars_xml='<variable name="iA"><type><INT/></type></variable>',
        body="iA := iA - 1;")          # XML velho: outro operador
    report = validate_semantic(xml, src)
    assert not report.valid
    erro = next(e for e in report.errors if e.code == "POU_BODY_DIFFERS")
    assert "PRG_X" in erro.location


def test_corpo_igual_com_comentarios_diferentes_passa(tmp_path: Path) -> None:
    """Comentario nao e' logica: divergir por causa dele so' ensina a pular o gate."""
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
END_VAR
(* comentario que so' existe no ST *)
iA := iA + 1;   // e este tambem
END_PROGRAM"""})
    xml = _make_xml_with_pou(
        tmp_path, "PRG_X",
        vars_xml='<variable name="iA"><type><INT/></type></variable>',
        body="iA := iA + 1;")
    report = validate_semantic(xml, src)
    assert report.valid, [e.message for e in report.errors]


def test_corpo_igual_com_indentacao_diferente_passa(tmp_path: Path) -> None:
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
END_VAR
IF iA > 0 THEN
        iA := 0;
END_IF
END_PROGRAM"""})
    xml = _make_xml_with_pou(
        tmp_path, "PRG_X",
        vars_xml='<variable name="iA"><type><INT/></type></variable>',
        body="IF iA > 0 THEN\niA := 0;\nEND_IF")
    report = validate_semantic(xml, src)
    assert report.valid, [e.message for e in report.errors]


def test_corpo_com_linha_a_MENOS_e_acusado(tmp_path: Path) -> None:
    """Perder uma linha e' o caso silencioso: contagem de var intacta, logica mutilada."""
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
END_VAR
iA := 1;
iA := iA + 1;
END_PROGRAM"""})
    xml = _make_xml_with_pou(
        tmp_path, "PRG_X",
        vars_xml='<variable name="iA"><type><INT/></type></variable>',
        body="iA := 1;")
    report = validate_semantic(xml, src)
    assert not report.valid
    assert any(e.code == "POU_BODY_DIFFERS" for e in report.errors)


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


# ─────────────────────── comparison BY NAME (not by count) ────────────────
#
# Counting has a ceiling: a renamed or retyped variable keeps the count identical and
# passes at ANY tolerance, 1.00 included. Measured on a real 27-POU project: renaming a
# single variable inside one POU left the count at 62 → 62 and every count-based check
# stayed green. These tests pin the by-name comparison that does catch it.


def test_count_st_vars_coleta_os_nomes_declarados(tmp_path: Path) -> None:
    """Names come from the declaration: with AT %, and several per line."""
    st = tmp_path / "PRG_N.st"
    st.write_text("""PROGRAM PRG_N
VAR
    bStart AT %IX0.0 : BOOL;
    iA, iB, iC : INT;
    rValue : REAL := 3.14;
END_VAR
iA := 1;
END_PROGRAM""", encoding="utf-8")
    nomes = count_st_vars(st)["_var_names"]
    assert nomes == ["bStart", "iA", "iB", "iC", "rValue"], nomes


def test_semantic_detecta_rename_que_a_contagem_nao_ve(tmp_path: Path) -> None:
    """The whole point: same count, different name. This is the 'wrong tag' class —
    an identifier that crosses a boundary and no longer matches on the other side."""
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iA : INT;
    iRENOMEADA : INT;
    iC : INT;
END_VAR
iA := 1;
END_PROGRAM"""})
    # XML still carries the OLD name — count matches (3 = 3), name does not
    vars_xml = "".join([
        f'<variable name="i{n}"><type><INT/></type></variable>' for n in ("A", "B", "C")
    ])
    xml = _make_xml_with_pou(tmp_path, "PRG_X", vars_xml=vars_xml)

    report = validate_semantic(xml, src)
    assert not report.valid, "a rename with matching count must NOT pass"
    erro = next(e for e in report.errors if e.code == "VARS_MISSING_BY_NAME")
    assert "iRENOMEADA" in erro.message, erro.message
    # and prove the count-based check was blind to it, even at the strictest tolerance
    assert not any(e.code == "VARS_MISSING" for e in report.errors)


def test_semantic_by_name_ignora_caixa(tmp_path: Path) -> None:
    """IEC 61131-3 identifiers are case-insensitive: iValue == IVALUE."""
    src = _make_source_dir(tmp_path, {"PRG_X.st": """PROGRAM PRG_X
VAR
    iValue : INT;
END_VAR
iValue := 1;
END_PROGRAM"""})
    xml = _make_xml_with_pou(
        tmp_path, "PRG_X", vars_xml='<variable name="IVALUE"><type><INT/></type></variable>',
        body="iValue := 1;")
    report = validate_semantic(xml, src)
    assert report.valid, [e.message for e in report.errors]


# ───────────────────── global variable lists (<globalVars>) ──────────────
#
# GVLs live in <globalVars> under <addData>, not in <pous>, so the POU loop never saw
# them: on a real project that left 553 declarations unchecked — the HMI<->PLC contract
# and the physical I/O map among them.


def _make_xml_with_gvl(tmp_path: Path, gvl_name: str, var_names: list[str]) -> Path:
    vars_xml = "".join(
        f'<variable name="{n}"><type><BOOL/></type></variable>' for n in var_names)
    xml = tmp_path / "gvl.xml"
    xml.write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <fileHeader companyName="" productName="X" productVersion="X" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="t" modificationDateTime="2026-01-01T00:00:00">
    <coordinateInfo><fbd><scaling x="1" y="1"/></fbd><ld><scaling x="1" y="1"/></ld><sfc><scaling x="1" y="1"/></sfc></coordinateInfo>
  </contentHeader>
  <types><dataTypes/><pous/></types>
  <instances><configurations/></instances>
  <addData><data name="x" handleUnknown="implementation">
    <globalVars name="{gvl_name}">{vars_xml}</globalVars>
  </data></addData>
</project>''', encoding="utf-8")
    return xml


def test_gvl_var_faltando_no_xml_e_acusada(tmp_path: Path) -> None:
    src = _make_source_dir(tmp_path, {"GVL_Test.st": """{attribute 'qualified_only'}
VAR_GLOBAL
    bSumida : BOOL;
    bPresente : BOOL;
END_VAR"""})
    xml = _make_xml_with_gvl(tmp_path, "GVL_Test", ["bPresente"])
    report = validate_semantic(xml, src)
    assert not report.valid
    erro = next(e for e in report.errors if e.code == "GVL_VARS_MISSING_BY_NAME")
    assert "bSumida" in erro.message


def test_gvl_inteira_ausente_do_xml_e_acusada(tmp_path: Path) -> None:
    """CODESYS descarta a lista inteira em silencio e toda referencia a ela quebra."""
    src = _make_source_dir(tmp_path, {"GVL_Sumida.st": """VAR_GLOBAL
    bX : BOOL;
END_VAR"""})
    xml = _make_xml_with_gvl(tmp_path, "GVL_Outra", ["bX"])
    report = validate_semantic(xml, src)
    assert not report.valid
    assert any(e.code == "GVL_MISSING_IN_XML" for e in report.errors)


def test_gvl_completa_passa(tmp_path: Path) -> None:
    src = _make_source_dir(tmp_path, {"GVL_Test.st": """VAR_GLOBAL
    bA : BOOL;
    bB : BOOL;
END_VAR"""})
    xml = _make_xml_with_gvl(tmp_path, "GVL_Test", ["bA", "bB"])
    report = validate_semantic(xml, src)
    assert report.valid, [e.message for e in report.errors]


def test_bloco_com_DOIS_qualificadores_e_lido(tmp_path: Path) -> None:
    """`VAR_GLOBAL PERSISTENT RETAIN` — qualificadores COMBINAM. Aceitar so um fazia o
    bloco inteiro sumir, e o que mora nele e' o estado que sobrevive ao power-cut.
    Medido num projeto real: 13 variaveis invisiveis, entre elas contadores de peca."""
    st = tmp_path / "GVL_R.st"
    st.write_text("""{attribute 'qualified_only'}
VAR_GLOBAL PERSISTENT RETAIN
    nTable_Count : INT;
    aTable_Slot : ARRAY[0..3] OF INT;
END_VAR""", encoding="utf-8")
    counts = count_st_vars(st)
    assert counts["total_var_decls"] == 2, "o bloco com 2 qualificadores foi ignorado"
    assert counts["_var_names"] == ["nTable_Count", "aTable_Slot"]


@pytest.mark.parametrize("cabecalho", [
    "VAR_GLOBAL", "VAR_GLOBAL CONSTANT", "VAR_GLOBAL RETAIN", "VAR_GLOBAL PERSISTENT",
    "VAR_GLOBAL PERSISTENT RETAIN", "VAR_GLOBAL RETAIN PERSISTENT", "VAR RETAIN",
])
def test_variacoes_de_cabecalho_de_bloco(tmp_path: Path, cabecalho: str) -> None:
    st = tmp_path / "GVL_V.st"
    st.write_text(f"{cabecalho}\n    bX : BOOL;\nEND_VAR", encoding="utf-8")
    assert count_st_vars(st)["total_var_decls"] == 1, f"nao leu o bloco '{cabecalho}'"


def test_semantic_by_name_nao_dispara_com_dois_pous_no_arquivo(tmp_path: Path) -> None:
    """count_st_vars scans the whole FILE, count_xml_vars scans ONE POU: with 2+ POUs the
    sets are not comparable, and a false positive here would teach people to skip the gate."""
    src = _make_source_dir(tmp_path, {"DOIS.st": """PROGRAM PRG_A
VAR
    iDoA : INT;
END_VAR
iDoA := 1;
END_PROGRAM

PROGRAM PRG_B
VAR
    iDoB : INT;
END_VAR
iDoB := 1;
END_PROGRAM"""})
    xml = tmp_path / "dois.xml"
    xml.write_text('''<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <fileHeader companyName="" productName="X" productVersion="X" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="t" modificationDateTime="2026-01-01T00:00:00">
    <coordinateInfo><fbd><scaling x="1" y="1"/></fbd><ld><scaling x="1" y="1"/></ld><sfc><scaling x="1" y="1"/></sfc></coordinateInfo>
  </contentHeader>
  <types><dataTypes/><pous>
    <pou name="PRG_A" pouType="program">
      <interface><localVars><variable name="iDoA"><type><INT/></type></variable></localVars></interface>
      <body><ST><xhtml:p><![CDATA[(* x *)]]></xhtml:p></ST></body>
    </pou>
    <pou name="PRG_B" pouType="program">
      <interface><localVars><variable name="iDoB"><type><INT/></type></variable></localVars></interface>
      <body><ST><xhtml:p><![CDATA[(* x *)]]></xhtml:p></ST></body>
    </pou>
  </pous></types>
  <instances><configurations/></instances>
</project>''', encoding="utf-8")

    report = validate_semantic(xml, src)
    assert not any(e.code == "VARS_MISSING_BY_NAME" for e in report.errors), \
        "must not compare names when the file declares more than one POU"
