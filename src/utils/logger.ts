/**
 * Structured Logger
 * Minimal logging for MCP server observability.
 *
 * Two output channels, both active by default (defense in depth):
 *
 * 1. stderr — preserved as the primary channel for backward compat
 *    with clients that don't subscribe to MCP logging notifications
 *    (Claude Desktop today). Disable by setting MCP_DUAL_LOG=0.
 *
 * 2. MCP `notifications/message` — emitted to the client over the
 *    transport once setLoggerServer() is called (typically right
 *    after McpServer is constructed in index.ts). Inspector renders
 *    these in the "Logs" tab; future clients gain structured logs
 *    automatically.
 *
 * stdout is reserved for the MCP protocol itself and must never
 * receive log lines.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type LogLevel = 'info' | 'warn' | 'error';

let currentServer: McpServer | null = null;

/**
 * Default ON — write to stderr AND send via SDK. Set MCP_DUAL_LOG=0
 * to silence stderr once you're confident your client renders the
 * notification stream.
 */
const DUAL_WRITE = process.env.MCP_DUAL_LOG !== '0';

/**
 * Wire the logger to the MCP server so subsequent log() calls also
 * emit `notifications/message`. Call once, after the server is
 * constructed and before the transport connects.
 */
export function setLoggerServer(server: McpServer): void {
  currentServer = server;
}

export function log(level: LogLevel, tool: string, message: string): void {
  // stderr write — happens whenever dual-write is on, OR before the
  // server has been wired (so startup logs are never lost).
  if (DUAL_WRITE || currentServer === null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${level.toUpperCase()}] [${tool}] ${message}`);
  }

  // SDK notification — fire-and-forget. The server may not yet be
  // connected to a transport (early startup), or the client may not
  // have logging capability; in either case we silently fall back to
  // stderr above.
  if (currentServer !== null) {
    try {
      void currentServer.server.sendLoggingMessage({
        level: toSyslogLevel(level), // SDK uses RFC 5424 syslog levels
        logger: tool,
        data: message,
      });
    } catch {
      // Intentionally swallowed — never let a logging failure crash
      // the caller. stderr already captured the message.
    }
  }
}

/**
 * Map our compact 3-level vocabulary to the SDK's RFC 5424 set so the
 * existing ~30 call sites don't need to change.
 */
function toSyslogLevel(level: LogLevel): 'info' | 'warning' | 'error' {
  if (level === 'warn') return 'warning';
  return level;
}
