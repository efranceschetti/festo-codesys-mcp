---
id: opcua-websocket-gateway
title: OPC-UA ↔ WebSocket Gateway for Web HMIs (Python / asyncua)
priority: HIGH
token_estimate: 3400
use_when:
  - building the Python gateway that bridges a web HMI to a CODESYS PLC
  - user asks how a browser gets live PLC data over WebSocket
  - designing the WebSocket JSON protocol between SPA and PLC
  - reading/writing OPC-UA nodes from Python (asyncua)
  - configuring the CODESYS OPC-UA server for a custom HMI
  - need robustness patterns (reconnect, watchdog, offline mode, single-writer)
never_use_when:
  - user wants the CODESYS-native WebVisu (see festo-cdpx-hmi)
  - user asks about MQTT publish/subscribe to a broker (see festo-mqtt)
  - the question is only about the browser SPA (see hmi-web-architecture)
related: [hmi-web-architecture, hmi-embedded-deploy, festo-cpx-reference]
keywords: [OPC-UA, asyncua, WebSocket, gateway, Python, asyncio, backend, mock, offline, watchdog, heartbeat, reconnect, backoff, single-writer, dead-man, browse, address space, NodeId, symbol config, anonymous, poll, state diff, bridge OPC-UA, bridge opc-ua to a website, connect browser to PLC, WebSocket server, Python gateway, live data bridge, tag bridge, middleware]
see_also: [hmi-web-architecture, hmi-embedded-deploy, festo-cpx]
---

# OPC-UA ↔ WebSocket Gateway for Web HMIs

> The middle layer of the custom web HMI stack (see `hmi-web-architecture` for the
> big picture). This Python process is the ONLY component that speaks OPC-UA. On
> one side it serves a WebSocket JSON protocol to browsers; on the other it reads
> and writes a CODESYS PLC through `asyncua`.

## 1. Layered Gateway Design

Keep the protocol logic **pure** and the I/O **swappable**. The core knows the
WebSocket protocol and the tag manifest; it does not know how bytes reach the
PLC. That job belongs to an interchangeable **backend**.

```
        ┌────────────────────────────────────────────┐
        │              GatewayCore                     │
        │  - loads tags-manifest.json                  │
        │  - WebSocket server + JSON protocol          │
        │  - subscription/group bookkeeping            │
        │  - single-writer + dead-man logic            │
        │  - diff/deadband + push                      │
        │            calls  backend.read()/.write()    │
        └───────────────┬──────────────────────────────┘
                        │  (abstract Backend interface)
        ┌───────────────┼───────────────┬──────────────┐
   PlcBackend      MockBackend    OfflineBackend  PlaceholderBackend
   (real asyncua)  (simulated)    (last-known,    (dashes "—",
                                   read-only)      no data yet)
```

```python
class Backend(Protocol):
    async def connect(self) -> None: ...
    async def read(self, nodes: list[str]) -> dict[str, object]: ...
    async def write(self, node: str, value: object) -> None: ...
    async def close(self) -> None: ...

class PlcBackend:      # talks to the real PLC via asyncua
    ...
class MockBackend:     # deterministic fake values for UI dev + CI
    ...
class OfflineBackend:  # serves last-known values, refuses writes, flags OFFLINE
    ...
class PlaceholderBackend:  # before first connect: everything reads as "no data"
    ...
```

Benefits: the UI team develops against `MockBackend` with no PLC on the desk;
tests run against it in CI (§7); and when the PLC drops, the runtime swaps
`PlcBackend` → `OfflineBackend` without the browser code changing at all.

## 2. Asyncio Runtime Loops

A small `Runtime` owns the backend and runs a handful of independent `asyncio`
tasks. Each loop has one job; none blocks the others.

```python
class Runtime:
    def __init__(self, core: GatewayCore, backend: Backend):
        self.core, self.backend = core, backend
        self.connected = asyncio.Event()

    async def run(self):
        await asyncio.gather(
            self._connection_loop(),   # (re)connect the backend, with backoff
            self._poll_loop(),         # read subscribed tags at poll_hz, diff, push
            self._watchdog_loop(),     # detect a dead PLC link → go OFFLINE
            self._heartbeat_loop(),    # increment the HMI heartbeat tag
        )

    async def _poll_loop(self):
        period = 1.0 / self.core.poll_hz          # e.g. 3 Hz → 0.333 s
        while True:
            await self.connected.wait()
            try:
                nodes = self.core.subscribed_nodes()          # only what screens need
                snapshot = await self.backend.read(nodes)
                diff = self.core.diff_with_deadband(snapshot)  # suppress sub-deadband noise
                if diff:
                    await self.core.push_state(diff)           # send only changes
            except Exception:
                self.connected.clear()                          # drop → connection_loop reconnects
            await asyncio.sleep(period)

    async def _watchdog_loop(self):
        while True:
            await asyncio.sleep(1.0)
            if self.core.age_of_last_good_read() > OFFLINE_AFTER_S:
                self.core.set_offline(True)     # UI shows OFFLINE; writes refused
```

