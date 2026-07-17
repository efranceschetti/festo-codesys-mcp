/**
 * Symbol Tools — code intelligence (symbol navigation) for Structured Text.
 *
 * Tool: st_symbols
 * Actions:
 *  - outline    : project map (top-level by default; kindFilter includes vars/members)
 *  - definition : resolve a name (case-insensitive) to its definition(s)
 *
 * Stage 1: definitions via parseStFile, cross-file. Position (line) arrives in Stage 2.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildProjectIndex,
  getDefinitions,
  findReferences,
  TOP_LEVEL_KINDS,
  type SymbolDefinition,
} from '../services/st-index.js';
import { pathExists } from '../utils/fs-scan.js';
import { validatePath } from '../utils/path-validation.js';
import { errorResponse, structuredResponse, getErrorMessage } from '../utils/mcp-helpers.js';
import { log } from '../utils/logger.js';

function toRow(s: SymbolDefinition) {
  return {
    name: s.name,
    kind: s.kind,
    type: s.type,
    container: s.container,
    filePath: s.filePath,
    line: s.position?.line,
    comment: s.comment,
  };
}

export function registerSymbolTools(server: McpServer) {

  server.registerTool(
    'st_symbols',
    {
      title: 'ST Symbols (cross-file outline & definition)',
      description: `Index a directory of .st files and navigate symbols across files — dialect-aware (CODESYS V3.5), comment/string-safe, better than grep.
USE WHEN: you need to navigate an existing .st project — outline symbols or resolve a definition across files (better than grep).
Actions:
  'outline'    — project map. Returns top-level symbols (functionBlock/program/function/enum/struct/gvl) by default;
                 pass kindFilter to include vars/members (e.g. ["inputVar","globalVar"]).
  'definition' — resolve a name (case-insensitive) to its definition(s); requires 'name'.
Notes: sourceDir must be inside the workspace unless FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1.
Line numbers and find-references arrive in a later version (this version returns file + container).`,
      inputSchema: {
        action: z.enum(['outline', 'definition']).describe("'outline' = project map | 'definition' = resolve a name"),
        sourceDir: z.string().min(1).describe('Directory containing .st files (recursive scan)'),
        name: z.string().optional().describe('Symbol name (required for action=definition)'),
        kindFilter: z.array(z.string()).optional().describe('Filter by SymbolKind (e.g. ["functionBlock","globalVar"])'),
      },
      outputSchema: {
        action: z.string(),
        sourceDir: z.string(),
        fileCount: z.number(),
        symbolCount: z.number(),
        symbols: z.array(z.object({
          name: z.string(),
          kind: z.string(),
          type: z.string().optional(),
          container: z.string().optional(),
          filePath: z.string(),
          line: z.number().optional(),
          comment: z.string().optional(),
        })),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ action, sourceDir, name, kindFilter }) => {
      try {
        const pathErr = validatePath(sourceDir);
        if (pathErr) return errorResponse(`Error: ${pathErr}`);
        if (!(await pathExists(sourceDir))) return errorResponse(`Error: Directory not found: ${sourceDir}`);

        const index = await buildProjectIndex(sourceDir);
        const filterSet = kindFilter && kindFilter.length > 0 ? new Set(kindFilter) : null;

        if (action === 'definition') {
          if (!name) return errorResponse('Missing "name" — required for action=definition');
          let defs = getDefinitions(index, name);
          if (filterSet) defs = defs.filter(d => filterSet.has(d.kind));
          const rows = defs.map(toRow);
          const text = defs.length > 0
            ? `Found ${defs.length} definition(s) for "${name}":\n` +
              defs.map(d => `  ${d.kind}  ${d.name}${d.container ? ` (in ${d.container})` : ''}  — ${d.filePath}`).join('\n')
            : `No definition found for "${name}" in ${index.files.length} file(s).`;
          log('info', 'st_symbols', `definition ${name}: ${defs.length} hit(s)`);
          return structuredResponse(text, {
            action, sourceDir, fileCount: index.files.length, symbolCount: rows.length, symbols: rows,
          });
        }

        // outline
        const all = index.files.flatMap(f => f.symbols);
        const selected = filterSet
          ? all.filter(s => filterSet.has(s.kind))
          : all.filter(s => TOP_LEVEL_KINDS.has(s.kind));
        const rows = selected.map(toRow);
        const text = [
          `ST outline — ${index.files.length} file(s), ${rows.length} symbol(s)${filterSet ? '' : ' (top-level)'}:`,
          ...rows.map(r => `  ${r.kind}  ${r.name}${r.container ? ` (in ${r.container})` : ''}`),
        ].join('\n');
        log('info', 'st_symbols', `outline: ${rows.length} symbols from ${index.files.length} files`);
        return structuredResponse(text, {
          action, sourceDir, fileCount: index.files.length, symbolCount: rows.length, symbols: rows,
        });
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    }
  );

  server.registerTool(
    'st_find_references',
    {
      title: 'ST Find References (where-used)',
      description: `Find all references (usages) of an ST identifier across a directory of .st files — token-aware and comment/string-safe (unlike grep: ignores comments, strings, typed literals, and substring matches).
USE WHEN: you need every usage of an ST identifier across files before renaming or refactoring.
Each reference carries file, line/column, the line text, the containing POU, whether it is the declaration site, and disambiguation hints (e.g. resolves E_X.MEMBER member access via the qualifier).
Note: sourceDir must be inside the workspace unless FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1.`,
      inputSchema: {
        sourceDir: z.string().min(1).describe('Directory containing .st files (recursive scan)'),
        name: z.string().min(1).describe('Identifier to search for (whole token)'),
        includeDeclaration: z.boolean().optional().describe('Include the declaration site (default false)'),
        caseInsensitive: z.boolean().optional().describe('IEC is case-insensitive (default true)'),
      },
      outputSchema: {
        name: z.string(),
        sourceDir: z.string(),
        referenceCount: z.number(),
        definitions: z.array(z.object({
          name: z.string(),
          kind: z.string(),
          container: z.string().optional(),
          filePath: z.string(),
          line: z.number().optional(),
        })),
        references: z.array(z.object({
          filePath: z.string(),
          line: z.number(),
          column: z.number(),
          lineText: z.string(),
          containerPou: z.string().optional(),
          isDefinitionSite: z.boolean(),
          disambiguation: z.array(z.string()),
        })),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ sourceDir, name, includeDeclaration, caseInsensitive }) => {
      try {
        const pathErr = validatePath(sourceDir);
        if (pathErr) return errorResponse(`Error: ${pathErr}`);
        if (!(await pathExists(sourceDir))) return errorResponse(`Error: Directory not found: ${sourceDir}`);

        const index = await buildProjectIndex(sourceDir);
        const refs = findReferences(index, name, { includeDeclaration, caseInsensitive });
        const defs = getDefinitions(index, name).map(d => ({
          name: d.name, kind: d.kind, container: d.container, filePath: d.filePath, line: d.position?.line,
        }));

        const refRows = refs.map(r => ({
          filePath: r.filePath,
          line: r.position.line,
          column: r.position.column,
          lineText: r.lineText,
          containerPou: r.containerPou,
          isDefinitionSite: r.isDefinitionSite,
          disambiguation: r.disambiguation,
        }));

        const text = refs.length > 0
          ? [`${refs.length} reference(s) to "${name}":`,
            ...refRows.slice(0, 60).map(r => `  ${r.filePath.split(/[\\/]/).pop()}:${r.line}  ${r.containerPou ? `[${r.containerPou}] ` : ''}${r.lineText}`)].join('\n')
          : `No references to "${name}" found in ${index.files.length} file(s).`;

        log('info', 'st_find_references', `${name}: ${refs.length} ref(s) in ${index.files.length} files`);
        return structuredResponse(text, {
          name, sourceDir, referenceCount: refRows.length, definitions: defs, references: refRows,
        });
      } catch (err) {
        return errorResponse(`Error: ${getErrorMessage(err)}`);
      }
    }
  );
}
