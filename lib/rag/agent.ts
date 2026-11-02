import { buildStaticKnowledgeBase } from './chunker';
import { HybridRetriever } from './hybrid';
import { CrossEncoderReranker } from './reranker';
import { DocumentChunk, RAGResponse, UserContextData } from './types';
import { classifyQueryIntent } from './intent';
import { PersonalityEngine } from './personality';

// Singleton knowledge base and retriever
let cachedChunks: DocumentChunk[] | null = null;
let cachedRetriever: HybridRetriever | null = null;
const reranker = new CrossEncoderReranker();
const personalityEngine = new PersonalityEngine();

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

    // 1. Fast Industry-Level Intent Classification
    const intentResult = classifyQueryIntent(userQuery);

    // 2. Handle Non-Curriculum Conversational Intents (Greetings, Emotional checkins, Motivation, Progress, Identity)
    if (intentResult.intent !== 'curriculum_query') {
      return this.handleConversationalQuery(userQuery, intentResult, userContext, startTime);
    }

    // 3. Curriculum Retrieval Pipeline (Hybrid BM25 + Dense + Cross-Encoder Reranker)
    const { chunks, retriever } = getRetriever();

    // Inject dynamic user context into temporary query chunks if present
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

    const activeRetriever = dynamicChunks.length > chunks.length
      ? new HybridRetriever(dynamicChunks)
      : retriever;

    const candidates = activeRetriever.retrieve(userQuery, 14);
    const topCandidates = reranker.rerank(userQuery, candidates, 5);
    const citations = reranker.extractCitations(topCandidates);

    // Build Context String
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

    // LLM or Offline Grounded Synthesizer
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

    return {
      answer,
      citations,
      retrievedCount: candidates.length,
      rerankedCount: topCandidates.length,
      executionTimeMs: Date.now() - startTime,
      engine,
      intent: intentResult.intent
    };
  }

  /**
   * Handles conversational gestures (greetings, emotional checkins, motivation, small talk)
   * with human-like warmth, empathy, and context awareness.
   */
  private async handleConversationalQuery(
    query: string,
    intentResult: ReturnType<typeof classifyQueryIntent>,
    userContext: Partial<UserContextData> | undefined,
    startTime: number
  ): Promise<RAGResponse> {
    let answer = '';
    let engine: RAGResponse['engine'] = 'conversational_engine';

    // If an LLM is available, give it an emotionally intelligent prompt
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (geminiKey || openAiKey) {
      const recentMoodStr = userContext?.recentNotes?.length
        ? `Last journal note (${userContext.recentNotes[0].date}): "${userContext.recentNotes[0].note}", Mood: ${userContext.recentNotes[0].mood}/5, Win: "${userContext.recentNotes[0].win}"`
        : 'No journal reflections logged yet';

      const conversationalPrompt = `You are the MV33 AI Growth Coach for Krishna's 100-Day Growth System.
Personality: Warm, deeply human, empathetic, direct, and inspired by Max Verstappen (calm, disciplined, supportive, no corporate fluff).
User info:
- Name: Krishna
- Current day: Day ${userContext?.dayNo || 1} of 100
- Active streak: ${userContext?.currentStreak || 0} days
- Gym consistency: ${userContext?.gymCount || 0} sessions
- Today's focus: ${userContext?.currentFocus || 'Daily Practice'} (${userContext?.suggestedMinutes || 60} min)
- Recent journal: ${recentMoodStr}
- Detected intent: ${intentResult.intent}

INSTRUCTIONS:
1. Respond naturally to the user's gesture or feeling.
2. If the user asks how you are, how your day is, or if you feel low: answer warmly as a coach who is locked in, but quickly pivot to asking how Krishna is feeling and acknowledge his current journey state.
3. If the user feels low, tired, or unmotivated: respond with profound empathy. Acknowledge that low days on a 100-day sprint are normal, encourage lowering the barrier (e.g. 10 mins of After Effects or a quick 30-min gym walk), and protect the streak.
4. Keep the response concise, punchy, and human. Use formatting like bullet points only when helpful.`;

      if (geminiKey) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${conversationalPrompt}\n\nUser message: "${query}"` }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
              })
            }
          );
          if (res.ok) {
            const json: any = await res.json();
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 0) {
              answer = text.trim();
              engine = 'gemini';
            }
          }
        } catch {
          // Fall through
        }
      }

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
                { role: 'system', content: conversationalPrompt },
                { role: 'user', content: query }
              ],
              temperature: 0.6,
              max_tokens: 600
            })
          });
          if (res.ok) {
            const json: any = await res.json();
            const text = json?.choices?.[0]?.message?.content;
            if (text && text.trim().length > 0) {
              answer = text.trim();
              engine = 'openai';
            }
          }
        } catch {
          // Fall through
        }
      }
    }

    // Offline / deterministic Personality Engine fallback
    if (!answer) {
      answer = personalityEngine.generateResponse(query, intentResult, userContext);
      engine = 'conversational_engine';
    }

    return {
      answer,
      citations: [],
      retrievedCount: 0,
      rerankedCount: 0,
      executionTimeMs: Date.now() - startTime,
      engine,
      intent: intentResult.intent
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
