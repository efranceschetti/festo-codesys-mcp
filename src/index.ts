#!/usr/bin/env node
/**
 * FestoCodesysMCP
 *
 * Model Context Protocol server for CODESYS PLC programming.
 * Generates IEC 61131-3 Structured Text and PLCopen XML.
 *
 * Platform: Festo CPX-E (CODESYS V3.5) + Festo CDPX HMI (WebVisu)
 * Fieldbus: EtherCAT (CiA 402 drive profile)
 * Standard: PLCopen XML TC6 0200
 * Conventions: PascalCase + Hungarian Notation, English only
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerPlcCodeTools } from './tools/plc-code-tools.js';
import { registerXmlTools } from './tools/xml-tools.js';
import { registerKnowledgeTools } from './tools/knowledge-tools.js';
import { registerAssistantTools } from './tools/assistant-tools.js';
import { registerLibraryTools } from './tools/library-tools.js';
import { registerLookupTools } from './tools/lookup-tools.js';
import { registerValidationTools } from './tools/validation-tools.js';
import { registerSymbolTools } from './tools/symbol-tools.js';
import { registerResources } from './resources/knowledge-resources.js';
import { registerPrompts } from './prompts/plc-prompts.js';
import { registerCodesysIdeTools } from './tools/codesys-ide-tools.js';
import { registerCodesysIdeResources } from './resources/codesys-ide-resources.js';
import { registerCpxTools } from './tools/festo-cpx-tools.js';
import { registerEdconTools } from './tools/festo-edcon-tools.js';
import { knowledgeIndexer } from './services/knowledge-indexer.js';
import { setLoggerServer, log } from './utils/logger.js';
import { buildServerInstructions } from './server-instructions.js';

/** Single source of truth for the server version (keep in sync with package.json). */
const SERVER_VERSION = '1.0.1';

async function main() {
  // Optional tool families are gated by environment variables. Compute the
  // gates once, up front: they drive both the conditional tool registration
  // below AND the server instructions (so the instructions only mention the
  // IDE/hardware layers that are actually available in this session).
  const ideToolsEnabled = Boolean(process.env.FESTO_MCP_CODESYS_PATH);
  const hardwareToolsEnabled = process.env.FESTO_MCP_ENABLE_HARDWARE === '1';

  const server = new McpServer(
    {
      name: 'FestoCodesysMCP',
      version: SERVER_VERSION,
    },
    {
      instructions: buildServerInstructions({ ideToolsEnabled, hardwareToolsEnabled }),
    },
  );

  // Wire the structured logger to the server so subsequent log() calls
  // also emit MCP notifications/message in addition to stderr.
  setLoggerServer(server);

  // Register all tools (sync)
  registerPlcCodeTools(server);
  registerXmlTools(server);
  registerKnowledgeTools(server);
  registerAssistantTools(server);
  registerLibraryTools(server);
  registerLookupTools(server);
  registerValidationTools(server);
  registerSymbolTools(server);

  // CODESYS IDE driving — optional, gated by FESTO_MCP_CODESYS_PATH.
  // Requires a running CODESYS V3.5 instance reachable via the configured
  // .exe path + profile name. Without these vars, ide_* tools and
  // codesys://project/* resources are simply not registered.
  if (ideToolsEnabled) {
    registerCodesysIdeTools(server);
    registerCodesysIdeResources(server);
  } else {
    log('info', 'startup', 'FESTO_MCP_CODESYS_PATH not set — IDE tools/resources skipped');
  }

  // Festo hardware tools (cpx_* + edcon_*) — optional, gated by env flag.
  // These spawn Python wrappers in <repo>/python/.venv. Without the venv
  // installed (npm run python:install) they fail-fast with a clear error.
  if (hardwareToolsEnabled) {
    registerCpxTools(server);
    registerEdconTools(server);
  } else {
    log('info', 'startup', 'FESTO_MCP_ENABLE_HARDWARE != 1 — hardware tools skipped');
  }

  // Build BM25 knowledge index (fast — uses cached async index if available)
  await knowledgeIndexer.index();

  // Register resources (async — discovers manuals from disk)
  await registerResources(server);

  // Register prompts (sync)
  registerPrompts(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Exit when the client disconnects (stdin closes) — otherwise a crashed or
  // scripted client leaves an orphaned node process behind.
  process.stdin.on('end', () => process.exit(0));
  process.stdin.on('close', () => process.exit(0));
  // D5-024: the structured logger emits both stderr and notifications/message.
  log('info', 'startup', `FestoCodesysMCP v${SERVER_VERSION} server running on stdio`);
}

main().catch((error) => {
  // logger may not be wired yet if main() crashes before setLoggerServer
  console.error('Fatal error:', error);
  process.exit(1);
});
