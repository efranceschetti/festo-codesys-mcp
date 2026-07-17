/**
 * Naming Convention Utilities
 * Auto-correction and enforcement of PLC naming conventions.
 */

const POU_PREFIXES: Record<string, string> = {
  'FUNCTION_BLOCK': 'FB_',
  'PROGRAM': 'PRG_',
  'FUNCTION': 'FC_',
};

const DUT_PREFIXES: Record<string, string> = {
  'enum': 'E_',
  'struct': 'ST_',
};

/**
 * Ensures a name starts with the required prefix.
 * Returns the (possibly corrected) name and whether it was corrected.
 *
 * D5-014: case-insensitive — before, `'fb_servoaxis'.startsWith('FB_')` was
 * false and generated `'FB_fb_servoaxis'` (double prefix). Now it normalizes
 * to the canonical prefix in any case.
 */
export function ensurePrefix(name: string, prefix: string): { name: string; corrected: boolean } {
  const lowerName = name.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();
  if (lowerName.startsWith(lowerPrefix)) {
    const remainder = name.slice(prefix.length);
    const canonical = `${prefix}${remainder}`;
    return { name: canonical, corrected: canonical !== name };
  }
  return { name: `${prefix}${name}`, corrected: true };
}

/**
 * Auto-correct a POU name based on its type.
 * E.g., "ServoAxis" + "FUNCTION_BLOCK" → "FB_ServoAxis"
 */
export function ensurePouPrefix(name: string, pouType: string): { name: string; corrected: boolean } {
  const prefix = POU_PREFIXES[pouType];
  if (!prefix) return { name, corrected: false };
  return ensurePrefix(name, prefix);
}

/**
 * Auto-correct a data type name based on its kind.
 * E.g., "MachState" + "enum" → "E_MachState"
 */
export function ensureDutPrefix(name: string, kind: string): { name: string; corrected: boolean } {
  const prefix = DUT_PREFIXES[kind];
  if (!prefix) return { name, corrected: false };
  return ensurePrefix(name, prefix);
}
