'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  ChevronRight,
  RotateCcw,
  Zap,
  Flame,
  Dumbbell,
  Compass,
  ArrowLeft,
  X,
  ExternalLink,
  MessageSquare,
  Smartphone,
  SlidersHorizontal,
  ChevronDown,
  Info
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
  intent?: string;
}

interface TelemetryState {
  today: string;
  dayNo: number;
  currentStreak: number;
  totalCheckins: number;
  gymCount: number;
  completedTasks: number;
  currentFocus: string;
  suggestedMinutes: number;
}

const PROMPT_CATEGORIES = [
  {
    category: '🎬 Motion Design & Editing',
    prompts: [
      'How do I link GEOlayers 3 with an After Effects 3D Camera?',
      'Give me documentary scene assembly and audio pacing rules.',
      'Explain keyframe interpolation & easing curves for SaaS animations.',
      'How do I track Google Earth Studio camera exports into After Effects?'
    ]
  },
  {
    category: '⚡ n8n Automation',
    prompts: [
      'Explain an n8n automated media pipeline for my video edits.',
      'How do I set up error routing and retry triggers in n8n workflows?',
      'How can I automate video client deliverables using n8n and cloud storage?'
    ]
  },
  {
    category: '🧠 Mindset & Empathy',
    prompts: [
      'Hey coach, how are you feeling today?',
      'I am feeling low today, need some guidance.',
      'Motivate me to push through today’s session.',
      'How does the 30-Minute Gym habit boost my editing stamina?'
    ]
  },
  {
    category: '📊 Telemetry & Progress',
    prompts: [
      'What is my streak and check-in status?',
      'What is my daily focus and target learning time today?',
      'Who are you and what is your coaching philosophy?'
    ]
  }
];

