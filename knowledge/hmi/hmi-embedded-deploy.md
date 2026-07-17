---
id: hmi-embedded-deploy
title: Deploying a Web HMI to Embedded Panels (Chromium 69 / ARMv7)
priority: HIGH
token_estimate: 3000
use_when:
  - deploying a custom web HMI to an embedded operator panel
  - user hits a slow/janky/blank HMI on a panel PC
  - deciding what CSS/JS an old embedded Chromium can run
  - packaging the SPA + gateway into a single panel installer
  - cross-compiling the Python gateway for an ARM panel
  - copying the SPA bundle onto the PLC web server
never_use_when:
  - target is a desktop/modern browser with no constraints
  - user wants the CODESYS-native WebVisu (see festo-cdpx-hmi)
  - the question is protocol/gateway logic (see opcua-websocket-gateway)
related: [hmi-web-architecture, opcua-websocket-gateway, festo-cdpx-hmi]
keywords: [embedded, panel, kiosk, Chromium 69, ARMv7, box-shadow, backdrop-filter, gzip budget, DOM elements, transform, opacity, PyInstaller, docker buildx, qemu, cross-arch, run.sh, installer, ZIP, PlcLogic, deploy, 800x480, single file, deploy HMI, panel PC, kiosk mode, embedded browser, install on panel, slow HMI, blank HMI, ARM panel, package the SPA]
see_also: [hmi-web-architecture, opcua-websocket-gateway, festo-cdpx-hmi]
---

# Deploying a Web HMI to Embedded Panels

> The last mile of the custom web HMI stack (see `hmi-web-architecture` for the
> architecture and `opcua-websocket-gateway` for the middle layer). Embedded
> operator panels are NOT desktops. This module is the hard-won checklist for
> making a modern SPA feel instant on a weak, old-Chromium, GPU-less panel.

## 1. Embedded Panel Constraints

A typical industrial panel PC runs an **old embedded Chromium (≈ v69)** on an
**ARMv7 CPU with no GPU acceleration**, a small resolution, and little RAM. Treat
these as hard limits, measured on real hardware:

| Constraint | Reality on the panel | Consequence |
|------------|----------------------|-------------|
| Browser engine | Chromium ~69 | No modern JS/CSS the engine can't parse |
| CPU | ARMv7, no GPU compositing | Effects that lean on the GPU are software-rendered |
| `box-shadow` / blur | Software-rasterized every frame | Measured **~7 fps** on a busy screen |
| Live DOM elements | Keep **< 100** actually-changing nodes | More → layout/paint thrash |
| Bundle size | Budget **~1.5 MB gzipped** total | Bigger → multi-second white screen on load |
| Screen | Often **800 × 480** | Design for it exactly, not "responsive down to it" |

The mindset: **the panel has the horsepower of a ~2014 phone.** Every effect that
is free on a laptop can cost you the frame budget here. Profile on the actual
device — the desktop dev machine lies.

## 2. CSS / JS Restriction Checklist

**Avoid (they force expensive software rasterization or aren't supported):**

- `box-shadow` — the single biggest offender; drops a screen to single-digit fps.
- `filter` / `backdrop-filter` (blur, drop-shadow) — GPU-only; brutal without one.
- Large `border-radius` on many moving elements.
- Animating `width`, `height`, `top`, `left`, `margin` — triggers layout every frame.
- Full-screen gradients that repaint on every state change.
- Heavy runtime CSS-in-JS; huge component/icon libraries pulled in whole.

**Prefer:**

- **Animate only `transform` and `opacity`** — the two properties the compositor
  can handle cheaply. A sliding panel is `transform: translateX()`, not `left`.
- Flat design: solid fills, `1px` borders instead of shadows for separation.
- `will-change: transform` sparingly on the few elements that actually move.
- A tiny, tree-shaken component set; import individual icons, not a whole pack.
- Virtualize long lists so only on-screen rows are live DOM (keeps < 100 nodes).

```css
/* BAD on the panel — soft shadow + blur, ~7 fps */
.card { box-shadow: 0 4px 12px rgba(0,0,0,.3); backdrop-filter: blur(8px); }

/* GOOD — flat, GPU-friendly, 60 fps */
.card { border: 1px solid #2a2a2a; background: #1c1c1c; }
.drawer { transform: translateX(100%); transition: transform .2s ease; }
.drawer.open { transform: translateX(0); }   /* animate transform, not left */
```

Pair this with `build.target: 'chrome69'` in Vite (see `hmi-web-architecture` §5)
so the *JavaScript* the panel receives is also within its engine's reach.

## 3. Kiosk Rendering

The panel should boot straight into the HMI, full-screen, no browser chrome, no
way to navigate away:

- Launch the embedded browser in **kiosk / full-screen** mode pointed at the
  PLC-hosted URL (`http://<plc-ip>:8080/visu/dist/index.html`).
- Disable pinch-zoom, text selection, context menu, and pull-to-refresh — an
  operator's palm should never zoom the UI or open a menu.
- Hide the cursor if the panel is touch-only.
- Auto-restart the browser if it crashes (a watchdog on the panel OS), so an
  unattended line recovers without a technician.

```css
/* Kiosk hardening — apply globally */
html, body { margin: 0; height: 100%; overflow: hidden;
             -webkit-user-select: none; user-select: none;
             touch-action: manipulation; }   /* no double-tap zoom */
```

## 4. Unified Panel Installer ("single file")

A frequent misunderstanding: **"single file" here is NOT a `vite-plugin-singlefile`
HTML bundle.** Inlining the whole SPA into one `.html` does not help — the SPA is
already served from the PLC (§6 of `hmi-web-architecture`), and it does nothing
for the *gateway*, which is a separate process on the panel.

The real "single file" is a **unified panel installer**: one archive the panel's
management screen can install in a single step. It bundles everything the panel
needs so a technician does not assemble parts by hand:

```
panel-installer.zip
├── chromium-oem/            # the panel vendor's OEM Chromium package (kiosk browser)
├── gateway/
│   └── hmi-gateway          # PyInstaller one-file binary, compiled FOR ARMv7
├── tags-manifest.json       # the tag contract (see hmi-web-architecture §3)
├── run.sh                   # patched startup: launch gateway, then kiosk browser
└── install.md               # what the management screen runs
```

- The **gateway** ships as a **PyInstaller one-file binary built for ARMv7** — the
  panel has no Python toolchain, so you cannot ship `.py` + `pip install`. One
  self-contained executable, cross-compiled (§5).
- The **Chromium** package is the panel OEM's own build (do not try to compile a
  browser for the panel yourself).
