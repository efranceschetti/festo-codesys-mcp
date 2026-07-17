"""
Types shared between the 2 gates.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class ValidationError:
    """An error/issue detected by one of the gates."""
    line: int | None
    location: str  # file path, POU name, etc
    code: str      # 'XSD_VIOLATION', 'VARS_MISSING', 'AT_ADDR_LOST', etc
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationReport:
    """Result of a single validation gate."""
    gate: str                                  # 'xsd' | 'semantic'
    valid: bool
    summary: str                               # human-readable 1-liner
    errors: list[ValidationError] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)  # arbitrary metrics (pous_checked, vars_total, etc)

    def to_dict(self) -> dict[str, Any]:
        return {
            "gate": self.gate,
            "valid": self.valid,
            "summary": self.summary,
            "errors": [e.to_dict() for e in self.errors],
            "counts": self.counts,
        }
