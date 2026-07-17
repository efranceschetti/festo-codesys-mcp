/**
 * MCP Resources — Knowledge Base
 *
 * Exposes knowledge documents as MCP resources that Claude can read.
 *
 * Architecture (post SDK 1.29 migration):
 * - 27 static knowledge resources via `registerResource(name, uriString, ...)`.
 * - Library blocks via `ResourceTemplate('library://{category}/{name}')` — single
 *   registration enumerates all 38 blocks via `list` callback.
 * - Manuals via `ResourceTemplate('knowledge://manual/{name}')` — single
 *   registration enumerates all dynamically discovered manuals.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import chokidar from 'chokidar';
import { getNamingConventions, getAbbreviationDictionary, getStateMachinePatterns, getHungarianNotation, getEngineeringDiscipline } from '../knowledge/conventions.js';
import { getXmlProtocol, getPlcopenSchema, getPlcopenExample, getPlcopenExtensions, getGroundTruth } from '../knowledge/plcopen.js';
import { getFestoCpxReference, getFestoPtpReference, getMotionPatterns, getCdpxHmi, getVtuxTerminal, getCmmtSt, getMqttIiot } from '../knowledge/festo.js';
import { getCia402Reference } from '../knowledge/ethercat.js';
import { getEplanReference } from '../knowledge/eplan.js';
import { getHmiWebArchitecture, getOpcuaWebsocketGateway, getHmiEmbeddedDeploy } from '../knowledge/hmi.js';
import { getPlcArchitecturePatterns, getPlcAlarmPatterns } from '../knowledge/architecture.js';
import { getRecipeManager, getCodesysGotchas } from '../knowledge/codesys.js';
import { getPlcTestingTwin } from '../knowledge/testing.js';
import { listManuals, loadManual, invalidateManualsCache, MANUALS_DIR, EXTERNAL_KNOWLEDGE_DIR } from '../knowledge/manuals.js';
import { getLibraryCatalog, getBlockContent } from '../knowledge/library.js';
import { log } from '../utils/logger.js';

export async function registerResources(server: McpServer) {
  // ── 1. Static knowledge resources ────────────────────────────────────────

  const staticResources: Array<{
    name: string;
    uri: string;
    description: string;
    mimeType: string;
    loader: () => string;
  }> = [
    { name: 'naming-conventions', uri: 'knowledge://naming-conventions', description: 'PascalCase + Hungarian Notation rules. MUST READ before writing any PLC code.', mimeType: 'text/markdown', loader: getNamingConventions },
    { name: 'abbreviation-dictionary', uri: 'knowledge://abbreviation-dictionary', description: 'Standard abbreviations for PLC variables (Pwr, Vel, Pos, Acc, Err, Sts, Cmd, Rdy, etc.).', mimeType: 'text/markdown', loader: getAbbreviationDictionary },
    { name: 'hungarian-notation', uri: 'knowledge://hungarian-notation', description: 'Hungarian Notation rationale and complete reference — why PLC uses it, all prefixes.', mimeType: 'text/markdown', loader: getHungarianNotation },
    { name: 'state-machine-patterns', uri: 'knowledge://state-machine-patterns', description: 'Standard state machine patterns for Function Blocks.', mimeType: 'text/markdown', loader: getStateMachinePatterns },
    { name: 'engineering-discipline', uri: 'knowledge://engineering-discipline', description: 'Engineering discipline & quality gates (non-negotiable) — verify before deliver, no regressions, zero pending issues, secret/safety hygiene, no over-engineering, definition of done.', mimeType: 'text/markdown', loader: getEngineeringDiscipline },
    { name: 'codesys-ground-truth', uri: 'knowledge://codesys-ground-truth', description: 'CODESYS Bible — anti-hallucination, XML DNA, motion FB signatures. HIGHEST AUTHORITY.', mimeType: 'text/markdown', loader: getGroundTruth },
    { name: 'plcopen-xml-protocol', uri: 'knowledge://plcopen-xml-protocol', description: 'PLCopen XML mandatory rules for CODESYS import.', mimeType: 'text/markdown', loader: getXmlProtocol },
    { name: 'festo-cpx-reference', uri: 'knowledge://festo-cpx-reference', description: 'Festo CPX-E platform — modules, EtherCAT, CiA 402, libraries.', mimeType: 'text/markdown', loader: getFestoCpxReference },
    { name: 'festo-ptp-reference', uri: 'knowledge://festo-ptp-reference', description: 'Festo PtP Package — all 24 MC_*_Festo FB signatures, error codes, enums, properties. MANUFACTURER REFERENCE.', mimeType: 'text/markdown', loader: getFestoPtpReference },
    { name: 'festo-motion-patterns', uri: 'knowledge://festo-motion-patterns', description: 'PLCopen Motion patterns for Festo (MC_Power, MC_Home, MC_MoveAbsolute).', mimeType: 'text/markdown', loader: getMotionPatterns },
    { name: 'ethercat-cia402', uri: 'knowledge://ethercat-cia402', description: 'EtherCAT CiA 402 drive profile — state machine, controlword, statusword, PDO mapping, fault recovery.', mimeType: 'text/markdown', loader: getCia402Reference },
    { name: 'eplan-reference', uri: 'knowledge://eplan-reference', description: 'EPLAN Platform reference — .NET API, Data Portal REST API, EDZ format, integration patterns with CODESYS/Festo.', mimeType: 'text/markdown', loader: getEplanReference },
    { name: 'festo-cdpx-hmi', uri: 'knowledge://festo-cdpx-hmi', description: 'Festo CDPX operator unit — HMI + PAC, Designer Studio, TargetVisu, WebVisu, CPX-E integration.', mimeType: 'text/markdown', loader: getCdpxHmi },
    { name: 'festo-vtux-terminal', uri: 'knowledge://festo-vtux-terminal', description: 'Festo VTUX valve terminal — pneumatic valve control, CPX-AP-A/I, EtherCAT PDO mapping, vacuum.', mimeType: 'text/markdown', loader: getVtuxTerminal },
    { name: 'festo-cmmt-st', uri: 'knowledge://festo-cmmt-st', description: 'Festo CMMT-ST stepper drive + EMMT-ST motor — CiA 402, absolute encoder, PLCopen FBs, homing methods.', mimeType: 'text/markdown', loader: getCmmtSt },
    { name: 'festo-mqtt-iiot', uri: 'knowledge://festo-mqtt-iiot', description: 'CODESYS MQTT IIoT Library — MQTTClient, MQTTPublish, MQTTSubscribe FBs, JSON utilities, Topic Alias, QoS levels.', mimeType: 'text/markdown', loader: getMqttIiot },
    { name: 'plcopen-xml-schema', uri: 'knowledge://plcopen-xml-schema', description: 'Official IEC 61131-10 Ed 1.0 PLCopen XML Schema (XSD). Definitive structure reference for XML generation.', mimeType: 'application/xml', loader: getPlcopenSchema },
    { name: 'plcopen-xml-example', uri: 'knowledge://plcopen-xml-example', description: 'Official PLCopen XML example — 6 POUs (IL, ST, LD, FBD, SFC) with complete structure.', mimeType: 'application/xml', loader: getPlcopenExample },
    { name: 'plcopen-extensions', uri: 'knowledge://plcopen-extensions', description: 'PLCopen XML extension schemas — AddData, vendor extensions, event tasks.', mimeType: 'text/markdown', loader: getPlcopenExtensions },
    { name: 'hmi-web-architecture', uri: 'knowledge://hmi-web-architecture', description: 'Custom Web HMI architecture for CODESYS PLCs — three-layer SPA/WebSocket/OPC-UA design, tag manifest, PLC-hosted SPA, push data flow, write safety.', mimeType: 'text/markdown', loader: getHmiWebArchitecture },
    { name: 'opcua-websocket-gateway', uri: 'knowledge://opcua-websocket-gateway', description: 'OPC-UA↔WebSocket gateway (Python/asyncua) — layered backends, asyncio loops, dynamic address-space browse, WebSocket JSON protocol, robustness patterns.', mimeType: 'text/markdown', loader: getOpcuaWebsocketGateway },
    { name: 'hmi-embedded-deploy', uri: 'knowledge://hmi-embedded-deploy', description: 'Deploying a Web HMI to embedded panels (Chromium 69 / ARMv7) — panel constraints, CSS/JS restrictions, unified panel installer, cross-arch build, PLC web server deploy.', mimeType: 'text/markdown', loader: getHmiEmbeddedDeploy },
    { name: 'plc-architecture-patterns', uri: 'knowledge://plc-architecture-patterns', description: 'PLC program architecture — Input-Process-Output skeleton, CASE/IF/rungs rule, emergent coordination via a shared status bus (no orchestrator), mode MUX, ladder→ST bridge, why NOT GoF patterns in ST.', mimeType: 'text/markdown', loader: getPlcArchitecturePatterns },
    { name: 'plc-alarm-patterns', uri: 'knowledge://plc-alarm-patterns', description: 'PLC alarm design — STALL/TIMEOUT/DEVICE categories by time management, stuck-vs-slow heuristic, station×10+cause fault codes, boot-fault masking with an on-delay (STO during enable).', mimeType: 'text/markdown', loader: getPlcAlarmPatterns },
    { name: 'codesys-recipe-manager', uri: 'knowledge://codesys-recipe-manager', description: 'CODESYS Recipe Manager — RecipeManCommands API, ReturnValues/InfoValues codes, .txtrecipe format, and gotchas (wildcard rejected, silent path rejection, no PLCopen XML export, unreliable auto-save).', mimeType: 'text/markdown', loader: getRecipeManager },
    { name: 'codesys-gotchas', uri: 'knowledge://codesys-gotchas', description: 'CODESYS gotchas — cosmetic device-editor crash, lost edge/pulse handoff between PROGRAMs, PersistentVars list vs the attribute, chronic runtime-crash triage method.', mimeType: 'text/markdown', loader: getCodesysGotchas },
    { name: 'plc-testing-twin', uri: 'knowledge://plc-testing-twin', description: 'Testing Structured Text without hardware — the Python twin method, scan-based TON/TOF timers, discriminative physical-result tests, swept-AABB/CCD collision to derive safe motion thresholds.', mimeType: 'text/markdown', loader: getPlcTestingTwin },
  ];

  for (const r of staticResources) {
    server.registerResource(
      r.name,
      r.uri,
      { description: r.description, mimeType: r.mimeType },
      async () => ({ contents: [{ uri: r.uri, text: r.loader(), mimeType: r.mimeType }] }),
    );
  }

  // ── 2. Library catalog (single static index of 38 blocks) ────────────────

  server.registerResource(
    'library-catalog',
    'library://catalog',
    { description: 'Complete catalog of reusable PLC Function Blocks (motion, sensors, safety, utilities, etc.)', mimeType: 'text/markdown' },
    async () => {
      const catalog = getLibraryCatalog();
      let text = '# PLC Library Catalog\n\n';
      for (const b of catalog) text += `- **${b.name}** [${b.category}] — ${b.description}\n`;
      return { contents: [{ uri: 'library://catalog', mimeType: 'text/markdown', text }] };
    },
  );

  // ── 3. Library blocks (Resource Template — 1 registration, 38 instances) ─

  server.registerResource(
    'library-blocks',
    new ResourceTemplate('library://{category}/{name}', {
      list: async () => ({
        resources: getLibraryCatalog().map((b) => ({
          uri: `library://${b.category}/${b.name}`,
          name: b.name,
          description: `${b.name} — ${b.description}`,
          mimeType: 'text/plain',
        })),
      }),
      complete: {
        category: async (value) => {
          const cats = ['types', 'motion', 'actuators', 'sensors', 'safety', 'system', 'utilities'];
          return cats.filter((c) => c.startsWith(value));
        },
        name: async (value, ctx) => {
          const cat = ctx?.arguments?.category;
          return getLibraryCatalog()
            .filter((b) => (cat ? b.category === cat : true))
            .map((b) => b.name)
            .filter((n) => n.startsWith(value));
        },
      },
    }),
    { description: 'Reusable Function Blocks indexed by category and name. URI: library://{category}/{name}', mimeType: 'text/plain' },
    async (uri, variables) => {
      const category = String(variables.category);
      const rawName = String(variables.name);
      const filename = rawName.endsWith('.st') ? rawName : `${rawName}.st`;
      const text = getBlockContent(category, filename);
      return { contents: [{ uri: uri.toString(), mimeType: 'text/plain', text }] };
    },
  );

  // ── 4. Hardware manuals (Resource Template — discovered at runtime) ──────

  server.registerResource(
    'hardware-manuals',
    new ResourceTemplate('knowledge://manual/{name}', {
      list: async () => {
        const manuals = await listManuals();
        return {
          resources: manuals.map((m) => ({
            uri: `knowledge://manual/${m.filename.replace('.md', '')}`,
            name: `manual-${m.filename.replace('.md', '')}`,
            description: `User manual: ${m.name} (${m.sizeKB} KB)`,
            mimeType: 'text/markdown',
          })),
        };
      },
      complete: {
        name: async (value) => {
          const manuals = await listManuals();
          return manuals
            .map((m) => m.filename.replace('.md', ''))
            .filter((n) => n.startsWith(value));
        },
      },
    }),
    { description: 'Hardware manuals (PDF→markdown). URI: knowledge://manual/{name}', mimeType: 'text/markdown' },
    async (uri, variables) => {
      const name = String(variables.name);
      const filename = name.endsWith('.md') ? name : `${name}.md`;
      const text = await loadManual(filename);
      return { contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text }] };
    },
  );

  // ── 5. Watch knowledge dirs → emit list_changed (PENDING B2 / F3-015) ─

  // D5-002: the watcher covers BOTH manual roots: knowledge/manuals/ AND
  // knowledge/external/festo-private/. Without this, regenerating gated content
  // (errors.ini, ESI dicts, CHM) via scripts/parse-*.mjs leaves the MCP client
  // with a stale list and cachedList pointing to files that no longer exist.
  // chokidar 5 accepts an array; silently ignores absent roots.
  const watcher = chokidar.watch([MANUALS_DIR, EXTERNAL_KNOWLEDGE_DIR], {
    ignored: /(^|[/\\])\../, // dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 100 },
  });

  const onManualChange = (event: 'add' | 'unlink' | 'change', path: string): void => {
    if (!path.endsWith('.md')) return;
    // D5-004: invalidate contentCache by the absolute path (LRU key) — before
    // only the list was invalidated, and edits did not reach the MCP client.
    invalidateManualsCache(path);
    log('info', 'manuals-watcher', `${event}: ${path} → resource list_changed`);
    if (event === 'add' || event === 'unlink') {
      server.sendResourceListChanged();
    }
    // 'change' invalidates content cache but URI list is unchanged — no notification needed.
  };

  watcher.on('add', (p) => onManualChange('add', p));
  watcher.on('unlink', (p) => onManualChange('unlink', p));
  watcher.on('change', (p) => onManualChange('change', p));
  watcher.on('error', (err) => log('error', 'manuals-watcher', String(err)));

  // D5-018: graceful close — waits for the watcher to close before killing the process.
  // Trade-off: small delay on Ctrl+C, but avoids a leaked fd in rare cases
  // where the watcher has pending writes/events.
  const shutdown = async (signal: string): Promise<void> => {
    log('info', 'shutdown', `Received ${signal}, closing watcher...`);
    try { await watcher.close(); } catch {
      // Best-effort — if the watcher fails to close, we still exit.
    }
    process.exit(0);
  };
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
}
