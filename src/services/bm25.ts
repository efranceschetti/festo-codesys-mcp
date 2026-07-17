/**
 * BM25 Full-Text Search Engine
 *
 * Pure TypeScript implementation of Okapi BM25 ranking.
 * Ported from EplanMCP knowledge/searcher.py.
 * Zero external dependencies.
 */

// ── Stopwords (English only — CODESYS is English-only codebase) ──────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'for',
  'on', 'with', 'as', 'at', 'by', 'this', 'that', 'are', 'was', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'no', 'so',
  'if', 'its', 'can', 'will', 'from', 'they', 'we', 'you', 'all',
  'each', 'which', 'their', 'there', 'then', 'than', 'when', 'what',
  'where', 'how', 'who', 'also', 'been', 'were', 'being', 'would',
  'could', 'should', 'may', 'might', 'shall', 'must', 'need',
  'about', 'into', 'through', 'between', 'after', 'before',
  'other', 'some', 'such', 'only', 'over', 'these', 'those',
  'more', 'most', 'very', 'just', 'any', 'same', 'own',
]);

// ── Tokenizer ────────────────────────────────────────────────────────────

/**
 * Tokenize text: lowercase, split on non-alphanumeric, remove stopwords.
 * Keeps tokens of 2+ characters (important for PLC prefixes like "fb", "mc").
 *
 * Snake_case identifiers (e.g. `RTSEXCPT_CYCLE_TIME_EXCEED`, `MC_Power_Festo`)
 * generate BOTH the full token (`mc_power_festo`) AND its components
 * (`mc`, `power`, `festo`) — natural-language search matches via components,
 * exact-identifier search matches via the full token. Fixes Bug A1
 * where searching for "cycle time exceeded" did not find `RTSEXCPT_CYCLE_TIME_EXCEED`.
 */
export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9_]+/g);
  if (!matches) return [];
  const tokens: string[] = [];
  for (const match of matches) {
    if (match.length > 1 && !STOPWORDS.has(match)) tokens.push(match);
    // Snake_case decomposition: add individual components.
    // Skip if the match has no _ (already added above).
    if (match.includes('_')) {
      for (const sub of match.split('_')) {
        if (sub.length > 1 && !STOPWORDS.has(sub)) tokens.push(sub);
      }
    }
  }
  return tokens;
}

// ── Chunker ──────────────────────────────────────────────────────────────

/**
 * Split text into chunks by word count with overlap.
 * Used as fallback when a section exceeds maxWords.
 */
function chunkByWords(text: string, maxWords: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = start + maxWords;
    const chunk = words.slice(start, end).join(' ');
    if (chunk.trim()) chunks.push(chunk);
    start += maxWords - overlap;
  }
  return chunks;
}

/**
 * Markdown-aware chunking: split by ## headers first, then by word count.
 * Preserves document structure — each section becomes a natural chunk.
 * Inspired by knowledge-rag's markdown-aware splitting.
 */
export function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  // Split on markdown headers (## or ###)
  const sections = text.split(/(?=^#{1,3}\s)/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= chunkSize) {
      chunks.push(trimmed);
    } else {
      // Section too large — sub-chunk with overlap
      chunks.push(...chunkByWords(trimmed, chunkSize, overlap));
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

// ── BM25 Engine ──────────────────────────────────────────────────────────

export class BM25 {
  private k1: number;
  private b: number;
  private corpus: string[][] = [];
  private docFreqs: Map<string, number> = new Map();
  /**
   * Inverted index: term → Map<docId, term frequency>.
   * F3-018: replaces the O(N*L) scan with an O(|hits|) lookup.
   * Lucene/Elasticsearch use the same pattern.
   */
  private tfIndex: Map<string, Map<number, number>> = new Map();
  private docLen: number[] = [];
  private avgdl = 0;
  private nDocs = 0;

  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  /** Index a corpus of tokenized documents. */
  fit(corpus: string[][]): void {
    this.corpus = corpus;
    this.nDocs = corpus.length;
    this.docLen = corpus.map(doc => doc.length);
    this.avgdl = this.docLen.reduce((a, b) => a + b, 0) / Math.max(this.nDocs, 1);

    this.docFreqs = new Map();
    this.tfIndex = new Map();
    for (let docId = 0; docId < corpus.length; docId++) {
      const doc = corpus[docId];
      const seen = new Set<string>();
      for (const token of doc) {
        // doc frequency (once per doc)
        if (!seen.has(token)) {
          this.docFreqs.set(token, (this.docFreqs.get(token) ?? 0) + 1);
          seen.add(token);
        }
        // term frequency in inverted index (every occurrence)
        let postings = this.tfIndex.get(token);
        if (postings === undefined) {
          postings = new Map();
          this.tfIndex.set(token, postings);
        }
        postings.set(docId, (postings.get(docId) ?? 0) + 1);
      }
    }
  }

  /** Score all documents against query tokens. */
  score(queryTokens: string[]): number[] {
    const scores = new Array<number>(this.nDocs).fill(0);

    for (const q of queryTokens) {
      const df = this.docFreqs.get(q);
      if (df === undefined) continue;

      const idf = Math.log((this.nDocs - df + 0.5) / (df + 0.5) + 1);

      // F3-018: iterate only over docs that CONTAIN the token (postings list).
      const postings = this.tfIndex.get(q);
      if (postings === undefined) continue;
      for (const [docId, tf] of postings) {
        const dl = this.docLen[docId];
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * dl / Math.max(this.avgdl, 1));
        scores[docId] += idf * numerator / denominator;
      }
    }

    return scores;
  }

  /** Return top-k (index, score) pairs sorted by relevance. */
  search(queryTokens: string[], topK = 5): Array<{ index: number; score: number }> {
    const scores = this.score(queryTokens);
    return scores
      .map((score, index) => ({ index, score }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
