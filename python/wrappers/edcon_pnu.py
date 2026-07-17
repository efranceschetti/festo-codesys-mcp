"""
edcon_pnu — raw PNU (Parameter Number Unit) read/write.

Maps directly to PROFIDRIVE SDO objects. Use for low-level access like:
  PNU 0x607C (24700)  = Home Offset / Reference Offset
  PNU 1124             = Firmware version
  PNU 1141             = Encoder type

Input (JSON):
  {
    "ipAddress": "192.168.0.20",
    "protocol": "modbus" | "ethernetip",
    "operation": "read" | "write",
    "pnu": 24700,           // decimal
    "subindex": 0,
    "numElements": 4,       // bytes
    "valueHex": "0A0B0C0D"  // little-endian hex, write only
  }

Output success (read):
  { "operation": "read", "pnu": ..., "valueHex": "..." }
Output success (write):
  { "operation": "write", "pnu": ..., "ok": true }

NOTE: wrapper for the Reference Offset commissioning use case
(CMMT-AS via SDO 0x607C without the FCT tool).
"""
from __future__ import annotations

from typing import Any
from _common import run


def handler(opts: dict[str, Any]) -> dict[str, Any]:
    ip = opts["ipAddress"]
    protocol = opts.get("protocol", "modbus").lower()
    operation = opts["operation"]
    pnu = int(opts["pnu"])
    subindex = int(opts.get("subindex", 0))
    num_elements = int(opts.get("numElements", 4))

    if protocol == "modbus":
        from edcon.edrive.com_modbus import ComModbus
        com_cls: Any = ComModbus
    elif protocol == "ethernetip":
        from edcon.edrive.com_ethernetip import ComEthernetip
        com_cls = ComEthernetip
    else:
        raise ValueError(f"Unsupported protocol: {protocol}")

    with com_cls(ip) as com:
        if operation == "read":
            raw: bytes = com.read_pnu_raw(pnu, subindex, num_elements)
            return {
                "operation": "read",
                "pnu": pnu,
                "subindex": subindex,
                "numElements": num_elements,
                "valueHex": raw.hex(),
            }
        elif operation == "write":
            hex_str = opts["valueHex"]
            try:
                payload = bytes.fromhex(hex_str)
            except ValueError as exc:
                raise ValueError(f"Invalid hex string: {hex_str}") from exc
            ok = com.write_pnu_raw(pnu, subindex, num_elements, payload)
            return {
                "operation": "write",
                "pnu": pnu,
                "subindex": subindex,
                "numElements": num_elements,
                "ok": bool(ok),
            }
        else:
            raise ValueError(f"Unsupported operation: {operation}")


if __name__ == "__main__":
    run(handler)
