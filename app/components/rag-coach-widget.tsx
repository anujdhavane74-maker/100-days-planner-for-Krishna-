'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  BookOpen,
  ChevronRight,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';
import { Citation } from '@/lib/rag/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
  engine?: string;
  executionTimeMs?: number;
}

const QUICK_PROMPTS = [
  "Hey coach, how are you feeling today?",
  "I'm feeling low today, need some guidance",
  "How is my streak and progress holding up?",
  "What is my daily focus and target learning time today?",
  "How do I link GEOlayers 3 with an After Effects 3D Camera?",
  "Explain an n8n automated media pipeline for my video edits.",
  "Give me documentary scene assembly and audio pacing rules.",
  "How does the 30-Minute Gym habit boost my editing stamina?"
];

export default function RAGCoachWidget({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to your **MV33 AI Growth Coach & Skill Mentor**.\n\nI am grounded in your complete 100-day personalized curriculum (After Effects, n8n, Documentary Editing, GEOlayers 3, SaaS Animation, and Portfolio Development), daily habits, and your personal journal reflections.\n\nAsk me about your daily rhythm, technical workflows, or current consistency.",
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  async function handleSend(textToSend?: string) {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get coach response');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        engine: data.engine,
        executionTimeMs: data.executionTimeMs
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ **Coach Notice**: ${err.message || 'Could not query your curriculum. Ensure you are signed in.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rag-floating-btn"
          aria-label="Open MV33 AI Growth Coach"
          title="Consult your MV33 AI Growth Coach"
          style={{
            position: 'fixed',
            left: 24,
            bottom: 20,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #e10600 0%, #ff873d 100%)',
            color: '#fff',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 24px rgba(225, 6, 0, 0.35)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <span
            style={{
              background: '#07101f',
              color: '#ff873d',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.05em'
            }}
          >
            33
          </span>
          <Sparkles size={16} />
          <span>Ask AI Coach</span>
        </button>
      )}

      {/* Slide-out / Modal Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            width: 'min(480px, calc(100vw - 40px))',
            height: 'min(640px, calc(100vh - 60px))',
            zIndex: 50,
            background: 'rgba(10, 16, 28, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 135, 61, 0.3)',
            borderRadius: 20,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(225, 6, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#f8fafc',
            fontFamily: 'inherit'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(180deg, rgba(225, 6, 0, 0.12) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #e10600 0%, #ff873d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                  boxShadow: '0 4px 12px rgba(225, 6, 0, 0.4)'
                }}
              >
                33
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  MV33 AI Growth Coach
                  <span
                    style={{
                      fontSize: 10,
                      background: 'rgba(74, 222, 128, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontWeight: 600
                    }}
                  >
                    RAG Grounded
                  </span>
                </h3>
                <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                  Curriculum · AE · n8n · Maps · Habits
                </small>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setMessages([messages[0]])}
                title="Reset conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close AI Coach"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                disabled={loading}
                onClick={() => handleSend(p)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  padding: '5px 12px',
                  borderRadius: 14,
                  fontSize: 11,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s ease'
                }}
              >
                ⚡ {p}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {messages.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    background:
                      m.role === 'user'
                        ? 'linear-gradient(135deg, #e10600 0%, #b80500 100%)'
                        : 'rgba(255, 255, 255, 0.06)',
                    color: '#f8fafc',
                    fontSize: 13,
                    lineHeight: 1.55,
                    border:
                      m.role === 'user'
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {m.content}

                  {/* Citations Pill Tray */}
                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#ff873d',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <BookOpen size={11} /> Grounded Sources:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {m.citations.map((c, idx) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCitation(c)}
                            title="Click to view verified source snippet"
                            style={{
                              background: 'rgba(255, 135, 61, 0.12)',
                              border: '1px solid rgba(255, 135, 61, 0.3)',
                              color: '#ffb088',
                              padding: '3px 8px',
                              borderRadius: 8,
                              fontSize: 10.5,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <span>[{idx + 1}] {c.title.slice(0, 24)}{c.title.length > 24 ? '…' : ''}</span>
                            <ChevronRight size={10} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <small
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 10,
                    marginTop: 4,
                    padding: '0 4px'
                  }}
                >
                  {m.timestamp} {m.executionTimeMs ? `· ${m.executionTimeMs}ms` : ''}
                </small>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ff873d',
                  fontSize: 12,
                  width: 'fit-content'
                }}
              >
                <Zap size={14} className="animate-spin" />
                <span>Reranking & synthesizing grounded curriculum answer…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Citation Inspector Overlay */}
          {selectedCitation && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.95)',
                borderTop: '1px solid rgba(255, 135, 61, 0.4)',
                fontSize: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ color: '#ff873d' }}>
                  Source: {selectedCitation.source}
                </strong>
                <button
                  onClick={() => setSelectedCitation(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                {selectedCitation.snippet}
              </p>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '14px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              gap: 10
            }}
          >
            <input
              type="text"
              value={input}
              disabled={loading}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about After Effects, n8n, maps, gym, or today's plan…"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#fff',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() ? '#e10600' : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                borderRadius: 10,
                padding: '0 16px',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
