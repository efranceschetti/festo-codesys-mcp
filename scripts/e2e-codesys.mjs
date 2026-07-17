#!/usr/bin/env node
/**
 * e2e-codesys — smoke test the CODESYS interop against a real installed CODESYS.
 *
 * REQUIREMENTS (set as env or pass --project):
 *   FESTO_MCP_CODESYS_PATH    — absolute path to CODESYS.exe
 *   FESTO_MCP_CODESYS_PROFILE — exact profile name (see discover-codesys-profile.mjs)
 *
 * Usage:
 *   node scripts/e2e-codesys.mjs --project=C:/path/to/some.project
 *   node scripts/e2e-codesys.mjs --status            # just verify scripting is alive
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — environment misconfigured
 *   2 — CODESYS interop returned SCRIPT_ERROR
 */

import { executeCodesysScript } from '../build/services/codesys-interop.js';
import { CHECK_STATUS_SCRIPT, OPEN_PROJECT_SCRIPT_TEMPLATE, fillTemplate }
  from '../build/utils/codesys-python-templates.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

if (!process.env.FESTO_MCP_CODESYS_PATH || !process.env.FESTO_MCP_CODESYS_PROFILE) {
  console.error('ERROR: set FESTO_MCP_CODESYS_PATH and FESTO_MCP_CODESYS_PROFILE first.');
  console.error('       Run scripts/discover-codesys-profile.mjs for hints.');
  process.exit(1);
}

console.log('═══ e2e-codesys ═══');
console.log(`CODESYS:  ${process.env.FESTO_MCP_CODESYS_PATH}`);
console.log(`Profile:  ${process.env.FESTO_MCP_CODESYS_PROFILE}`);

console.log('\n→ Step 1: CHECK_STATUS (verify scripting is alive)');
const statusRes = await executeCodesysScript(CHECK_STATUS_SCRIPT);
console.log(`  success=${statusRes.success}`);
console.log(`  output:\n${statusRes.output.split('\n').map((l) => `    ${l}`).join('\n')}`);
if (!statusRes.success) process.exit(2);

if (args.status) {
  console.log('\n✓ --status mode: stopping here.');
  process.exit(0);
}

if (!args.project) {
  console.log('\n(skip Step 2 — pass --project=<path> to exercise open_project)');
  process.exit(0);
}

console.log(`\n→ Step 2: OPEN_PROJECT ${args.project}`);
const openScript = fillTemplate(OPEN_PROJECT_SCRIPT_TEMPLATE, {
  PROJECT_FILE_PATH: args.project,
});
const openRes = await executeCodesysScript(openScript);
console.log(`  success=${openRes.success}`);
console.log(`  output:\n${openRes.output.split('\n').map((l) => `    ${l}`).join('\n')}`);
if (!openRes.success) process.exit(2);

console.log('\n✓ All checks passed.');
