#!/usr/bin/env node
/**
 * e2e-cpx — smoke test the festo-cpx-io wrapper chain against a real CPX-AP.
 *
 * REQUIREMENTS:
 *   - npm run python:install (uv sync) must have succeeded
 *   - Real CPX-AP system reachable on the LAN
 *   - --ip=<addr> passed (no env fallback by design — pick the right device)
 *
 * Usage:
 *   node scripts/e2e-cpx.mjs --ip=192.168.0.10
 *
 * Exit codes:
 *   0 — discover_system returned at least one module
 *   1 — env/setup misconfigured (no venv, etc.)
 *   2 — wrapper returned SCRIPT_ERROR (network/protocol issue)
 */

import { runPythonWrapper } from '../build/services/python-runner.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

if (!args.ip) {
  console.error('ERROR: pass --ip=<address> (e.g., --ip=192.168.0.10)');
  process.exit(1);
}

console.log('═══ e2e-cpx ═══');
console.log(`CPX-AP IP: ${args.ip}`);

console.log('\n→ cpx_discover.py');
const res = await runPythonWrapper('cpx_discover', { ipAddress: args.ip, timeoutMs: 2000 });
if (!res.success) {
  console.error(`✗ ${res.stderr}`);
  process.exit(2);
}

const data = res.data;
console.log(`  moduleCount: ${data.moduleCount}`);
for (const m of data.modules ?? []) {
  console.log(`    [${m.index}] ${m.name} (type ${m.typeCode})`);
}

if ((data.modules ?? []).length === 0) {
  console.error('✗ Discovery returned zero modules — check IP / connectivity.');
  process.exit(2);
}

console.log('\n✓ Discovery passed.');
