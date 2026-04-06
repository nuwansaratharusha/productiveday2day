// =============================================================
// ProductiveDay — AI Script Generation (Vite Browser Client)
// Uses Groq API (free tier) via VITE_GROQ_API_KEY
// Get your free key at: https://console.groq.com
// 14,400 free requests/day — no billing required
// =============================================================

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface ScriptRequest {
  topic: string;
  content_type: "video" | "short" | "blog" | "newsletter" | "social";
  platform: string;
  target_duration_sec?: number;
  key_points?: string[];
  tone?: string;
  brand_voice_id?: string;
}

export interface ScriptSection {
  type: string;
  label: string;
  content: string;
  duration_sec?: number;
}

export interface GeneratedScript {
  title: string;
  sections: ScriptSection[];
  estimated_duration_sec: number;
  word_count: number;
}

export async function generateScript(
  request: ScriptRequest
): Promise<{ data: GeneratedScript | null; error: string | null }> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      error:
        "VITE_GROQ_API_KEY is not set. Get a free key at console.groq.com and add it to your .env.local file.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Load brand voice
  let brandContext = "";
  const voiceQuery = request.brand_voice_id
    ? supabase
        .from("brand_voices")
        .select("*")
        .eq("id", request.brand_voice_id)
        .eq("user_id", user.id)
        .single()
    : supabase
        .from("brand_voices")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .single();

  const { data: voice } = await voiceQuery;
  if (voice) {
    brandContext = `
BRAND VOICE PROFILE:
- Tone: ${voice.tone?.join(", ") || "conversational"}
- Target audience: ${voice.target_audience || "general"}
- Brand description: ${voice.brand_description || ""}
- Words to use: ${voice.vocabulary_include?.join(", ") || "none specified"}
- Words to avoid: ${voice.vocabulary_exclude?.join(", ") || "none specified"}
- Example of their style: ${voice.example_content?.slice(0, 500) || "none provided"}
`;
  }

  const durationGuide = request.target_duration_sec
    ? `Target duration: ${request.target_duration_sec} seconds (~${Math.round(
        request.target_duration_sec / 60
      )} minutes). At ~150 words/minute speaking pace, aim for ~${Math.round(
        (request.target_duration_sec / 60) * 150
      )} words total.`
    : "";

  const keyPointsGuide = request.key_points?.length
    ? `Key points to cover:\n${request.key_points
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n")}`
    : "";

  const promptMap: Record<string, string> = {
    video: `Create a YouTube video script with these sections:
- hook (5-15 sec): An attention-grabbing opening that stops the scroll
- intro (10-20 sec): Set up the topic and why it matters
- body (main content): The core value, broken into clear segments
- cta (5-10 sec): Clear call to action (subscribe, comment, etc.)
Include [B-ROLL] markers where visual cutaways would work.`,

    short: `Create a short-form video script (TikTok/Reel/Short) with:
- hook (1-3 sec): Instant attention grabber, first frame matters
- body (15-45 sec): Fast-paced, one core idea, punchy delivery
- cta (2-5 sec): Quick, specific action
Keep it under 60 seconds total. Every word must earn its place.`,

    blog: `Create a blog post outline with:
- headline: SEO-friendly, compelling title
- intro: Hook the reader, state the problem
- body: 3-5 main sections with subheadings and key points
- conclusion: Summary + next steps for the reader`,

    newsletter: `Create an email newsletter with:
- subject_line: High open-rate subject line (under 50 chars)
- preview: Preview text (under 90 chars)
- intro: Personal, warm opening
- body: Main value or story
- cta: Single clear action`,

    social: `Create a social media post with:
- hook: First line that stops the scroll
- body: Value-packed content, use line breaks
- cta: Engagement driver (question, poll, save this)
- hashtags: 5-10 relevant hashtags
Optimize for ${request.platform}.`,
  };

  const systemPrompt = `You are a professional content strategist and scriptwriter. You write scripts that are engaging, authentic, and optimized for the specified platform.

${brandContext}

CRITICAL: Respond ONLY with valid JSON. No markdown, no backticks, no explanation before or after. Just the raw JSON object.

Exact response format:
{
  "title": "Compelling title for this content",
  "sections": [
    {
      "type": "hook",
      "label": "Hook",
      "content": "The actual script text here",
      "duration_sec": 10
    }
  ],
  "estimated_duration_sec": 180,
  "word_count": 450
}

Section types to use: hook, intro, body, cta, outro, subject_line, preview, headline, hashtags`;

  const userPrompt = `Create a ${request.content_type} script for ${request.platform}.

Topic: ${request.topic}
${durationGuide}
${keyPointsGuide}
${request.tone ? `Tone: ${request.tone}` : ""}

${promptMap[request.content_type] || promptMap.video}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg =
        (err as { error?: { message?: string } })?.error?.message ||
        `HTTP ${response.status}`;
      return { data: null, error: `Groq API error: ${msg}` };
    }

    const result = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = result.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as GeneratedScript;

    return { data: parsed, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Script generation failed",
    };
  }
}
