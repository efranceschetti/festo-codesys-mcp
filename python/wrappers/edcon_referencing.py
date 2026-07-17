"""
edcon_referencing — run drive-controlled homing/referencing sequence.

Input (JSON):
  {
    "ipAddress": "192.168.0.20",
    "protocol": "modbus" | "ethernetip",
    "nonblocking": false,
    "timeoutSec": 30.0
  }

Output (success):
  {
    "result": true/false,
    "isHomed": true/false,
    "actualPosition": <int>,
    "statusword": "0xXXXX"
  }
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    ip = opts["ipAddress"]
    protocol = opts.get("protocol", "modbus").lower()
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
        result = mot.referencing_task(nonblocking=nonblocking)
        mot.update_inputs()
        statusword_int = int(mot.telegram.zsw1.value)
        actual = int(mot.telegram.nist_b.value)
        return {
            "result": bool(result),
            "isHomed": bool(statusword_int & 0x0400),  # CiA 402 bit 10 = home position attained
            "actualPosition": actual,
            "statusword": f"0x{statusword_int:04X}",
        }


if __name__ == "__main__":
    run(handler)
