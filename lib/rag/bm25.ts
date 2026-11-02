import { DocumentChunk } from './types';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'or', 'this', 'you', 'your'
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

export class BM25Index {
  private chunks: DocumentChunk[] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private invertedIndex: Map<string, Map<number, number>> = new Map();
  private idfMap: Map<string, number> = new Map();
  private k1: number;
  private b: number;

  constructor(chunks: DocumentChunk[], k1 = 1.5, b = 0.75) {
    this.chunks = chunks;
    this.k1 = k1;
    this.b = b;
    this.buildIndex();
  }

  private buildIndex() {
    let totalLength = 0;
    const numDocs = this.chunks.length;

    this.chunks.forEach((chunk, docIdx) => {
      // Index both content and metadata keywords
      const fullText = `${chunk.metadata.title} ${chunk.metadata.source} ${chunk.metadata.tags.join(' ')} ${chunk.content}`;
      const tokens = tokenize(fullText);
      const len = tokens.length;
      this.docLengths[docIdx] = len;
      totalLength += len;

      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }

      for (const [token, count] of tfMap.entries()) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Map());
        }
        this.invertedIndex.get(token)!.set(docIdx, count);
      }
    });

    this.avgDocLength = numDocs > 0 ? totalLength / numDocs : 1;

    // Calculate IDF for each token
    for (const [token, postingList] of this.invertedIndex.entries()) {
      const docFreq = postingList.size;
      const idf = Math.log(1 + (numDocs - docFreq + 0.5) / (docFreq + 0.5));
      this.idfMap.set(token, Math.max(0, idf));
    }
  }

  public search(query: string, topK = 10): { chunk: DocumentChunk; score: number }[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = new Float32Array(this.chunks.length);

    for (const token of queryTokens) {
      const postings = this.invertedIndex.get(token);
      if (!postings) continue;
      const idf = this.idfMap.get(token) || 0;

      for (const [docIdx, tf] of postings.entries()) {
        const docLen = this.docLengths[docIdx];
        const denom = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        const termScore = idf * ((tf * (this.k1 + 1)) / (denom || 1));
        scores[docIdx] += termScore;
      }
    }

    // Collect non-zero matches
    const results: { chunk: DocumentChunk; score: number }[] = [];
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0) {
        results.push({ chunk: this.chunks[i], score: scores[i] });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
