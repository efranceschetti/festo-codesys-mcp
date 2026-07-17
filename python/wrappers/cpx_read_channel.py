"""
cpx_read_channel — read a single I/O channel from a CPX-AP module.

Input (JSON):
  { "ipAddress": "192.168.0.10", "moduleIndex": 1, "channel": 0 }

Output (success):
  { "moduleIndex": 1, "channel": 0, "value": <any> }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    from cpx_io.cpx_system.cpx_ap.cpx_ap import CpxAp

    ip = opts["ipAddress"]
    module_index = int(opts["moduleIndex"])
    channel = int(opts["channel"])

    with CpxAp(ip_address=ip) as cpx:
        mod = cpx.modules[module_index]
        value = mod.read_channel(channel)
        return {
            "moduleIndex": module_index,
            "channel": channel,
            "value": value,
        }


if __name__ == "__main__":
    run(handler)
