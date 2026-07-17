/**
 * MCP Response Helpers
 * Standardized response builders for tool handlers.
 */

/** Build a successful MCP tool response. */
export function successResponse(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

/**
 * Build a successful MCP tool response that includes both human-readable text
 * AND a typed structuredContent payload that matches the tool's outputSchema.
 *
 * Spec: MCP 2025-06-18 — clients can validate/render structuredContent without
 * regex on the markdown text. Falls back to `content` text for older clients.
 */
export function structuredResponse<T extends Record<string, unknown>>(text: string, structured: T) {
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: structured,
  };
}

/** Build an error MCP tool response with isError flag. */
export function errorResponse(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true as const };
}

/**
 * Build an error response that ALSO satisfies an outputSchema requiring
 * `found: false` etc. Used by tools that declare outputSchema and need
 * to return structured "not found" data.
 */
export function structuredErrorResponse<T extends Record<string, unknown>>(text: string, structured: T) {
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: structured,
    isError: true as const,
  };
}

/** Extract a human-readable message from an unknown error. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return `Unknown error: ${JSON.stringify(err)}`;
}

/**
 * Strip IEC 61131-3 comments from Structured Text code.
 * Removes both (* ... *) block comments and // line comments.
 */
export function stripComments(code: string): string {
  return code
    .replace(/\(\*[\s\S]*?\*\)/g, '')   // Remove (* ... *) block comments
    .replace(/\/\/.*$/gm, '');            // Remove // line comments
}

/**
 * Extract a JSON payload from a CODESYS IronPython script output.
 *
 * Convention: scripts that want to return structured data print a line
 * starting with `SCRIPT_RESULT_JSON:` followed by the JSON.dumps output.
 * This helper finds that line, parses it, and returns the typed payload.
 *
 * Multiple SCRIPT_RESULT_JSON: lines: returns the LAST one (most recent emit).
 * No JSON line found: returns null.
 * Malformed JSON: returns null (does not throw).
 */
export function extractScriptJsonResult<T = unknown>(output: string): T | null {
  const lines = output.split(/\r?\n/);
  let lastJson: T | null = null;
  for (const line of lines) {
    const marker = 'SCRIPT_RESULT_JSON:';
    const idx = line.indexOf(marker);
    if (idx === -1) continue;
    const jsonText = line.slice(idx + marker.length).trim();
    try {
      lastJson = JSON.parse(jsonText) as T;
    } catch {
      // Ignore malformed JSON lines (might be debug text containing the marker)
    }
  }
  return lastJson;
}
