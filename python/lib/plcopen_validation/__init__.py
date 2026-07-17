"""
PLCopen XML validation gates.

Source of truth for structural XSD + semantic (vars/inits) validation.
Consumed by the MCP wrappers in python/wrappers/validate_plcopen_*.py.

Example:
    from lib.plcopen_validation import validate_xsd, validate_semantic

    xsd_report = validate_xsd(Path("project.xml"))
    if not xsd_report.valid:
        for err in xsd_report.errors:
            print(err.line, err.message)

    sem_report = validate_semantic(Path("project.xml"), Path("src_PLC/"))
"""
from __future__ import annotations

from .types import ValidationError, ValidationReport
from .xsd_gate import validate_xsd
from .semantic_gate import validate_semantic

__all__ = ["validate_xsd", "validate_semantic", "ValidationReport", "ValidationError"]
