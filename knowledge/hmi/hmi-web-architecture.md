---
id: hmi-web-architecture
title: Custom Web HMI Architecture for CODESYS PLCs
priority: HIGH
token_estimate: 3200
use_when:
  - user wants a custom browser-based HMI / dashboard for a CODESYS PLC
  - user asks how a web SPA talks to a PLC without WebVisu/TargetVisu
  - user needs to show live PLC data in a browser
  - designing the tag/variable contract between PLC and web UI
  - deciding where the HMI is hosted and how data flows
never_use_when:
  - user wants the CODESYS-native WebVisu/TargetVisu editor (see festo-cdpx-hmi)
  - user asks about MQTT/IIoT telemetry to a cloud broker (see festo-mqtt)
  - the question is pure PLC logic with no HMI (see festo-cpx-reference)
related: [opcua-websocket-gateway, hmi-embedded-deploy, festo-cdpx-hmi, festo-mqtt]
keywords: [web HMI, SPA, WebSocket, OPC-UA, gateway, tag manifest, single source of truth, codegen, dead-man, deadband, push not poll, single-writer, React, Vite, zustand, CmpWebServer, PlcLogic, dashboard, SCADA, browser HMI, real-time visualization, operator screen, web panel, tag display, show plc data in a browser, live PLC data in browser, custom HMI, browser-based dashboard]
see_also: [opcua-websocket-gateway, hmi-embedded-deploy, festo-cdpx-hmi, festo-mqtt]
---

# Custom Web HMI Architecture for CODESYS PLCs

> A teaching module: how to build a modern browser HMI (single-page app) that
> shows and controls a CODESYS PLC over OPC-UA, without the browser ever
> speaking an industrial protocol. Companion topics: `opcua-websocket-gateway`
> (the Python gateway) and `hmi-embedded-deploy` (packaging for panels).

## 1. When to Use a Custom Web HMI

CODESYS ships with native visualization (**WebVisu**, **TargetVisu**, and vendor
panels like the Festo CDPX). Reach for a **custom web HMI** only when the native
tooling cannot deliver what the project needs:

| Need | Native WebVisu / TargetVisu / CDPX | Custom Web HMI (this module) |
|------|------------------------------------|------------------------------|
| Draw screens in the CODESYS editor | Yes | No — you write React/HTML/CSS |
| Modern component library, animations, charts | Limited | Full web ecosystem |
| Version control / code review of the UI | Weak (binary-ish) | Strong (plain source files) |
| Reuse the same UI on phone, tablet, kiosk | Awkward | Native to the web |
| Run with zero extra services | Yes | No — needs a gateway process |
| Team of PLC engineers, no web skills | Best fit | Wrong tool |

**Rule of thumb:** if the deliverable is a handful of maintenance screens, use
WebVisu. If the deliverable is a *product* — a polished operator experience,
reused across devices, maintained by software engineers — a custom web HMI pays
for its extra moving parts.

## 2. Three-Layer Architecture

The single most important rule: **the browser NEVER speaks OPC-UA (or any
fieldbus).** A browser can only open HTTP and WebSocket connections. All
industrial protocol handling lives in a small server process — the **gateway**.

```
  ┌──────────────┐   WebSocket    ┌───────────────┐   OPC-UA     ┌──────────┐
  │   Browser    │  JSON frames   │    Gateway    │  (asyncua)   │   PLC    │
  │  SPA (React) │ <============> │  (Python)     │ <==========> │ CODESYS  │
  │              │  ws://:8765    │  protocol +   │  binary TCP  │  runtime │
  │  zustand     │                │  backends     │  :4840       │  + OPC-UA│
  │  store       │                │               │              │  server  │
  └──────────────┘                └───────────────┘              └──────────┘
        ▲                                                              ▲
        │ HTTP GET (static files: index.html, JS, CSS)                 │
        └──────────────── served by the PLC web server ───────────────┘
                          (CmpWebServer, PlcLogic/visu/dist)
```

Responsibilities, strictly separated:

- **SPA (browser)** — render UI, hold view state, send user intents as JSON,
  apply state diffs pushed by the gateway. Knows nothing about NodeIds.
- **Gateway (server)** — the ONLY component that speaks OPC-UA. Translates
  between the WebSocket JSON protocol and the PLC address space. Owns all
  robustness logic (reconnect, watchdog, write safety).
- **PLC (CODESYS)** — runs the machine logic and exposes a curated set of
  symbols through its OPC-UA server. Also *hosts the static SPA files* (see §6).

Two independent transports meet in the browser: **HTTP** delivers the app once
(HTML/JS/CSS), then a **WebSocket** carries live data for the session's life.

## 3. Tag Manifest as the Single Source of Truth

Do not scatter variable names across PLC code, gateway code, and UI code. Define
every PLC↔HMI variable **once**, in a `tags-manifest.json`. Everything else is
generated or driven from it.