Loop responsibilities:

| Loop | Rate | Job |
|------|------|-----|
| connection | on demand | connect/reconnect the backend with exponential backoff |
| poll | `poll_hz` (≈3 Hz) | read subscribed nodes, diff, push state to clients |
| watchdog | 1 Hz | if reads stop succeeding, flip to OFFLINE mode |
| heartbeat | 1 Hz | write the incrementing `hb` tag so the PLC knows the HMI is alive |

## 3. OPC-UA Client with `asyncua` (<2.0) — Dynamic Browse

Pin **`asyncua<2.0`** for a stable async API. The critical rule: **never
hardcode NodeIds.** NodeIds (`ns=4;s=|var|...`) are generated by CODESYS and
change between builds and controllers. Instead, **browse the address space by
symbolic name** at connect time and cache the resolved nodes.

```python
from asyncua import Client

class PlcBackend:
    def __init__(self, url: str, manifest: dict):
        self.url = url                      # "opc.tcp://192.168.0.10:4840"
        self.manifest = manifest
        self.client: Client | None = None
        self.resolved: dict[str, "Node"] = {}   # "GVL_HMI.rLineSpeed" -> Node

    async def connect(self):
        self.client = Client(self.url)
        await self.client.connect()
        await self._resolve_nodes()

    async def _resolve_nodes(self):
        # Walk the Objects tree once; match each manifest path by browse name.
        # e.g. "GVL_HMI.rLineSpeed" -> Objects → GVL_HMI → rLineSpeed
        objects = self.client.nodes.objects
        for tag in self.manifest["tags"].values():
            gvl_name, var_name = tag["node"].split(".", 1)
            gvl = await self._child_by_name(objects, gvl_name)
            var = await self._child_by_name(gvl, var_name)
            self.resolved[tag["node"]] = var

    async def _child_by_name(self, parent, name):
        for child in await parent.get_children():
            bn = await child.read_browse_name()
            if bn.Name == name:
                return child
        raise KeyError(f"OPC-UA node not found by name: {name}")

    async def read(self, nodes):
        return {n: await self.resolved[n].read_value() for n in nodes}

    async def write(self, node, value):
        await self.resolved[node].write_value(value)
```

Because resolution is by name, a rebuild that renumbers NodeIds needs **zero**
code changes — the gateway re-browses and finds `GVL_HMI.rLineSpeed` again.

## 4. CODESYS Server Configuration

For the gateway to see the tags:

1. **Add an OPC-UA Symbol Configuration** to the CODESYS project. Select exactly
   the variables the HMI needs — publishing the whole `GVL_HMI` and nothing else
   keeps the address space small and the contract explicit.
2. **Enable the OPC-UA server** in the runtime (`CODESYSControl.cfg`, or the
   communication settings). Default endpoint: `opc.tcp://<plc-ip>:4840`.
3. **Anonymous access** — for a gateway running on the same isolated machine
   network, an anonymous read/write endpoint is the simplest configuration.
   Because only the curated `GVL_HMI` symbols are exposed, the attack surface is
   just that variable list. If the network is not trusted, switch to a
   username/password or certificate policy and give the gateway credentials via
   environment variables — never hardcode them.
4. Rebuild and download; the symbols appear under `Objects` in the address space.

## 5. WebSocket JSON Protocol

A compact, text-based protocol. Every frame has a `type`. Client → gateway
frames carry intents; gateway → client frames carry data and status.

