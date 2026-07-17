"""
edcon_position — execute a positioning task on a Festo drive (Telegram 111).

Input (JSON):
  {
    "ipAddress": "192.168.0.20",
    "protocol": "modbus" | "ethernetip",
    "position": 12345,       // target position (drive units)
    "velocity": 1000,        // velocity (drive units/s)
    "absolute": true,        // false = relative
    "nonblocking": false,
    "timeoutSec": 30.0
  }

Output (success):
  { "result": true/false, "actualPosition": <int> }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    ip = opts["ipAddress"]
    protocol = opts.get("protocol", "modbus").lower()
    position = int(opts["position"])
    velocity = int(opts["velocity"])
    absolute = bool(opts.get("absolute", True))
    nonblocking = bool(opts.get("nonblocking", False))

    if protocol == "modbus":
        from edcon.edrive.com_modbus import ComModbus
        com_cls: Any = ComModbus
    elif protocol == "ethernetip":
        from edcon.edrive.com_ethernetip import ComEthernetip
        com_cls = ComEthernetip
    else:
        raise ValueError(f"Unsupported protocol: {protocol}")

    from edcon.edrive.motion_handler import MotionHandler

    with com_cls(ip) as com:
        mot = MotionHandler(com)
        result = mot.position_task(
            position=position,
            velocity=velocity,
            absolute=absolute,
            nonblocking=nonblocking,
        )
        mot.update_inputs()
        actual = int(mot.telegram.nist_b.value)
        return {
            "result": bool(result),
            "actualPosition": actual,
        }


if __name__ == "__main__":
    run(handler)
