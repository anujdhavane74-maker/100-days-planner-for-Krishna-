import { RetrievalCandidate, Citation } from './types';
import { tokenize } from './bm25';

export class CrossEncoderReranker {
  /**
   * Cross-scores candidate chunks with query intent, entity matching, and contextual density
   */
  public rerank(query: string, candidates: RetrievalCandidate[], topK = 5): RetrievalCandidate[] {
    if (candidates.length === 0) return [];

    const queryTokens = tokenize(query);
    const queryLower = query.toLowerCase();

    // Check for specific temporal/day intent (e.g., "day 23", "week 4")
    const dayMatch = queryLower.match(/\bday\s*(\d+)\b/i);
    const targetDay = dayMatch ? parseInt(dayMatch[1], 10) : null;

    const weekMatch = queryLower.match(/\bweek\s*(\d+)\b/i);
    const targetWeek = weekMatch ? parseInt(weekMatch[1], 10) : null;

    // Check for specific course track intent
    const courseKeywords = [
      'after effects', 'ae', 'n8n', 'documentary', 'google earth',
      'geolayers', 'saas', 'portfolio', 'gym', 'speaking'
    ];
    const mentionedCourses = courseKeywords.filter(k => queryLower.includes(k));

    const scored = candidates.map(candidate => {
      let score = candidate.rrfScore * 10;
      const c = candidate.chunk;
      const titleTokens = tokenize(c.metadata.title);
      const tagTokens = tokenize(c.metadata.tags.join(' '));
      const contentTokens = tokenize(c.content);

      // 1. Title match boost
      let titleHits = 0;
      for (const t of queryTokens) {
        if (titleTokens.includes(t)) titleHits++;
      }
      score += (titleHits / Math.max(1, queryTokens.length)) * 3.5;

      // 2. Tag match boost
      let tagHits = 0;
      for (const t of queryTokens) {
        if (tagTokens.includes(t)) tagHits++;
      }
      score += (tagHits / Math.max(1, queryTokens.length)) * 2.0;

      // 3. Exact Day match boost
      if (targetDay !== null && c.metadata.day === targetDay) {
        score += 8.0;
      }

      // 4. Exact Week match boost
      if (targetWeek !== null && c.metadata.title.toLowerCase().includes(`week ${targetWeek}`)) {
        score += 8.0;
      }

      // 5. Course alignment boost
      if (mentionedCourses.length > 0 && c.metadata.course) {
        const cCourse = c.metadata.course.toLowerCase();
        if (mentionedCourses.some(m => cCourse.includes(m) || m.includes(cCourse))) {
          score += 3.0;
        }
      }

      // 6. Content coverage ratio
      let contentHits = 0;
      for (const t of queryTokens) {
        if (contentTokens.includes(t)) contentHits++;
      }
      score += (contentHits / Math.max(1, queryTokens.length)) * 1.5;

      // Normalize into candidate
      candidate.rerankScore = parseFloat(score.toFixed(4));
      return candidate;
    });

    scored.sort((a, b) => b.rerankScore - a.rerankScore);
    return scored.slice(0, topK);
  }

  public extractCitations(candidates: RetrievalCandidate[]): Citation[] {
    return candidates.map(cand => {
      const c = cand.chunk;
      const snippet = c.content.length > 180 ? c.content.slice(0, 180) + '…' : c.content;
      return {
        id: c.id,
        source: c.metadata.source,
        title: c.metadata.title,
        type: c.metadata.type,
        snippet,
        course: c.metadata.course,
        day: c.metadata.day
      };
    });
  }
}
