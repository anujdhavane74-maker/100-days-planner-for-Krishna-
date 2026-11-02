import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDatabase } from '@/lib/db-adapter';
import { RAGGrowthAgent } from '@/lib/rag/agent';
import { UserContextData } from '@/lib/rag/types';
import plan from '@/app/plan.json';
import { z } from 'zod';

const agent = new RAGGrowthAgent();

const requestSchema = z.object({
  query: z.string().trim().min(1).max(2000)
});

function calculateStreak(checkins: string[], today: string): number {
  const set = new Set(checkins);
  const start = new Date(Date.UTC(2026, 10, 2));
  const now = new Date(today + 'T12:00:00Z');
  const dayIdx = Math.min(99, Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000)));

  let i = dayIdx;
  const dateStr = (idx: number) =>
    new Date(Date.UTC(2026, 10, 2 + idx)).toISOString().slice(0, 10);

  if (!set.has(dateStr(i))) i--;
  let current = 0;
  for (; i >= 0 && set.has(dateStr(i)); i--) current++;
  return current;
}

export async function POST(req: Request) {
  // 1. Verify authentication
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: 'Please sign in to consult your MV33 AI Coach.' },
      { status: 401 }
    );
  }

  // 2. Parse & validate request body
  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await req.json();
    body = requestSchema.parse(raw);
  } catch {
    return Response.json(
      { error: 'Invalid query. Please ask a valid question.' },
      { status: 400 }
    );
  }

  // 3. Assemble active user context
  let userContext: Partial<UserContextData> = {};
  try {
    const db = await getDatabase();
    const row = await db
      .prepare('SELECT data, revision FROM journeys WHERE user_id = ?')
      .bind(user.userId)
      .first<{ data: string; revision: number }>();

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const start = new Date(Date.UTC(2026, 10, 2));
    const now = new Date(todayStr + 'T12:00:00Z');
    const dayNo = Math.min(
      100,
      Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000) + 1)
    );

    const todayPlan = (plan.daily[dayNo - 1] as any) || {};

    if (row?.data) {
      const parsed = JSON.parse(row.data);
      const days = parsed.days || {};
      const checkins = parsed.checkins || [];
      const streak = calculateStreak(checkins, todayStr);
      const gymCount = Object.values(days).filter((d: any) =>
        d.habits?.includes('30-Minute Gym')
      ).length;

      const recentNotes = Object.entries(days)
        .filter(([, d]: any) => d.note || d.win)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 3)
        .map(([date, d]: any) => ({
          date,
          note: d.note || '',
          mood: d.mood || 0,
          win: d.win || ''
        }));

      userContext = {
        today: todayStr,
        dayNo,
        currentStreak: streak,
        totalCheckins: checkins.length,
        completedTasksCount: Object.keys(parsed.done || {}).length,
        gymCount,
        recentNotes,
        currentFocus: todayPlan.F || 'Review & apply',
        suggestedMinutes: todayPlan.G || 60
      };
    } else {
      userContext = {
        today: todayStr,
        dayNo,
        currentStreak: 0,
        totalCheckins: 0,
        completedTasksCount: 0,
        gymCount: 0,
        recentNotes: [],
        currentFocus: todayPlan.F || 'Review & apply',
        suggestedMinutes: todayPlan.G || 60
      };
    }
  } catch {
    // Non-fatal, proceed with static retrieval
  }

  // 4. Execute Advanced Modular RAG
  const result = await agent.query(body.query, userContext);

  return Response.json(result, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

