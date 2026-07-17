"""
XSD gate tests: structural validation against the official PLCopen TC6 XML v2.00.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from lib.plcopen_validation import validate_xsd


def test_synthetic_project_passes_xsd(valid_xml_path: Path) -> None:
    """The synthetic multi-POU project must pass against the XSD v2.00."""
    report = validate_xsd(valid_xml_path)
    assert report.valid, f"expected VALID, errors: {[e.message for e in report.errors[:3]]}"
    assert report.gate == "xsd"
    assert "valid" in report.summary.lower()
    assert report.counts.get("file_size_bytes", 0) > 100_000


def test_xml_inexistente_retorna_invalid() -> None:
    report = validate_xsd(Path("/tmp/__nonexistent__.xml"))
    assert not report.valid
    assert report.errors[0].code == "FILE_NOT_FOUND"


def test_xml_malformado_retorna_parse_error(tmp_path: Path) -> None:
    """Simulated Bug C-severe: malformed tag."""
    bad = tmp_path / "broken.xml"
    bad.write_text("""<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <variable name="bX"
    <type><BOOL/></type>
  </variable>
</project>""", encoding="utf-8")
    report = validate_xsd(bad)
    assert not report.valid
    assert report.errors[0].code == "XML_PARSE_ERROR"


def test_xml_namespace_errado_retorna_xsd_violation(tmp_path: Path) -> None:
    """Bug C-severe variant: namespace does not match the XSD."""
    bad = tmp_path / "wrong_ns.xml"
    bad.write_text("""<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0999">
  <fileHeader companyName="" productName="X" productVersion="X" creationDateTime="2026-01-01T00:00:00"/>
</project>""", encoding="utf-8")
    report = validate_xsd(bad)
    assert not report.valid
    assert any(e.code == "XSD_VIOLATION" for e in report.errors)


def test_xsd_inexistente_retorna_xsd_not_found(valid_xml_path: Path) -> None:
    report = validate_xsd(valid_xml_path, xsd_path=Path("/tmp/__inexistente.xsd"))
    assert not report.valid
    assert report.errors[0].code == "XSD_NOT_FOUND"
