/**
 * Knowledge Base Tools
 * Consolidated tool for retrieving PLC programming knowledge.
 * Single tool with actions: topic, search, list_manuals, read_manual.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNamingConventions, getAbbreviationDictionary, getStateMachinePatterns, getHungarianNotation, getEngineeringDiscipline } from '../knowledge/conventions.js';
import { getXmlProtocol, getPlcopenSchema, getPlcopenExample, getPlcopenExtensions, getGroundTruth } from '../knowledge/plcopen.js';
import { getFestoCpxReference, getFestoPtpReference, getMotionPatterns, getCdpxHmi, getVtuxTerminal, getCmmtSt, getMqttIiot } from '../knowledge/festo.js';
import { getCia402Reference } from '../knowledge/ethercat.js';
import { getEplanReference } from '../knowledge/eplan.js';
import { getHmiWebArchitecture, getOpcuaWebsocketGateway, getHmiEmbeddedDeploy } from '../knowledge/hmi.js';
import { getPlcArchitecturePatterns, getPlcAlarmPatterns } from '../knowledge/architecture.js';
import { getRecipeManager, getCodesysGotchas } from '../knowledge/codesys.js';
import { getPlcTestingTwin } from '../knowledge/testing.js';
import { loadManual, listManuals, searchManuals } from '../knowledge/manuals.js';
import { successResponse, errorResponse, getErrorMessage } from '../utils/mcp-helpers.js';
import { appendNextStep } from '../utils/next-steps.js';
import { knowledgeIndexer } from '../services/knowledge-indexer.js';
import { log } from '../utils/logger.js';

/**
 * Canonical list of topic keys, frozen as a tuple so it can drive both
 * the `TOPIC_MAP` dispatch and the zod enum exposed in the input schema.
 * Adding a topic = update this list AND the map below — the type system
 * will refuse to compile if you forget one side.
 */
const TOPIC_KEYS = [
  'conventions',
  'abbreviations',
  'hungarian-notation',
  'state-machines',
  'ground-truth',
  'xml-rules',
  'plcopen-schema',
  'plcopen-example',
  'plcopen-extensions',
  'festo-cpx',
  'festo-ptp',
  'festo-cdpx-hmi',
  'festo-vtux-terminal',
  'festo-cmmt-st',
  'motion-patterns',
  'ethercat-cia402',
  'festo-mqtt',
  'eplan',
  'hmi-web-architecture',
  'opcua-websocket-gateway',
  'hmi-embedded-deploy',
  'plc-architecture-patterns',
  'plc-alarm-patterns',
  'codesys-recipe-manager',
  'codesys-gotchas',
  'plc-testing-twin',
  'engineering-discipline',
] as const;

type TopicKey = typeof TOPIC_KEYS[number];

const TOPIC_MAP: Record<TopicKey, () => string> = {
  'conventions': getNamingConventions,
  'abbreviations': getAbbreviationDictionary,
  'hungarian-notation': getHungarianNotation,
  'state-machines': getStateMachinePatterns,
  'ground-truth': getGroundTruth,
  'xml-rules': getXmlProtocol,
  'plcopen-schema': getPlcopenSchema,
  'plcopen-example': getPlcopenExample,
  'plcopen-extensions': getPlcopenExtensions,
  'festo-cpx': getFestoCpxReference,
  'festo-ptp': getFestoPtpReference,
  'festo-cdpx-hmi': getCdpxHmi,
  'festo-vtux-terminal': getVtuxTerminal,
  'festo-cmmt-st': getCmmtSt,
  'motion-patterns': getMotionPatterns,
  'ethercat-cia402': getCia402Reference,
  'festo-mqtt': getMqttIiot,
  'eplan': getEplanReference,
  'hmi-web-architecture': getHmiWebArchitecture,
  'opcua-websocket-gateway': getOpcuaWebsocketGateway,
  'hmi-embedded-deploy': getHmiEmbeddedDeploy,
  'plc-architecture-patterns': getPlcArchitecturePatterns,
  'plc-alarm-patterns': getPlcAlarmPatterns,
  'codesys-recipe-manager': getRecipeManager,
  'codesys-gotchas': getCodesysGotchas,
  'plc-testing-twin': getPlcTestingTwin,
  'engineering-discipline': getEngineeringDiscipline,
};

export { TOPIC_MAP, TOPIC_KEYS };

/**
 * Search across ALL knowledge sources using BM25 ranked search.
 * Falls back to substring search for manual results.
 */
async function searchAllKnowledge(query: string): Promise<string> {
  // BM25 ranked search across all indexed knowledge (async I/O lazy-loads index)
  const bm25Results = await knowledgeIndexer.search(query, 10);

  // Also search manuals (legacy substring for backward compat)
  const manualResults = await searchManuals(query);
  const hasManualHits = manualResults.totalMatches > 0;

  if (bm25Results.length === 0 && !hasManualHits) {
    return `No matches found for "${query}" across indexed knowledge and manuals.\n\n` +
      'TIP: If you need this information, search the web and consider saving the results ' +
      'as a .md file in knowledge/manuals/ so it will be available locally next time.';
  }

  const sections: string[] = [`# Search Results for "${query}" (BM25 ranked)\n`];

  if (bm25Results.length > 0) {
    sections.push(`## Top ${bm25Results.length} Results\n`);
    for (const result of bm25Results) {
      sections.push(
        `### ${result.source} (score: ${result.score.toFixed(2)})`,
        `\`\`\`\n${result.snippet}\n\`\`\`\n`,
      );
    }
  }

  if (hasManualHits) {
    sections.push('## Manual Search Results\n', manualResults.markdown);
  }

  return sections.join('\n');
}

