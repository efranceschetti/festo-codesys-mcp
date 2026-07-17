"""
validate_plcopen_xsd — validate PLCopen XML against the official TC6 v2.00 XSD.

Input (JSON):
  { "filePath": "C:/path/project.xml",
    "xsdPath": "C:/optional/custom.xsd" }   # optional, default = embedded XSD

Output (success):
  {
    "gate": "xsd",
    "valid": true/false,
    "summary": "...",
    "errors": [{"line": N, "location": "...", "code": "...", "message": "..."}],
    "counts": {"file_size_bytes": N, "total_errors": N}
  }
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Add python/ to sys.path so `lib.plcopen_validation` resolves
sys.path.insert(0, str(Path(__file__).parent.parent))

from _common import run  # noqa: E402
from lib.plcopen_validation import validate_xsd  # noqa: E402


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    file_path = Path(opts["filePath"])
    xsd_path = Path(opts["xsdPath"]) if opts.get("xsdPath") else None

    report = validate_xsd(file_path, xsd_path=xsd_path)
    return report.to_dict()


if __name__ == "__main__":
    run(handler)
