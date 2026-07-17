/**
 * CODESYS IDE Tools (ide_*)
 *
 * Drives a running CODESYS V3.5 IDE via the Scripting Engine.
 * Counterpart to the offline code generators (create_function_block,
 * generate_plcopen_xml etc.) — these tools apply changes to a live project
 * file, the others write .st / .xml to disk.
 *
 * Adapted from codesys-mcp-toolkit (MIT 2025, Johannes Pettersson — see NOTICE.md).
 * Modernized to MCP SDK 1.29 (registerTool API + annotations).
 *
 * Gating: tools are only registered when FESTO_MCP_CODESYS_PATH is set
 * (see src/index.ts). Headless CI builds without CODESYS skip these.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validatePath } from '../utils/path-validation.js';
import {
  successResponse,
  errorResponse,
  getErrorMessage,
  structuredResponse,
  structuredErrorResponse,
  extractScriptJsonResult,
} from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';
import { executeCodesysScript } from '../services/codesys-interop.js';
import {
  fillTemplate,
  OPEN_PROJECT_SCRIPT_TEMPLATE,
  CREATE_PROJECT_SCRIPT_TEMPLATE,
  SAVE_PROJECT_SCRIPT_TEMPLATE,
  COMPILE_PROJECT_SCRIPT_TEMPLATE,
  CREATE_POU_SCRIPT_TEMPLATE,
  SET_POU_CODE_SCRIPT_TEMPLATE,
  CREATE_PROPERTY_SCRIPT_TEMPLATE,
  CREATE_METHOD_SCRIPT_TEMPLATE,
  GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE,
  GET_POU_CODE_SCRIPT_TEMPLATE,
  PATCH_POU_CODE_SCRIPT_TEMPLATE,
  GET_DEVICE_TREE_SCRIPT_TEMPLATE,
} from '../utils/codesys-python-templates.js';

const PouTypeEnum = z.enum(['Program', 'FunctionBlock', 'Function']);
const ImplementationLanguageEnum = z.enum([
  'ST', 'LD', 'FBD', 'SFC', 'IL', 'CFC',
]);

export function registerCodesysIdeTools(server: McpServer) {

  // ── ide_open_project ─────────────────────────────────────────────────
  server.registerTool(
    'ide_open_project',
    {
      title: 'Open CODESYS project (IDE)',
      description: `Opens an existing .project file in the running CODESYS IDE.
Requires FESTO_MCP_CODESYS_PATH and FESTO_MCP_CODESYS_PROFILE env vars.`,
      inputSchema: {
        filePath: z.string().min(1).describe('Absolute path to .project file'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: false, openWorldHint: true },
    },
    async ({ filePath }) => {
      const pathErr = validatePath(filePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(OPEN_PROJECT_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: filePath,
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_open_project', `success=${result.success}`);
        return result.success
          ? successResponse(result.output)
          : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_create_project ───────────────────────────────────────────────
  server.registerTool(
    'ide_create_project',
    {
      title: 'Create CODESYS project from template',
      description: `Copies a CODESYS Standard.project template to a new path and opens it.
Template path comes from FESTO_MCP_CODESYS_TEMPLATE env var (or pass templatePath explicitly).
Requires FESTO_MCP_CODESYS_PATH and FESTO_MCP_CODESYS_PROFILE.`,
      inputSchema: {
        filePath: z.string().min(1).describe('Target .project file path (created from template)'),
        templatePath: z.string().min(1).optional().describe('Source template .project file (default: $FESTO_MCP_CODESYS_TEMPLATE)'),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ filePath, templatePath }) => {
      const pathErr = validatePath(filePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      const template = templatePath ?? process.env.FESTO_MCP_CODESYS_TEMPLATE;
      if (!template) {
        return errorResponse(
          'Error: template path not configured. Pass templatePath or set FESTO_MCP_CODESYS_TEMPLATE.',
        );
      }

      try {
        const script = fillTemplate(CREATE_PROJECT_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: filePath,
          TEMPLATE_PROJECT_PATH: template,
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_create_project', `success=${result.success}`);
        return result.success
          ? successResponse(result.output)
          : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_save_project ─────────────────────────────────────────────────
  server.registerTool(
    'ide_save_project',
    {
      title: 'Save CODESYS project (IDE)',
      description: 'Persists pending changes of the open project to disk.',
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Absolute path to the open .project file'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(SAVE_PROJECT_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_compile_project ──────────────────────────────────────────────
  server.registerTool(
    'ide_compile_project',
    {
      title: 'Compile CODESYS project (IDE)',
      description: 'Runs Build on the project. Look at the Message Store after for compile errors.',
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Absolute path to the open .project file'),
      },
      annotations: { destructiveHint: false, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(COMPILE_PROJECT_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_create_pou ───────────────────────────────────────────────────
  server.registerTool(
    'ide_create_pou',
    {
      title: 'Create POU in open CODESYS project',
      description: `Creates Program / FunctionBlock / Function inside a CODESYS project.
Parent path uses '/' segments. Application root is typically "Application".
For example: parentPath="Application" creates the POU at the Application root.`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        name: z.string().min(1).describe('POU name (will be auto-corrected to PRG_/FB_/FC_ prefix if missing)'),
        type: PouTypeEnum.describe('POU kind'),
        language: ImplementationLanguageEnum.optional().default('ST').describe('Implementation language (only ST is fully supported by Script Engine)'),
        parentPath: z.string().min(1).describe('Parent container path, slash-separated (e.g., "Application" or "Application/Folder1")'),
      },
      annotations: { destructiveHint: false, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath, name, type, language, parentPath }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(CREATE_POU_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          POU_NAME: name,
          POU_TYPE_STR: type,
          IMPL_LANGUAGE_STR: language ?? 'ST',
          PARENT_PATH: parentPath,
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_set_pou_code ─────────────────────────────────────────────────
  server.registerTool(
    'ide_set_pou_code',
    {
      title: 'Set POU declaration and/or implementation code',
      description: `Sets textual_declaration and/or textual_implementation of an existing POU.
Pass either or both. Path: 'Application/POUName'.`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        pouPath: z.string().min(1).describe('Full POU path inside the project (e.g., "Application/FB_MyBlock")'),
        declarationCode: z.string().optional().describe('Full VAR_INPUT/VAR_OUTPUT/VAR header block (everything before code body)'),
        implementationCode: z.string().optional().describe('Body of the POU (code after END_VAR, before END_FUNCTION_BLOCK)'),
      },
      annotations: { destructiveHint: true, idempotentHint: true, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath, pouPath, declarationCode, implementationCode }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      if (!declarationCode && !implementationCode) {
        return errorResponse('Error: at least one of declarationCode or implementationCode must be provided.');
      }

      try {
        const script = fillTemplate(SET_POU_CODE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          POU_FULL_PATH: pouPath,
          DECLARATION_CONTENT: declarationCode ?? '',
          IMPLEMENTATION_CONTENT: implementationCode ?? '',
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_create_property ──────────────────────────────────────────────
  server.registerTool(
    'ide_create_property',
    {
      title: 'Create Property in FunctionBlock',
      description: 'Creates a Property (getter+setter pair) on an existing FB.',
      inputSchema: {
        projectFilePath: z.string().min(1),
        parentPouPath: z.string().min(1).describe('Path to the parent FB (e.g., "Application/FB_MyBlock")'),
        propertyName: z.string().min(1),
        propertyType: z.string().min(1).describe('Return type of the property (e.g., "BOOL", "INT", "REAL")'),
      },
      annotations: { destructiveHint: false, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath, parentPouPath, propertyName, propertyType }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(CREATE_PROPERTY_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          PARENT_POU_FULL_PATH: parentPouPath,
          PROPERTY_NAME: propertyName,
          PROPERTY_TYPE: propertyType,
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_create_method ────────────────────────────────────────────────
  server.registerTool(
    'ide_create_method',
    {
      title: 'Create Method in FunctionBlock',
      description: 'Creates a Method on an existing FB.',
      inputSchema: {
        projectFilePath: z.string().min(1),
        parentPouPath: z.string().min(1).describe('Path to the parent FB'),
        methodName: z.string().min(1),
        returnType: z.string().optional().default('').describe('Return type (empty string = no return)'),
      },
      annotations: { destructiveHint: false, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath, parentPouPath, methodName, returnType }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(CREATE_METHOD_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          PARENT_POU_FULL_PATH: parentPouPath,
          METHOD_NAME: methodName,
          RETURN_TYPE: returnType ?? '',
        });
        const result = await executeCodesysScript(script);
        return result.success ? successResponse(result.output) : errorResponse(result.output);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_browse_project_tree ──────────────────────────────────────────
  server.registerTool(
    'ide_browse_project_tree',
    {
      title: 'Browse CODESYS project tree (devices, applications, POUs)',
      description: `Returns the hierarchical structure of the open project as JSON.
Walks devices, applications, POUs, GVLs, folders. Read-only. Use this to discover
what's in a project before reading or modifying specific POUs.`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        maxDepth: z.number().int().min(1).max(20).optional().default(15).describe('Recursion depth limit (default 15)'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ projectFilePath, maxDepth }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(GET_PROJECT_STRUCTURE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_browse_project_tree', `success=${result.success}`);
        if (!result.success) return errorResponse(result.output);

        const json = extractScriptJsonResult<{
          projectPath: string;
          projectName: string;
          tree: Record<string, unknown>;
        }>(result.output);

        if (!json) {
          // Fallback: structured payload not found, return text-only response
          return successResponse(result.output);
        }

        // Note: maxDepth is enforced server-side in IronPython, not by re-walking here.
        // Future: pass {{MAX_DEPTH}} placeholder into template if dynamic depth required.
        void maxDepth;

        return structuredResponse(result.output, json);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_get_pou_code ─────────────────────────────────────────────────
  server.registerTool(
    'ide_get_pou_code',
    {
      title: 'Read POU code (declaration + implementation) as JSON',
      description: `Returns the Structured Text declaration and implementation of a POU.
Read-only. Use before ide_patch_pou_code or ide_set_pou_code to know current state.
POU path uses '/' segments (e.g., "Application/PRG_Main" or "Application/Folder/FB_X").`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        pouPath: z.string().min(1).describe('Full POU path inside the project'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ projectFilePath, pouPath }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(GET_POU_CODE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          POU_FULL_PATH: pouPath,
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_get_pou_code', `success=${result.success} pou=${pouPath}`);
        if (!result.success) return errorResponse(result.output);

        const json = extractScriptJsonResult<{
          projectPath: string;
          pouPath: string;
          name: string;
          type: string;
          declaration: string;
          implementation: string;
          hasDeclaration: boolean;
          hasImplementation: boolean;
        }>(result.output);

        if (!json) return successResponse(result.output);
        return structuredResponse(result.output, json);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_patch_pou_code ───────────────────────────────────────────────
  server.registerTool(
    'ide_patch_pou_code',
    {
      title: 'Apply find/replace patch to POU code (atomic, single match required)',
      description: `Replaces an exact text snippet inside a POU's declaration or implementation.
The findText MUST occur exactly ONCE in the target section — if 0 matches OR ≥2 matches,
the operation fails (forces caller to provide unique context, like Claude Code's Edit tool).
Use ide_get_pou_code first to know current text. Safer than ide_set_pou_code for surgical edits.`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        pouPath: z.string().min(1).describe('Full POU path (e.g., "Application/FB_MyBlock")'),
        section: z.enum(['declaration', 'implementation']).default('implementation').describe('Which section to patch'),
        findText: z.string().min(1).describe('Exact text to find (must occur EXACTLY ONCE in the section)'),
        replaceText: z.string().describe('Text to replace the match with (can be empty string for deletion)'),
        save: z.boolean().optional().default(true).describe('Save project after successful patch (default true)'),
      },
      annotations: { destructiveHint: true, idempotentHint: false, readOnlyHint: false, openWorldHint: true },
    },
    async ({ projectFilePath, pouPath, section, findText, replaceText, save }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(PATCH_POU_CODE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          POU_FULL_PATH: pouPath,
          SECTION: section ?? 'implementation',
          FIND_TEXT: findText,
          REPLACE_TEXT: replaceText,
          SAVE_AFTER: (save ?? true) ? 'true' : 'false',
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_patch_pou_code', `success=${result.success} pou=${pouPath} section=${section}`);

        const json = extractScriptJsonResult<{
          matched: boolean;
          matchCount: number;
          savedProject: boolean;
          reason?: string;
          pouPath?: string;
          section?: string;
          previousLength?: number;
          newLength?: number;
        }>(result.output);

        if (!result.success) {
          if (json) return structuredErrorResponse(result.output, json);
          return errorResponse(result.output);
        }

        if (!json) return successResponse(result.output);
        return structuredResponse(result.output, json);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  // ── ide_get_device_tree ──────────────────────────────────────────────
  server.registerTool(
    'ide_get_device_tree',
    {
      title: 'Read CODESYS device tree (hardware + IO config) as JSON',
      description: `Returns the device hierarchy (PLC + I/O modules + bus configuration).
Read-only. Crucial for Festo CPX-E setups where opening Device Editor in the GUI
can crash; this script-based reading is robust. Set includeParameters=true to also
include device parameter values (Symbol Configuration / IO mapping context).`,
      inputSchema: {
        projectFilePath: z.string().min(1).describe('Path to .project file'),
        includeParameters: z.boolean().optional().default(false).describe('Include device parameter values (heavier; default false)'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: true },
    },
    async ({ projectFilePath, includeParameters }) => {
      const pathErr = validatePath(projectFilePath);
      if (pathErr) return errorResponse(`Error: ${pathErr}`);

      try {
        const script = fillTemplate(GET_DEVICE_TREE_SCRIPT_TEMPLATE, {
          PROJECT_FILE_PATH: projectFilePath,
          INCLUDE_PARAMETERS: (includeParameters ?? false) ? 'true' : 'false',
        });
        const result = await executeCodesysScript(script);
        log('info', 'ide_get_device_tree', `success=${result.success}`);
        if (!result.success) return errorResponse(result.output);

        const json = extractScriptJsonResult<{
          projectPath: string;
          projectName: string;
          deviceCount: number;
          includeParameters: boolean;
          devices: Array<Record<string, unknown>>;
        }>(result.output);

        if (!json) return successResponse(result.output);
        return structuredResponse(result.output, json);
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    },
  );

  log('info', 'startup', 'CODESYS IDE tools registered (12 ide_* tools)');
}