export function registerKnowledgeTools(server: McpServer) {

  server.registerTool(
    'plc_knowledge',
    {
      title: 'PLC Knowledge Base',
      description: `Load embedded PLC reference documentation — the source of truth for Festo/CODESYS/EtherCAT/PLCopen.
USE WHEN: before writing ANY Structured Text (load 'conventions' + 'abbreviations' first), before generating XML (load 'ground-truth'), before motion code (load 'festo-ptp' + 'ethercat-cia402'), or whenever a technical fact is needed — never answer from memory.
Actions: 'topic' (load by name), 'search' (BM25 full-text across ALL topics + manuals), 'list_manuals', 'read_manual'.
Topics (27): conventions, abbreviations, hungarian-notation, state-machines, engineering-discipline, ground-truth, xml-rules,
  plcopen-schema, plcopen-example, plcopen-extensions, festo-cpx, festo-ptp, festo-cdpx-hmi,
  festo-vtux-terminal, festo-cmmt-st, festo-mqtt, motion-patterns, ethercat-cia402, eplan,
  hmi-web-architecture, opcua-websocket-gateway, hmi-embedded-deploy, plc-architecture-patterns,
  plc-alarm-patterns, codesys-recipe-manager, codesys-gotchas, plc-testing-twin.
Covers: Festo CPX/PtP/CMMT/MQTT, CODESYS, EtherCAT CiA 402, PLCopen XML, naming conventions, engineering discipline & quality gates, custom Web HMI + OPC-UA gateway, PLC program architecture + alarm design, recipes, testing without hardware, CODESYS gotchas, 19 device manuals.
If information is not found here, you may search the web — but suggest saving useful findings to knowledge/manuals/ for future use.`,
      inputSchema: {
        action: z.enum(['topic', 'search', 'list_manuals', 'read_manual']).describe(
          "'topic': load reference by name | 'search': full-text across ALL topics + manuals | 'list_manuals': show available manuals | 'read_manual': load complete manual"
        ),
        topic: z.enum([...TOPIC_KEYS, 'all']).optional().describe('Topic name for action=topic. Use "all" to load every topic concatenated.'),
        query: z.string().optional().describe('Search term for action=search (e.g., "P-0-4014", "homing method", "CMMT fault")'),
        filename: z.string().optional().describe('Manual filename for action=read_manual (e.g., "festo-cpx-e-system")'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ action, topic, query, filename }) => {
      try {
        switch (action) {
          case 'topic': {
            if (!topic) {
              const available = Object.keys(TOPIC_MAP).join(', ');
              return errorResponse(`Missing "topic" parameter. Available topics: ${available}`);
            }

            if (topic === 'all') {
              const all = Object.entries(TOPIC_MAP)
                .map(([k, fn]) => `${'═'.repeat(50)}\n${k.toUpperCase()}\n${'═'.repeat(50)}\n${fn()}`)
                .join('\n\n');
              return successResponse(all);
            }

            const fn = TOPIC_MAP[topic];
            if (!fn) {
              const available = Object.keys(TOPIC_MAP).join(', ');
              return errorResponse(
                `Topic not found: "${topic}". Available: ${available}, all.\n` +
                'Try action "search" with keywords if you\'re not sure of the exact topic name.'
              );
            }
            log('info', 'plc_knowledge', `Loaded topic: ${topic}`);
            // Only 'conventions' and 'ground-truth' have hints registered;
            // any other topic key returns the content unchanged.
            return successResponse(appendNextStep(fn(), `plc_knowledge:${topic}`));
          }

          case 'search': {
            if (!query) {
              return errorResponse('Missing "query" parameter. Provide a search term (e.g., "homing method", "CMMT fault").');
            }
            log('info', 'plc_knowledge', `Searching all knowledge for: ${query}`);
            const results = await searchAllKnowledge(query);
            return successResponse(results);
          }

          case 'list_manuals': {
            const manuals = await listManuals();
            if (manuals.length === 0) {
              return successResponse('No manuals found. Add .md files to knowledge/manuals/ directory.');
            }
            const header = `# Available Manuals (${manuals.length})\n\n| Manual | File | Size |\n| ------ | ---- | ---- |`;
            const rows = manuals.map((m) => `| ${m.name} | \`${m.filename}\` | ${m.sizeKB} KB |`);
            const footer = '\n\nUse action "search" to search across all knowledge, or action "read_manual" to load a specific manual.';
            return successResponse(`${header}\n${rows.join('\n')}${footer}`);
          }

          case 'read_manual': {
            if (!filename) {
              const manuals = await listManuals();
              const available = manuals.map(m => m.filename).join(', ');
              return errorResponse(`Missing "filename" parameter. Available manuals: ${available || 'none'}`);
            }
            const content = await loadManual(filename);
            return successResponse(content);
          }
        }
      } catch (err) {
        return errorResponse(`Error in plc_knowledge: ${getErrorMessage(err)}`);
      }
    }
  );
}
