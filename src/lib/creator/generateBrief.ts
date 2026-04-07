// =============================================================
// ProductiveDay — AI Content Brief Generator (Groq / Llama)
// =============================================================
// Takes a content piece title, type and platforms and returns a
// structured content brief: angle, hooks, key points, CTA, hashtags.
// =============================================================

export interface ContentBrief {
  angle: string;
  hooks: string[];
  key_points: string[];
  target_audience: string;
  cta: string;
  hashtags: string[];
  thumbnail_concept: string;
  notes: string; // formatted markdown brief for storing in piece.notes
}

export async function generateBrief(req: {
  title: string;
  content_type: string;
  platforms: string[];
  existing_notes?: string;
}): Promise<{ data: ContentBrief | null; error: string | null }> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return { data: null, error: "VITE_GROQ_API_KEY not set" };

  const platformStr = req.platforms.length ? req.platforms.join(", ") : "general";

  const systemPrompt = `You are an expert content strategist. Generate detailed, actionable content briefs.
Always respond with valid JSON matching the exact schema requested. Be specific and creative.`;

  const userPrompt = `Create a detailed content brief for:
Title: "${req.title}"
Type: ${req.content_type}
Platforms: ${platformStr}
${req.existing_notes ? `Existing notes: ${req.existing_notes}` : ""}

Return JSON with EXACTLY this structure:
{
  "angle": "the unique angle or thesis (1-2 sentences)",
  "hooks": ["hook option 1", "hook option 2", "hook option 3"],
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "target_audience": "describe who this is for and their pain point",
  "cta": "clear call-to-action for the end",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "thumbnail_concept": "describe a compelling thumbnail or cover image",
  "notes": "Write a formatted markdown brief with sections: ## Angle\\n...\\n## Hooks\\n...\\n## Key Points\\n...\\n## Target Audience\\n...\\n## CTA\\n..."
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: (err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}` };
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return { data: null, error: "Empty response from AI" };

    const parsed: ContentBrief = JSON.parse(raw);
    return { data: parsed, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
