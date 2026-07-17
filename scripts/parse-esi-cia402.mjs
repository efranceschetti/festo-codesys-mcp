#!/usr/bin/env node
// Parser for EtherCAT Slave Information (ESI) XML CiA 402 → markdown.
// Specific to Festo CMMT-AS drives (and variants MP-S1, MP-S3, CMMT-ST,
// EMCA-EC). Extracts the full object dictionary, groups by CiA range, and
// generates structured markdown for use by plc_knowledge.
//
// Usage:
//   node scripts/parse-esi-cia402.mjs
//
// Reads from: knowledge/external/_raw/**/Festo-CMMT-AS*-CiA402-*.xml
// Writes: knowledge/external/festo-private/<device>-cia402-dict.md (1 per device)

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RAW_DIR = resolve(REPO_ROOT, 'knowledge/external/_raw');
const OUT_DIR = resolve(REPO_ROOT, 'knowledge/external/festo-private');

const ESI_PATTERNS = [
  /Festo-CMMT-AS.*-CiA402-.*\.xml$/i,
  /Festo-CMMT-ST.*-CiA402-.*\.xml$/i,
  /Festo-EMCA-EC-CiA402.*\.xml$/i,
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (ESI_PATTERNS.some((re) => re.test(entry.name))) out.push(full);
  }
  return out;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
});

function asArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  if (maybe == null) return [];
  return [maybe];
}

