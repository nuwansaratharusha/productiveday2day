// =============================================================
// ProductiveDay — Analytics Service
// =============================================================
import { createClient } from "./client";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Dashboard Overview Stats ──────────────────────────────
export async function getDashboardStats() {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const [todayTasks, weekTasks, streakData, todayPlan] = await Promise.all([
    supabase.from("tasks").select("id, status, priority").eq("user_id", user.id).eq("scheduled_date", today),
    supabase.from("tasks").select("id, completed_at").eq("user_id", user.id).eq("status", "done").gte("completed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("habits").select("id").eq("user_id", user.id).eq("is_active", true),
    supabase.from("daily_plans").select("energy_level, productivity_score").eq("user_id", user.id).eq("plan_date", today).single(),
  ]);

  const todayTaskList = todayTasks.data || [];
  const todayTotal = todayTaskList.length;
  const todayDone = todayTaskList.filter((t) => t.status === "done").length;

  return {
    data: {
      today: {
        total: todayTotal,
        done: todayDone,
        in_progress: todayTaskList.filter((t) => t.status === "in_progress").length,
        completion_rate: todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0,
      },
      week: { tasks_completed: weekTasks.data?.length || 0 },
      habits: { active_count: streakData.data?.length || 0 },
      plan: todayPlan.data || null,
    },
    error: null,
  };
}

// ─── Daily Stats for Charts ────────────────────────────────
export async function getDailyStats(startDate?: string, endDate?: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const end = endDate || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_daily_stats", {
    p_user_id: user.id,
    p_start_date: start,
    p_end_date: end,
  });

  return { data, error: error?.message || null };
}

// ─── Weekly Summary ────────────────────────────────────────
export async function getWeeklySummary() {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("weekly_summary")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error?.code === "PGRST116") return { data: null, error: null };
  return { data, error: error?.message || null };
}

// ─── Productivity Trend ────────────────────────────────────
export async function getProductivityTrend(weeks = 8) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [plans, checkins] = await Promise.all([
    supabase.from("daily_plans").select("plan_date, productivity_score, energy_level").eq("user_id", user.id).gte("plan_date", startDate).not("productivity_score", "is", null).order("plan_date", { ascending: true }),
    supabase.from("checkins").select("checkin_date, mood_score").eq("user_id", user.id).gte("checkin_date", startDate).not("mood_score", "is", null).order("checkin_date", { ascending: true }),
  ]);

  return {
    data: { productivity: plans.data || [], mood: checkins.data || [] },
    error: plans.error?.message || checkins.error?.message || null,
  };
}
