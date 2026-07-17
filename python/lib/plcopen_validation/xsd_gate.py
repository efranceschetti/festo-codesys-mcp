"""
Gate 1: structural validation via the official PLCopen TC6 v2.00 XSD.

XSD embedded in data/tc6_xml_v200_patched.xsd (official PLCopen v2.01 release
patched for the tc6_0200 namespace that CODESYS emits).
"""
from __future__ import annotations

from pathlib import Path

from lxml import etree

from .types import ValidationError, ValidationReport

DEFAULT_XSD = Path(__file__).parent / "data" / "tc6_xml_v200_patched.xsd"


def validate_xsd(
    xml_path: Path,
    xsd_path: Path | None = None,
    max_errors: int = 50,
) -> ValidationReport:
    """
    Validate PLCopen XML against the official TC6 v2.00 XSD.

    Args:
        xml_path: path of the .xml file to validate.
        xsd_path: optional. If None, uses the embedded XSD (tc6_xml_v200_patched.xsd).
        max_errors: caps reported errors to avoid a blowup on badly broken XML.

    Returns:
        ValidationReport with gate='xsd'. valid=True when the schema passes,
        valid=False when there are violations. Errors carry line + the libxml2 message.
    """
    xsd_to_use = xsd_path or DEFAULT_XSD
    if not xml_path.is_file():
        return ValidationReport(
            gate="xsd",
            valid=False,
            summary=f"XML not found: {xml_path}",
            errors=[ValidationError(None, str(xml_path), "FILE_NOT_FOUND", "XML file does not exist")],
        )
    if not xsd_to_use.is_file():
        return ValidationReport(
            gate="xsd",
            valid=False,
            summary=f"XSD not found: {xsd_to_use}",
            errors=[ValidationError(None, str(xsd_to_use), "XSD_NOT_FOUND", "XSD schema does not exist")],
        )

    # Parse the XSD (may fail if the XSD is malformed)
    try:
        schema = etree.XMLSchema(etree.parse(str(xsd_to_use)))
    except etree.XMLSchemaParseError as e:
        return ValidationReport(
            gate="xsd",
            valid=False,
            summary=f"Malformed XSD: {e}",
            errors=[ValidationError(None, str(xsd_to_use), "XSD_PARSE_ERROR", str(e))],
        )

    # Parse the XML (may fail if the XML is malformed — severe Bug C)
    try:
        tree = etree.parse(str(xml_path))
    except etree.XMLSyntaxError as e:
        return ValidationReport(
            gate="xsd",
            valid=False,
            summary=f"Malformed XML (parse failed): {e}",
            errors=[ValidationError(
                getattr(e, "lineno", None),
                str(xml_path),
                "XML_PARSE_ERROR",
                str(e),
            )],
            counts={"file_size_bytes": xml_path.stat().st_size},
        )

    # Validate against the schema
    if schema.validate(tree):
        return ValidationReport(
            gate="xsd",
            valid=True,
            summary=f"{xml_path.name} valid against the official PLCopen TC6 XML v2.00",
            counts={"file_size_bytes": xml_path.stat().st_size},
        )

    # Collect errors (capped)
    err_log = list(schema.error_log)[:max_errors]
    errors = [
        ValidationError(
            line=err.line,
            location=str(xml_path),
            code="XSD_VIOLATION",
            message=err.message,
        )
        for err in err_log
    ]
    total = len(schema.error_log)
    suffix = f" (truncated, total {total})" if total > max_errors else ""
    return ValidationReport(
        gate="xsd",
        valid=False,
        summary=f"{xml_path.name} INVALID: {len(errors)} error(s){suffix}",
        errors=errors,
        counts={"file_size_bytes": xml_path.stat().st_size, "total_errors": total},
    )
