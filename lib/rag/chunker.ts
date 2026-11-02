import plan from '@/app/plan.json';
import { DocumentChunk } from './types';

export const TECHNICAL_GUIDES: Array<{
  id: string;
  title: string;
  course: string;
  tags: string[];
  content: string;
}> = [
  {
    id: 'guide-ae-expressions',
    title: 'Essential After Effects Expressions for Motion Designers',
    course: 'Adobe After Effects',
    tags: ['After Effects', 'Expressions', 'Motion Graphics', 'Animation'],
    content: `After Effects expressions automate and streamline animation workflows:
1. Smooth looping: loopOut("cycle") for seamless cycling, or loopOut("pingpong") to oscillate.
2. Controlled jitter: wiggle(frequency, amplitude) e.g., wiggle(3, 15) for natural handheld camera drift.
3. Range mapping: linear(value, inMin, inMax, outMin, outMax) to map audio levels or slider controls to scale/opacity.
4. Time-based rotation: time * speed e.g., time * 90 rotates 90 degrees per second.
5. Value clamping: clamp(value, min, max) ensures properties do not exceed target visual bounds.`
  },
  {
    id: 'guide-geolayers-workflow',
    title: 'GEOlayers 3 + After Effects Production Pipeline',
    course: 'GEOlayers 3 Animation',
    tags: ['GEOlayers 3', 'Cartography', 'Google Earth', 'Motion Design'],
    content: `GEOlayers 3 production pipeline for documentary and explainer maps:
1. Map Style Selection: Use Mapbox / Stadia Maps vector styles for clean, non-distracting backgrounds.
2. Route Tracing: Import GeoJSON or draw paths directly in GEOlayers. Enable auto-zoom along pathways.
3. Camera Linking: Link GEOlayers view controls to an After Effects 3D Camera for cinematic tilts, zooms, and fly-bys.
4. Pin Anchoring & Callouts: Anchor labels, statistics, and floating UI cards to geographic coordinates so they stay locked during camera rotation.
5. Lighting & Atmosphere: Pre-compose map layers and add vignette, color grading, and subtle atmospheric dust for a cinematic documentary aesthetic.`
  },
  {
    id: 'guide-n8n-media-automation',
    title: 'n8n Video Asset & Media Automation Blueprint',
    course: 'n8n Automation',
    tags: ['n8n', 'Automation', 'Workflows', 'Webhooks', 'Media Management'],
    content: `n8n media automation architecture for content creators and editors:
1. Ingestion Triggers: Webhook node or Google Drive / Dropbox trigger watches folder for new video exports and raw footage.
2. Metadata Extraction & Transformation: Use n8n Code (JavaScript) node to parse filenames, dates, and camera tags.
3. Automated Transcription: Forward audio tracks via HTTP Request node to Whisper API for automated SRT subtitle generation.
4. Thumbnail & Asset Pipeline: Generate YouTube/Instagram preview frames and upload to review staging servers.
5. Notification & Logging: Send Discord or Telegram alerts when renders complete, with links to final cloud assets.`
  },
  {
    id: 'guide-doc-editing-pacing',
    title: 'Documentary Scene Assembly, Pacing & Audio Design',
    course: 'Documentary Editing',
    tags: ['Documentary', 'Premiere Pro', 'Pacing', 'Storytelling', 'Sound Design'],
    content: `Professional documentary editing principles:
1. Pacing & Breathing Room: Don't cut on every sentence. Let reaction shots breathe for 1.5–3 seconds to give emotional weight.
2. J-Cuts and L-Cuts: Always split audio and video transitions. Introduce ambient audio or character dialogue 0.5s before cutting the video.
3. 3-Point Story Arc: Anchor scenes with an opening premise, an escalating complication/conflict, and a reflective resolution.
4. Layered Sound Design: Combine room tone, foley footsteps, low sub-bass drones for tension, and acoustic textures rather than overpowering orchestral music.
5. B-Roll Intentionality: Every cutaway must advance the narrative argument or reveal subtext, never just fill empty visual space.`
  },
  {
    id: 'guide-30min-gym',
    title: '30-Minute Gym Routine & Athletic Discipline',
    course: 'Personal Growth',
    tags: ['Gym', 'Physical Fitness', 'Habits', 'Energy', 'Discipline'],
    content: `The 100-Day 30-Minute Gym practice:
1. High-Efficiency Split: Focus on compound movements (Squat/Leg Press, Push-ups/Dumbbell Press, Pull-ups/Rows, Core planks).
2. Intensity over Duration: 30 minutes of high focus is superior to 90 minutes of distracted scrolling.
3. Cognitive Benefits for Creators: Resistance training increases brain-derived neurotrophic factor (BDNF), sharpening focus for long editing and animation sessions.
4. Consistency Rule: Even on low energy or exam days, completing 30 minutes of stretching, mobility, or brisk incline walking preserves the unbroken streak.`
  }
];

