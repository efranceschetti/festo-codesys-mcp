/**
 * CODESYS IDE Resources
 *
 * 3 read-only resources backed by the Scripting Engine:
 *   - codesys://project/status                          → CHECK_STATUS_SCRIPT
 *   - codesys://project/{projectPath}/structure         → GET_PROJECT_STRUCTURE
 *   - codesys://project/{projectPath}/pou/{pouPath}/code → GET_POU_CODE
 *
 * Gated by FESTO_MCP_CODESYS_PATH (same as ide_* tools).
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeCodesysScript } from '../services/codesys-interop.js';
import {
  fillTemplate,
  CHECK_STATUS_SCRIPT,
  GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
  GET_POU_CODE_SCRIPT_TEMPLATE,
} from '../utils/codesys-python-templates.js';
import { log } from '../utils/logger.js';

export function registerCodesysIdeResources(server: McpServer) {
  // ── codesys://project/status (static) ────────────────────────────────
  server.registerResource(
    'codesys-project-status',
    'codesys://project/status',
    {
      description: 'Status of the running CODESYS IDE (scripting OK, primary project open, project name/path).',
      mimeType: 'text/plain',
    },
    async () => {
      try {
        const result = await executeCodesysScript(CHECK_STATUS_SCRIPT);
        return {
          contents: [{
            uri: 'codesys://project/status',
            text: result.output,
            mimeType: 'text/plain',
          }],
        };
      } catch (err) {
        return {
          contents: [{
            uri: 'codesys://project/status',
            text: `SCRIPT_ERROR: ${err instanceof Error ? err.message : String(err)}`,
            mimeType: 'text/plain',
          }],
        };
      }
    },
  );

  // ── codesys://project/{projectPath}/structure (template) ─────────────
  server.registerResource(
    'codesys-project-structure',
    new ResourceTemplate('codesys://project/{+projectPath}/structure', { list: undefined }),
    {
      description: 'Recursive structure tree of the open CODESYS project (devices, applications, POUs, folders).',
      mimeType: 'text/plain',
    },
    async (uri, { projectPath }) => {
      const targetPath = decodeURIComponent(String(projectPath));
      try {
        const script = fillTemplate(GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: targetPath,
        });
        const result = await executeCodesysScript(script);
        return {
          contents: [{
            uri: uri.href,
            text: result.output,
            mimeType: 'text/plain',
          }],
        };
      } catch (err) {
        return {
          contents: [{
            uri: uri.href,
            text: `SCRIPT_ERROR: ${err instanceof Error ? err.message : String(err)}`,
            mimeType: 'text/plain',
          }],
        };
      }
    },
  );

  // ── codesys://project/{projectPath}/pou/{pouPath}/code (template) ────
  server.registerResource(
    'codesys-project-pou-code',
    new ResourceTemplate('codesys://project/{+projectPath}/pou/{+pouPath}/code', { list: undefined }),
    {
      description: 'Declaration and implementation code of a specific POU inside a CODESYS project.',
      mimeType: 'text/plain',
    },
    async (uri, { projectPath, pouPath }) => {
      const proj = decodeURIComponent(String(projectPath));
      const pou = decodeURIComponent(String(pouPath));
      try {
        const script = fillTemplate(GET_POU_CODE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: proj,
          POU_FULL_PATH: pou,
        });
        const result = await executeCodesysScript(script);
        return {
          contents: [{
            uri: uri.href,
            text: result.output,
            mimeType: 'text/plain',
          }],
        };
      } catch (err) {
        return {
          contents: [{
            uri: uri.href,
            text: `SCRIPT_ERROR: ${err instanceof Error ? err.message : String(err)}`,
            mimeType: 'text/plain',
          }],
        };
      }
    },
  );

  log('info', 'startup', 'CODESYS IDE resources registered (3 codesys://project/* resources)');
}
