// =============================================================
// ProductiveDay — Smart Schedule Generator (profession-aware)
// =============================================================
import { TimeBlockData } from "@/data/plannerData";
import { OnboardingData, Profession } from "@/components/planner/OnboardingWizard";

let idCounter = 2000;
const makeId = () => `smart-${++idCounter}`;

// ─── Time helpers ─────────────────────────────────────────────
function formatTime(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m   = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function makeRange(startMin: number, dur: number): string {
  const s = formatTime(startMin);
  const e = formatTime(startMin + dur);
  const sp = s.slice(-2), ep = e.slice(-2);
  return sp === ep ? `${s.replace(/ (AM|PM)$/, "")}–${e}` : `${s}–${e}`;
}

interface BlockDef {
  block: string;
  desc:  string;
  cat:   string;
  dur:   number;
}

// ─── Break helpers ────────────────────────────────────────────
const BREAK_DESCS = [
  "Quick stretch & hydrate",
  "Step away from screens",
  "5-min walk or breathing",
  "Coffee / tea break",
  "Light reading",
  "5-min meditation",
];

function breakDur(style: OnboardingData["breakStyle"]): number {
  return style === "short" ? 15 : style === "long" ? 30 : 10;
}
function breakFreq(style: OnboardingData["breakStyle"]): number {
  return style === "short" ? 2 : style === "long" ? 3 : 1;
}

// ─── Work-start offset by work-hours setting ─────────────────
function workStartOffset(wh: OnboardingData["workHours"]): number {
  switch (wh) {
    case "early":    return 30;   // 30 min after wake = morning ritual only
    case "standard": return 60;   // 1h
    case "flexible": return 90;
    case "night":    return 120;
  }
}

// ─── Profession-specific core block templates ─────────────────

const PROFESSION_BLOCKS: Record<Profession, {
  weekday: BlockDef[];
  weekend: BlockDef[];
}> = {

  student: {
    weekday: [
      { block: "Review Yesterday's Notes",    desc: "Quickly scan what you studied yesterday",           cat: "Learning",  dur: 20 },
      { block: "Active Study Block",           desc: "Deep reading, flashcards, problem solving",         cat: "Learning",  dur: 90 },
      { block: "Assignment Work",              desc: "Tackle today's assignment or essay",                cat: "Delivery",  dur: 75 },
      { block: "Class / Lecture Prep",         desc: "Read ahead, prepare questions, gather notes",       cat: "Learning",  dur: 45 },
      { block: "Practice Problems",            desc: "Apply concepts — past papers, exercises",           cat: "Learning",  dur: 60 },
      { block: "Group Study / Discussion",     desc: "Study group, peer learning, collaborative review",  cat: "Networking",dur: 45 },
      { block: "Research Block",               desc: "Library research, citations, source gathering",     cat: "Learning",  dur: 60 },
    ],
    weekend: [
      { block: "Weekly Academic Review",       desc: "Review all subjects for the week ahead",            cat: "Learning",  dur: 60 },
      { block: "Assignment Catch-up",          desc: "Complete or start upcoming assignments",            cat: "Delivery",  dur: 90 },
      { block: "Skill Development",            desc: "Extra-curricular skill or personal project",        cat: "Personal",  dur: 60 },
      { block: "Leisure Reading",              desc: "Read something you enjoy — non-textbook",           cat: "Personal",  dur: 45 },
    ],
  },

  employee: {
    weekday: [
      { block: "Team Standup",                 desc: "Daily sync — blockers, priorities, updates",        cat: "Operations",dur: 20 },
      { block: "Deep Work Session",            desc: "Focused project work — no Slack, no calls",         cat: "Delivery",  dur: 90 },
      { block: "Email & Communication",        desc: "Process inbox, respond to messages, Slack",         cat: "Operations",dur: 30 },
      { block: "Project Block",                desc: "Core deliverable work for today's priorities",      cat: "Delivery",  dur: 75 },
      { block: "Meeting Block",                desc: "Scheduled calls, 1:1s, reviews",                    cat: "Operations",dur: 60 },
      { block: "Learning & Development",       desc: "Course, reading, upskilling — invest in yourself",  cat: "Learning",  dur: 30 },
      { block: "Task Review & Planning",       desc: "Review today's work, plan tomorrow",                cat: "Operations",dur: 20 },
    ],
    weekend: [
      { block: "Career Development",           desc: "Upskill, portfolio, side project, networking",      cat: "Learning",  dur: 60 },
      { block: "Week Planning",                desc: "Plan next week's priorities and goals",             cat: "Operations",dur: 30 },
      { block: "Personal Project",             desc: "Work on something you love outside work",           cat: "Personal",  dur: 60 },
    ],
  },

  entrepreneur: {
    weekday: [
      { block: "CEO Morning Power Hour",       desc: "Journal, priorities, 3 MITs for the day",           cat: "Strategy",  dur: 45 },
      { block: "Revenue Activities",           desc: "Sales calls, proposals, follow-ups, outreach",      cat: "Revenue",   dur: 90 },
      { block: "Strategic Deep Work",          desc: "Vision, planning, roadmap — no meetings",           cat: "Strategy",  dur: 75 },
      { block: "Team / Partner Sync",          desc: "Standups, partner updates, delegation",             cat: "Operations",dur: 30 },
      { block: "Product / Offer Review",       desc: "Improve product, customer feedback, iterate",       cat: "Delivery",  dur: 45 },
      { block: "Growth & Marketing",           desc: "Content, ads, SEO, partnerships, PR",               cat: "Revenue",   dur: 45 },
      { block: "Investor / Advisor Calls",     desc: "Fundraising, mentorship, strategic relationships",  cat: "Networking",dur: 45 },
      { block: "Finance & Operations",         desc: "Cash flow, invoices, metrics, reporting",           cat: "Operations",dur: 30 },
    ],
    weekend: [
      { block: "Weekly Business Review",       desc: "Revenue metrics, growth, wins and blockers",        cat: "Strategy",  dur: 45 },
      { block: "Strategic Planning",           desc: "Quarterly thinking, vision, goal alignment",        cat: "Strategy",  dur: 60 },
      { block: "Networking & Community",       desc: "Events, DMs, relationship building",               cat: "Networking",dur: 45 },
      { block: "Personal Recharge",            desc: "Family, hobbies, physical health — protect this",  cat: "Personal",  dur: 90 },
    ],
  },

  creator: {
    weekday: [
      { block: "Trend Research",               desc: "Scroll for inspiration, check trending topics",     cat: "Research",  dur: 30 },
      { block: "Content Planning",             desc: "Scripts, outlines, shot lists, content calendar",   cat: "Strategy",  dur: 45 },
      { block: "Recording / Filming Block",    desc: "Film videos, record audio, shoot photos",           cat: "Delivery",  dur: 90 },
      { block: "Editing Block",                desc: "Video edit, audio cleanup, thumbnail design",       cat: "Delivery",  dur: 90 },
      { block: "Publishing & Upload",          desc: "Post content, write captions, add hashtags, SEO",  cat: "Delivery",  dur: 30 },
      { block: "Community Engagement",         desc: "Reply to comments, DMs, engage with audience",     cat: "Networking",dur: 30 },
      { block: "Brand & Partnership Work",     desc: "Sponsor emails, deal negotiation, collabs",         cat: "Revenue",   dur: 30 },
      { block: "Analytics Review",             desc: "Views, engagement, growth — what's working?",      cat: "Strategy",  dur: 20 },
    ],
    weekend: [
      { block: "Batch Content Creation",       desc: "Film or write multiple pieces in one sitting",      cat: "Delivery",  dur: 120 },
      { block: "Content Ideation",             desc: "Brainstorm next week's content ideas",              cat: "Strategy",  dur: 45 },
      { block: "Audience Engagement Day",      desc: "Deeper community interaction, Q&A, lives",          cat: "Networking",dur: 60 },
    ],
  },

  freelancer: {
    weekday: [
      { block: "Client Communication",         desc: "Reply to emails, Slack, Loom updates",              cat: "Operations",dur: 30 },
      { block: "Billable Work Block #1",       desc: "Deep client project work — your most valuable time",cat: "Delivery",  dur: 90 },
      { block: "Billable Work Block #2",       desc: "Continue client deliverables or second project",    cat: "Delivery",  dur: 75 },
      { block: "Proposals & New Business",     desc: "Write proposals, pitches, find leads",              cat: "Revenue",   dur: 45 },
      { block: "Portfolio & Marketing",        desc: "Update portfolio, LinkedIn, case studies",          cat: "Branding",  dur: 30 },
      { block: "Admin & Invoicing",            desc: "Time tracking, invoices, contracts, finance",       cat: "Operations",dur: 20 },
      { block: "Skill Sharpening",             desc: "Stay sharp — tutorials, new tools, industry news",  cat: "Learning",  dur: 30 },
    ],
    weekend: [
      { block: "Weekly Client Review",         desc: "Review deliverables, prep updates for clients",     cat: "Operations",dur: 30 },
      { block: "Pipeline & Lead Gen",          desc: "Reach out to potential clients, update CRM",        cat: "Revenue",   dur: 45 },
      { block: "Personal Development",         desc: "New skill, course, or portfolio project",           cat: "Learning",  dur: 60 },
    ],
  },

  developer: {
    weekday: [
      { block: "Code Review",                  desc: "Review PRs with fresh eyes before coding",          cat: "Delivery",  dur: 30 },
      { block: "Deep Coding Session #1",       desc: "Main feature or bug — no interruptions",            cat: "Delivery",  dur: 90 },
      { block: "Standup & Team Sync",          desc: "Daily standup, blockers, sprint updates",           cat: "Operations",dur: 20 },
      { block: "Deep Coding Session #2",       desc: "Continue feature work or start next task",          cat: "Delivery",  dur: 90 },
      { block: "Documentation & Testing",      desc: "Write tests, docs, clean up code",                  cat: "Delivery",  dur: 45 },
      { block: "Architecture & Design",        desc: "System design, ERDs, API planning, RFC reviews",   cat: "Strategy",  dur: 30 },
      { block: "Learning & Side Project",      desc: "New tech, OSS contribution, personal experiment",   cat: "Learning",  dur: 45 },
    ],
    weekend: [
      { block: "Side Project Sprint",          desc: "Build something for yourself — no tickets needed",  cat: "Delivery",  dur: 120 },
      { block: "Tech Learning",                desc: "Course, talk, article, new framework or tool",      cat: "Learning",  dur: 60 },
      { block: "OSS / Community",              desc: "Open source contribution or tech community",        cat: "Networking",dur: 45 },
    ],
  },
};

// ─── Goal supplement blocks ───────────────────────────────────
const GOAL_SUPPLEMENTS: Record<string, BlockDef> = {
  revenue:    { block: "Revenue Focus",       desc: "Dedicated time on income-generating activities",   cat: "Revenue",   dur: 45 },
  study:      { block: "Skill Learning",      desc: "Course, book chapter, or tutorial",               cat: "Learning",  dur: 40 },
  health:     { block: "Workout",             desc: "Exercise session — gym, run, yoga, or home",       cat: "Health",    dur: 45 },
  creative:   { block: "Creative Time",       desc: "Pure creation — design, write, compose",          cat: "Creative",  dur: 45 },
  networking: { block: "Reach Out",           desc: "One meaningful connection or DM per day",         cat: "Networking",dur: 20 },
  personal:   { block: "Journaling",          desc: "Reflect, write, process thoughts",                cat: "Personal",  dur: 20 },
  launch:     { block: "Launch Task",         desc: "One specific task toward your launch goal",       cat: "Delivery",  dur: 60 },
  mindset:    { block: "Mindset Practice",    desc: "Meditation, affirmations, or gratitude",          cat: "Personal",  dur: 15 },
};

// ─── Main generator ───────────────────────────────────────────
export function generateSmartSchedule(data: OnboardingData): {
  weekday: TimeBlockData[];
  weekend: TimeBlockData[];
} {
  const [h, m] = data.wakeUpTime.split(":").map(Number);
  const wakeMin = h * 60 + m;

  return {
    weekday: buildDay(data, wakeMin, false),
    weekend: buildDay(data, wakeMin, true),
  };
}

function buildDay(data: OnboardingData, wakeMin: number, isWeekend: boolean): TimeBlockData[] {
  const plan: BlockDef[] = [];
  const bd = breakDur(data.breakStyle);
  const bf = breakFreq(data.breakStyle);

  // ── Morning ritual ───────────────────────────────────────────
  const rituals: Record<Profession, BlockDef> = {
    student:      { block: "Morning Ritual",        desc: "Wake up, hydrate, quick review of today's plan",  cat: "Personal",  dur: 20 },
    employee:     { block: "Morning Startup",        desc: "Coffee, review calendar, set 3 daily priorities", cat: "Personal",  dur: 25 },
    entrepreneur: { block: "CEO Morning Ritual",     desc: "Journal, gratitude, 3 MITs, mindset set",        cat: "Personal",  dur: 40 },
    creator:      { block: "Creator Morning",        desc: "Inspiration scroll, mindset, idea capture",      cat: "Personal",  dur: 30 },
    freelancer:   { block: "Morning Setup",          desc: "Review client tasks, set today's deliverables",  cat: "Personal",  dur: 20 },
    developer:    { block: "Dev Morning",            desc: "Check notifications, plan tasks, coffee ☕",     cat: "Personal",  dur: 20 },
  };

  plan.push(rituals[data.profession]);
  plan.push({ block: "Breakfast",  desc: "Fuel up — eat well, hydrate, scan news briefly", cat: "Personal", dur: 25 });

  // ── Goal-based supplements early if morning person ───────────
  if (data.productivity === "morning") {
    if (data.goals.includes("health")) {
      plan.push(GOAL_SUPPLEMENTS.health);
    }
    if (data.goals.includes("mindset")) {
      plan.push(GOAL_SUPPLEMENTS.mindset);
    }
  }

  // ── Core profession blocks ───────────────────────────────────
  const prof   = PROFESSION_BLOCKS[data.profession];
  let coreBlocks = isWeekend
    ? [...prof.weekend]
    : [...prof.weekday];

  // Work-type adjustment — preference order
  if (data.workType === "deep") {
    coreBlocks.sort((a, b) => {
      const aScore = a.cat === "Delivery" || a.cat === "Learning" ? -1 : 0;
      const bScore = b.cat === "Delivery" || b.cat === "Learning" ? -1 : 0;
      return aScore - bScore;
    });
  } else if (data.workType === "meetings") {
    // Keep meetings / ops blocks prominent
    coreBlocks.sort((a, b) => {
      const aOps = a.cat === "Operations" || a.cat === "Networking" ? -1 : 0;
      const bOps = b.cat === "Operations" || b.cat === "Networking" ? -1 : 0;
      return aOps - bOps;
    });
  }

  // Productivity peak — heavy blocks first or last
  if (data.productivity === "morning") {
    coreBlocks.sort((a, b) => b.dur - a.dur);
  } else if (data.productivity === "evening") {
    coreBlocks.sort((a, b) => a.dur - b.dur);
  }

  // Limit block count for weekend (lighter day)
  if (isWeekend) {
    coreBlocks = coreBlocks.slice(0, Math.max(3, Math.ceil(coreBlocks.length * 0.6)));
    coreBlocks.push({ block: "Weekend Leisure", desc: "Hobbies, family, outdoors — recharge intentionally", cat: "Personal", dur: 60 });
  }

  // ── Inject breaks + lunch into core blocks ───────────────────
  const lunch: BlockDef = { block: "Lunch Break", desc: "Eat well, rest, recharge — no screens or calls",  cat: "Personal", dur: 35, };
  const mid = Math.floor(coreBlocks.length / 2);

  let bCount = 0, bIdx = 0;
  for (let i = 0; i < coreBlocks.length; i++) {
    if (i === mid) plan.push(lunch);
    plan.push(coreBlocks[i]);
    bCount++;
    if (bCount >= bf && i < coreBlocks.length - 1) {
      plan.push({
        block: "Break",
        desc: BREAK_DESCS[bIdx++ % BREAK_DESCS.length],
        cat: "Personal",
        dur: bd,
      });
      bCount = 0;
    }
  }

  // ── Goal supplements (afternoon / evening ───────────────────
  const goalOrder = data.productivity === "morning"
    ? ["study", "creative", "launch", "networking", "revenue", "personal"]
    : ["revenue", "health", "study", "creative", "launch", "networking", "mindset", "personal"];

  for (const g of goalOrder) {
    if (data.goals.includes(g) && GOAL_SUPPLEMENTS[g]) {
      const already = [
        ...(data.productivity === "morning" ? ["health", "mindset"] : []),
      ];
      if (!already.includes(g)) {
        plan.push(GOAL_SUPPLEMENTS[g]);
      }
    }
  }

  // ── Evening wrap ─────────────────────────────────────────────
  plan.push({ block: "Dinner",        desc: "Eat, rest, connect with family or friends",          cat: "Personal",  dur: 30 });
  plan.push({ block: "Evening Review",desc: "Review day, update tasks, plan tomorrow",             cat: "Operations",dur: 15 });
  plan.push({ block: "Wind Down",     desc: "No screens, read, relax — prepare for deep sleep",   cat: "Personal",  dur: 30 });

  // ── Convert to TimeBlockData ─────────────────────────────────
  let cursor = wakeMin + workStartOffset(data.workHours);

  // Put ritual + breakfast before the offset delay
  const prework = [rituals[data.profession], { block: "Breakfast", desc: "", cat: "Personal", dur: 25 }];
  cursor = wakeMin;

  return plan.map(b => {
    const td: TimeBlockData = {
      id: makeId(),
      time: makeRange(cursor, b.dur),
      block: b.block,
      desc: b.desc,
      cat: b.cat,
      dur: b.dur,
    };
    cursor += b.dur;
    return td;
  });
}

export function getBreakSuggestions(): string[] {
  return [...BREAK_DESCS].sort(() => Math.random() - 0.5).slice(0, 4);
}
