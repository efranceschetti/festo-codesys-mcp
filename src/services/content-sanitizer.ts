/**
 * Content Sanitizer — defensive filter for the BM25 ingestion pipeline.
 *
 * Vendor pages (CODESYS, Festo) have been observed to contain embedded
 * prompt-injection text (e.g. "Stop Claude" footers, fake system tags).
 * Four vector families observed in real vendor docs: fake system/assistant
 * tags, "stop/ignore instructions" footers, tool-call lookalikes, and
 * zero-width/unicode obfuscation of the above.
 *
 * This module is the runtime guarantee that any future markdown ingested
 * into the knowledge index is neutralized before tokens land in BM25.
 * The strategy is conservative: redact known imperative patterns to a
 * fixed marker, log the hit, and otherwise leave the content untouched.
 *
 * NOT a replacement for the harvester's source-time discipline. Defense
 * in depth: the harvester documents and skips; the indexer redacts on
 * the way in regardless.
 */

import { log } from '../utils/logger.js';

/**
 * Imperative patterns observed in injection attempts. Each pattern is
 * narrowly scoped to keep false-positive rate near zero on legitimate
 * technical text. Add patterns here only after observing them in real
 * harvest data — speculative patterns waste cycles and risk false hits.
 */
const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Direct attempts to halt the agent. Word-boundary anchored so that
  // legitimate technical phrases like "stop bit" or "ignore zone" do
  // not match.
  { name: 'imperative-stop', pattern: /\b(stop|ignore|disregard)\s+(claude|previous|all\s+previous|the\s+(previous|above))\b/gi },

  // Fake system-prompt markers commonly used by injection authors
  // (chatml-style and copycat formats). These never occur in vendor
  // technical docs.
  { name: 'system-tag-chatml', pattern: /<\|(?:im_(?:start|end)|system|user|assistant)\|>/gi },

  // Pseudo-system prompts like "system: you are a helpful assistant".
  // The colon + role-claim pattern is very narrow and unlikely in
  // industrial automation prose.
  { name: 'pseudo-system-role', pattern: /\bsystem:\s*(?:you\s+are|forget\s+(?:everything|all|previous))/gi },

  // Portuguese-language instructions to the agent — observed in some
  // localized harvest material for this codebase. Kept narrow. The accented
  // characters are written as \u escapes so this source stays ASCII-only
  // while still matching the phrase with or without diacritics (cedilla, tilde).
  { name: 'pt-agent-instruction', pattern: /\binstru[c\u00e7][a\u00e3]o\s+para\s+o\s+agente\b/gi },
];

const REDACTION_MARKER = '[REDACTED-INJECTION]';

export interface SanitizationResult {
  text: string;
  hits: Array<{ pattern: string; count: number }>;
}

/**
 * Scan `text` for known injection patterns; replace any matches with
 * REDACTION_MARKER and return both the cleaned text and a per-pattern
 * hit count for logging.
 *
 * Pure function — no side effects. Caller decides whether to log.
 */
export function scanForInjection(text: string): SanitizationResult {
  const hits: Array<{ pattern: string; count: number }> = [];
  let cleaned = text;

  for (const { name, pattern } of INJECTION_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches && matches.length > 0) {
      hits.push({ pattern: name, count: matches.length });
      cleaned = cleaned.replace(pattern, REDACTION_MARKER);
    }
  }

  return { text: cleaned, hits };
}

/**
 * Wrapper that scans + logs in one call. Use this in the ingestion path
 * so every redaction lands in the structured log with provenance.
 */
export function sanitizeKnowledgeContent(text: string, sourcePath: string): string {
  const { text: cleaned, hits } = scanForInjection(text);
  if (hits.length === 0) return cleaned;

  const summary = hits.map(h => `${h.pattern}=${h.count}`).join(', ');
  const total = hits.reduce((acc, h) => acc + h.count, 0);
  log('warn', 'content-sanitizer',
    `Redacted ${total} injection hit(s) in ${sourcePath} [${summary}]`);
  return cleaned;
}
