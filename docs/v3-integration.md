# IDE Driving & Hardware Integration Notes

How the optional live surfaces (CODESYS IDE driving + hardware commissioning)
fit on top of the offline code-generation core.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FestoCodesysMCP                          │
│                                                                  │
│  ┌─────────────────────┐  ┌────────────────────────────────┐    │
│  │ Offline core (18)   │  │ Live IDE driving (12)          │    │
│  │  plc_lookup         │  │  ide_open_project              │    │
│  │  plc_knowledge      │  │  ide_create_project            │    │
│  │  plc_library        │  │  ide_save_project              │    │
│  │  plc_validate       │  │  ide_compile_project           │    │
│  │  create_function_*  │  │  ide_create_pou                │    │
│  │  create_program     │  │  ide_set_pou_code              │    │
│  │  create_data_type   │  │  ide_create_property           │    │
│  │  create_gvl         │  │  ide_create_method             │    │
│  │  generate_plcopen.. │  │  ide_browse_project_tree       │    │
│  │  validate_plcopen.. │  │  ide_get_pou_code              │    │
│  │  st_symbols         │  │  ide_patch_pou_code            │    │
│  │  st_find_references │  │  ide_get_device_tree           │    │
│  │  ...                │  │  + 3 codesys:// resources      │    │
│  │                     │  └──────────────┬─────────────────┘    │
│  │  ...                │                 │                       │
│  └──────┬──────────────┘                 │                       │
│         │                                ▼                       │
│         │                ┌──────────────────────────────┐        │
│         │                │  services/codesys-interop.ts │        │
│         │                │  spawn CODESYS.exe --runscript│       │
│         │                └──────────────┬───────────────┘        │
│         │                               │                        │
│         │                  ┌────────────▼────────────┐           │
│         │                  │  Real CODESYS V3.5 IDE  │           │
│         │                  │  (must be installed)    │           │
│         │                  └─────────────────────────┘           │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │ Hardware commissioning (8 — 4+4)                         │    │
│  │  cpx_discover_system   │ edcon_drive_control            │    │
│  │  cpx_read_channel      │ edcon_position_task            │    │
│  │  cpx_write_channel     │ edcon_pnu_read                 │    │
│  │  cpx_system_state      │ edcon_pnu_write                │    │
│  └──────┬──────────────────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────┐                            │
│  │  services/python-runner.ts       │                            │
│  │  spawn python/.venv/bin/python   │                            │
│  └──────┬───────────────────────────┘                            │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────┐             │
│  │  python/wrappers/*.py (8 scripts)               │             │
│  │  import festo_cpx_io  /  import edcon           │             │
│  └─────────────────────────────────────────────────┘             │
│                  │                  │                            │
│                  ▼                  ▼                            │
│    ┌──────────────────┐  ┌──────────────────────┐                │
│    │  CPX-AP hardware │  │  CMMT-AS/ST drives   │                │
│    │  (Modbus/TCP)    │  │  (PROFIDRIVE)        │                │
│    └──────────────────┘  └──────────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

## Environment variables

### CODESYS IDE driving

| Var | Required | Default | Purpose |
|---|---|---|---|
| `FESTO_MCP_CODESYS_PATH` | yes | — | Full path to `CODESYS.exe` |
| `FESTO_MCP_CODESYS_PROFILE` | yes | — | Profile name (`File > Preferences > Profile` in CODESYS UI) |
| `FESTO_MCP_CODESYS_TEMPLATE` | for `ide_create_project` only | — | Path to `Standard.project` template |
| `FESTO_MCP_CODESYS_TIMEOUT_MS` | no | `60000` | Per-script spawn timeout |

If `FESTO_MCP_CODESYS_PATH` is unset, the `ide_*` tools and `codesys://`
resources are not registered (info log marks the skip).

### Hardware commissioning

| Var | Required | Default | Purpose |
|---|---|---|---|
| `FESTO_MCP_ENABLE_HARDWARE` | yes (`=1`) | — | Master switch for `cpx_*`/`edcon_*` tools |
| `FESTO_MCP_PYTHON` | no | `<repo>/python/.venv/Scripts/python.exe` (Win) or `bin/python` | Interpreter override |
| `FESTO_MCP_WRAPPERS_DIR` | no | `<repo>/python/wrappers` | Wrappers directory override |
| `FESTO_MCP_PYTHON_TIMEOUT_MS` | no | `30000` | Per-script spawn timeout |

### Other (offline core)

- `MCP_DUAL_LOG=0` — silence stderr logging (rely on `notifications/message`)
- `FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1` — bypass workspace jail in `validatePath`

## Setup

### One-time setup for IDE driving

1. Install CODESYS V3.5 (tested on SP20.60 — Script Engine API stable since SP9)
2. Install Festo TSP packages (CPX-E-CEC, CMMT-AS ESI, etc.) via CODESYS Package Manager
3. Discover your profile name (look in `File > Preferences > Profile` or
   enumerate `%ProgramData%\CODESYS\CODESYS\*`)
4. Set environment:
   ```powershell
   $env:FESTO_MCP_CODESYS_PATH = "C:\Program Files\CODESYS 3.5.20.60\CODESYS\Common\CODESYS.exe"
   $env:FESTO_MCP_CODESYS_PROFILE = "CODESYS V3.5 SP20 Patch 6"
   ```

### One-time setup for hardware tools

1. Install [uv](https://docs.astral.sh/uv/) (single-binary Python manager)
2. Install the Python venv:
   ```powershell
   npm run python:install   # = cd python && uv sync
   ```
   This creates `python/.venv/` with `festo-cpx-io` + `festo-edcon` pinned.
3. Enable in env:
   ```powershell
   $env:FESTO_MCP_ENABLE_HARDWARE = "1"
   ```

## Troubleshooting

### `ide_*` tools fail with "spawn failed: ENOENT"

Usually wrong `FESTO_MCP_CODESYS_PATH`. Verify the file exists exactly at the
configured location. On Windows, paths with spaces work — they're quoted
in the spawn argv automatically.

### CODESYS stderr says `--profile="profile name"`

The profile name in `FESTO_MCP_CODESYS_PROFILE` is wrong/empty. Open CODESYS
manually, look at `File > Preferences > Profile`, copy the exact string.

### `cpx_*`/`edcon_*` fail with "Python interpreter not found"

Run `npm run python:install` to create the venv. If you have a system Python
elsewhere, set `FESTO_MCP_PYTHON` to its absolute path (must have
`festo-cpx-io` + `festo-edcon` installed).

### `edcon_*` returns ConnectionError

- Drive IP unreachable: ping it first.
- Drive in EthernetIP mode but tool called with `protocol=modbus` (or vice
  versa): match `protocol` arg to actual fieldbus config (parametrized via
  Festo Automation Suite at commissioning).

### Build / lint / test should be clean without IDE or hardware

By design — both feature blocks are env-gated in `src/index.ts`. CI servers
without CODESYS or Python venv installed should still see:
- `npm run build` → success
- `npm run lint` → 0 warnings
- `npm test` → 676 (or more) tests pass

If tests fail at the IDE/hardware boundary, the test was mocked incorrectly.

## Reference Offset commissioning without FCT

Traditionally, writing the Reference Offset (SDO 0x607C) on a CMMT-AS drive after
homing required FCT (Festo Configuration Tool). With the `edcon_*` tools you can
do it directly. Example flow for one drive (replace the IP with your drive's address):

```javascript
// 1. Read the current Reference Offset
await edcon_pnu_read({
  ipAddress: "192.168.0.10",
  protocol: "modbus",
  pnu: 24700,             // 0x607C
  subindex: 0,
  numElements: 4,
});
// → "valueHex": "00000000"

// 2. Write the new offset (e.g., -1234 in little-endian INT32)
await edcon_pnu_write({
  ipAddress: "192.168.0.10",
  protocol: "modbus",
  pnu: 24700,
  numElements: 4,
  valueHex: "2efbffff",   // -1234 as INT32 LE
});

// 3. Save params to non-volatile memory
await edcon_drive_control({
  ipAddress: "192.168.0.10",
  protocol: "modbus",
  action: "ack_faults",   // triggers re-init via subsequent enable
});

// 4. Confirm
await edcon_pnu_read({  // expects valueHex: "2efbffff"
  ipAddress: "192.168.0.10",
  protocol: "modbus",
  pnu: 24700,
  numElements: 4,
});
```

Repeat for each additional drive node. FCT becomes optional.
