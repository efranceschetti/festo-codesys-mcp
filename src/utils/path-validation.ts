/**
 * Path Validation Utility
 * Prevents directory traversal, path injection, and access to sensitive paths.
 */

import { normalize, resolve, sep } from 'path';
import { access, mkdir } from 'fs/promises';

const MAX_PATH_LENGTH = 4096;

const SENSITIVE_PREFIXES = [
  '/etc/', '/proc/', '/sys/', '/dev/',
  '/root/.ssh/', '/root/.gnupg/',
];

/**
 * D5-001: Workspace jail. The 7 creation tools accept an arbitrary `outputDir`.
 * SENSITIVE_PREFIXES alone was Linux-only — on Windows, paths like
 * C:\\Users\\<user>\\.ssh or C:\\Windows\\System32 passed without an alarm.
 * Resolves absolutely and requires that it fall inside process.cwd().
 *
 * Set FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1 if you legitimately need to write
 * outside the workspace (e.g., shared network drive). Off by default.
 */
function isInsideWorkspace(absolutePath: string): boolean {
  if (process.env.FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE === '1') return true;
  const workspace = resolve(process.cwd());
  // P2.0/A2: Windows filesystems are case-insensitive — `D:\ws` and `d:\ws`
  // are the same directory, but process.cwd() and user input may disagree on
  // drive-letter (or any segment) case. Fold case on win32 only; POSIX
  // filesystems are case-sensitive and must keep the exact comparison.
  const win = process.platform === 'win32';
  const a = win ? absolutePath.toLowerCase() : absolutePath;
  const w = win ? workspace.toLowerCase() : workspace;
  return a === w || a.startsWith(w + sep);
}

/**
 * Validates a user-provided path to prevent directory traversal and injection attacks.
 * Returns null if valid, or an error message string if invalid.
 */
export function validatePath(userPath: string): string | null {
  if (!userPath || userPath.length === 0) {
    return 'Invalid path: empty path not allowed';
  }

  if (userPath.length > MAX_PATH_LENGTH) {
    return `Invalid path: exceeds maximum length (${MAX_PATH_LENGTH})`;
  }

  if (userPath.includes('\0')) {
    return 'Invalid path: null bytes not allowed';
  }

  // Block control characters (< 0x20 except tab 0x09)
  for (let i = 0; i < userPath.length; i++) {
    const code = userPath.charCodeAt(i);
    if (code < 0x20 && code !== 0x09) {
      return 'Invalid path: control characters not allowed';
    }
  }

  const normalized = normalize(userPath).replace(/\\/g, '/');

  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..')
  ) {
    return 'Invalid path: directory traversal (..) not allowed';
  }

  // D5-001: workspace jail (Windows-aware). Applies AFTER the syntactic
  // validations to allow the specific traversal message above.
  const absolute = resolve(userPath);
  if (!isInsideWorkspace(absolute)) {
    return 'Invalid path: must be inside the workspace directory (set FESTO_MCP_ALLOW_OUTSIDE_WORKSPACE=1 to bypass)';
  }

  // Block sensitive system directories — second line of defense in environments
  // where process.cwd() ends up elevated (root containers, /tmp shells, etc.).
  for (const prefix of SENSITIVE_PREFIXES) {
    if (normalized.startsWith(prefix) || normalized === prefix.slice(0, -1)) {
      return `Invalid path: access to ${prefix} not allowed`;
    }
  }

  return null;
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}