export function buildStaticKnowledgeBase(): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // 1. Course Modules Chunks
  plan.courses.forEach((item: any, i: number) => {
    chunks.push({
      id: `course-${i}`,
      content: `Course Track: ${item.A}\nModule Title: ${item.B}\nStatus: Active 100-day curriculum\nFocus Area: Mastering ${item.A} through dedicated modules and applied practice.`,
      parentContent: `Full curriculum for ${item.A}: Module ${i + 1} covers ${item.B}. This is part of the 100-day growth program personalized for documentary editing, motion graphics, and automation.`,
      metadata: {
        type: 'curriculum',
        source: `Curriculum: ${item.A}`,
        title: item.B,
        course: item.A,
        tags: [item.A, 'Curriculum', 'Module']
      }
    });
  });

  // 2. Tasks Chunks
  plan.tasks.forEach((task: any) => {
    chunks.push({
      id: `task-${task.A}`,
      content: `Task ID: ${task.A}\nCourse: ${task.B}\nAction Title: ${task.C}\nTarget Deadline: Day ${task.D} in the 100-day timeline\nState: Ready for practice and evidence submission.`,
      parentContent: `Detailed practical exercise for ${task.B}: "${task.C}". Scheduled for execution around Day ${task.D}. Designed to build portfolio evidence.`,
      metadata: {
        type: 'task',
        source: `Task: ${task.A} (${task.B})`,
        title: task.C,
        course: task.B,
        tags: [task.B, 'Task', 'Exercise', task.A]
      }
    });
  });

  // 3. Daily Schedule Chunks
  plan.daily.forEach((day: any, i: number) => {
    const dayNumber = i + 1;
    chunks.push({
      id: `daily-${dayNumber}`,
      content: `Day ${dayNumber} of 100 (Date: ${day.B})\nSubject / Track: ${day.E}\nDaily Focus: ${day.F}\nSuggested Learning Time: ${day.G} minutes\nCommute / Transit Strategy: ${day.H || 'Adaptable'}\nSession Mode: Normal rhythm`,
      parentContent: `Schedule specification for Day ${dayNumber} (${day.B}): Focus on "${day.F}" in track "${day.E}". Allocate ${day.G} minutes of focused practice. Rest days and unit test days are balanced into the 100-day calendar.`,
      metadata: {
        type: 'daily_focus',
        source: `Day ${dayNumber} (${day.B})`,
        title: `Day ${dayNumber} Focus: ${day.F}`,
        course: day.E,
        day: dayNumber,
        tags: ['Daily Focus', day.E, `Day ${dayNumber}`]
      }
    });
  });

  // 4. Roadmap Milestones
  plan.roadmap.forEach((rm: any) => {
    chunks.push({
      id: `roadmap-w${rm.A}`,
      content: `Week ${rm.A} Roadmap Milestone\nPrimary Focus: ${rm.D}\nPortfolio Objective: ${rm.E}\nSpeaking / Confidence Milestone: ${rm.F}`,
      parentContent: `Week ${rm.A} comprehensive growth milestone: Technical focus is "${rm.D}", producing portfolio piece "${rm.E}", with speaking practice "${rm.F}".`,
      metadata: {
        type: 'roadmap',
        source: `Week ${rm.A} Roadmap`,
        title: `Week ${rm.A}: ${rm.D}`,
        tags: ['Roadmap', 'Weekly Milestone', `Week ${rm.A}`]
      }
    });
  });

  // 5. Daily Habits & Practices
  const habitsData = [
    { title: 'Morning visualization', tip: 'Picture your direction. Choose one small action.' },
    { title: 'Speaking practice', tip: 'Record a 2-minute talk. Listen and try again.' },
    { title: 'Mindfulness', tip: 'Five quiet minutes. Notice, pause, return.' },
    { title: 'Gratitude', tip: 'Write down one thing you appreciated.' },
    { title: 'Kindness & listening', tip: 'Listen fully before responding.' },
    { title: 'Decision or leadership', tip: 'Make a thoughtful choice or take responsibility.' },
    { title: 'Evening reflection', tip: 'Recognize your effort and what you learned.' },
    { title: '30-Minute Gym', tip: '30 minutes of gym training or physical fitness.' }
  ];

  habitsData.forEach((h, idx) => {
    chunks.push({
      id: `habit-${idx + 1}`,
      content: `Habit #${idx + 1}: ${h.title}\nDescription: ${h.tip}\nRequirement: Practiced daily throughout the 100-day challenge to build compounding consistency, stamina and mental resilience.`,
      parentContent: `Core personal growth habit #${idx + 1} (${h.title}): "${h.tip}". Checked daily on the dashboard alongside technical studies.`,
      metadata: {
        type: 'habit',
        source: `Habit #${idx + 1} · ${h.title}`,
        title: h.title,
        tags: ['Habit', 'Personal Growth', h.title]
      }
    });
  });

  // 6. Technical Guides
  TECHNICAL_GUIDES.forEach(g => {
    chunks.push({
      id: g.id,
      content: `${g.title}\nCourse: ${g.course}\n\n${g.content}`,
      parentContent: g.content,
      metadata: {
        type: 'technical_guide',
        source: `Technical Guide · ${g.title}`,
        title: g.title,
        course: g.course,
        tags: g.tags
      }
    });
  });

  return chunks;
}
