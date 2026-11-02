import { IntentClassificationResult } from './intent';
import { UserContextData } from './types';

export class PersonalityEngine {
  /**
   * Generates a warm, human-like, context-aware conversational response.
   */
  public generateResponse(
    query: string,
    intentResult: IntentClassificationResult,
    userContext?: Partial<UserContextData>
  ): string {
    const ctx = this.normalizeContext(userContext);
    const timeOfDay = this.getTimeOfDay();

    switch (intentResult.intent) {
      case 'greeting':
        return this.renderGreeting(timeOfDay, ctx);

      case 'checkin_ai':
        return this.renderAICheckin(timeOfDay, ctx, query);

      case 'emotional_user':
        return this.renderEmotionalSupport(query, ctx, intentResult);

      case 'motivational':
        return this.renderMotivation(ctx);

      case 'progress_review':
        return this.renderProgressReview(ctx);

      case 'identity_capabilities':
        return this.renderIdentityAndCapabilities();

      case 'small_talk':
        return this.renderSmallTalk(query, ctx);

      default:
        return this.renderFallbackConversation(ctx);
    }
  }

  private normalizeContext(userContext?: Partial<UserContextData>) {
    return {
      today: userContext?.today || 'Today',
      dayNo: userContext?.dayNo || 1,
      currentStreak: userContext?.currentStreak || 0,
      totalCheckins: userContext?.totalCheckins || 0,
      completedTasksCount: userContext?.completedTasksCount || 0,
      gymCount: userContext?.gymCount || 0,
      currentFocus: userContext?.currentFocus || 'Daily Practice & Skill Compounding',
      suggestedMinutes: userContext?.suggestedMinutes || 60,
      recentNotes: userContext?.recentNotes || []
    };
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    try {
      const istHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          hour12: false
        }).format(new Date()),
        10
      );
      if (istHour >= 5 && istHour < 12) return 'morning';
      if (istHour >= 12 && istHour < 17) return 'afternoon';
      if (istHour >= 17 && istHour < 22) return 'evening';
      return 'night';
    } catch {
      return 'morning';
    }
  }

  private renderGreeting(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
    ctx: ReturnType<typeof this.normalizeContext>
  ): string {
    const greetings = {
      morning: 'Good morning, Krishna!',
      afternoon: 'Good afternoon, Krishna!',
      evening: 'Good evening, Krishna!',
      night: 'Hey Krishna, late session tonight!'
    };

    const header = greetings[timeOfDay] || 'Hey Krishna!';
    const streakMsg =
      ctx.currentStreak > 0
        ? `You're riding an active **${ctx.currentStreak}-day streak** into **Day ${ctx.dayNo} of 100**.`
        : `Welcome to **Day ${ctx.dayNo} of 100** of your growth championship.`;

    return `${header} 🏎️💨

${streakMsg}

• **Today's Focus**: ${ctx.currentFocus}
• **Recommended Time**: ${ctx.suggestedMinutes} minutes
• **Gym Consistency**: ${ctx.gymCount} sessions completed

Are we diving into After Effects keyframes, setting up n8n automation, or hitting the 30-minute gym block first? Tell me where you want to start!`;
  }

  private renderAICheckin(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
    ctx: ReturnType<typeof this.normalizeContext>,
    query: string
  ): string {
    const lower = query.toLowerCase();
    const isAboutDay = lower.includes('day') || lower.includes('going');

    let opening = '';
    if (isAboutDay) {
      opening = `My day is running on pure high-octane energy! Coaching Day ${ctx.dayNo} of your 100-day system is the highlight of my board.`;
    } else {
      opening = `I'm feeling sharp, dialed in, and fully focused! As your MV33 coach, my telemetry is green and ready to roll.`;
    }

    let personalNoteEcho = '';
    if (ctx.recentNotes.length > 0) {
      const latest = ctx.recentNotes[0];
      if (latest.win) {
        personalNoteEcho = `\nI loved seeing your win from your journal: *" ${latest.win} "*. That kind of consistency builds championship caliber.`;
      }
    }

    return `${opening}

More importantly, Krishna, **how are you feeling today?**
${personalNoteEcho}

You have **Day ${ctx.dayNo}** queued up with **"${ctx.currentFocus}"** (${ctx.suggestedMinutes} min). How are your energy levels heading into today's creative sprint?`;
  }

  private renderEmotionalSupport(
    query: string,
    ctx: ReturnType<typeof this.normalizeContext>,
    intentResult: IntentClassificationResult
  ): string {
    const isCheckingCoach = intentResult.details?.isAboutCoach && !query.toLowerCase().includes('i am') && !query.toLowerCase().includes("i'm");

    if (isCheckingCoach) {
      return `I really appreciate you checking in on me with genuine human care, Krishna! 🙏

As your AI coach, I don't get tired, frustrated, or down — my energy is permanently locked at 100% to back you up through every turn of these 100 days.

**But the real telemetry that matters is yours.**
Are *you* feeling low or drained today? If you're experiencing fatigue, creative block, or low energy, talk to me. We can adjust today's load, lower the friction, or focus on a restorative 30-minute gym session. How are you holding up?`;
    }

    // User is feeling low, tired, or overwhelmed
    let journalContext = '';
    if (ctx.recentNotes.length > 0) {
      const last = ctx.recentNotes[0];
      if (last.mood && last.mood <= 2) {
        journalContext = `I also noticed in your recent journal entry that you felt a bit drained (${last.mood}/5). That tells me you've been pushing hard.`;
      }
    }

    return `I hear you loud and clear, Krishna. Take a deep, slow breath. 🤝

First of all: **feeling low or exhausted on a 100-day sprint is completely normal.** It is not a character flaw, and it does not mean your momentum is broken. Even Max Verstappen has wet track days where grip is zero and the car feels impossible to steer.
${journalContext ? `\n${journalContext}\n` : ''}
Here is our **MV33 Low-Energy Protocol** for today:

1. **Lower the floor, don't drop the race**
   Do not force yourself to do a grueling 2-hour editing marathon today. Instead, drop the target to **just 10 minutes** of After Effects or n8n. Open the timeline, touch one layer or node, and if you still feel depleted, you have full permission to stop.

2. **Physical State Reset (The 30-Minute Gym Rule)**
   Physical movement alters brain chemistry faster than willpower. A light 20-30 minute walk or gym session will flush cortisol and reset your mental baseline. You've already banked **${ctx.gymCount} gym sessions** — you know how good it feels afterwards.

3. **Protect the Chain**
   Your current streak is **${ctx.currentStreak} days**. Even checking in today and writing one sentence in your journal keeps the psychological habit alive.

You don't need to be a superhero every single day. You just need to show up, protect the baseline, and be kind to yourself. 

How about we just tackle one micro-step right now?`;
  }

  private renderMotivation(ctx: ReturnType<typeof this.normalizeContext>): string {
    const daysLeft = Math.max(0, 100 - ctx.dayNo);

    return `Listen to me closely, Krishna. 🏎️🔥

When you signed up for this 100-Day Growth System, you knew it wasn't going to be a casual walk in the park. You committed to mastering **high-end Documentary Editing, GEOlayers 3 & Google Earth animations, n8n automations, and building a world-class portfolio**.

Look at where you stand right now:
• **Day ${ctx.dayNo} of 100** (${daysLeft} days to go until the finish line)
• **${ctx.currentStreak} Days Consecutive Streak**
• **${ctx.gymCount} Gym Sessions Logged**
• **${ctx.completedTasksCount} Portfolio Milestones Crushed**

Max Verstappen has a simple philosophy: *"Simply Lovely"* isn't born on the podium — it is born in the rain, in the simulator at midnight, and on the unglamorous laps when nobody is watching.

Motivation is an emotion that comes and goes like the wind. **Discipline is the engine.**

You don't need to see the entire staircase; you just need to execute today's block: **"${ctx.currentFocus}"**.

Put on your headphones, open Premiere / After Effects, start your timer, and let's put in the laps. Let's go!`;
  }

  private renderProgressReview(ctx: ReturnType<typeof this.normalizeContext>): string {
    const daysLeft = Math.max(0, 100 - ctx.dayNo);
    const completionPercent = Math.round((ctx.dayNo / 100) * 100);

    let journalSnippet = '';
    if (ctx.recentNotes.length > 0) {
      const top = ctx.recentNotes[0];
      journalSnippet = `\n• **Latest Reflection (${top.date})**: "${top.note || 'Consistent execution'}" · Mood: ${top.mood || 5}/5 · Win: "${top.win || 'Solid work'}"`;
    }

    return `📊 **Krishna's 100-Day Championship Telemetry** (Day ${ctx.dayNo} of 100)

• **Race Progress**: ${completionPercent}% complete (${daysLeft} days remaining)
• **Active Daily Streak**: 🔥 **${ctx.currentStreak} days unbroken**
• **Total Daily Check-ins**: 🏁 **${ctx.totalCheckins} / 100**
• **30-Min Gym Consistency**: 🏋️ **${ctx.gymCount} sessions logged**
• **Portfolio Tasks Done**: ✅ **${ctx.completedTasksCount} completed**
• **Today's Active Focus**: 🎯 **${ctx.currentFocus}** (${ctx.suggestedMinutes} minutes)
${journalSnippet}

**Coach Verdict**:
${
  ctx.currentStreak >= 5
    ? "Your compounding curve is steep and steady. You are building real muscle memory across your creative and physical habits. Maintain this rhythm."
    : "Every day you check in and record a win is a brick in your high-tier editing career. Lock in today's session to extend your streak."
}`;
  }

  private renderIdentityAndCapabilities(): string {
    return `👋 **I am your MV33 AI Growth Coach & Skill Mentor.**

Built specifically for Krishna's 100-Day Growth System, my mission is to keep you disciplined, technically sharp, and creatively unstoppable.

**What I Can Do For You:**
1. 🎯 **Curriculum Guidance**: Instant answers and step-by-step workflows for:
   • Adobe After Effects & Motion Design
   • Google Earth Studio + 3D Camera integration
   • GEOlayers 3 map animations
   • Documentary pacing, sound design, and scene assembly
   • n8n automated media workflows
   • SaaS product animations & client portfolio development

2. 📈 **System Accountability**: Track your daily streak, 30-minute gym consistency, daily focus, and milestone completion.

3. 🧠 **Mindset & Mental Resilience**: Empathy when energy is low, Max Verstappen–inspired discipline when you need a push, and habit coaching to protect your daily chain.

4. 📚 **RAG-Grounded Citations**: Direct references to your verified 100-day roadmap, task briefs, and personal journal logs.

How can I help you level up your craft today?`;
  }

  private renderSmallTalk(query: string, ctx: ReturnType<typeof this.normalizeContext>): string {
    const q = query.toLowerCase();

    if (q.includes('joke') || q.includes('laugh') || q.includes('funny')) {
      return `Why did the video editor break up with their keyframe?
Because their relationship had too many easing issues and zero spatial tension! 😂

Now that we got a smile, let's bring that smooth interpolation into your **"${ctx.currentFocus}"** session today!`;
    }

    if (q.includes('max') || q.includes('verstappen') || q.includes('red bull') || q.includes('f1')) {
      return `Max Verstappen's relentless focus is the DNA of this entire system! 🏎️💨
No excuses, relentless precision, and letting the work speak for itself. *"Simply Lovely"* isn't luck — it's 10,000 unglamorous laps. Let's bring that same ruthless precision to your timeline today.`;
    }

    if (q.includes('thank') || q.includes('thanks') || q.includes('appreciate')) {
      return `You're always welcome, Krishna! 👊
I'm in your pit wall for all 100 days. Now go crush today's edit and log that daily win!`;
    }

    if (q.includes('bye') || q.includes('good night') || q.includes('cya') || q.includes('see you')) {
      return `Rest up and recharge, Krishna! 🌙
Make sure your daily check-in is logged before you sleep. Tomorrow we push the compounding curve even higher!`;
    }

    return `Always here for you, Krishna! Let me know if you need technical guidance on After Effects, n8n, documentary pacing, or a mindset check for today.`;
  }

  private renderFallbackConversation(ctx: ReturnType<typeof this.normalizeContext>): string {
    return `I'm with you, Krishna! Day ${ctx.dayNo} is live with **"${ctx.currentFocus}"**.
Whether you want a breakdown of today's curriculum, technical advice on After Effects or n8n, or just a quick reset, I'm ready. What's on your mind?`;
  }
}
