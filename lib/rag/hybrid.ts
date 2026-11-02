import { BM25Index } from './bm25';
import { VectorIndex, generateLocalEmbedding } from './embeddings';
import { DocumentChunk, RetrievalCandidate } from './types';

export class HybridRetriever {
  private bm25: BM25Index;
  private vectorIndex: VectorIndex;
  private kRRF = 60;
  private denseWeight = 0.6;
  private sparseWeight = 0.4;

  constructor(chunks: DocumentChunk[]) {
    this.bm25 = new BM25Index(chunks);
    this.vectorIndex = new VectorIndex(chunks);
  }

  public retrieve(query: string, candidatePoolSize = 15): RetrievalCandidate[] {
    // 1. Sparse BM25 retrieval
    const sparseResults = this.bm25.search(query, candidatePoolSize);
    
    // 2. Dense Vector retrieval
    const queryVector = generateLocalEmbedding(query);
    const denseResults = this.vectorIndex.search(queryVector, candidatePoolSize);

    // 3. Map candidates with ranks
    const candidateMap = new Map<string, RetrievalCandidate>();

    sparseResults.forEach((item, rank) => {
      const id = item.chunk.id;
      const rrf = this.sparseWeight / (this.kRRF + rank + 1);
      candidateMap.set(id, {
        chunk: item.chunk,
        denseScore: 0,
        bm25Score: item.score,
        rrfScore: rrf,
        rerankScore: 0
      });
    });

    denseResults.forEach((item, rank) => {
      const id = item.chunk.id;
      const rrf = this.denseWeight / (this.kRRF + rank + 1);
      if (candidateMap.has(id)) {
        const existing = candidateMap.get(id)!;
        existing.denseScore = item.score;
        existing.rrfScore += rrf;
      } else {
        candidateMap.set(id, {
          chunk: item.chunk,
          denseScore: item.score,
          bm25Score: 0,
          rrfScore: rrf,
          rerankScore: 0
        });
      }
    });

    const candidates = Array.from(candidateMap.values());
    candidates.sort((a, b) => b.rrfScore - a.rrfScore);
    return candidates.slice(0, candidatePoolSize);
  }
}