function decodeIndex(esiIndex) {
  // ESI uses the "#xNNNN" hex format
  if (typeof esiIndex !== 'string') return null;
  const m = esiIndex.match(/^#x([0-9A-Fa-f]+)$/);
  return m ? parseInt(m[1], 16) : null;
}

function classifyByIndex(idx) {
  if (idx >= 0x1000 && idx <= 0x1FFF) return 'communication';
  if (idx >= 0x2000 && idx <= 0x5FFF) return 'manufacturer';
  if (idx >= 0x6000 && idx <= 0x67FF) return 'cia402_profile';
  if (idx >= 0x6800 && idx <= 0x9FFF) return 'cia402_extended';
  if (idx >= 0xA000 && idx <= 0xFFFF) return 'reserved';
  return 'other';
}

const RANGE_LABELS = {
  communication: 'Communication area (0x1000–0x1FFF) — CoE / CANopen mandatory',
  manufacturer: 'Manufacturer-specific area (0x2000–0x5FFF) — Festo CMMT-AS internal',
  cia402_profile: 'CiA 402 drive profile (0x6000–0x67FF) — controlword, statusword, modes',
  cia402_extended: 'CiA 402 extended (0x6800–0x9FFF) — gear ratio, factor groups, etc.',
  reserved: 'Reserved (0xA000–0xFFFF) — vendor-defined or unused',
  other: 'Other / out-of-range',
};

function extractDevice(parsed, sourcePath) {
  // EtherCATInfo > Descriptions > Devices > Device (might be array)
  const devNode = parsed?.EtherCATInfo?.Descriptions?.Devices?.Device;
  const devices = asArray(devNode);

  return devices.map((d) => {
    const typeNode = d?.Type;
    const typeText = typeof typeNode === 'string' ? typeNode : typeNode?.['#text'] ?? '';
    const productCode = typeNode?.['@_ProductCode'] ?? '—';
    const revision = typeNode?.['@_RevisionNo'] ?? '—';
    const profileNo = d?.Profile?.ProfileNo;
    const objects = asArray(d?.Profile?.Dictionary?.Objects?.Object);
    return { typeText, productCode, revision, profileNo, objects, sourcePath };
  });
}

function objectName(o) {
  const n = o?.Name;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object' && n['#text']) return n['#text'];
  return '—';
}

function objectAccess(o) {
  const f = o?.Flags?.Access;
  if (typeof f === 'string') return f;
  if (f && typeof f === 'object' && f['#text']) return f['#text'];
  return '—';
}

function objectPdo(o) {
  const f = o?.Flags?.PdoMapping;
  if (typeof f === 'string') return f;
  return '—';
}

const xmlFiles = await walk(RAW_DIR);
console.log(`Found ${xmlFiles.length} ESI files`);

const today = new Date().toISOString().slice(0, 10);
await mkdir(OUT_DIR, { recursive: true });

let written = 0;

for (const file of xmlFiles) {
  const buf = await readFile(file);
  // ESI files are ISO-8859-1
  const content = new TextDecoder('iso-8859-1').decode(buf);
  const parsed = parser.parse(content);
  const devices = extractDevice(parsed, file);

  for (const dev of devices) {
    // Strip 'CiA402' / 'CiA 402' from the device name before slugifying — the
    // filename suffix already covers it. Avoids duplication like
    // 'emca-cia402-cia402-dict.md' when typeText comes as "EMCA CiA402".
    const cleanedTypeText = dev.typeText.replace(/\bcia\s*402\b/gi, '').trim();
    const slug = cleanedTypeText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const outFile = resolve(OUT_DIR, `${slug}-cia402-dict.md`);

    // Group objects by range
    const byRange = new Map();
    for (const o of dev.objects) {
      const idx = decodeIndex(o.Index);
      if (idx == null) continue;
      const range = classifyByIndex(idx);
      if (!byRange.has(range)) byRange.set(range, []);
      byRange.get(range).push({
        idx,
        idxHex: `0x${idx.toString(16).toUpperCase().padStart(4, '0')}`,
        name: objectName(o),
        type: o.Type ?? '—',
        bitSize: o.BitSize ?? '—',
        access: objectAccess(o),
        pdo: objectPdo(o),
      });
    }

    const lines = [];
    lines.push('---');
    lines.push(`id: ${slug}-cia402-dict`);
    lines.push(`title: ${dev.typeText} — CiA 402 Object Dictionary (EtherCAT ESI)`);
    lines.push('priority: HIGH');
    lines.push('use_when:');
    lines.push(`  - configuring CoE SDO / PDO mapping for ${dev.typeText}`);
    lines.push('  - decoding controlword 0x6040 / statusword 0x6041 bits');
    lines.push('  - looking up CiA 402 mode-specific objects (PP, PV, HM, CSP, CSV)');
    lines.push('  - finding Festo manufacturer-specific parameters (0x2000–0x5FFF)');
    lines.push('  - PDO mapping default: 0x1A00 / 0x1600 — what is included');
    lines.push('never_use_when:');
    lines.push('  - working with CPX-E EtherCAT fieldbus coupler (use festo-cpx-e-ec-coe-dictionary)');
    lines.push('  - need general PtP behavior reference (use festo-point-to-point or festo-ptp-reference)');
    lines.push('  - need CMMT-AS hardware spec (use hw-cmmt-servo)');
    lines.push(`keywords: [${dev.typeText}, CiA 402, EtherCAT, CoE, object dictionary, controlword, statusword, PDO, SDO, drive, servo, MC_Power_Festo, MC_Home_Festo, modes of operation]`);
    lines.push(`source: ESI XML — ${relative(RAW_DIR, file).replace(/\\/g, '/')}`);
    lines.push(`product_code: ${dev.productCode}`);
    lines.push(`revision: ${dev.revision}`);
    lines.push(`profile: CiA ${dev.profileNo ?? '—'}`);
    lines.push(`extracted: ${today}`);
    lines.push('license: gated — Festo customer-portal package, not redistributable');
    lines.push(`total_objects: ${dev.objects.length}`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${dev.typeText} — CiA 402 Object Dictionary`);
    lines.push('');
    lines.push(`Source: EtherCAT Slave Information (ESI) XML extracted from the Festo`);
    lines.push(`SoftMotion. Vendor: Festo (`+'`0x001D`'+`). Profile: **CiA ${dev.profileNo}** (drive profile).`);
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|---|---|');
    lines.push(`| Product Code | \`${dev.productCode}\` |`);
    lines.push(`| Revision | \`${dev.revision}\` |`);
    lines.push(`| Profile | CiA ${dev.profileNo} |`);
    lines.push(`| Total OD entries | ${dev.objects.length} |`);
    lines.push('');
    lines.push('**Reading the tables**:');
    lines.push('- `Index` in hex (CiA standard).');
    lines.push('- `Type` = CoE data type (BOOL/USINT/UINT/UDINT/INT/DINT/STRING/ARRAY etc.).');
    lines.push('- `Access` = `ro` (read-only), `rw` (read-write), `wo` (write-only), `const`.');
    lines.push('- `PDO` = mapping flag: `R` (RxPDO mappable), `T` (TxPDO mappable), `RT`/`TR` (both), `—` (SDO only).');
    lines.push('');

    // Render in canonical order
    const order = ['communication', 'cia402_profile', 'cia402_extended', 'manufacturer', 'reserved', 'other'];
    for (const range of order) {
      const items = byRange.get(range);
      if (!items || items.length === 0) continue;
      items.sort((a, b) => a.idx - b.idx);
      lines.push(`## ${RANGE_LABELS[range]}`);
      lines.push('');
      lines.push(`Entries: **${items.length}**`);
      lines.push('');
      lines.push('| Index | Name | Type | BitSize | Access | PDO |');
      lines.push('|---|---|---|---|---|---|');
      for (const it of items) {
        const name = String(it.name).replace(/\|/g, '\\|');
        lines.push(`| \`${it.idxHex}\` | ${name} | \`${it.type}\` | ${it.bitSize} | ${it.access} | ${it.pdo} |`);
      }
      lines.push('');
    }

    await writeFile(outFile, lines.join('\n'), 'utf8');
    console.log(`✓ ${dev.typeText}: ${dev.objects.length} objects → ${outFile}`);
    written++;
  }
}

console.log('');
console.log(`Done: ${written} ESI device(s) processed`);
