export type ChunkType =
  | 'curriculum'
  | 'task'
  | 'daily_focus'
  | 'roadmap'
  | 'habit'
  | 'journal'
  | 'technical_guide';

export type QueryIntent =
  | 'greeting'
  | 'checkin_ai'
  | 'emotional_user'
  | 'motivational'
  | 'progress_review'
  | 'identity_capabilities'
  | 'small_talk'
  | 'curriculum_query';

export interface DocumentChunk {
  id: string;
  content: string;
  parentContent?: string;
  metadata: {
    type: ChunkType;
    source: string;
    title: string;
    course?: string;
    day?: number;
    tags: string[];
    actionable?: string;
  };
  embedding?: number[];
}

export interface RetrievalCandidate {
  chunk: DocumentChunk;
  denseScore: number;
  bm25Score: number;
  rrfScore: number;
  rerankScore: number;
}

export interface Citation {
  id: string;
  source: string;
  title: string;
  type: ChunkType;
  snippet: string;
  course?: string;
  day?: number;
}

export interface UserContextData {
  today: string;
  dayNo: number;
  currentStreak: number;
  totalCheckins: number;
  completedTasksCount: number;
  gymCount: number;
  recentNotes: { date: string; note: string; mood: number; win: string }[];
  currentFocus: string;
  suggestedMinutes: number;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  retrievedCount: number;
  rerankedCount: number;
  executionTimeMs: number;
  engine: 'gemini' | 'openai' | 'grounded_synthesis' | 'conversational_engine';
  intent?: QueryIntent;
}

