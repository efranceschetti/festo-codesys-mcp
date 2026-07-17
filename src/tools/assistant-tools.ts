/**
 * Assistant Tools — Analysis and debugging tools for PLC development.
 *
 * Tools: debug_plc_code, review_st_code, explain_error_code
 * (Manual tools moved to knowledge-tools.ts as part of plc_knowledge consolidation)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HUNGARIAN_PREFIXES } from '../knowledge/conventions.js';
import { getCia402Reference } from '../knowledge/ethercat.js';
import { getFestoPtpReference } from '../knowledge/festo.js';
import { searchManuals } from '../knowledge/manuals.js';
import { getGroundTruth } from '../knowledge/plcopen.js';
import { TOPIC_MAP } from './knowledge-tools.js';
import { successResponse, errorResponse, getErrorMessage, stripComments, structuredResponse } from '../utils/mcp-helpers.js';
import { appendNextStep } from '../utils/next-steps.js';
import { log } from '../utils/logger.js';

export function registerAssistantTools(server: McpServer) {

  // ── debug_plc_code ────────────────────────────────────────────────────
  server.registerTool(
    'debug_plc_code',
    {
      title: 'Debug PLC Code (static analysis)',
      description: `Static analysis for Structured Text bugs — run BEFORE deploying to a real PLC.
USE WHEN: ST code is convention-clean and you need runtime-bug analysis, or the user reports misbehavior.
Catches: WHILE/REPEAT loops (watchdog risk), missing error handling (bErr/nErrId),
CiA 402 safety gaps (MC_Power without MC_Stop), state machine issues (missing IDLE/ERROR),
Hungarian notation violations, REAL-INT type mismatches, unused timer outputs.
Returns categorized Critical/Warning/Suggestion results.`,
      inputSchema: {
        code: z.string().describe('The Structured Text code to analyze'),
        context: z.string().optional().describe('Additional context (e.g., "EtherCAT axis", "conveyor control")'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ code, context }) => {
      try {
        const stripped = stripComments(code);

        const issues: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        if (stripped.includes('CASE') && !stripped.includes('ELSE')) {
          warnings.push('CASE without ELSE — unhandled states may cause undefined behavior');
        }

        if (stripped.includes('MC_Power') && !stripped.includes('MC_Stop')) {
          warnings.push('MC_Power used without MC_Stop — add emergency stop handling');
        }

        if (stripped.includes('MC_MoveAbsolute') && !stripped.includes('MC_Home')) {
          warnings.push('MC_MoveAbsolute without MC_Home — axis may not be referenced');
        }

        if (stripped.includes('WHILE') || stripped.includes('REPEAT')) {
          issues.push('WHILE/REPEAT loops detected — risk of watchdog timeout in cyclic tasks');
        }

        if (!stripped.includes('bErr') && !stripped.includes('nErrId') && !stripped.includes('Error')) {
          warnings.push('No error handling variables found — add bErr/nErrId outputs');
        }

        if (stripped.includes(':=') && stripped.includes('REAL') && stripped.includes('INT')) {
          warnings.push('Possible type mismatch — verify REAL/INT conversions use explicit casts');
        }

        if (stripped.includes('TON') && !stripped.includes('.Q')) {
          warnings.push('TON timer declared but .Q output not read — potential timing issue');
        }

        const statePattern = /nState\s*:=\s*(\d+)/g;
        const stateValues = new Set<string>();
        let match;
        while ((match = statePattern.exec(stripped)) !== null) {
          stateValues.add(match[1]);
        }
        if (stateValues.size > 0 && !stateValues.has('99')) {
          suggestions.push('State machine uses nState but no error state (99) — consider adding');
        }
        if (stateValues.size > 0 && !stateValues.has('0')) {
          issues.push('State machine has no IDLE state (0) — machine may not initialize correctly');
        }

        const varPattern = /(\w+)\s*:\s*(BOOL|INT|DINT|SINT|LINT|UINT|UDINT|USINT|ULINT|REAL|LREAL|TIME|LTIME|STRING|WSTRING|WORD|DWORD|LWORD|BYTE)\b/g;
        while ((match = varPattern.exec(stripped)) !== null) {
          const varName = match[1];
          const typeName = match[2];
          const expectedPrefix = HUNGARIAN_PREFIXES[typeName];
          if (expectedPrefix && !varName.startsWith(expectedPrefix)) {
            warnings.push(`Variable "${varName}" (${typeName}) should start with "${expectedPrefix}" prefix`);
          }
        }

        const sections: string[] = ['# PLC Code Analysis\n'];

        if (context) {
          sections.push(`**Context:** ${context}\n`);
        }

        if (issues.length > 0) {
          sections.push(`## Critical Issues (${issues.length})\n${issues.map(i => `- ${i}`).join('\n')}\n`);
        }
        if (warnings.length > 0) {
          sections.push(`## Warnings (${warnings.length})\n${warnings.map(w => `- ${w}`).join('\n')}\n`);
        }
        if (suggestions.length > 0) {
          sections.push(`## Suggestions (${suggestions.length})\n${suggestions.map(s => `- ${s}`).join('\n')}\n`);
        }

        const clean = issues.length === 0 && warnings.length === 0 && suggestions.length === 0;
        if (clean) {
          sections.push('## No issues detected\n\nCode passes basic static analysis checks.');
        }

        sections.push('\n---\n_Analysis powered by FestoCodesysMCP. For deeper review, use `review_st_code`._');

        const debugText = sections.join('\n');
        return successResponse(clean ? appendNextStep(debugText, 'debug_plc_code:clean') : debugText);
      } catch (err) {
        return errorResponse(`Error analyzing code: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── review_st_code ────────────────────────────────────────────────────
  server.registerTool(
    'review_st_code',
    {
      title: 'Review ST Code (naming conventions)',
      description: `Validate ST code against naming conventions — returns ONLY violations, not reference dumps.
USE WHEN: immediately after writing or editing any ST code.
Checks: Hungarian notation (b=BOOL, n=INT, r=REAL, t=TIME, fb=FB instance),
POU prefixes (FB_, PRG_, FC_), FB interface pattern (bEnable/bDone/bBusy/bErr/nErrId),
state machine (0=IDLE, 90=DONE, 99=ERROR), snake_case detection.
Includes quick-reference table when violations are found.`,
      inputSchema: {
        code: z.string().describe('The Structured Text code to review'),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ code }) => {
      try {
        const stripped = stripComments(code);

        const violations: string[] = [];
        const info: string[] = [];
        let match: RegExpExecArray | null;

        const varPattern = /(\w+)\s*:\s*(BOOL|INT|DINT|SINT|LINT|UINT|UDINT|USINT|ULINT|REAL|LREAL|TIME|LTIME|STRING|WSTRING|WORD|DWORD|LWORD|BYTE)\b/g;
        while ((match = varPattern.exec(stripped)) !== null) {
          const varName = match[1];
          const typeName = match[2];
          const expected = HUNGARIAN_PREFIXES[typeName];
          if (expected && !varName.startsWith(expected)) {
            violations.push(`- \`${varName} : ${typeName}\` → prefix should be \`${expected}\` (e.g. \`${expected}${varName.charAt(0).toUpperCase()}${varName.slice(1)}\`)`);
          }
        }

        const fbPattern = /(\w+)\s*:\s*(FB_\w+|MC_\w+|TON|TOF|R_TRIG|F_TRIG|CTU|CTD)\b/g;
        while ((match = fbPattern.exec(stripped)) !== null) {
          if (!match[1].startsWith('fb') && !match[1].startsWith('FB')) {
            violations.push(`- \`${match[1]} : ${match[2]}\` → FB instances must start with \`fb\` prefix`);
          }
        }

        const pouMatch = stripped.match(/FUNCTION_BLOCK\s+(\w+)/);
        if (pouMatch && !pouMatch[1].startsWith('FB_')) {
          violations.push(`- Function Block \`${pouMatch[1]}\` → name must start with \`FB_\``);
        }
        const prgMatch = stripped.match(/PROGRAM\s+(\w+)/);
        if (prgMatch && !prgMatch[1].startsWith('PRG_')) {
          violations.push(`- Program \`${prgMatch[1]}\` → name must start with \`PRG_\``);
        }

        if (stripped.includes('VAR_INPUT') && stripped.includes('VAR_OUTPUT')) {
          if (!stripped.includes('bEnable') && !stripped.includes('bExecute')) {
            info.push('- No `bEnable`/`bExecute` input — consider adding standard trigger');
          }
          if (!stripped.includes('bDone') && !stripped.includes('bBusy')) {
            info.push('- No `bDone`/`bBusy` outputs — consider adding standard status');
          }
          if (!stripped.includes('bErr') && !stripped.includes('nErrId')) {
            info.push('- No `bErr`/`nErrId` outputs — consider adding error handling');
          }
        }

        const stateVals = new Set<string>();
        const stateRe = /nState\s*:=\s*(\d+)/g;
        while ((match = stateRe.exec(stripped)) !== null) stateVals.add(match[1]);
        if (stateVals.size > 0) {
          if (!stateVals.has('0')) violations.push('- State machine missing IDLE state (nState := 0)');
          if (!stateVals.has('99')) info.push('- State machine missing ERROR state (nState := 99)');
          if (!stateVals.has('90')) info.push('- State machine missing DONE state (nState := 90)');
        }

        const snakePattern = /\b(\w+_\w+)\s*:/g;
        while ((match = snakePattern.exec(stripped)) !== null) {
          const name = match[1];
          if (!/^(FB_|PRG_|E_|ST_|GVL_|FC_|I_|VAR_)/.test(name)) {
            violations.push(`- \`${name}\` uses snake_case — must be PascalCase`);
          }
        }

        const sections: string[] = ['# ST Code Review\n'];

        if (violations.length > 0) {
          sections.push(`## Violations (${violations.length})\n${[...new Set(violations)].join('\n')}\n`);
        }
        if (info.length > 0) {
          sections.push(`## Recommendations\n${info.join('\n')}\n`);
        }
        if (violations.length === 0 && info.length === 0) {
          sections.push('## Code follows FestoCodesysMCP conventions\n');
        }

        if (violations.length > 0) {
          sections.push(
            '## Quick Reference\n' +
            '| Prefix | Type |\n' +
            '|--------|------|\n' +
            '| `b` | BOOL |\n' +
            '| `n` | INT/DINT |\n' +
            '| `r` | REAL |\n' +
            '| `t` | TIME |\n' +
            '| `fb` | FB instance |\n' +
            '| `s` | STRING |\n' +
            '| `w` | WORD |\n' +
            '| `u` | UINT/UDINT |\n' +
            '| `dw` | DWORD |\n' +
            '| `by` | BYTE |\n'
          );
        }

        sections.push('\n_For full conventions, use plc_knowledge topic "conventions"._');

        const reviewText = sections.join('\n');
        return successResponse(
          violations.length === 0 ? appendNextStep(reviewText, 'review_st_code:clean') : reviewText,
        );
      } catch (err) {
        return errorResponse(`Error reviewing code: ${getErrorMessage(err)}`);
      }
    }
  );

  // ── explain_error_code ────────────────────────────────────────────────
  server.registerTool(
    'explain_error_code',
    {
      title: 'Explain Error Code',
      description: `Decode Festo/CODESYS/EtherCAT error codes using ALL embedded references.
USE WHEN: any Festo/CODESYS/EtherCAT error code appears — 0x…, 16#…, drive fault, AL status. Never guess meanings.
Accepts hex (0x7500), IEC (16#8011), or decimal formats.
Searches: CiA 402, Festo PtP, CODESYS ground truth, ALL embedded topics, and all device manuals.
If not found locally, search the web — then save useful findings to knowledge/manuals/ for future use.`,
      inputSchema: {
        errorCode: z.string().min(1).describe('The error code (e.g., "0x7500", "16#8011", "MC error 4357")'),
        source: z.enum(['codesys', 'festo', 'ethercat', 'plcopen', 'unknown']).optional()
          .describe('Error source platform'),
      },
      outputSchema: {
        errorCode: z.string(),
        source: z.string(),
        found: z.boolean(),
        snippetCount: z.number(),
        sourcesMatched: z.array(z.string()),
        manualHits: z.boolean(),
        message: z.string(),
      },
      annotations: { destructiveHint: false, idempotentHint: true, readOnlyHint: true, openWorldHint: false },
    },
    async ({ errorCode, source }) => {
      try {
        log('info', 'explain_error_code', `Decoding: ${errorCode} (source: ${source || 'auto'})`);

        const codeLower = errorCode.toLowerCase();
        const codeHex = errorCode.replace('0x', '').replace('16#', '');
        // Addresses P3 (Phase 4 audit): filter empty strings out of searchTerms
        // — if codeHex was '' it resulted in searchTerms including '',
        // and lineLower.includes('') === true ⇒ would return ALL manuals
        // (OOM / context window blowup via prompt injection).
        const searchTerms = [codeLower, `0x${codeHex}`, `16#${codeHex}`, codeHex].filter(t => t.length > 0);
        if (searchTerms.length === 0) {
          return errorResponse('Error code resolved to empty search terms.');
        }

        function findContext(docContent: string, docName: string): string[] {
          const lines = docContent.split('\n');
          const snippets: string[] = [];
          const usedLines = new Set<number>();

          for (let i = 0; i < lines.length; i++) {
            const lineLower = lines[i].toLowerCase();
            if (searchTerms.some(term => lineLower.includes(term))) {
              if (usedLines.has(i)) continue;
              const start = Math.max(0, i - 10);
              const end = Math.min(lines.length, i + 11);
              for (let j = start; j < end; j++) usedLines.add(j);
              snippets.push(`### ${docName} (line ${i + 1})\n\`\`\`\n${lines.slice(start, end).join('\n')}\n\`\`\``);
            }
          }
          return snippets;
        }

        // Search priority docs first; track which sources matched
        const allSnippets: string[] = [];
        const sourcesMatched: string[] = [];

        const cia402Snippets = findContext(getCia402Reference(), 'CiA 402 Reference');
        if (cia402Snippets.length > 0) sourcesMatched.push('cia402');
        allSnippets.push(...cia402Snippets);

        const ptpSnippets = findContext(getFestoPtpReference(), 'Festo PtP Reference');
        if (ptpSnippets.length > 0) sourcesMatched.push('festo-ptp');
        allSnippets.push(...ptpSnippets);

        const groundTruthSnippets = findContext(getGroundTruth(), 'CODESYS Ground Truth');
        if (groundTruthSnippets.length > 0) sourcesMatched.push('codesys-ground-truth');
        allSnippets.push(...groundTruthSnippets);

        // Search remaining topics (skip already-searched ones)
        const skipTopics = new Set(['ethercat-cia402', 'festo-ptp', 'ground-truth']);
        for (const [topicName, fn] of Object.entries(TOPIC_MAP)) {
          if (skipTopics.has(topicName)) continue;
          const snippets = findContext(fn(), `Topic: ${topicName}`);
          if (snippets.length > 0) {
            sourcesMatched.push(topicName);
            allSnippets.push(...snippets.slice(0, 3));
          }
        }

        // Search manuals
        const manualResults = await searchManuals(errorCode);
        const hasManualHits = manualResults.totalMatches > 0;
        if (hasManualHits) sourcesMatched.push('manuals');

        const contextSection = allSnippets.length > 0
          ? allSnippets.join('\n\n')
          : '_Error code not found in any embedded reference._';

        const notFoundTip = allSnippets.length === 0 && !hasManualHits
          ? '\n_No matches in any embedded reference. Search the web for this error code, ' +
            'then save useful findings as a .md file in knowledge/manuals/ for future use._\n'
          : '';

        const response = `# Error Code: ${errorCode}
## Source: ${source || 'auto-detect'}

## Relevant Reference Context
${contextSection}
${hasManualHits ? `\n## Manual Search Results\n${manualResults.markdown}` : ''}
${notFoundTip}
## Provide:
1. What this error means
2. Root cause
3. Recovery procedure in ST code
4. Prevention strategy`;

        const totalSnippetCount = allSnippets.length + manualResults.totalMatches;
        const found = totalSnippetCount > 0;
        const responseText = found ? appendNextStep(response, 'explain_error_code:found') : response;
        return structuredResponse(responseText, {
          errorCode,
          source: source || 'auto-detect',
          found,
          snippetCount: totalSnippetCount,
          sourcesMatched,
          manualHits: hasManualHits,
          message: found
            ? `Found ${totalSnippetCount} snippet(s) across ${sourcesMatched.length} source(s)`
            : 'Error code not found in any embedded reference',
        });
      } catch (err) {
        return errorResponse(`Error explaining error code: ${getErrorMessage(err)}`);
      }
    }
  );
}
