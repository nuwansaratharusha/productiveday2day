// =============================================================
// ProductiveDay — Groq AI client for daily schedule generation
// Free tier: llama-3.3-70b-versatile, no credit card needed
// Get your key at: https://console.groq.com
// =============================================================

import type { TimeBlockData } from "@/data/plannerData";

export const GROQ_KEY_STORAGE = "pd-groq-key";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Key helpers ───────────────────────────────────────────────

export function getGroqKey(): string | null {
  try { return localStorage.getItem(GROQ_KEY_STORAGE); } catch { return null; }
}

export function saveGroqKey(key: string): void {
  try { localStorage.setItem(GROQ_KEY_STORAGE, key.trim()); } catch {}
}

// ─── Message type ──────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── System prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional daily schedule optimizer inside ProductiveDay, a productivity app.
Your job: take the user's description of their day and produce a realistic, optimized time-blocked schedule.

SCHEDULING RULES:
- Default start time: 7:00 AM (adjust if user gives context like "I wake up at 6")
- High-focus/client work → morning peak (8 AM–12 PM)
- Learning/lectures → flexible, often mid-morning or afternoon
- Creative work (recording, design) → mid-morning or early afternoon
- Admin, email, planning → early afternoon (1 PM–3 PM)
- Include a 15-minute break after every 90 minutes of focused work
- Include a 30–60 minute lunch/meal break if the plan spans midday
- Wind-down/review → late afternoon or evening
- No blocks past 10 PM unless user specifies night work

DURATION GUIDELINES:
- Deep focus / client project: 90–120 min
- Lectures / classes: use stated duration, otherwise 90 min
- Online course / self-study: 60–90 min
- Content recording / creation: 60–120 min
- Exercise / morning routine: 30–60 min
- Meals: 30–60 min
- Admin / email: 20–30 min
- Short breaks: 15 min

CATEGORIES — pick the single most fitting one:
Health, Learning, Revenue, Creative, Personal, Product, Operations, Delivery, Branding, Side Projects, CIM, Networking

CATEGORY GUIDE:
- Health → exercise, morning routine, meals, wellness
- Learning → courses, lectures, studying, reading, books
- Revenue → client work, freelance, paid projects
- Creative → content creation, recording, video, design, writing
- Personal → breaks, errands, wind-down, personal chores
- Product → coding, app building, product development
- Operations → admin, planning, scheduling, organisation
- Delivery → project delivery, client deliverables, deadlines
- Branding → social media, marketing, personal brand posts
- Side Projects → personal projects, side hustles, experiments
- CIM → CIM lectures, assignments, exam prep (Chartered Institute)
- Networking → calls, meetings, networking events, 1:1s

RESPONSE FORMAT — respond ONLY with this exact JSON structure (no markdown, no extra text outside the JSON):
{
  "message": "Here's your optimised day! [1–2 sentences summing up the plan.]",
  "blocks": [
    {
      "time": "7:00–8:00 AM",
      "block": "Block title (≤35 chars)",
      "desc": "One sentence describing what to do in this block.",
      "cat": "Category",
      "dur": 60
    }
  ]
}

TIME FORMAT RULES:
- Use en-dash (–) between start and end, e.g. "9:00–10:30 AM"
- When both times are before noon: "9:00–10:30 AM"
- When crossing noon: "11:00 AM–12:30 PM"
- When both after noon: "1:00–2:30 PM"
- Blocks must be contiguous — end time of block N = start time of block N+1

For refinement requests (user asks to change the plan), output the COMPLETE updated schedule JSON with ALL blocks, not just the changed ones.`;

// ─── API call ──────────────────────────────────────────────────

export async function callGroq(
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.6,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `Groq API error ${res.status}`,
    );
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Response parser ───────────────────────────────────────────

export interface ParsedPlan {
  message: string;
  blocks: TimeBlockData[];
}

export function parsePlanFromResponse(content: string): ParsedPlan | null {
  try {
    // Strip markdown code fences if the model wrapped the JSON
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      message?: unknown;
      blocks?: unknown[];
    };

    if (!parsed.blocks || !Array.isArray(parsed.blocks)) return null;

    const blocks: TimeBlockData[] = parsed.blocks.map(
      (b: Record<string, unknown>, i: number) => ({
        id: `ai-${Date.now()}-${i}`,
        time: String(b.time ?? "9:00–10:00 AM"),
        block: String(b.block ?? "Block").slice(0, 50),
        desc: String(b.desc ?? ""),
        cat: String(b.cat ?? "Personal"),
        dur: Number(b.dur) || 60,
      }),
    );

    return {
      message: String(parsed.message ?? "Here's your plan for the day!"),
      blocks,
    };
  } catch {
    return null;
  }
}
