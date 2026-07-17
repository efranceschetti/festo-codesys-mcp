"""
edcon_drive_control — high-level Festo drive control (CMMT-AS/ST, EMMT-ST).

Input (JSON):
  {
    "ipAddress": "192.168.0.20",
    "protocol": "modbus" | "ethernetip",
    "action": "ack_faults" | "enable_powerstage" | "disable" | "reference",
    "timeoutSec": 5.0
  }

Output (success):
  { "action": "...", "result": true/false, "statusword": <hex string> }

Uses Telegram 111 MotionHandler.
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    ip = opts["ipAddress"]
    protocol = opts.get("protocol", "modbus").lower()
    action = opts["action"]
    timeout = float(opts.get("timeoutSec", 5.0))

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
        if action == "ack_faults":
            result = mot.acknowledge_faults(timeout=timeout)
        elif action == "enable_powerstage":
            result = mot.enable_powerstage(timeout=timeout)
        elif action == "disable":
            result = mot.disable_powerstage(timeout=timeout)
        elif action == "reference":
            result = mot.referencing_task(nonblocking=False)
        else:
            raise ValueError(f"Unsupported action: {action}")

        # Read statusword for diagnostics
        mot.update_inputs()
        statusword_int = int(mot.telegram.zsw1.value)

        return {
            "action": action,
            "result": bool(result),
            "statusword": f"0x{statusword_int:04X}",
        }


if __name__ == "__main__":
    run(handler)
