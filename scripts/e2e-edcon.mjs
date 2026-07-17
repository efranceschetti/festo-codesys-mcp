#!/usr/bin/env node
/**
 * e2e-edcon — smoke test the festo-edcon wrapper against a real Festo drive.
 *
 * Reads PNU 1124 (firmware version) — a SAFE, read-only PNU. Does NOT write
 * anything to the drive.
 *
 * REQUIREMENTS:
 *   - npm run python:install
 *   - Real CMMT-AS / CMMT-ST / EMMT-ST drive reachable
 *   - --ip=<addr> and --protocol=modbus|ethernetip
 *
 * Usage:
 *   node scripts/e2e-edcon.mjs --ip=192.168.0.20 --protocol=modbus
 *   node scripts/e2e-edcon.mjs --ip=192.168.0.20 --pnu=24700 --read    # 0x607C Reference Offset (read-only)
 *
 * Exit codes:
 *   0 — PNU read returned bytes
 *   1 — env/setup misconfigured
 *   2 — wrapper returned SCRIPT_ERROR (network/protocol/drive in fault)
 */

import { runPythonWrapper } from '../build/services/python-runner.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

if (!args.ip) {
  console.error('ERROR: pass --ip=<address>');
  process.exit(1);
}

const protocol = args.protocol ?? 'modbus';
const pnu = Number(args.pnu ?? 1124);
const subindex = Number(args.subindex ?? 0);
const numElements = Number(args.numElements ?? 4);

console.log('═══ e2e-edcon ═══');
console.log(`Drive:    ${args.ip} (${protocol})`);
console.log(`PNU:      ${pnu} (0x${pnu.toString(16).toUpperCase()})`);
console.log(`Subindex: ${subindex}`);
console.log(`NumBytes: ${numElements}`);

console.log('\n→ edcon_pnu.py (operation=read — never writes anything)');
const res = await runPythonWrapper('edcon_pnu', {
  ipAddress: args.ip,
  protocol,
  operation: 'read',
  pnu,
  subindex,
  numElements,
});

if (!res.success) {
  console.error(`✗ ${res.stderr}`);
  process.exit(2);
}

const data = res.data;
console.log(`  valueHex: ${data.valueHex}`);
const bytes = Buffer.from(data.valueHex, 'hex');
if (bytes.length === 4) {
  console.log(`  asInt32LE: ${bytes.readInt32LE(0)}`);
  console.log(`  asUInt32LE: ${bytes.readUInt32LE(0)}`);
}

console.log('\n✓ Read passed.');