- **`run.sh`** is the glue: start the gateway in the background, wait for its
  WebSocket port, then launch the OEM browser in kiosk mode at the PLC URL.
- The whole thing is a **ZIP** the panel's installation/management UI accepts —
  hence "single file to install," not "single-file HTML."

```bash
# run.sh — panel startup glue (patched into the OEM boot sequence)
#!/bin/sh
./gateway/hmi-gateway --backend plc --plc opc.tcp://192.168.0.10:4840 &
until nc -z 127.0.0.1 8765; do sleep 0.2; done      # wait for the gateway WS
exec ./chromium-oem/chromium --kiosk --disable-pinch \
     "http://192.168.0.10:8080/visu/dist/index.html"
```

## 5. Cross-Arch Build (ARMv7 gateway binary)

You develop on x86_64 but the panel is ARMv7. Use Docker `buildx` with QEMU
emulation to compile the PyInstaller binary for the panel's architecture, then
smoke-test it under emulation before you ever touch hardware.

```dockerfile
# Dockerfile.armv7 — build the gateway binary for the panel
FROM --platform=linux/arm/v7 python:3.11-slim
WORKDIR /build
COPY gateway/ ./gateway/
COPY tags-manifest.json requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt pyinstaller
RUN pyinstaller --onefile --name hmi-gateway gateway/main.py
# → /build/dist/hmi-gateway  (ARMv7 ELF)
```

```bash
# One-time: register QEMU so the host can run ARM containers
docker run --privileged --rm tonistiigi/binfmt --install arm

# Build the ARMv7 binary on an x86_64 machine
docker buildx build --platform linux/arm/v7 \
  -f Dockerfile.armv7 --output type=local,dest=./out .

# Smoke test the ARM binary under emulation before shipping
docker run --rm --platform linux/arm/v7 \
  -v "$PWD/out:/app" python:3.11-slim /app/dist/hmi-gateway --backend mock --selftest
```

If `--selftest` (start with the `MockBackend`, run one poll/diff cycle, exit 0)
passes under QEMU, the binary at least *runs* on ARMv7. Final validation still
happens on the real panel — emulation catches architecture mistakes, not
device-specific ones.

## 6. Deploying to the PLC Web Server

The **SPA** (multi-file, not single-file) goes on the **PLC**, served by
`CmpWebServer`; the **gateway** goes on the **panel**. Two separate deploys.

### Build and copy the SPA

```bash
npm run build                         # Vite → dist/  (base:'./', target chrome69)
# copy dist/ onto the controller's file system, e.g. via FTP/SFTP or the IDE:
#   dist/*  →  PlcLogic/visu/dist/  on the PLC
# browser then loads:  http://<plc-ip>:8080/visu/dist/index.html
```

- Keep the **whole `dist/` tree** (index.html + hashed JS/CSS assets). Do not
  flatten it into one file; the relative `base:'./'` paths expect the folder
  layout.
- Re-deploying the UI is just replacing `PlcLogic/visu/dist/` — the gateway and
  PLC logic are untouched.

### Install flow on the panel

1. Copy `panel-installer.zip` to the panel (USB stick or network share).
2. Open the panel's **management / configuration screen**.
3. Select **install package** and point it at the ZIP.
4. The management screen unpacks it and runs the patched `run.sh`.
5. On next boot the panel starts the gateway, waits for its port, and opens the
   kiosk browser at the PLC-hosted HMI.

### Redeploy matrix

| You changed... | Redeploy | Where |
|----------------|----------|-------|
| UI (React/CSS) | `dist/` | PLC → `PlcLogic/visu/dist/` |
| Gateway logic / tag modes | ARMv7 binary in the ZIP | Panel (re-install package) |
| PLC logic / `GVL_HMI` | CODESYS download | PLC (and re-run OPC-UA symbol config) |

Because the three artifacts deploy independently, most day-to-day changes (UI
tweaks) are a one-folder copy to the PLC — no panel re-image, no gateway rebuild.