```json
{
  "version": 3,
  "poll_hz": 3,
  "tags": {
    "ConveyorRunning":  { "node": "GVL_HMI.bConveyorRunning",  "mode": "ro",    "type": "bool" },
    "LineSpeed":        { "node": "GVL_HMI.rLineSpeed",         "mode": "ro",    "type": "real", "deadband": 0.5 },
    "PartCount":        { "node": "GVL_HMI.nPartCount",         "mode": "ro",    "type": "dint" },
    "SpeedSetpoint":    { "node": "GVL_HMI.rSpeedSetpoint",     "mode": "write", "type": "real", "min": 0, "max": 100 },
    "ResetFault":       { "node": "GVL_HMI.bResetFault",        "mode": "pulse", "type": "bool", "pulse_ms": 300 },
    "JogForward":       { "node": "GVL_HMI.bJogForward",        "mode": "hold",  "type": "bool", "ttl_ms": 2500 },
    "HmiHeartbeat":     { "node": "GVL_HMI.nHmiHeartbeat",      "mode": "hb",    "type": "dint" }
  },
  "groups": {
    "overview":   ["ConveyorRunning", "LineSpeed", "PartCount"],
    "manual":     ["JogForward", "SpeedSetpoint", "ResetFault"]
  }
}
```

### The 5 access modes

| Mode | Direction | Semantics |
|------|-----------|-----------|
| `ro` | PLC → HMI | Read-only. Displayed, never written. Most tags are `ro`. |
| `write` | HMI → PLC | Set-and-hold value (setpoint). Written once per user commit; clamped to `min`/`max`. |
| `pulse` | HMI → PLC | Momentary command. Gateway writes TRUE, then FALSE after `pulse_ms`. Use for reset/start/acknowledge buttons — the PLC sees a clean rising edge. |
| `hold` | HMI → PLC | **Dead-man** command. Stays TRUE only while the operator holds the button. The gateway auto-clears it if it does not hear from the client within `ttl_ms` (typ. 2500 ms). Use for jog/inch. |
| `hb` | HMI ↔ PLC | Heartbeat counter. The gateway increments it every cycle; the PLC watches it and stops motion if it stalls (the HMI/gateway died). |

### Deadband

For noisy analog `ro` tags, declare a `deadband`. The gateway suppresses pushes
smaller than the deadband, so a fluctuating REAL does not flood the WebSocket
and re-render the UI 3× per second for a 0.01 change.

### On-demand tag groups (per screen)

`groups` maps a screen name to the tags it needs. When a screen mounts, the SPA
sends `{"type":"subscribe","group":"overview"}`. The gateway then polls and
pushes **only** that group. Leaving a screen unsubscribes it. This keeps both
the OPC-UA read load and the WebSocket traffic proportional to what is on screen,
not to the size of the whole manifest.

## 4. Manifest → TypeScript Codegen

A small codegen step turns the manifest into a typed module the SPA imports.
Never hand-maintain a parallel list of tag names in TypeScript — generate it.

```python
# gen-tags.py — run at build time; writes src/generated/tags.ts
import json, pathlib

manifest = json.loads(pathlib.Path("tags-manifest.json").read_text())
TS = {"bool": "boolean", "real": "number", "dint": "number", "lreal": "number"}

lines = ["// AUTO-GENERATED from tags-manifest.json — do not edit by hand.\n"]
lines.append("export interface HmiState {")
for name, t in manifest["tags"].items():
    lines.append(f"  {name}: {TS[t['type']]};")
lines.append("}\n")
lines.append("export const TAG_NAMES = [")
for name in manifest["tags"]:
    lines.append(f"  '{name}',")
lines.append("] as const;")
lines.append("export type TagName = typeof TAG_NAMES[number];")

pathlib.Path("src/generated/tags.ts").write_text("\n".join(lines))
```

Result — the UI gets compile-time safety; a renamed tag is a type error, not a
silent runtime `undefined`:

```typescript
// src/generated/tags.ts  (generated)
export interface HmiState {
  ConveyorRunning: boolean;
  LineSpeed: number;
  PartCount: number;
  SpeedSetpoint: number;
  // ...
}
export const TAG_NAMES = ['ConveyorRunning', 'LineSpeed', /* ... */] as const;
export type TagName = typeof TAG_NAMES[number];
```

The gateway loads the *same* manifest at runtime, so PLC node paths, modes, and
deadbands never drift between the two sides.

## 5. SPA Stack and Constraints

A pragmatic, embedded-friendly stack:

- **React + Vite** — fast dev server, small production bundle.
- **zustand** — a tiny store. The WebSocket handler writes incoming state diffs
  into the store; components subscribe to just the slices they render.
- **Plain CSS / a utility framework** — avoid heavy runtime CSS-in-JS on
  embedded panels (see `hmi-embedded-deploy` for the hard constraints).

Two Vite settings are mandatory when the target is an embedded panel and the app
is served from the PLC:

