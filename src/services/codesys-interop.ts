/**
 * CODESYS Interop — drives CODESYS V3.5 via the Scripting Engine.
 *
 * Mechanism (adapted from codesys-mcp-toolkit, MIT 2025):
 *   1. Write an IronPython script to %TEMP%.
 *   2. Spawn `CODESYS.exe --profile="<name>" --noUI --runscript="<temp.py>"`.
 *   3. Parse stdout/stderr for SCRIPT_SUCCESS / SCRIPT_ERROR markers.
 *   4. Cleanup the temp file.
 *
 * Reuses FestoCodesysMCP utilities: log(), getErrorMessage(). Workspace-jail
 * via validatePath() applies to caller-provided project paths, not to the
 * scripts themselves (which target the user's Windows %TEMP%).
 *
 * Environment variables:
 *   FESTO_MCP_CODESYS_PATH       — full path to CODESYS.exe (required)
 *   FESTO_MCP_CODESYS_PROFILE    — profile name as shown in CODESYS UI (required)
 *   FESTO_MCP_CODESYS_TIMEOUT_MS — spawn timeout, default 60000
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { log } from '../utils/logger.js';
import { getErrorMessage } from '../utils/mcp-helpers.js';

const SCRIPT_SUCCESS_MARKER = 'SCRIPT_SUCCESS';
const SCRIPT_ERROR_MARKER = 'SCRIPT_ERROR';
const DEFAULT_TIMEOUT_MS = 60_000;

export interface CodesysExecOptions {
  /** Override env-derived CODESYS.exe path. */
  codesysPath?: string;
  /** Override env-derived profile name. */
  codesysProfile?: string;
  /** Spawn timeout in ms. Defaults to FESTO_MCP_CODESYS_TIMEOUT_MS or 60000. */
  timeoutMs?: number;
}

export interface CodesysExecResult {
  success: boolean;
  /** Combined output (stdout on success, stderr+stdout on failure). */
  output: string;
}

/**
 * Resolve the CODESYS executable path. Returns null if neither env var nor
 * opts.codesysPath is set or the resolved path doesn't exist.
 */
export function resolveCodesysPath(opts?: CodesysExecOptions): string | null {
  const path = opts?.codesysPath ?? process.env.FESTO_MCP_CODESYS_PATH ?? null;
  if (!path) return null;
  if (!existsSync(path)) return null;
  return path;
}

/**
 * Resolve the CODESYS profile name. Returns null if neither env var nor
 * opts.codesysProfile is set.
 */
export function resolveCodesysProfile(opts?: CodesysExecOptions): string | null {
  return opts?.codesysProfile ?? process.env.FESTO_MCP_CODESYS_PROFILE ?? null;
}

/**
 * Execute a CODESYS IronPython script via the Scripting Engine.
 *
 * The script content is written to a temp file, then CODESYS.exe is spawned
 * with --runscript. SCRIPT_SUCCESS / SCRIPT_ERROR markers in stdout/stderr
 * determine the outcome; the temp file is always cleaned up.
 */
