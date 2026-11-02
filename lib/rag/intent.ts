import { QueryIntent } from './types';

export interface IntentClassificationResult {
  intent: QueryIntent;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'empathetic';
  details?: {
    isAboutCoach?: boolean;
    isAboutUser?: boolean;
    timeOfDayHint?: 'morning' | 'afternoon' | 'evening';
  };
}

/**
 * High-accuracy, deterministic intent classifier for the MV33 AI Growth Agent.
 * Runs in O(1) time before retrieval to separate conversational/emotional gestures
 * from technical curriculum queries.
 */
export function classifyQueryIntent(rawQuery: string): IntentClassificationResult {
  const q = rawQuery.trim().toLowerCase();
  // Strip common punctuation for cleaner matching
  const cleaned = q.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();

  // Guard: If the query contains core technical curriculum keywords with question words,
  // ensure it is routed to curriculum_query unless it's explicitly an emotional checkin.
  const technicalKeywords = [
    'geolayers',
    'google earth',
    'after effects',
    'n8n',
    'pacing',
    'keyframes',
    'null object',
    '3d camera',
    'webhook',
    'automation',
    'documentary',
    'premiere',
    'sound design',
    'render queue',
    'expression',
    'json'
  ];
  const containsTechnical = technicalKeywords.some(tk => cleaned.includes(tk));

  // 1. Emotional state checks (High Priority)
  // Queries like "are you feeling low today", "i'm feeling low", "feeling tired", "demotivated"
  const lowKeywords = [
    'feeling low',
    'feel low',
    'feeling down',
    'feel down',
    'feeling sad',
    'feel sad',
    'demotivated',
    'unmotivated',
    'burned out',
    'burnt out',
    'exhausted',
    'tired today',
    'overwhelmed',
    'struggling today',
    'rough day',
    'bad day',
    'hard day',
    'feeling lazy',
    'lazy today',
    'procrastinating',
    'no energy',
    'feeling anxious',
    'stressed out',
    'so stressed',
    'feeling heavy',
    'want to sleep all day',
    'not in the mood'
  ];

  const hasLowEmotion = lowKeywords.some(k => cleaned.includes(k));
  if (hasLowEmotion || cleaned.match(/\b(are you|r u)\s+feeling\s+low\b/)) {
    const isAboutCoach = cleaned.includes('are you') || cleaned.includes('r u');
    return {
      intent: 'emotional_user',
      confidence: 0.98,
      sentiment: 'empathetic',
      details: {
        isAboutCoach,
        isAboutUser: !isAboutCoach || cleaned.includes('i') || cleaned.includes('me')
      }
    };
  }

  // 2. Motivational requests / crisis points
  const motivationKeywords = [
    'motivate me',
    'inspire me',
    'give me a push',
    'give me motivation',
    'need motivation',
    'pep talk',
    'i want to quit',
    'want to give up',
    'giving up',
    'i cant do this',
    "i can't do this",
    'cannot do this',
    'why am i doing this',
    'is this worth it',
    'fire me up',
    'boost my morale',
    'kick my ass',
    'push me harder',
    'discipline me'
  ];

  if (motivationKeywords.some(k => cleaned.includes(k))) {
    return {
      intent: 'motivational',
      confidence: 0.96,
      sentiment: 'empathetic'
    };
  }

  // If query contains technical keywords and is not emotional/motivational, route to curriculum
  if (containsTechnical && (cleaned.includes('how') || cleaned.includes('what') || cleaned.includes('explain') || cleaned.includes('link') || cleaned.includes('setup') || cleaned.includes('pipeline') || cleaned.includes('tutorial'))) {
    return {
      intent: 'curriculum_query',
      confidence: 0.99,
      sentiment: 'neutral'
    };
  }

  // 3. AI Check-in ("how are you", "how are you feeling", "how is your day going")
  const aiCheckinPatterns = [
    /(?:^|\b)(?:hey|hi|hello|yo)?\s*(?:there|coach|mv33|bro|man)?\s*,?\s*how\s+(?:are\s+you|r\s+u)\b/,
    /(?:^|\b)how\s+(?:are\s+you|r\s+u)\s+feeling\b/,
    /(?:^|\b)how\s+is\s+your\s+day\b/,
    /(?:^|\b)how'?s\s+your\s+day\b/,
    /(?:^|\b)how\s+is\s+it\s+going\b/,
    /(?:^|\b)how'?s\s+it\s+going\b/,
    /(?:^|\b)how\s+are\s+things\b/,
    /(?:^|\b)are\s+you\s+good\b/,
    /(?:^|\b)are\s+you\s+doing\s+well\b/,
    /(?:^|\b)how\s+do\s+you\s+feel\b/,
    /(?:^|\b)what'?s\s+up\s+with\s+you\b/
  ];

  if (aiCheckinPatterns.some(pattern => pattern.test(cleaned))) {
    return {
      intent: 'checkin_ai',
      confidence: 0.95,
      sentiment: 'positive',
      details: { isAboutCoach: true }
    };
  }

  // 4. Greetings
  const exactGreetings = new Set([
    'hi',
    'hello',
    'hey',
    'heyy',
    'heyyy',
    'hola',
    'namaste',
    'yo',
    'sup',
    'whats up',
    "what's up",
    'good morning',
    'morning',
    'good afternoon',
    'afternoon',
    'good evening',
    'evening',
    'hey coach',
    'hi coach',
    'hello coach',
    'mv33',
    'hey mv33',
    'hi mv33'
  ]);

  if (exactGreetings.has(cleaned) || cleaned.match(/^(hi|hello|hey|yo|namaste|good morning|good evening|good afternoon)\s*(there|coach|mv33|bro|man)?$/)) {
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | undefined;
    if (cleaned.includes('morning')) timeOfDay = 'morning';
    else if (cleaned.includes('afternoon')) timeOfDay = 'afternoon';
    else if (cleaned.includes('evening')) timeOfDay = 'evening';

    return {
      intent: 'greeting',
      confidence: 0.99,
      sentiment: 'positive',
      details: { timeOfDayHint: timeOfDay }
    };
  }

  // 5. Progress & Stats Review
  const progressPatterns = [
    /\b(how am i doing|how'?s my progress|show my progress|my progress)\b/,
    /\b(what is my streak|what'?s my streak|check my streak|my streak)\b/,
    /\b(am i on track|are we on track|is my track good)\b/,
    /\b(how many days left|days remaining|how many checkins)\b/,
    /\b(show my stats|my statistics|my consistency)\b/,
    /\b(review my progress|review my week|status report)\b/
  ];

  if (progressPatterns.some(p => p.test(cleaned))) {
    return {
      intent: 'progress_review',
      confidence: 0.94,
      sentiment: 'neutral',
      details: { isAboutUser: true }
    };
  }

  // 6. Identity / Capabilities
  const identityPatterns = [
    /\b(who are you|what are you)\b/,
    /\b(what can you do|how can you help|what do you do)\b/,
    /\b(what is your name|who is mv33|why mv33)\b/,
    /\b(what is your philosophy|tell me about yourself)\b/
  ];

  if (identityPatterns.some(p => p.test(cleaned))) {
    return {
      intent: 'identity_capabilities',
      confidence: 0.95,
      sentiment: 'neutral'
    };
  }

  // 7. Small talk & polite gestures
  const smallTalkPatterns = [
    /\b(tell me a joke|make me laugh|say something funny)\b/,
    /\b(favorite car|red bull|max verstappen|f1|formula 1)\b/,
    /\b(thank you|thanks|thx|appreciate it|great job|awesome)\b/,
    /\b(bye|goodbye|see you|see ya|good night|cya)\b/
  ];

  if (smallTalkPatterns.some(p => p.test(cleaned))) {
    return {
      intent: 'small_talk',
      confidence: 0.90,
      sentiment: 'positive'
    };
  }

  // 8. Default: Curriculum Query for RAG retrieval
  return {
    intent: 'curriculum_query',
    confidence: 0.85,
    sentiment: 'neutral'
  };
}
