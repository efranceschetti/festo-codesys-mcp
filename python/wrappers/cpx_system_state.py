"""
cpx_system_state — dump structural + state information about the CPX system.

Input (JSON):
  { "ipAddress": "192.168.0.10" }

Output (success):
  {
    "ipAddress": "...",
    "moduleCount": N,
    "modules": [
      {
        "index": i,
        "name": "...",
        "channels": [{"index": c, "value": v}, ...]
      },
      ...
    ]
  }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    from cpx_io.cpx_system.cpx_ap.cpx_ap import CpxAp

    ip = opts["ipAddress"]
    with CpxAp(ip_address=ip) as cpx:
        modules: list[dict[str, Any]] = []
        for idx, mod in enumerate(cpx.modules):
            entry: dict[str, Any] = {
                "index": idx,
                "name": getattr(mod, "name", str(mod)),
                "channels": [],
            }
            # Best-effort: many modules expose read_channels()
            try:
                values = mod.read_channels()
                entry["channels"] = [
                    {"index": ci, "value": cv} for ci, cv in enumerate(values)
                ]
            except Exception as inner:  # noqa: BLE001
                entry["channelsError"] = f"{type(inner).__name__}: {inner}"
            modules.append(entry)
        return {
            "ipAddress": ip,
            "moduleCount": len(modules),
            "modules": modules,
        }


if __name__ == "__main__":
    run(handler)
