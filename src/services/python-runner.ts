/**
 * Python Runner — spawns FestoCodesysMCP wrapper scripts in the project venv.
 *
 * The TS side passes a JSON payload as `--json '<json>'` argv. The Python
 * wrapper reads it (see python/wrappers/_common.py), invokes the SDK, and
 * prints exactly one JSON line on success or `SCRIPT_ERROR: ...` on stderr.
 *
 * Environment variables:
 *   FESTO_MCP_PYTHON           — interpreter path
 *                                (default: <repo>/python/.venv/Scripts/python.exe on Windows,
 *                                 <repo>/python/.venv/bin/python elsewhere)
 *   FESTO_MCP_WRAPPERS_DIR     — wrappers directory
 *                                (default: <repo>/python/wrappers)
 *   FESTO_MCP_PYTHON_TIMEOUT_MS — spawn timeout, default 30000
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';
import { getErrorMessage } from '../utils/mcp-helpers.js';

const SCRIPT_ERROR_MARKER = 'SCRIPT_ERROR';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface PythonRunOptions {
  /** Override interpreter path. */
  pythonPath?: string;
  /** Override wrappers directory. */
  wrappersDir?: string;
  /** Spawn timeout. */
  timeoutMs?: number;
}

export interface PythonRunResult<T = unknown> {
  success: boolean;
  /** Parsed JSON from stdout when success; null on failure. */
  data: T | null;
  /** Raw stderr (useful for diagnostics on failure). */
  stderr: string;
}

/**
 * Resolve the repo root by walking from this module's URL. This file lives at
 * `<repo>/build/services/python-runner.js` after tsc, so root = ../..
 */
function repoRoot(): string {
  const here = fileURLToPath(import.meta.url);
  return resolve(here, '..', '..', '..');
}

export function resolvePythonInterpreter(opts?: PythonRunOptions): string {
  if (opts?.pythonPath) return opts.pythonPath;
  const envPath = process.env.FESTO_MCP_PYTHON;
  if (envPath) return envPath;
  const isWin = process.platform === 'win32';
  const root = repoRoot();
  return isWin
    ? join(root, 'python', '.venv', 'Scripts', 'python.exe')
    : join(root, 'python', '.venv', 'bin', 'python');
}

export function resolveWrappersDir(opts?: PythonRunOptions): string {
  if (opts?.wrappersDir) return opts.wrappersDir;
  const envDir = process.env.FESTO_MCP_WRAPPERS_DIR;
  if (envDir) return envDir;
  return join(repoRoot(), 'python', 'wrappers');
}

/**
 * Run a wrapper script by name (e.g., "cpx_discover") with a JSON-encoded
 * args payload. Returns parsed JSON on success, raw stderr on failure.
 */
export async function runPythonWrapper<T = unknown>(
  wrapperName: string,
  args: Record<string, unknown>,
  opts: PythonRunOptions = {},
): Promise<PythonRunResult<T>> {
  const python = resolvePythonInterpreter(opts);
  const dir = resolveWrappersDir(opts);
  const script = join(dir, `${wrapperName}.py`);

  if (!existsSync(python)) {
    return {
      success: false,
      data: null,
      stderr: `${SCRIPT_ERROR_MARKER}: Python interpreter not found at ${python}. Run "npm run python:install".`,
    };
  }
  if (!existsSync(script)) {
    return {
      success: false,
      data: null,
      stderr: `${SCRIPT_ERROR_MARKER}: wrapper script not found at ${script}`,
    };
  }

  const timeoutMs =
    opts.timeoutMs ??
    Number(process.env.FESTO_MCP_PYTHON_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const payload = JSON.stringify(args);
  log('info', 'python-runner', `${wrapperName}.py (timeout=${timeoutMs}ms)`);

  return new Promise((resolveProm) => {
    const controller = new AbortController();
    let stdout = '';
    let stderr = '';

    const child = spawn(python, [script, '--json', payload], {
      signal: controller.signal,
      windowsHide: true,
    });

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      resolveProm({
        success: false,
        data: null,
        stderr: `${SCRIPT_ERROR_MARKER}: spawn failed: ${getErrorMessage(err)}\n${stderr}`,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0 && !stderr.includes(SCRIPT_ERROR_MARKER)) {
        // Try parsing the last non-empty line as JSON (matches _common.py contract).
        const lines = stdout.trim().split(/\r?\n/).filter((l) => l.length > 0);
        const lastLine = lines[lines.length - 1] ?? '';
        try {
          const parsed = JSON.parse(lastLine) as { success: boolean; data: T };
          resolveProm({
            success: parsed.success === true,
            data: parsed.data ?? null,
            stderr,
          });
        } catch (parseErr) {
          resolveProm({
            success: false,
            data: null,
            stderr: `${SCRIPT_ERROR_MARKER}: stdout was not JSON: ${getErrorMessage(parseErr)}\nstdout=${stdout}\nstderr=${stderr}`,
          });
        }
      } else {
        resolveProm({
          success: false,
          data: null,
          stderr: stderr.includes(SCRIPT_ERROR_MARKER)
            ? stderr
            : `${SCRIPT_ERROR_MARKER}: exit code ${code}\n${stderr}`,
        });
      }
    });

    controller.signal.addEventListener('abort', () => {
      if (!child.killed) child.kill('SIGTERM');
    }, { once: true });
  });
}
