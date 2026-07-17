"""
validate_plcopen_semantic — compares var/init counts, ST source vs XML.

Detects the PLCopen generator's A/B/E/F bugs that silently drop vars/inits.

Input (JSON):
  { "filePath": "C:/path/project.xml",
    "sourceDir": "C:/path/src_PLC",
    "varsTolerance": 0.75,                   # optional, default 0.75
    "initsTolerance": 0.70 }                 # optional, default 0.70

Output (success):
  {
    "gate": "semantic",
    "valid": true/false,
    "summary": "...",
    "errors": [{"line": N, "location": "...", "code": "...", "message": "..."}],
    "counts": {"st_files": N, "pous_in_xml": N, "pous_checked": N}
  }

Possible codes: VARS_MISSING, INITS_MISSING, AT_ADDR_LOST, POU_MISSING_IN_XML.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from _common import run  # noqa: E402
from lib.plcopen_validation import validate_semantic  # noqa: E402


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    file_path = Path(opts["filePath"])
    source_dir = Path(opts["sourceDir"])
    vars_tol = float(opts.get("varsTolerance", 0.75))
    inits_tol = float(opts.get("initsTolerance", 0.70))

    report = validate_semantic(
        file_path,
        source_dir,
        vars_tolerance=vars_tol,
        inits_tolerance=inits_tol,
    )
    return report.to_dict()


if __name__ == "__main__":
    run(handler)
