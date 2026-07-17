"""
Shared helpers for FestoCodesysMCP Python wrappers.

All wrappers follow the same I/O contract:
  - Accept `--json '<json>'` on the command line.
  - On success: write exactly one JSON line to stdout, exit 0.
  - On failure: write `SCRIPT_ERROR: <msg>` to stderr, exit 1.

The TS side (`services/python-runner.ts`) parses these markers.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Callable


def parse_args() -> dict[str, Any]:
    """Read --json flag and return its decoded contents."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", required=True, help="JSON-encoded arguments")
    args = parser.parse_args()
    return json.loads(args.json)


def emit_success(data: Any) -> None:
    """Write success payload as a single JSON line on stdout."""
    print(json.dumps({"success": True, "data": data}))


def emit_error(msg: str, exit_code: int = 1) -> None:
    """Write SCRIPT_ERROR marker on stderr and exit non-zero."""
    print(f"SCRIPT_ERROR: {msg}", file=sys.stderr)
    sys.exit(exit_code)


def run(handler: Callable[[dict[str, Any]], Any]) -> None:
    """
    Common entry point. Handlers receive the parsed JSON dict and return the
    serializable result payload. Exceptions are converted into SCRIPT_ERROR
    on stderr automatically.
    """
    try:
        opts = parse_args()
        result = handler(opts)
        emit_success(result)
    except Exception as exc:  # noqa: BLE001  (we want the broad catch here)
        emit_error(f"{type(exc).__name__}: {exc}")