```typescript
// vite.config.ts
export default defineConfig({
  base: './',                 // relative asset paths — app is served from a sub-path on the PLC
  build: {
    target: 'chrome69',       // embedded Chromium is OLD; do not emit modern syntax it cannot parse
    outDir: 'dist',
  },
});
```

`base: './'` matters because the PLC serves the bundle from a directory, not the
web root; absolute `/assets/...` paths would 404. `target: 'chrome69'` prevents
Vite from emitting optional chaining / nullish operators the panel's browser
cannot run (details and the full budget live in `hmi-embedded-deploy`).

## 6. Hosting the SPA on the PLC Itself

The CODESYS runtime includes a web server component (**CmpWebServer**), the same
one that serves WebVisu. You can drop your own static bundle next to it and the
PLC will serve your custom HMI — **no separate web host required.**

- Default port: **8080** (configurable in the runtime's `CODESYSControl.cfg`).
- Serve directory (typical): `PlcLogic/visu/dist/` on the controller's file
  system. Copy the Vite `dist/` output there.
- The browser then loads `http://<plc-ip>:8080/visu/dist/index.html`.

Key idea: **HTML comes from the PLC; data comes from the gateway.** The two are
decoupled — you can redeploy the UI without touching the gateway, and restart
the gateway without reloading the UI.

```
GVL_HMI  (PLC)        →  OPC-UA server (:4840)  →  Gateway  →  WebSocket (:8765)  →  SPA
dist/*   (PLC)        →  CmpWebServer (:8080)    →  HTTP      →                       SPA
```

## 7. Data Flow: Push, Not Poll

The browser must never poll the gateway. Polling wastes CPU on a weak panel and
adds latency. The pattern is **poll once at the edge, diff, push the changes**:

1. The gateway polls the PLC over OPC-UA at a fixed rate (typ. **3 Hz** — fast
   enough for human eyes, slow enough for a busy controller).
2. It compares the fresh snapshot to the last one (applying per-tag `deadband`).
3. It pushes only the **changed** tags to each subscribed client as a
   `state-diff` frame.

```json
// gateway → browser, only what changed since the last cycle
{ "type": "state", "diff": { "LineSpeed": 12.4, "PartCount": 1043 } }
```

The SPA merges the diff into the zustand store; unchanged tags keep their values
and their components do not re-render. One slow-changing REAL with a deadband can
go minutes between pushes. See `opcua-websocket-gateway` for the loop code.

## 8. Write Safety Model

Writes can move a machine, so the architecture builds in two layers of defense.

### Single-writer (`cmd_owner`)

Only **one** client may hold write authority at a time. On connect, a client can
request ownership; the gateway grants it to at most one session (`cmd_owner`).
Write/pulse/hold frames from any other client are rejected. This prevents two
tablets from fighting over the same setpoint or jog button. Ownership is released
on disconnect or after an idle timeout, so control can pass to another panel.

### Dead-man in two layers (for `hold` commands)

A jog button must stop the axis the instant the operator lets go — *or* the
instant the UI freezes / the network drops. One check is not enough:

- **Layer 1 — client:** the button clears the command on `pointerup`,
  `pointerleave`, `blur`, and page `visibilitychange`. While held, the client
  re-asserts the command on a short interval (the "I'm still holding" signal).
- **Layer 2 — gateway TTL:** the gateway writes the `hold` tag TRUE only while
  it keeps receiving that re-assert. If none arrives within `ttl_ms` (e.g.
  2500 ms) — frozen tab, dead Wi-Fi, killed process — it forces the tag FALSE.

Layer 1 handles the normal release; Layer 2 handles every failure Layer 1 can't
see. Combined with the `hb` heartbeat (§3) — which lets the *PLC* stop motion if
the whole HMI stack dies — a stuck jog command is prevented at three independent
levels: client, gateway, and PLC.

## Companion PLC-side Pattern: `GVL_HMI`

Expose a **dedicated** global variable list to the HMI. Do not point the gateway
at internal machine variables — curate a stable, documented contract:

```iecst
// GVL_HMI — the ONLY variables the web HMI is allowed to see/touch.
// Read-only status is written BY the PLC; commands are read BY the PLC.
VAR_GLOBAL
    // ── Status (PLC writes, HMI reads) ──
    bConveyorRunning : BOOL;    // ro
    rLineSpeed       : REAL;    // ro  (m/min)
    nPartCount       : DINT;    // ro
    // ── Commands (HMI writes, PLC reads) ──
    rSpeedSetpoint   : REAL;    // write, clamped 0..100 in PLC too
    bResetFault      : BOOL;    // pulse
    bJogForward      : BOOL;    // hold  (PLC also requires bHmiAlive)
    // ── Watchdog ──
    nHmiHeartbeat    : DINT;    // hb — PLC drops motion if this stalls
    bHmiAlive        : BOOL;    // PLC sets from heartbeat freshness
END_VAR
```

Clamp setpoints and gate dead-man commands **inside the PLC as well** — never
trust the HMI as the sole guardian of a value that can cause motion. The web
layers are for usability; the PLC remains the final safety authority.
