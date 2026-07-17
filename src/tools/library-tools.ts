/**
 * MCP Tools — PLC Function Block Library
 *
 * Consolidated tool for browsing, searching, and retrieving
 * self-contained Function Blocks from the library.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getLibraryCatalog, getBlockContent, searchLibrary } from '../knowledge/library.js';
import { successResponse, errorResponse, getErrorMessage } from '../utils/mcp-helpers.js';
import { appendNextStep } from '../utils/next-steps.js';
import { log } from '../utils/logger.js';

export function registerLibraryTools(server: McpServer): void {

  server.registerTool(
    'plc_library',
    {
      title: 'PLC Function Block Library',
      description: `Access the 38-block reusable ST library (30 Function Blocks + 8 shared DUTs) — ALWAYS check here BEFORE creating new FBs.
USE WHEN: about to create any FB, or looking for ready-made motor/valve/PID/sensor/safety logic.
Actions: 'search' (keyword match), 'list' (browse by category), 'get' (full source code).
Categories: types (8), motion (4), actuators (5), sensors (4), safety (2), system (5), utilities (10).
Contains ready-to-use blocks for motors, valves, PID, sensors, safety, and more.
DO NOT create a new FB if a similar one already exists here.`,
      inputSchema: {
        action: z.enum(['search', 'list', 'get']).describe(
          "'search': find blocks by keyword | 'list': browse all blocks (optionally by category) | 'get': retrieve full .st source code"
        ),
        query: z.string().optional().describe('Search term for action=search (e.g., "motor", "temperature", "pid")'),
        category: z.enum(['types', 'motion', 'actuators', 'sensors', 'safety', 'system', 'utilities']).optional()
          .describe('Filter by category for action=list, or category hint for action=get'),
        name: z.string().optional().describe('Block name for action=get (e.g., "FB_StandardMotor", "E_AxisState")'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ action, query, category, name }) => {
      try {
        switch (action) {
          case 'search': {
            if (!query) {
              return errorResponse('Missing "query" parameter. Provide a search term (e.g., "motor", "temperature", "pid").');
            }
            const results = searchLibrary(query);
            if (results.length === 0) {
              return successResponse(appendNextStep(
                `No blocks found for "${query}". Try broader terms (e.g., "motor" instead of "servo motor").\n` +
                'Available categories: types, motion, actuators, sensors, safety, system, utilities.\n' +
                'Use action "list" to browse all 38 blocks.',
                'plc_library:no_match',
              ));
            }
            let text = `# Search results for "${query}"\n\n`;
            for (const b of results) {
              text += `- **${b.name}** [${b.category}] — ${b.description}\n`;
            }
            text += `\n${results.length} block(s) found. Use action "get" with the block name to retrieve full source code.`;
            return successResponse(text);
          }

          case 'list': {
            const catalog = getLibraryCatalog();
            const filtered = category
              ? catalog.filter(b => b.category === category)
              : catalog;

            if (filtered.length === 0) {
              const msg = category
                ? `No blocks in category "${category}".`
                : 'Library is empty.';
              return successResponse(msg);
            }

            const grouped = new Map<string, typeof filtered>();
            for (const b of filtered) {
              const arr = grouped.get(b.category) || [];
              arr.push(b);
              grouped.set(b.category, arr);
            }

            let text = '# PLC Library Blocks\n\n';
            for (const [cat, blocks] of grouped) {
              text += `## ${cat}\n\n`;
              for (const b of blocks) {
                text += `- **${b.name}** — ${b.description}\n`;
              }
              text += '\n';
            }
            text += `Total: ${filtered.length} blocks`;
            return successResponse(text);
          }

          case 'get': {
            if (!name) {
              return errorResponse('Missing "name" parameter. Provide the block name (e.g., "FB_StandardMotor").');
            }
            const catalog = getLibraryCatalog();
            const filename = name.endsWith('.st') ? name : `${name}.st`;

            const block = category
              ? catalog.find(b => b.filename === filename && b.category === category)
              : catalog.find(b => b.filename === filename);

            if (!block) {
              return errorResponse(
                `Block not found: "${name}". Use action "list" to see available blocks, ` +
                'or action "search" to find by keyword.'
              );
            }

            const content = getBlockContent(block.category, block.filename);
            log('info', 'plc_library', `Retrieved block: ${block.name}`);
            return successResponse(appendNextStep(content, 'plc_library:get'));
          }
        }
      } catch (err) {
        return errorResponse(`Error in plc_library: ${getErrorMessage(err)}`);
      }
    }
  );
}