```jsonc
// gateway → client, on connect: manifest metadata + current mode
{ "type": "hello", "version": 3, "poll_hz": 3, "mode": "ONLINE", "writable": true }

// client → gateway: subscribe to the tags a screen needs
{ "type": "subscribe", "group": "overview" }

// gateway → client: full state on (re)subscribe, then diffs each poll cycle
{ "type": "state", "full": { "ConveyorRunning": true, "LineSpeed": 12.4 } }
{ "type": "state", "diff": { "LineSpeed": 12.6 } }

// client → gateway: set-and-hold a setpoint (mode "write")
{ "type": "write", "tag": "SpeedSetpoint", "value": 42.5 }

// client → gateway: momentary command (mode "pulse") — gateway does TRUE→delay→FALSE
{ "type": "pulse", "tag": "ResetFault" }

// client → gateway: dead-man command (mode "hold") — must be re-asserted
{ "type": "hold", "tag": "JogForward", "state": true }

// client → gateway: keep-alive / re-assert; also carries dead-man refresh
{ "type": "heartbeat", "ts": 1737000000 }

// gateway → client: something changed about connection/authority
{ "type": "status", "mode": "OFFLINE", "reason": "plc_unreachable" }
```

Message types:

| Type | From | Purpose |
|------|------|---------|
| `hello` | gateway | handshake: version, poll rate, mode, write authority |
| `subscribe` | client | request a tag group for the current screen |
| `state` | gateway | `full` snapshot on subscribe, `diff` every cycle |
| `write` | client | set a `write` setpoint (clamped) |
| `pulse` | client | fire a momentary `pulse` command |
| `hold` | client | assert/release a dead-man `hold` command |
| `heartbeat` | client | keep-alive + dead-man re-assert |
| `status` | gateway | mode/authority changes (ONLINE/OFFLINE, writable) |

## 6. Robustness Patterns

Industrial HMIs must fail loudly and safely, never silently show stale or fake
data as if it were live.

- **Explicit OFFLINE mode — never fake data.** When the PLC link drops, the
  gateway flips to OFFLINE and tells the browser. The UI must render an
  unmistakable OFFLINE banner and dashes/greyed values. It must NEVER keep
  showing the last numbers as though they were current. A `PlaceholderBackend`
  serves "no data yet" before the first successful connect for the same reason.

- **Exponential backoff with jitter** on reconnect — do not hammer a booting
  controller:

  ```python
  async def _connection_loop(self):
      delay = 1.0
      while True:
          try:
              await self.backend.connect()
              self.connected.set()
              await self._until_disconnected()   # returns when the link drops
          except Exception:
              pass
          self.connected.clear()
          await asyncio.sleep(delay + random.uniform(0, delay * 0.3))  # jitter
          delay = min(delay * 2, 30.0)           # cap at 30 s
  ```

- **Ping/pong for half-open sockets.** A TCP socket can look alive while the peer
  is gone ("half-open"). Send WebSocket pings on an interval and drop clients
  that miss N pongs; likewise treat a stalled OPC-UA read as a dropped link.

- **Single-writer (`cmd_owner`).** Track one write-authorized session. Reject
  `write`/`pulse`/`hold` from anyone else and tell them they are view-only via
  `hello`/`status`. Release authority on disconnect or idle timeout.

- **Dead-man in two layers.** The client re-asserts a held `hold` via
  `heartbeat`; the gateway writes the tag FALSE the moment re-asserts stop
  arriving within `ttl_ms` (e.g. 2500 ms). Covers frozen tabs and dropped
  networks that a client-side `pointerup` alone cannot. (Full rationale in
  `hmi-web-architecture` §8.)

## 7. Testing with the Mock Backend

Because the backend is swappable, the entire protocol is testable **without a
PLC**. Point `GatewayCore` at a `MockBackend` and drive it from a test client.

```python
async def test_pulse_produces_rising_edge():
    core = GatewayCore(manifest=TEST_MANIFEST)
    backend = MockBackend()
    runtime = Runtime(core, backend)
    async with connect_test_client(core) as ws:
        await ws.send_json({"type": "subscribe", "group": "manual"})
        await ws.send_json({"type": "pulse", "tag": "ResetFault"})
        # gateway writes TRUE then FALSE after pulse_ms
        assert backend.write_log == [("GVL_HMI.bResetFault", True),
                                     ("GVL_HMI.bResetFault", False)]

async def test_offline_never_fakes_data():
    core = GatewayCore(manifest=TEST_MANIFEST)
    runtime = Runtime(core, OfflineBackend(last_known={}))
    async with connect_test_client(core) as ws:
        hello = await ws.recv_json()
        assert hello["mode"] == "OFFLINE"
        assert hello["writable"] is False
```

The `MockBackend` also powers local UI development: run the gateway with
`--backend mock`, open the SPA, and the whole HMI comes alive with deterministic
values — no controller, no OPC-UA, no wiring. Reserve `PlcBackend` for
bench/commissioning against the real controller.
