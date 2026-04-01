import { TimeBlockData } from "@/data/plannerData";
import { OnboardingData } from "@/components/planner/OnboardingWizard";

let idCounter = 2000;
const makeId = () => `smart-${++idCounter}`;

function formatTime(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function makeRange(startMin: number, dur: number): string {
  const startStr = formatTime(startMin);
  const endStr = formatTime(startMin + dur);
  const startPeriod = startStr.slice(-2);
  const endPeriod = endStr.slice(-2);
  if (startPeriod === endPeriod) {
    return `${startStr.replace(/ (AM|PM)$/, "")}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

interface BlockDef {
  block: string;
  desc: string;
  cat: string;
  dur: number;
  isBreak?: boolean;
}

const BREAK_SUGGESTIONS = [
  "Take a short walk outside",
  "Stretch & hydrate",
  "Coffee / tea break",
  "5-min meditation",
  "Light reading",
  "Quick breathing exercise",
  "Listen to a podcast clip",
  "Step away from screens",
];

function pickBreakDesc(index: number): string {
  return BREAK_SUGGESTIONS[index % BREAK_SUGGESTIONS.length];
}

function getBreakDuration(style: OnboardingData["breakStyle"]): number {
  switch (style) {
    case "short": return 15;
    case "long": return 30;
    case "frequent": return 10;
  }
}

function getBreakFrequency(style: OnboardingData["breakStyle"]): number {
  switch (style) {
    case "short": return 2;    // every 2 work blocks
    case "long": return 3;     // every 3 work blocks
    case "frequent": return 1; // every work block
  }
}

function buildGoalBlocks(goals: string[], workType: OnboardingData["workType"]): BlockDef[] {
  const blocks: BlockDef[] = [];

  const goalMap: Record<string, BlockDef[]> = {
    business: [
      { block: "Client Outreach", desc: "Pitching, emails, proposals, follow-ups", cat: "Revenue", dur: 60 },
      { block: "Business Development", desc: "Strategy, pipeline review, new opportunities", cat: "Revenue", dur: 45 },
    ],
    study: [
      { block: "Deep Learning", desc: "Study session — focused reading & note-taking", cat: "Learning", dur: 60 },
      { block: "Practice & Review", desc: "Apply what you learned, review notes", cat: "Learning", dur: 45 },
    ],
    personal: [
      { block: "Personal Growth", desc: "Journaling, reflection, self-improvement", cat: "Personal", dur: 30 },
      { block: "Skill Building", desc: "Work on a personal skill or hobby", cat: "Personal", dur: 45 },
    ],
    health: [
      { block: "Workout", desc: "Exercise session — gym, run, or home workout", cat: "Health", dur: 45 },
      { block: "Wellness Check", desc: "Meal prep, nutrition, mindfulness", cat: "Health", dur: 20 },
    ],
    creative: [
      { block: "Creative Work", desc: "Design, write, build — pure creation mode", cat: "Creative", dur: 60 },
      { block: "Content Creation", desc: "Scripts, posts, reels, branding content", cat: "Branding", dur: 45 },
    ],
    networking: [
      { block: "Networking & Outreach", desc: "Connect with people, engage online, send intros", cat: "Networking", dur: 30 },
      { block: "Social Engagement", desc: "Comment on posts, reply to DMs, build presence", cat: "Branding", dur: 30 },
    ],
  };

  // Add blocks based on goals
  for (const goal of goals) {
    const gb = goalMap[goal];
    if (gb) {
      blocks.push(...gb);
    }
  }

  // Add work-type specific blocks
  if (workType === "deep") {
    blocks.push({ block: "Deep Work Session", desc: "Extended focused work — no distractions", cat: "Delivery", dur: 120 });
  } else if (workType === "meetings") {
    blocks.push({ block: "Meeting Block", desc: "Calls, standups, client meetings", cat: "Operations", dur: 60 });
    blocks.push({ block: "Follow-up & Admin", desc: "Process meeting notes, send follow-ups", cat: "Operations", dur: 30 });
  } else {
    blocks.push({ block: "Focused Work", desc: "Core work session — main projects", cat: "Delivery", dur: 90 });
    blocks.push({ block: "Collaborative Time", desc: "Meetings, check-ins, team sync", cat: "Operations", dur: 45 });
  }

  return blocks;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateSmartSchedule(data: OnboardingData): {
  weekday: TimeBlockData[];
  weekend: TimeBlockData[];
} {
  const [h, m] = data.wakeUpTime.split(":").map(Number);
  const wakeMin = h * 60 + m;

  const weekday = buildDaySchedule(data, wakeMin, false);
  const weekend = buildDaySchedule(data, wakeMin, true);

  return { weekday, weekend };
}

function buildDaySchedule(
  data: OnboardingData,
  wakeMin: number,
  isWeekend: boolean
): TimeBlockData[] {
  const plan: BlockDef[] = [];
  const breakDur = getBreakDuration(data.breakStyle);
  const breakFreq = getBreakFrequency(data.breakStyle);

  // Morning ritual always first
  plan.push({ block: "Morning Ritual", desc: "Wake up, hydrate, stretch, plan the day", cat: "Personal", dur: 30 });

  // Build goal-based work blocks
  let workBlocks = buildGoalBlocks(data.goals, data.workType);

  if (isWeekend) {
    // Lighter weekend — take ~60% of blocks, add more personal time
    workBlocks = shuffle(workBlocks).slice(0, Math.ceil(workBlocks.length * 0.6));
    workBlocks.push({ block: "Weekend Leisure", desc: "Hobbies, family, fun — you earned it", cat: "Personal", dur: 60 });
    workBlocks.push({ block: "Weekly Review", desc: "Review the week, plan ahead, update goals", cat: "Operations", dur: 45 });
  }

  // Reorder based on productivity preference
  if (data.productivity === "morning") {
    // Heavy/important blocks first
    workBlocks.sort((a, b) => b.dur - a.dur);
  } else {
    // Light tasks first, heavy later
    workBlocks.sort((a, b) => a.dur - b.dur);
  }

  // Meals
  const breakfast: BlockDef = { block: "Breakfast", desc: "Eat well, scan news", cat: "Personal", dur: 30 };
  const lunch: BlockDef = { block: "Lunch Break", desc: "Eat, rest, recharge — no screens", cat: "Personal", dur: 30, isBreak: true };
  const dinner: BlockDef = { block: "Dinner & Rest", desc: "Eat, decompress, family time", cat: "Personal", dur: 30 };

  // Insert breakfast after morning ritual
  plan.push(breakfast);

  // Insert work blocks with breaks
  let breakCounter = 0;
  let breakIdx = 0;
  const midpoint = Math.floor(workBlocks.length / 2);

  for (let i = 0; i < workBlocks.length; i++) {
    // Insert lunch roughly at midpoint
    if (i === midpoint) {
      plan.push(lunch);
    }

    plan.push(workBlocks[i]);
    breakCounter++;

    if (breakCounter >= breakFreq && i < workBlocks.length - 1) {
      plan.push({
        block: "Break",
        desc: pickBreakDesc(breakIdx++),
        cat: "Personal",
        dur: breakDur,
        isBreak: true,
      });
      breakCounter = 0;
    }
  }

  // Evening wind-down
  plan.push(dinner);
  plan.push({ block: "Evening Review", desc: "Review today, plan tomorrow, update task board", cat: "Operations", dur: 20 });
  plan.push({ block: "Wind Down", desc: "No screens, relax, prepare for sleep", cat: "Personal", dur: 30 });

  // Convert to TimeBlockData with times
  let cursor = wakeMin;
  return plan.map(b => {
    const time = makeRange(cursor, b.dur);
    const block: TimeBlockData = {
      id: makeId(),
      time,
      block: b.block,
      desc: b.desc,
      cat: b.cat,
      dur: b.dur,
    };
    cursor += b.dur;
    return block;
  });
}

export function getBreakSuggestions(): string[] {
  return shuffle([...BREAK_SUGGESTIONS]).slice(0, 4);
}
