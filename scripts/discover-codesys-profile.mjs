#!/usr/bin/env node
/**
 * discover-codesys-profile — enumerate CODESYS profiles installed locally.
 *
 * The codesys-interop layer requires the *exact* profile name as shown in
 * CODESYS UI's `File > Preferences > Profile`. This script crawls the standard
 * location and prints the valid names so you can copy the right one into
 * `FESTO_MCP_CODESYS_PROFILE`.
 *
 * Usage:
 *   node scripts/discover-codesys-profile.mjs
 *
 * Windows-specific. On Linux/Mac, profiles live in different paths and are
 * out of scope for the codesys-mcp-toolkit-style integration anyway.
 */

import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROFILE_ROOTS = [
  `${process.env.ProgramData}\\CODESYS\\CODESYS`,
  `${process.env.LOCALAPPDATA}\\3S\\CODESYS\\CODESYS`,
];

const CODESYS_INSTALL_ROOT = 'C:\\Program Files';

async function listInstalledCodesysVersions() {
  const versions = [];
  try {
    const entries = await readdir(CODESYS_INSTALL_ROOT);
    for (const entry of entries) {
      if (!entry.startsWith('CODESYS')) continue;
      const full = join(CODESYS_INSTALL_ROOT, entry);
      const s = await stat(full);
      if (!s.isDirectory()) continue;
      const exe = join(full, 'CODESYS', 'Common', 'CODESYS.exe');
      versions.push({ folder: entry, exe, exeExists: existsSync(exe) });
    }
  } catch (err) {
    console.error(`Cannot read ${CODESYS_INSTALL_ROOT}: ${err.message}`);
  }
  return versions;
}

async function listProfiles() {
  const profiles = new Map();
  for (const root of PROFILE_ROOTS) {
    if (!existsSync(root)) continue;
    try {
      const entries = await readdir(root);
      for (const entry of entries) {
        const full = join(root, entry);
        const s = await stat(full);
        if (s.isDirectory()) profiles.set(entry, full);
      }
    } catch (err) {
      console.error(`Cannot read ${root}: ${err.message}`);
    }
  }
  return [...profiles.entries()];
}

console.log('═══ CODESYS installed versions ═══');
const versions = await listInstalledCodesysVersions();
if (versions.length === 0) {
  console.log('  (none found)');
} else {
  for (const v of versions) {
    console.log(`  ${v.folder}`);
    console.log(`    CODESYS.exe: ${v.exe} ${v.exeExists ? '✓' : '✗ (missing)'}`);
  }
}

console.log('\n═══ Profiles discovered ═══');
const profiles = await listProfiles();
if (profiles.length === 0) {
  console.log('  (none — has CODESYS been launched at least once?)');
  console.log('  Open CODESYS UI once to create a profile, then re-run this script.');
} else {
  for (const [name, path] of profiles) {
    console.log(`  "${name}"`);
    console.log(`    → ${path}`);
  }
}

console.log('\n═══ Setup snippet ═══');
if (versions.length > 0 && profiles.length > 0) {
  const firstVersion = versions.find((v) => v.exeExists) ?? versions[0];
  const firstProfile = profiles[0][0];
  console.log('PowerShell:');
  console.log(`  $env:FESTO_MCP_CODESYS_PATH = "${firstVersion.exe}"`);
  console.log(`  $env:FESTO_MCP_CODESYS_PROFILE = "${firstProfile}"`);
} else {
  console.log('  (incomplete — install CODESYS and launch it once first)');
}
