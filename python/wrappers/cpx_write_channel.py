"""
cpx_write_channel — write a value to a CPX-AP module channel.

Input (JSON):
  { "ipAddress": "192.168.0.10", "moduleIndex": 1, "channel": 0, "value": true }

Output (success):
  { "moduleIndex": 1, "channel": 0, "valueWritten": <any> }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    from cpx_io.cpx_system.cpx_ap.cpx_ap import CpxAp

    ip = opts["ipAddress"]
    module_index = int(opts["moduleIndex"])
    channel = int(opts["channel"])
    value = opts["value"]

    with CpxAp(ip_address=ip) as cpx:
        mod = cpx.modules[module_index]
        mod.write_channel(channel, value)
        return {
            "moduleIndex": module_index,
            "channel": channel,
            "valueWritten": value,
        }


if __name__ == "__main__":
    run(handler)