export async function executeCodesysScript(
  scriptContent: string,
  opts: CodesysExecOptions = {},
): Promise<CodesysExecResult> {
  const codesysPath = resolveCodesysPath(opts);
  if (!codesysPath) {
    throw new Error(
      'CODESYS executable not configured. Set FESTO_MCP_CODESYS_PATH or pass opts.codesysPath.',
    );
  }
  const codesysProfile = resolveCodesysProfile(opts);
  if (!codesysProfile) {
    throw new Error(
      'CODESYS profile not configured. Set FESTO_MCP_CODESYS_PROFILE or pass opts.codesysProfile.',
    );
  }

  const timeoutMs =
    opts.timeoutMs ??
    Number(process.env.FESTO_MCP_CODESYS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const tempFile = join(
    tmpdir(),
    `festo_mcp_codesys_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.py`,
  );
  const codesysDir = dirname(codesysPath);

  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;
  let success = false;
  let spawnError: Error | undefined;

  try {
    const normalized = scriptContent.replace(/\r\n/g, '\n');
    await writeFile(tempFile, normalized, 'latin1');
    log('info', 'codesys-interop', `temp script: ${tempFile}`);

    // Quoting trickery: shell:true with full command string handles spaces in
    // both the exe path and the profile name. CODESYS argument parser is picky
    // about how --profile and --runscript get their values; passing as one big
    // string lets the shell hand it off intact.
    const fullCommand =
      `"${codesysPath}" --profile="${codesysProfile}" --noUI --runscript="${tempFile}"`;
    log('info', 'codesys-interop', `spawning (timeout=${timeoutMs}ms): ${fullCommand}`);

    const spawnEnv = { ...process.env };
    // Prepend CODESYS dir to PATH so any sibling DLLs resolve.
    spawnEnv.PATH = `${codesysDir};${spawnEnv.PATH ?? ''}`;

    const result = await new Promise<{
      code: number | null;
      stdoutData: string;
      stderrData: string;
      error?: Error;
    }>((resolve) => {
      const controller = new AbortController();
      const child = spawn(fullCommand, [], {
        cwd: codesysDir,
        env: spawnEnv,
        windowsHide: true,
        signal: controller.signal,
        shell: true,
      });

      let stdoutData = '';
      let stderrData = '';

      const timeoutId = setTimeout(() => {
        log('warn', 'codesys-interop', 'timeout reached, aborting');
        controller.abort();
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutData += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderrData += chunk.toString();
      });
      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({ code: null, stdoutData, stderrData, error: err });
      });
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({ code, stdoutData, stderrData });
      });
      controller.signal.addEventListener(
        'abort',
        () => {
          // best-effort kill
          if (!child.killed) {
            child.kill('SIGTERM');
            setTimeout(() => {
              if (!child.killed) child.kill('SIGKILL');
            }, 2000);
          }
          resolve({
            code: null,
            stdoutData,
            stderrData: `${stderrData}\nTIMEOUT: process aborted after ${timeoutMs}ms`,
          });
        },
        { once: true },
      );
    });

    stdout = result.stdoutData;
    stderr = result.stderrData;
    exitCode = result.code;
    spawnError = result.error;

    // --- Determine success ---
    if (spawnError) {
      success = false;
      if (!stderr.includes(SCRIPT_ERROR_MARKER)) {
        stderr = `${SCRIPT_ERROR_MARKER}: spawn failed: ${spawnError.message}\n${stderr}`;
      }
    } else if (stderr.includes('is not recognized as an internal or external command')) {
      success = false;
      if (!stderr.includes(SCRIPT_ERROR_MARKER)) {
        stderr = `${SCRIPT_ERROR_MARKER}: shell execution failed: ${stderr}`;
      }
    } else if (stderr.includes('--profile="profile name"')) {
      // CODESYS prints this message when the profile arg is malformed.
      success = false;
      if (!stderr.includes(SCRIPT_ERROR_MARKER)) {
        stderr = `${SCRIPT_ERROR_MARKER}: ${stderr}`;
      }
    } else if (stderr.includes('SyntaxErrorException')) {
      success = false;
      if (!stderr.includes(SCRIPT_ERROR_MARKER)) {
        stderr = `${SCRIPT_ERROR_MARKER}: ${stderr}`;
      }
    } else if (stdout.includes(SCRIPT_SUCCESS_MARKER) || stderr.includes(SCRIPT_SUCCESS_MARKER)) {
      success = true;
    } else if (stdout.includes(SCRIPT_ERROR_MARKER) || stderr.includes(SCRIPT_ERROR_MARKER)) {
      success = false;
    } else {
      success = exitCode === 0;
      if (!success && !stderr.includes(SCRIPT_ERROR_MARKER)) {
        stderr = `${SCRIPT_ERROR_MARKER}: process exited with code ${exitCode} (no markers found)\n${stderr}`;
      }
    }
  } catch (err) {
    const msg = getErrorMessage(err);
    log('error', 'codesys-interop', `setup error: ${msg}`);
    stderr = `${SCRIPT_ERROR_MARKER}: setup error: ${msg}`;
    success = false;
  } finally {
    try {
      await unlink(tempFile);
    } catch (cleanupErr) {
      log('warn', 'codesys-interop', `temp cleanup failed: ${getErrorMessage(cleanupErr)}`);
    }
  }

  const finalOutput = success ? stdout : `${stderr}\n${stdout}`.trim();
  log('info', 'codesys-interop', `result success=${success} len=${finalOutput.length}`);
  return { success, output: finalOutput };
}
