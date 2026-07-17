#!/usr/bin/env node
// Parser for devdesc.xml (CODESYS DeviceDescription-1.0 schema) → markdown
// consolidated into knowledge/external/festo-private/festo-devices-extracted.md.
//
// Usage:
//   node scripts/parse-devdesc-xml.mjs
//
// Reads from: knowledge/external/_raw/**/Devices/**/*.devdesc.xml (extracted by W3)
// Writes: knowledge/external/festo-private/festo-devices-extracted.md
//
// Filters: skip 3S generic devices, skip Beckhoff/etc — keep only Festo.
// Groups by family (CMMP-AS, CMMD-AS, CESA, CECC, CEPE, EMCA, CMMT, CDPX).

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RAW_DIR = resolve(REPO_ROOT, 'knowledge/external/_raw');
const OUTPUT = resolve(REPO_ROOT, 'knowledge/external/festo-private/festo-devices-extracted.md');

async function walkXml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkXml(full)));
    } else if (entry.name.endsWith('.devdesc.xml')) {
      out.push(full);
    }
  }
  return out;
}

function familyOf(name, sourceRel) {
  if (!name) return 'Unknown';
  const upper = name.toUpperCase();
  if (upper.startsWith('CMMP-AS')) return 'CMMP-AS (CANopen servo drive — legacy)';
  if (upper.startsWith('CMMD-AS')) return 'CMMD-AS (CANopen dual-axis drive)';
  if (upper.startsWith('CMMT-AS')) return 'CMMT-AS (EtherCAT servo drive — modern)';
  if (upper.startsWith('CMMT-ST')) return 'CMMT-ST (EtherCAT stepper drive)';
  if (upper.startsWith('CMMS-AS')) return 'CMMS-AS (CANopen drive — legacy)';
  if (upper.startsWith('CMMS-ST')) return 'CMMS-ST (CANopen / SoftMotion stepper drive)';
  if (upper.startsWith('CMMO-ST')) return 'CMMO-ST (IO-Link stepper drive)';
  if (upper.startsWith('CMXH-ST')) return 'CMXH-ST (linear gantry)';
  if (upper.startsWith('EXCM')) return 'EXCM (planar surface gantry)';
  if (upper.startsWith('MTR-DCI')) return 'MTR-DCI (integrated motor — CANopen)';
  if (upper.startsWith('SFC-DC') || upper.startsWith('SFC-LAC')) return 'SFC (servo position controller)';
  if (upper.startsWith('CESA')) return 'CESA (CANopen gateway)';
  if (upper.startsWith('CECC-X')) return 'CECC-X (modular controller)';
  if (upper.startsWith('CECC-D')) return 'CECC-D (controller variant)';
  if (upper.startsWith('CECC')) return 'CECC (compact controller)';
  if (upper.startsWith('CPX-CEC')) return 'CPX-CEC (CPX-E controller)';
  if (upper.startsWith('CEPE')) return 'CEPE (Edge Platform)';
  if (upper.startsWith('EMCA')) return 'EMCA (integrated motor)';
  if (upper.startsWith('CDPX')) return 'CDPX (HMI / PAC)';
  if (upper.startsWith('FESTOETHERCATMASTER') || upper === 'ETHERCAT MASTER') return 'EtherCAT Master';
  if (upper.startsWith('SM_DRIVE_CAN_FESTO')) return 'SoftMotion driver wrapper';
  // Pneumatic / valve families
  if (/^(VTUB|VTUG|VTUS|VTUX|VTSA|VABA)/i.test(upper)) return 'Valve terminal (VTUB/VTUG/VTUX/VTSA)';
  if (/^(VAEM|VPPM|VMPA|MPAC)/i.test(upper)) return 'Valve manifold / proportional (VAEM/VPPM/VMPA/MPAC)';
  if (upper.startsWith('CPV')) return 'CPV (Compact Performance Valves)';
  if (upper.startsWith('OVEM')) return 'OVEM (vacuum generator)';
  if (upper.startsWith('SDAT')) return 'SDAT (magnetic displacement sensor)';
  if (upper.startsWith('CTEU') || upper.startsWith('CTSL')) return 'CTEU/CTSL (CPX terminal)';
  // Generic IEC / fieldbus / IO-Link device classes
  if (/^IO-LINK/i.test(upper)) return 'IO-Link generic (master / device)';
  if (/^(DIGITAL INPUT|DIGITAL OUTPUT|ENCODER|RS422|RS485|FB14|CO2|CO3|GENERAL PURPOSE|PLC-DIAGNOSIS)/i.test(upper)) {
    return 'Generic IEC / fieldbus primitive';
  }
  // CPX-E module subfamilies — classify by path (Devices/CPX/) + I/O type
  if (sourceRel && /\/Devices\/CPX\//i.test(sourceRel)) {
    if (/^(2AI|3AI|4AI|1AI|8AI)/i.test(upper) || /AO-/.test(upper) || /AI-/.test(upper)) return 'CPX-E module — Analog I/O';
    if (/^\d+DI/i.test(upper) || /^\d+NDI/i.test(upper)) return 'CPX-E module — Digital Input';
    if (/^\d+DO/i.test(upper)) return 'CPX-E module — Digital Output';
    if (/CEC-/.test(upper)) return 'CPX-E module — Controller (CEC)';
    if (/CTEL|CM-|CPX/.test(upper)) return 'CPX-E module — System / Comm';
    return 'CPX-E module — Other';
  }
  return 'Festo (uncategorized — irregular naming or third-party generic)';
}

