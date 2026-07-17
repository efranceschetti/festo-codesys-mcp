"""
cpx_discover — list modules of a CPX-AP system on the network.

Input (JSON):
  { "ipAddress": "192.168.0.10", "timeoutMs": 1000 }

Output (success):
  {
    "ipAddress": "...",
    "moduleCount": N,
    "modules": [{"index": i, "name": "...", "typeCode": "..."}, ...]
  }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    from cpx_io.cpx_system.cpx_ap.cpx_ap import CpxAp

    ip = opts["ipAddress"]
    timeout_ms = int(opts.get("timeoutMs", 1000))

    with CpxAp(ip_address=ip, timeout=timeout_ms / 1000.0) as cpx:
        modules: list[dict[str, Any]] = []
        for idx, mod in enumerate(cpx.modules):
            modules.append({
                "index": idx,
                "name": getattr(mod, "name", str(mod)),
                "typeCode": getattr(mod, "module_code", None),
            })
        return {
            "ipAddress": ip,
            "moduleCount": len(modules),
            "modules": modules,
        }


if __name__ == "__main__":
    run(handler)
