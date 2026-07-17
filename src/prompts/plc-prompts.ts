/**
 * MCP Prompts — Guided workflows for PLC programming.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer) {

  server.registerPrompt(
    'new-function-block',
    {
      title: 'New Function Block',
      description: 'Guide for creating a new IEC 61131-3 Function Block for Festo CPX.',
      argsSchema: {
        name: z.string().describe('FB name (e.g., FB_ConveyorCtrl)'),
        purpose: z.string().describe('What this FB does'),
      },
    },
    async ({ name, purpose }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Create a CODESYS Function Block "${name}" for Festo CPX-E.

Purpose: ${purpose}

MANDATORY RULES:
1. PascalCase + Hungarian Notation (b=BOOL, n=INT, r=REAL, t=TIME, fb=FB)
2. Standard abbreviations: Pwr, Vel, Pos, Acc, Dec, Err, Sts, Cmd, Rdy, etc.
3. English only — variable names AND comments
4. Standard interface: bEnable, bExecute → bDone, bBusy, bErr, nErrId
5. State machine: nState (0=IDLE, 10-80=work, 90=DONE, 99=ERROR)
6. Generate .st file AND PLCopen XML

IMPORTANT: First use plc_library search to check if a similar block already exists.
Then use plc_knowledge topic 'conventions' for naming rules.
Use the create_function_block tool. Read abbreviation-dictionary resource first.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'new-motion-fb',
    {
      title: 'New Motion FB (EtherCAT/CiA 402)',
      description: 'Guide for creating a Motion Control FB with PLCopen FBs for EtherCAT servo axes.',
      argsSchema: {
        name: z.string().describe('FB name (e.g., FB_PickPlace)'),
        axes: z.string().describe('Axes description (e.g., "2 axes: X linear, Z vertical")'),
      },
    },
    async ({ name, axes }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Create a Motion Control Function Block "${name}" for Festo CPX-E with EtherCAT (CiA 402).

Axes: ${axes}

Use PLCopen Motion FBs: MC_Power, MC_Home, MC_MoveAbsolute, MC_MoveVelocity, MC_Stop.
Use abbreviations: Pwr, Home, Vel, Pos, Acc, Dec, Rdy, etc.
Follow state machine: PowerOn → Home → Ready → Motion → Done.
All servo communication is EtherCAT with CiA 402 drive profile.

IMPORTANT: Use plc_knowledge topic 'festo-ptp' for EXACT Festo FB signatures — never guess names.
Read the festo-motion-patterns resource for motion sequence patterns.
Read the ethercat-cia402 resource for controlword/statusword reference.
Use the create_function_block tool.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'audit-plcopen-xml',
    {
      title: 'Audit PLCopen XML',
      description: 'Audit a PLCopen XML file for CODESYS import compatibility.',
      argsSchema: {
        filePath: z.string().describe('Path to XML file'),
      },
    },
    async ({ filePath }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Audit PLCopen XML file: "${filePath}"

Use validate_plcopen_xml tool, then review against the codesys-ground-truth resource.

Check: namespace, coordinateInfo, zero-ID, footer, type declarations, escaping.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'new-project',
    {
      title: 'New CODESYS Project (EtherCAT)',
      description: 'Guide for creating a complete CODESYS project structure with EtherCAT.',
      argsSchema: {
        name: z.string().describe('Project name'),
        description: z.string().describe('What this project does'),
      },
    },
    async ({ name, description }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete CODESYS project for Festo CPX-E with EtherCAT.

Project: ${name}
Description: ${description}

Steps:
1. Use create_project_structure with includeExamples=true
2. Create required data types (E_ enums, ST_ structs)
3. Create GVLs (GVL_Sys, GVL_IO, GVL_HMI)
4. Create Function Blocks
5. Create PRG_Main
6. Generate unified PLCopen XML

All fieldbus communication uses EtherCAT (CiA 402).
Follow ALL naming conventions — PascalCase + Hungarian + standard abbreviations.`,
        },
      }],
    })
  );

  // ── NEW PROMPTS ───────────────────────────────────────────────────────

  server.registerPrompt(
    'debug-axis',
    {
      title: 'Debug EtherCAT Axis',
      description: 'Guided EtherCAT axis debugging — CiA 402 state analysis, error recovery.',
      argsSchema: {
        axisName: z.string().describe('Axis variable name (e.g., "stAxis1" or "Axis X")'),
        symptom: z.string().describe('What is happening (e.g., "axis not enabling", "position error", "fault after homing")'),
      },
    },
    async ({ axisName, symptom }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Debug EtherCAT servo axis: ${axisName}

Symptom: ${symptom}

Debugging procedure:
1. Read the ethercat-cia402 resource for state machine reference
2. Check the current CiA 402 state via Statusword (0x6041)
3. Identify which state transition failed
4. Check controlword (0x6040) — is the correct command being sent?
5. Check for active faults and error codes
6. Provide recovery code in Structured Text

IMPORTANT: Use plc_knowledge search with error codes FIRST before searching the web.
Use the explain_error_code tool if specific error codes are present.
Use the debug_plc_code tool to analyze any relevant code.
Reference: EtherCAT CiA 402 drive profile, Festo CMMT documentation.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'new-ethercat-slave',
    {
      title: 'New EtherCAT Slave',
      description: 'Template for adding a new EtherCAT slave device to a CODESYS project.',
      argsSchema: {
        deviceType: z.string().describe('Device type (e.g., "servo drive", "IO module", "stepper controller")'),
        manufacturer: z.string().describe('Manufacturer (e.g., "Festo CMMT", "Beckhoff EL7211", "Delta ASDA-A3")'),
      },
    },
    async ({ deviceType, manufacturer }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Add a new EtherCAT slave device to the CODESYS project.

Device: ${manufacturer} (${deviceType})

Steps:
1. Import ESI (EtherCAT Slave Information) XML file in CODESYS
2. Add slave device under EtherCAT master in device tree
3. Configure PDO mapping (RxPDO for commands, TxPDO for feedback)
4. Create device data types: ST_{DeviceName}Rx, ST_{DeviceName}Tx
5. Create GVL entry for the device
6. If servo/motion: configure CiA 402 profile
7. Create FB for device control

Read the ethercat-cia402 resource for CiA 402 profile details.
Use Hungarian Notation: w=WORD, dw=DWORD, n=INT, r=REAL.
For servo drives, use PLCopen Motion FBs (MC_Power, MC_Home, etc).

Provide:
- ST_ struct definitions for PDO data
- GVL variable declarations
- FB_ control function block
- PLCopen XML for all components`,
        },
      }],
    })
  );

  server.registerPrompt(
    'audit-naming',
    {
      title: 'Audit Naming Conventions',
      description: 'Audit existing ST code for naming convention violations.',
      argsSchema: {
        code: z.string().describe('The Structured Text code to audit'),
      },
    },
    async ({ code }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Audit the following Structured Text code for naming convention compliance.

\`\`\`iecst
${code}
\`\`\`

IMPORTANT: Use plc_knowledge topic 'conventions' to load the full naming reference first.
Check against FestoCodesysMCP conventions:
1. Read the naming-conventions and abbreviation-dictionary resources
2. Read the hungarian-notation resource for prefix rules
3. Verify ALL variables use correct Hungarian prefixes
4. Verify POU names use correct type prefixes (FB_, PRG_, FC_, E_, ST_)
5. Verify standard abbreviations are used consistently
6. Check for non-English variable names or comments

Use the review_st_code tool for detailed analysis.
Provide a corrected version of the code with all violations fixed.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'decode-error-code',
    {
      title: 'Decode Festo / CODESYS / EtherCAT Error Code',
      description: 'Look up an error code in the embedded references and produce a recovery plan.',
      argsSchema: {
        code: z.string().describe('Error code (e.g., "0x6041", "P-0-4014", "F.001", "E03")'),
        source: z.string().optional().describe('Where the code came from (e.g., "CMMT-AS HMI", "CODESYS log", "axis statusword")'),
      },
    },
    async ({ code, source }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Decode error code: \`${code}\`${source ? ` (source: ${source})` : ''}.

Procedure:
1. FIRST call \`plc_lookup\` with action='error_code' and the code — fast database hit if known.
2. If not found, call \`explain_error_code\` for embedded-reference deep search.
3. If still inconclusive, call \`plc_knowledge\` action='search' with the code as query.
4. NEVER guess from training data — always cite the embedded source.

Then produce a recovery plan in this shape:
- **What it means** (one line, plain language).
- **Likely root cause** (top 1-2, ranked by frequency).
- **Recovery steps** in Structured Text using the existing Festo / PLCopen FBs (e.g., MC_Reset, MC_Power, MC_Home).
- **Prevention** (config / safety / interlock note).

Constraints:
- Only Festo / CODESYS / EtherCAT context — do not refer to Siemens, Allen-Bradley, or other vendors.
- Use Hungarian Notation in any code emitted.
- If the code does not match any embedded reference, say so explicitly — do NOT fabricate a meaning.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'validate-st-batch',
    {
      title: 'Validate ST Files in Batch',
      description: 'Run naming + structure + PLCopen XML validation across an entire directory of .st files.',
      argsSchema: {
        directory: z.string().describe('Directory containing .st files (e.g., "C:/Projects/MyMachine/PLC/POUs")'),
        focus: z.string().optional().describe('Optional focus area (e.g., "naming", "state-machines", "FB interface")'),
      },
    },
    async ({ directory, focus }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Validate every .st file under: \`${directory}\`${focus ? ` — focus: ${focus}` : ''}.

Pipeline (run in order; do not skip steps):
1. \`plc_validate\` action='batch' — fast batch validator over the entire directory. Captures naming (Hungarian + PascalCase + abbreviations), POU prefix conventions, and FB interface checks.
2. For every file flagged, call \`plc_validate\` action='review' for the full ST review (state machine completeness, error transitions, hardcoded addresses).
3. \`generate_plcopen_xml\` — convert the directory to PLCopen XML.
4. \`validate_plcopen_xml\` — schema check + ground-truth rules (namespace, coordinateInfo, zero-IDs, footer).

Then produce a markdown checklist that pairs each finding with:
- File and line.
- Severity (\`error\` blocks import; \`warning\` is style).
- Suggested fix (concrete, ready to apply).

End with a one-line verdict: \`READY FOR IMPORT\` if zero errors and all schemas valid, \`BLOCKED\` otherwise.

Important:
- Do NOT modify files. Only report.
- Do NOT recommend bypass / "quick fix" against conventions — every error must be addressed at the source.
- Reference \`plc_knowledge\` topic 'conventions' for the canonical rule set.`,
        },
      }],
    })
  );

  server.registerPrompt(
    'convert-manual',
    {
      title: 'Convert Manual to Markdown',
      description: 'Guide for converting a PDF manual section to .md format for the knowledge base.',
      argsSchema: {
        manualName: z.string().describe('Name of the manual being converted'),
        section: z.string().describe('Which section to focus on (e.g., "error codes", "parameter tables", "wiring diagram")'),
      },
    },
    async ({ manualName, section }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Convert the following manual section to Markdown format for the FestoCodesysMCP knowledge base.

Manual: ${manualName}
Section: ${section}

Conversion guidelines:
1. Use standard Markdown headings (# ## ###) matching the original chapter structure
2. Convert parameter tables to Markdown table format
3. Use \`iecst\` fenced code blocks for any ST code examples
4. Preserve all numerical values, units, and ranges exactly as in the original
5. Include register/object addresses in their original format (0x6040, P-0-4014, etc.)
6. Add descriptive notes where the original has figures/diagrams that can't be converted

Save the result as a .md file in the knowledge/manuals/ directory.
Use the naming convention: lowercase-with-hyphens.md
Example: \`festo-cmmt-error-codes.md\`

After saving, restart the FestoCodesysMCP server to discover the new manual.
It will then be available via plc_knowledge actions 'search' and 'list_manuals'.`,
        },
      }],
    })
  );
}
