import { buildStaticKnowledgeBase } from './chunker';
import { HybridRetriever } from './hybrid';
import { CrossEncoderReranker } from './reranker';
import { DocumentChunk, RAGResponse, UserContextData } from './types';

// Singleton knowledge base and retriever
let cachedChunks: DocumentChunk[] | null = null;
let cachedRetriever: HybridRetriever | null = null;
const reranker = new CrossEncoderReranker();

export function getRetriever(): { chunks: DocumentChunk[]; retriever: HybridRetriever } {
  if (!cachedChunks || !cachedRetriever) {
    cachedChunks = buildStaticKnowledgeBase();
    cachedRetriever = new HybridRetriever(cachedChunks);
  }
  return { chunks: cachedChunks, retriever: cachedRetriever };
}

export class RAGGrowthAgent {
  public async query(
    userQuery: string,
    userContext?: Partial<UserContextData>
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    const { chunks, retriever } = getRetriever();

    // 1. Inject dynamic user context into temporary query chunks if present
    let dynamicChunks = [...chunks];
    if (userContext?.recentNotes && userContext.recentNotes.length > 0) {
      userContext.recentNotes.forEach((n, idx) => {
        dynamicChunks.push({
          id: `user-journal-${n.date}-${idx}`,
          content: `Personal Journal Entry (${n.date})\nMood: ${n.mood}/5\nReflection: ${n.note}\nDaily Win: ${n.win}`,
          parentContent: `User recorded reflection on ${n.date}: "${n.note}", Win: "${n.win}".`,
          metadata: {
            type: 'journal',
            source: `My Journal · ${n.date}`,
            title: `Journal (${n.date})`,
            tags: ['Journal', 'Reflection', 'Win']
          }
        });
      });
    }

    // 2. Hybrid Retrieval (BM25 + Dense Vector Search)
    const activeRetriever = dynamicChunks.length > chunks.length
      ? new HybridRetriever(dynamicChunks)
      : retriever;

    const candidates = activeRetriever.retrieve(userQuery, 14);

    // 3. Cross-Encoder Reranking
    const topCandidates = reranker.rerank(userQuery, candidates, 5);
    const citations = reranker.extractCitations(topCandidates);

    // 4. Build Context String
    const contextText = topCandidates
      .map((c, i) => `[Source ${i + 1}] (${c.chunk.metadata.source}):\n${c.chunk.content}`)
      .join('\n\n');

    const userStateSummary = userContext
      ? `Active Challenge State:
- Today: ${userContext.today || 'Active challenge'} (Day ${userContext.dayNo || 1} of 100)
- Streak: ${userContext.currentStreak || 0} days | Total Check-ins: ${userContext.totalCheckins || 0} / 100
- 30-Minute Gym consistency: ${userContext.gymCount || 0} sessions
- Current Focus: ${userContext.currentFocus || 'Daily Practice'} (${userContext.suggestedMinutes || 60} min)`
      : '';

    // 5. Try Gemini LLM, OpenAI LLM, or Fallback Grounded Synthesizer
    let answer = '';
    let engine: RAGResponse['engine'] = 'grounded_synthesis';

    const systemPrompt = `You are the MV33 AI Growth Coach & Skill Mentor for Krishna's 100-Day Growth System.
Your personality is inspired by Max Verstappen: disciplined, clear, laser-focused on continuous compounding improvement, and practical.
Krishna's core skill tracks are: Adobe After Effects, n8n Automation, Documentary Editing, Google Earth + AE Animation, GEOlayers 3 Animation, SaaS Animation, Portfolio Development, and 30-Minute Gym.

GUIDELINES:
1. Ground your answer strictly on the provided Context and Active Challenge State.
2. Provide direct, actionable guidance with exact steps, shortcuts, workflows, or timeline references.
3. Explicitly cite retrieved sources like [Source 1], [Source 2] where appropriate.
4. Keep the tone sharp, inspiring, and concise.`;

    const userMessage = `${userStateSummary ? `${userStateSummary}\n\n` : ''}Retrieved Curriculum & Knowledge Context:
${contextText}

Question: ${userQuery}`;

    // A. Check for Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
            })
          }
        );
        if (res.ok) {
          const json: any = await res.json();
          const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim().length > 0) {
            answer = candidateText.trim();
            engine = 'gemini';
          }
        }
      } catch {
        // Fall through
      }
    }

    // B. Check for OpenAI API
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!answer && openAiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.2,
            max_tokens: 900
          })
        });
        if (res.ok) {
          const json: any = await res.json();
          const candidateText = json?.choices?.[0]?.message?.content;
          if (candidateText && candidateText.trim().length > 0) {
            answer = candidateText.trim();
            engine = 'openai';
          }
        }
      } catch {
        // Fall through
      }
    }

    // C. Grounded Rule-Based Synthesizer (Zero-Network / Offline Mode)
    if (!answer) {
      answer = this.synthesizeGroundedAnswer(userQuery, topCandidates, userContext);
      engine = 'grounded_synthesis';
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      answer,
      citations,
      retrievedCount: candidates.length,
      rerankedCount: topCandidates.length,
      executionTimeMs,
      engine
    };
  }

  /**
   * High-accuracy grounded answer synthesizer for offline or zero-key environments
   */
  private synthesizeGroundedAnswer(
    query: string,
    candidates: ReturnType<CrossEncoderReranker['rerank']>,
    userContext?: Partial<UserContextData>
  ): string {
    if (candidates.length === 0) {
      return `No direct match found in your 100-day curriculum or guides for "${query}". Check your schedule on the learning tab or search for After Effects, n8n, GEOlayers 3, or documentary modules.`;
    }

    const primary = candidates[0].chunk;
    const secondary = candidates[1]?.chunk;
    const lines: string[] = [];

    // Header grounding
    lines.push(`**Guidance based on your 100-Day System** [Source 1: ${primary.metadata.source}]:`);
    lines.push('');

    // Primary chunk insights
    if (primary.metadata.type === 'daily_focus') {
      lines.push(`• **Target Focus**: ${primary.metadata.title}`);
      lines.push(`• **Curriculum Track**: ${primary.metadata.course}`);
      lines.push(`• **Execution Note**: ${primary.content.split('\n').slice(1).join(' · ')}`);
    } else if (primary.metadata.type === 'technical_guide') {
      lines.push(`• **Core Method**: ${primary.metadata.title}`);
      lines.push(`• **Key Practices**:\n${primary.content.split('\n').filter(l => l.match(/^\d\./)).map(l => '  ' + l).join('\n')}`);
    } else if (primary.metadata.type === 'task') {
      lines.push(`• **Portfolio Task**: ${primary.metadata.title}`);
      lines.push(`• **Track**: ${primary.metadata.course}`);
      lines.push(`• **Action Requirement**: Submit verified project evidence upon completion.`);
    } else if (primary.metadata.type === 'habit') {
      lines.push(`• **Daily Habit**: ${primary.metadata.title}`);
      lines.push(`• **Mindset**: ${primary.content}`);
    } else {
      lines.push(`• ${primary.content}`);
    }

    // Secondary chunk insights
    if (secondary) {
      lines.push('');
      lines.push(`**Related Checkpoint** [Source 2: ${secondary.metadata.source}]:`);
      lines.push(`• ${secondary.metadata.title} (${secondary.metadata.course || secondary.metadata.type})`);
      const secondPreview = secondary.content.split('\n').filter(Boolean).slice(0, 2).join(' — ');
      lines.push(`• ${secondPreview}`);
    }

    // User context integration
    if (userContext?.currentStreak !== undefined && userContext.currentStreak > 0) {
      lines.push('');
      lines.push(`*Racing Mindset (MV33)*: You have an active streak of **${userContext.currentStreak} days** and **${userContext.gymCount || 0} gym sessions**. Stay in rhythm, execute today's block, and log your evidence.`);
    } else {
      lines.push('');
      lines.push(`*Racing Mindset (MV33)*: Own your pace. Focus on one clean action today and record your check-in.`);
    }

    return lines.join('\n');
  }
}
