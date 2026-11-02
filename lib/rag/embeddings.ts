import { DocumentChunk } from './types';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic Semantic Subword Feature Vectorizer (256 dimensions)
 * Used as high-speed, zero-dependency offline fallback.
 */
export function generateLocalEmbedding(text: string, dims = 256): number[] {
  const vec = new Float64Array(dims);
  const normalized = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    // Word hash
    let h1 = 0x811c9dc5;
    for (let i = 0; i < word.length; i++) {
      h1 ^= word.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    const bucket = Math.abs(h1) % dims;
    const sign = (h1 & 0x1000) !== 0 ? 1 : -1;
    vec[bucket] += sign * (1 + 1 / (1 + wIdx * 0.1));

    // Character 3-grams
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        let h2 = 0x811c9dc5;
        for (let j = 0; j < 3; j++) {
          h2 ^= word.charCodeAt(i + j);
          h2 = Math.imul(h2, 0x01000193);
        }
        const gramBucket = Math.abs(h2) % dims;
        const gramSign = (h2 & 0x800) !== 0 ? 1 : -1;
        vec[gramBucket] += gramSign * 0.5;
      }
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result: number[] = new Array(dims);
  for (let i = 0; i < dims; i++) result[i] = vec[i] / norm;

  return result;
}

/**
 * Generates embeddings via Gemini, OpenAI, or local vectorizer
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] }
          })
        }
      );
      if (res.ok) {
        const json: any = await res.json();
        const values = json?.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      }
    } catch {
      // Fallback on network/API failure
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });
      if (res.ok) {
        const json: any = await res.json();
        const values = json?.data?.[0]?.embedding;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      }
    } catch {
      // Fallback on network/API failure
    }
  }

  // Guaranteed fallback
  return generateLocalEmbedding(text);
}

export class VectorIndex {
  private chunks: DocumentChunk[] = [];
  private embeddings: number[][] = [];

  constructor(chunks: DocumentChunk[]) {
    this.chunks = chunks;
    this.embeddings = chunks.map(c => generateLocalEmbedding(
      `${c.metadata.title} ${c.metadata.tags.join(' ')} ${c.content}`
    ));
  }

  public search(queryVector: number[], topK = 10): { chunk: DocumentChunk; score: number }[] {
    const scored = this.chunks.map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(queryVector, this.embeddings[i])
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}
