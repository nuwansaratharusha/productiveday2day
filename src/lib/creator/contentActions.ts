// =============================================================
// ProductiveDay — Creator Content Actions (Browser Client)
// Adapted from Next.js server actions to browser Supabase client
// =============================================================

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Content Pieces ────────────────────────────────────────

export async function getContentPipeline(status?: string) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  let query = supabase
    .from("content_pieces")
    .select("*, script:scripts(*), shoot:shoots(*)")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  return { data, error: error?.message || null };
}

export async function createContentPiece(piece: {
  title: string;
  content_type?: string;
  status?: string;
  platforms?: string[];
  planned_date?: string;
  tags?: string[];
  notes?: string;
  checklist?: { label: string; done: boolean }[];
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("content_pieces")
    .insert({ ...piece, user_id: user.id })
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function updateContentPiece(id: string, updates: Record<string, unknown>) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("content_pieces")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function moveContentStatus(id: string, newStatus: string) {
  return updateContentPiece(id, {
    status: newStatus,
    ...(newStatus === "published"
      ? { publish_date: new Date().toISOString().split("T")[0] }
      : {}),
  });
}

export async function deleteContentPiece(id: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("content_pieces")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message || null };
}

// ─── Promote Idea → Content Piece ──────────────────────────

export async function promoteIdea(ideaId: string) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: idea } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();
  if (!idea) return { data: null, error: "Idea not found" };

  const { data: piece, error } = await supabase
    .from("content_pieces")
    .insert({
      user_id: user.id,
      title: idea.title,
      description: idea.body,
      tags: idea.tags,
      platforms: idea.platforms,
      status: "brief",
    })
    .select()
    .single();

  if (!error && piece) {
    await supabase
      .from("ideas")
      .update({ status: "promoted", promoted_to: piece.id })
      .eq("id", ideaId);
  }
  return { data: piece, error: error?.message || null };
}

// ─── Scripts ───────────────────────────────────────────────

export async function createScript(script: {
  title: string;
  script_type?: string;
  sections?: unknown[];
  body?: string;
  content_piece_id?: string;
  ai_generated?: boolean;
  ai_prompt?: string;
  ai_model?: string;
  estimated_duration_sec?: number;
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const wordCount = script.body
    ? script.body.split(/\s+/).length
    : (script.sections as Array<{ content?: string }> | undefined)?.reduce(
        (sum: number, s) => sum + (s.content?.split(/\s+/).length || 0),
        0
      ) || 0;

  const { data, error } = await supabase
    .from("scripts")
    .insert({ ...script, user_id: user.id, word_count: wordCount })
    .select()
    .single();

  if (!error && data && script.content_piece_id) {
    await supabase
      .from("content_pieces")
      .update({ script_id: data.id })
      .eq("id", script.content_piece_id)
      .eq("user_id", user.id);
  }
  return { data, error: error?.message || null };
}

export async function updateScript(id: string, updates: Record<string, unknown>) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (typeof updates.body === "string") {
    updates.word_count = updates.body.split(/\s+/).length;
  }
  if (Array.isArray(updates.sections)) {
    updates.word_count = (updates.sections as Array<{ content?: string }>).reduce(
      (sum: number, s) => sum + (s.content?.split(/\s+/).length || 0),
      0
    );
  }

  const { data, error } = await supabase
    .from("scripts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function getScripts(contentPieceId?: string) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  let query = supabase
    .from("scripts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (contentPieceId) query = query.eq("content_piece_id", contentPieceId);

  const { data, error } = await query;
  return { data, error: error?.message || null };
}

// ─── Ideas ─────────────────────────────────────────────────

export async function captureIdea(idea: {
  title: string;
  body?: string;
  source?: string;
  tags?: string[];
  platforms?: string[];
  rating?: number;
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("ideas")
    .insert({ ...idea, user_id: user.id })
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function updateIdea(id: string, updates: Record<string, unknown>) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("ideas")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function deleteIdea(id: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message || null };
}

export async function getIdeas(status?: string) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  let query = supabase
    .from("ideas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  return { data, error: error?.message || null };
}

// ─── Shoots ────────────────────────────────────────────────

export async function createShoot(shoot: {
  title: string;
  shoot_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  equipment?: string[];
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("shoots")
    .insert({ ...shoot, user_id: user.id })
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function getShoots(upcoming?: boolean) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  let query = supabase.from("shoots").select("*").eq("user_id", user.id);
  if (upcoming) {
    query = query
      .gte("shoot_date", new Date().toISOString().split("T")[0])
      .order("shoot_date", { ascending: true });
  } else {
    query = query.order("shoot_date", { ascending: false });
  }

  const { data, error } = await query;
  return { data, error: error?.message || null };
}

// ─── Build Logs ────────────────────────────────────────────

export async function upsertBuildLog(log: {
  log_date: string;
  title: string;
  body?: string;
  is_public?: boolean;
  tags?: string[];
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const [tasksResult, contentResult, streakResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("completed_at", log.log_date + "T00:00:00")
      .lt("completed_at", log.log_date + "T23:59:59"),
    supabase
      .from("content_pieces")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "published")
      .eq("publish_date", log.log_date),
    supabase.rpc("get_creator_streak", { p_user_id: user.id }),
  ]);

  const slug = log.is_public
    ? `${log.log_date}-${log.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40)}`
    : null;

  const { data, error } = await supabase
    .from("build_logs")
    .upsert(
      {
        ...log,
        user_id: user.id,
        share_slug: slug,
        tasks_completed: tasksResult.data?.length || 0,
        content_published: contentResult.data?.length || 0,
        streak_day: streakResult.data || 0,
      },
      { onConflict: "user_id,log_date" }
    )
    .select()
    .single();

  return { data, error: error?.message || null };
}

export async function getBuildLogs() {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("build_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false });
  return { data, error: error?.message || null };
}

// ─── Brand Voice ───────────────────────────────────────────

export async function upsertBrandVoice(voice: {
  name: string;
  tone?: string[];
  vocabulary_include?: string[];
  vocabulary_exclude?: string[];
  example_content?: string;
  target_audience?: string;
  brand_description?: string;
}) {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("brand_voices")
    .upsert({ ...voice, user_id: user.id }, { onConflict: "user_id,name" })
    .select()
    .single();
  return { data, error: error?.message || null };
}

export async function getBrandVoice() {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("brand_voices")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .single();
  return { data, error: error?.message || null };
}

// ─── Creator Dashboard Stats ───────────────────────────────

export async function getCreatorDashboard() {
  const user = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const [pipeline, streak, ideasCount, upcomingShoots] = await Promise.all([
    supabase.rpc("get_pipeline_stats", { p_user_id: user.id }),
    supabase.rpc("get_creator_streak", { p_user_id: user.id }),
    supabase
      .from("ideas")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .in("status", ["captured", "researching", "ready"]),
    supabase
      .from("shoots")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "planned")
      .gte("shoot_date", new Date().toISOString().split("T")[0])
      .order("shoot_date")
      .limit(3),
  ]);

  return {
    data: {
      pipeline: pipeline.data || [],
      creator_streak: streak.data || 0,
      ideas_count: ideasCount.count || 0,
      upcoming_shoots: upcomingShoots.data || [],
    },
    error: null,
  };
}