function extractName(parsed) {
  const di = parsed?.DeviceDescription?.Device?.DeviceInfo;
  if (!di) return null;
  const n = di.Name;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object' && n['#text']) return n['#text'];
  return null;
}

function extractIdent(parsed) {
  const id = parsed?.DeviceDescription?.Device?.DeviceIdentification;
  if (!id) return {};
  return { type: id.Type, id: id.Id, version: id.Version };
}

function extractVendor(parsed) {
  const di = parsed?.DeviceDescription?.Device?.DeviceInfo;
  if (!di) return null;
  const v = di.Vendor;
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && v['#text']) return v['#text'];
  return null;
}

function extractOrderNumber(parsed) {
  const di = parsed?.DeviceDescription?.Device?.DeviceInfo;
  if (!di) return null;
  const o = di.OrderNumber;
  if (typeof o === 'string') return o;
  if (o && typeof o === 'object' && o['#text']) return o['#text'];
  return null;
}

function extractDescription(parsed) {
  const di = parsed?.DeviceDescription?.Device?.DeviceInfo;
  if (!di) return null;
  const d = di.Description;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && d['#text']) return d['#text'];
  return null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
});

const xmlFiles = await walkXml(RAW_DIR);
const devices = [];
let skipped = 0;

for (const file of xmlFiles) {
  try {
    const content = await readFile(file, 'utf8');
    const parsed = parser.parse(content);
    const name = extractName(parsed);
    if (!name) {
      skipped++;
      continue;
    }
    const vendor = extractVendor(parsed);
    // Festo-only filter — vendor field literal OR id matches Festo vendor ID 0x001D
    const ident = extractIdent(parsed);
    const isFesto =
      (vendor && /festo/i.test(vendor)) ||
      (ident.id && /^1D_/i.test(ident.id)) ||
      /festo|cmm[dpst]|cesa|cecc|cepe|emca|cdpx|cpx-cec/i.test(name);
    if (!isFesto) {
      skipped++;
      continue;
    }

    const sourceRel = relative(RAW_DIR, file).replace(/\\/g, '/');
    devices.push({
      name,
      family: familyOf(name, sourceRel),
      id: ident.id ?? '—',
      version: ident.version ?? '—',
      orderNumber: extractOrderNumber(parsed) ?? '—',
      description: extractDescription(parsed) ?? '',
      sourceRel,
    });
  } catch {
    skipped++;
    // silent — devdesc with namespace edge-cases
  }
}

// Dedupe by (name, version) — same device may appear in multiple packages
const dedup = new Map();
for (const d of devices) {
  const key = `${d.name}::${d.version}`;
  if (!dedup.has(key)) dedup.set(key, d);
}
const unique = Array.from(dedup.values()).sort((a, b) => {
  const f = a.family.localeCompare(b.family);
  return f !== 0 ? f : a.name.localeCompare(b.name);
});

// Group by family
const byFamily = new Map();
for (const d of unique) {
  if (!byFamily.has(d.family)) byFamily.set(d.family, []);
  byFamily.get(d.family).push(d);
}

const today = new Date().toISOString().slice(0, 10);