export default function CoachView({ signedIn }: { signedIn: boolean }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    today: '2026-11-02',
    dayNo: 1,
    currentStreak: 0,
    totalCheckins: 0,
    gymCount: 0,
    completedTasks: 0,
    currentFocus: 'Documentary Pacing & After Effects Fundamentals',
    suggestedMinutes: 60
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `Welcome to your dedicated **MV33 AI Growth Coach & Skill Mentor Workstation**, Krishna! 🏎️💨\n\nI am grounded in your full 100-day system — including your **Adobe After Effects**, **n8n Automation**, **Documentary Editing**, **GEOlayers 3**, and **SaaS Animation** tracks, as well as your **30-Minute Gym** consistency and daily journal reflections.\n\nWhether you need deep technical workflows, mindset resets, or daily pacing, I'm here. What are we tackling today?`,
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Fetch telemetry state from /api/progress
  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/progress')
      .then(async res => {
        if (!res.ok) return;
        const j: any = await res.json();
        const d = j.data || {};
        const days = d.days || {};
        const checkins = d.checkins || [];

        // Calculate streak
        const start = new Date(Date.UTC(2026, 10, 2));
        const now = new Date(j.today + 'T12:00:00Z');
        const dayIdx = Math.min(99, Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000)));
        let i = dayIdx;
        const set = new Set(checkins);
        const dateStr = (idx: number) =>
          new Date(Date.UTC(2026, 10, 2 + idx)).toISOString().slice(0, 10);
        if (!set.has(dateStr(i))) i--;
        let streak = 0;
        for (; i >= 0 && set.has(dateStr(i)); i--) streak++;

        const gymCount = Object.values(days).filter((day: any) =>
          day.habits?.includes('30-Minute Gym')
        ).length;

        setTelemetry({
          today: j.today || '2026-11-02',
          dayNo: dayIdx + 1,
          currentStreak: streak,
          totalCheckins: checkins.length,
          gymCount,
          completedTasks: Object.keys(d.done || {}).length,
          currentFocus: 'Documentary Pacing & Motion Design',
          suggestedMinutes: 60
        });
      })
      .catch(() => {
        // Fallback to defaults
      });
  }, [signedIn]);

  async function handleSend(promptText?: string) {
    const q = (promptText || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!promptText) setInput('');
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
        executionTimeMs: data.executionTimeMs,
        intent: data.intent
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ **Coach Notice**: ${err.message || 'Could not query your curriculum. Make sure you are signed in.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#07101f',
        color: '#eef3ff',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* 1. Main Navigation Header */}
      <header
        style={{
          height: 64,
          background: 'rgba(13, 23, 41, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(169, 191, 234, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: '#f6f8ff',
              letterSpacing: '-1px'
            }}
          >
            100<span style={{ fontWeight: 400 }}>days</span>
            <i
              style={{
                fontStyle: 'normal',
                fontSize: 12,
                background: '#ff873d',
                color: '#101b2e',
                padding: '4px 7px',
                transform: 'skew(-10deg)',
                borderRadius: 3,
                marginLeft: 8,
                fontWeight: 900
              }}
            >
              MV
            </i>
          </a>

          {/* Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 12
            }}
          >
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                textDecoration: 'none',
                color: '#a8b5cf',
                transition: 'background 0.15s ease'
              }}
            >
              Dashboard
            </a>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                background: 'linear-gradient(135deg, rgba(255, 135, 61, 0.2) 0%, rgba(225, 6, 0, 0.12) 100%)',
                color: '#ffab72',
                border: '1px solid rgba(255, 135, 61, 0.35)',
                fontWeight: 700
              }}
            >
              <Sparkles size={14} /> AI Coach
            </span>
            <a
              href="/studio"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                textDecoration: 'none',
                color: '#a8b5cf',
                transition: 'background 0.15s ease'
              }}
            >
              Growth Studio ↗
            </a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile Telemetry Toggle */}
          <button
            onClick={() => setShowTelemetryDrawer(!showTelemetryDrawer)}
            className="mobile-telemetry-btn"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#eef3ff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Telemetry</span>
          </button>

          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#a8b5cf',
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 12px'
            }}
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </a>
        </div>
      </header>

      {/* 2. Main Workstation Area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          maxWidth: 1600,
          width: '100%',
          margin: '0 auto',
          position: 'relative'
        }}
      >
        {/* Left Column: Telemetry & Prompt Catalog (Desktop) */}
        <aside
          className={`coach-sidebar ${showTelemetryDrawer ? 'drawer-open' : ''}`}
          style={{
            width: 380,
            flexShrink: 0,
            borderRight: '1px solid rgba(169, 191, 234, 0.14)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflowY: 'auto',
            background: 'rgba(10, 18, 33, 0.6)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Active Telemetry Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(31, 49, 77, 0.7) 0%, rgba(13, 26, 46, 0.7) 100%)',
              border: '1px solid rgba(169, 191, 234, 0.2)',
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: '#ff873d',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Compass size={13} /> Active Telemetry
              </span>
              <span
                style={{
                  fontSize: 11,
                  background: 'rgba(74, 222, 128, 0.15)',
                  color: '#4ade80',
                  padding: '2px 8px',
                  borderRadius: 8,
                  fontWeight: 600
                }}
              >
                Day {telemetry.dayNo} of 100
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 8
              }}
            >
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <small style={{ color: '#a8b5cf', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} color="#ff873d" /> Active Streak
                </small>
                <strong style={{ fontSize: 20, color: '#fff', display: 'block', marginTop: 4 }}>
                  {telemetry.currentStreak} <span style={{ fontSize: 12, fontWeight: 400, color: '#a8b5cf' }}>days</span>
                </strong>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <small style={{ color: '#a8b5cf', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Dumbbell size={12} color="#ff873d" /> 30-Min Gym
                </small>
                <strong style={{ fontSize: 20, color: '#fff', display: 'block', marginTop: 4 }}>
                  {telemetry.gymCount} <span style={{ fontSize: 12, fontWeight: 400, color: '#a8b5cf' }}>sessions</span>
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 12,
                color: '#a8b5cf'
              }}
            >
              <span style={{ color: '#ffab72', fontWeight: 600 }}>Curriculum Focus:</span>{' '}
              {telemetry.currentFocus}
            </div>
          </div>

          {/* Quick Prompt Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#a8b5cf',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Curated Sprint Prompts
            </span>

            {PROMPT_CATEGORIES.map(cat => (
              <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ffb088' }}>{cat.category}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cat.prompts.map(p => (
                    <button
                      key={p}
                      disabled={loading}
                      onClick={() => handleSend(p)}
                      style={{
                        textAlign: 'left',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'rgba(238, 243, 255, 0.85)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        lineHeight: 1.4,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease, border-color 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 135, 61, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 135, 61, 0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      ⚡ {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Column: Full-Height Chat Stream */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)',
            position: 'relative',
            background: 'rgba(7, 16, 31, 0.95)'
          }}
        >
          {/* Workstation Status Subheader */}
          <div
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: '#e10600',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '2px 7px',
                  fontWeight: 900,
                  fontSize: 11
                }}
              >
                MV33
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Grounded Intelligence Workstation</span>
              <span
                style={{
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 6,
                  fontSize: 11
                }}
              >
                ● Hybrid RAG + Empathy Engine
              </span>
            </div>

            <button
              onClick={() => setMessages([messages[0]])}
              title="Reset conversation"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#a8b5cf',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <RotateCcw size={12} /> Clear Chat
            </button>
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {messages.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: m.role === 'user' ? '80%' : '88%',
                    padding: '16px 20px',
                    borderRadius: 16,
                    background:
                      m.role === 'user'
                        ? 'linear-gradient(135deg, #e10600 0%, #ba0500 100%)'
                        : 'linear-gradient(135deg, rgba(25, 40, 65, 0.65) 0%, rgba(13, 23, 41, 0.65) 100%)',
                    color: '#f8fafc',
                    fontSize: 14,
                    lineHeight: 1.6,
                    border:
                      m.role === 'user'
                        ? '1px solid rgba(255, 255, 255, 0.25)'
                        : '1px solid rgba(169, 191, 234, 0.18)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {m.content}

                  {/* Citations Pill Tray */}
                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#ff873d',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <BookOpen size={12} /> Grounded Knowledge Sources:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {m.citations.map((c, idx) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCitation(c)}
                            title="Click to view verified curriculum snippet"
                            style={{
                              background: 'rgba(255, 135, 61, 0.12)',
                              border: '1px solid rgba(255, 135, 61, 0.3)',
                              color: '#ffb088',
                              padding: '5px 10px',
                              borderRadius: 8,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <span>
                              [{idx + 1}] {c.title.slice(0, 32)}
                              {c.title.length > 32 ? '…' : ''}
                            </span>
                            <ChevronRight size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <small
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 11,
                    marginTop: 6,
                    padding: '0 6px'
                  }}
                >
                  {m.timestamp} {m.executionTimeMs ? `· ${m.executionTimeMs}ms` : ''}{' '}
                  {m.engine ? `· engine: ${m.engine}` : ''}
                </small>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ff873d',
                  fontSize: 13,
                  width: 'fit-content'
                }}
              >
                <Zap size={16} className="animate-spin" />
                <span>Reranking & synthesizing grounded curriculum answer…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Citation Inspector Overlay */}
          {selectedCitation && (
            <div
              style={{
                padding: '16px 24px',
                background: 'rgba(15, 23, 42, 0.98)',
                borderTop: '2px solid #ff873d',
                boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
                fontSize: 13
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: '#ff873d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={14} /> Source: {selectedCitation.source}
                </strong>
                <button
                  onClick={() => setSelectedCitation(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5 }}>
                {selectedCitation.snippet}
              </p>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(10, 18, 33, 0.9)',
              backdropFilter: 'blur(15px)',
              display: 'flex',
              gap: 12,
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={input}
              disabled={loading}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about After Effects, n8n, documentary pacing, maps, or how you're feeling…"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 12,
                padding: '14px 18px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#ff873d')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)')}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: input.trim()
                  ? 'linear-gradient(135deg, #e10600 0%, #ff873d 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                borderRadius: 12,
                padding: '0 24px',
                height: 48,
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                boxShadow: input.trim() ? '0 6px 18px rgba(225, 6, 0, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Send</span>
              <Send size={16} />
            </button>
          </form>
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .coach-sidebar {
            position: fixed;
            top: 64px;
            left: 0;
            bottom: 0;
            z-index: 50;
            width: 320px !important;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .coach-sidebar.drawer-open {
            transform: translateX(0);
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.7);
          }
          .mobile-telemetry-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
