# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in festo-codesys-mcp, please report it
privately via **GitHub Security Advisories** ("Report a vulnerability" on the
repository's Security tab). Please do not open a public issue for security
reports.

You can expect an acknowledgement within a few days. Please include a minimal
reproduction where possible.

## Scope

Reports we consider in scope:

- Path traversal or workspace-jail escapes in the file-writing tools
  (`create_*`, `generate_plcopen_xml`).
- Injection of malicious content through knowledge-base ingestion
  (`knowledge/manuals/` hot-reload) or library blocks.
- Any way a crafted `.st` / `.xml` input can cause the server to write outside
  the intended output directory or execute unintended commands.
- Vulnerabilities in the optional IDE-driving (`ide_*`) and hardware
  commissioning (`cpx_*`, `edcon_*`) surfaces.

## Machine-Safety Notice (please read)

This project generates and validates PLC code — logic that can command real
machinery: motors, heaters, valves, presses.

- **festo-codesys-mcp is a reference implementation and engineering assistant.
  Generated code MUST be reviewed by a qualified automation engineer before it
  runs on any machine that can cause physical harm.**
- Safety functions (emergency stop, STO/SBC, guard interlocks, limits) must be
  implemented and validated according to the applicable safety standards for
  your machine and jurisdiction — never rely on generated logic as a safety
  measure.
- The optional hardware tools (`cpx_*`, `edcon_*`) write directly to devices
  and are intended for **bench commissioning only**, never for machines in
  production. They are disabled by default and require an explicit opt-in
  environment variable (`FESTO_MCP_ENABLE_HARDWARE=1`).

## Hardening Defaults

- File-writing tools are jailed to the workspace directory
  (`FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1` opts out explicitly).
- The server never requires credentials; do not embed credentials, tokens, or
  production network addresses in ST code, GVLs, or knowledge files.
- Knowledge-base content is sanitized on ingestion; treat third-party manuals
  you add locally as trusted input only if you trust their source.