const out = [];
out.push('---');
out.push('id: festo-devices-extracted');
out.push('title: Festo Devices — Consolidated Reference (extracted from CODESYS .package)');
out.push('priority: HIGH');
out.push('use_when:');
out.push('  - user asks for product code / order number of Festo device');
out.push('  - identifying device variant (CMMP-AS-M0 vs CMMP-AS-M3, CMMT-AS-MP-S1 vs S3, etc.)');
out.push('  - configuring CODESYS device tree with correct devdesc revision');
out.push('  - cross-referencing CANopen vs EtherCAT variants of same drive family');
out.push('never_use_when:');
out.push('  - need full object dictionary (use cmmt-as-cia402-dict for CMMT-AS, festo-cpx-e-ec-coe-dictionary for CPX-E-EC)');
out.push('  - need CMMT-AS hardware spec details (use hw-cmmt-servo)');
out.push('  - need CPX-E-CEC controller details (use hw-cpx-e-cec)');
out.push('keywords: [device list, product code, order number, CMMP-AS, CMMD-AS, CMMT-AS, CMMT-ST, CESA, CECC, CEPE, EMCA, devdesc, CANopen, EtherCAT]');
out.push(`source: CODESYS .package (Festo customer-portal) → devdesc.xml — extracted ${today}`);
out.push('license: gated — Festo customer-portal package, not redistributable');
out.push(`total_devices: ${unique.length}`);
out.push('---');
out.push('');
out.push('# Festo Devices — Consolidated Reference');
out.push('');
out.push('Consolidated table of **all** Festo devices declared in the official');
out.push('CODESYS packages (CECC, CECC-X, Festo+CPX-CEC, Festo+CEPE, CMMT-AS_SoftMotion).');
out.push('For each device: Name, Vendor ID `Id` (format `1D_xxxx` = Festo `0x001D`),');
out.push('Version, OrderNumber (when declared), and relative source path.');
out.push('');
out.push(`Unique devices: ${unique.length} | Families: ${byFamily.size}`);
out.push('');
out.push('## Family glossary');
out.push('');
out.push('- **CMMP-AS**: CANopen servo drive (legacy, Festo Compact Motor Pre-amp).');
out.push('  Variants: `M0` (no FHPP), `M3` (FHPP), `V2.3`/`V2.5` (firmware revisions),');
out.push('  capacities `C2-3A`, `C5-3A`, `C5-11A-P3`, `C10-11A-P3`, `C20-11A-P3`.');
out.push('- **CMMD-AS**: CANopen dual-axis drive. Variants `1p0`, `1p1`, `1p2` (rev).');
out.push('- **CMMT-AS**: EtherCAT servo drive (current). Variants `MP-S1`, `MP-S3`');
out.push('  (Multi-Protocol, safety functions). EtherCAT only — do not confuse with CANopen.');
out.push('- **CMMT-ST**: EtherCAT stepper drive.');
out.push('- **CESA**: CANopen-AS gateway (CESA-GW-AS-CO).');
out.push('- **CECC**: Compact controller standalone — CODESYS V2 and V3.');
out.push('- **CEPE**: Edge Platform Embedded — modern industrial PC variant.');
out.push('- **EMCA**: Integrated motor with an integrated fieldbus (EtherCAT).');
out.push('');

for (const [family, items] of [...byFamily.entries()].sort()) {
  out.push(`## ${family}`);
  out.push('');
  out.push(`Devices: **${items.length}**`);
  out.push('');
  out.push('| Name | Vendor:Product Id | Version | OrderNo | Source |');
  out.push('|---|---|---|---|---|');
  for (const d of items) {
    const escName = d.name.replace(/\|/g, '\\|');
    out.push(`| \`${escName}\` | \`${d.id}\` | ${d.version} | ${d.orderNumber} | \`${d.sourceRel}\` |`);
  }
  out.push('');
}

out.push('## Filtering rules used');
out.push('');
out.push('- Vendor name match: regex `/festo/i` on DeviceInfo.Vendor');
out.push('- ID prefix match: `1D_` (Festo Vendor ID `0x001D`)');
out.push('- Name match: `cmm[dpst]|cesa|cecc|cepe|emca|cdpx|cpx-cec`');
out.push('');
out.push(`Skipped: ${skipped} non-Festo / unparseable files`);

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, out.join('\n'), 'utf8');

console.log(`✓ parsed ${xmlFiles.length} devdesc files`);
console.log(`  Festo devices kept: ${devices.length} → ${unique.length} unique`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Families: ${byFamily.size}`);
for (const [f, items] of byFamily) console.log(`    ${f}: ${items.length}`);
console.log(`→ ${OUTPUT}`);
