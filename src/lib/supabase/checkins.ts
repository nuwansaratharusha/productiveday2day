// =============================================================
// ProductiveDay — Check-in & Daily Plan Service
// =============================================================
import { createClient } from "./client";
import type { CheckinUpsert, DailyPlanUpsert } from "@/lib/types/database";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Daily Plans ───────────────────────────────────────────
export async function getDailyPlan(date: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("plan_date", date)
    .single();

  if (error?.code === "PGRST116") return { data: null, error: null };
  return { data, error: error?.message || null };
}

export async function upsertDailyPlan(plan: DailyPlanUpsert) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("daily_plans")
    .upsert({ ...plan, user_id: user.id }, { onConflict: "user_id,plan_date" })
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Check-ins ─────────────────────────────────────────────
export async function getCheckin(date: string, type: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", date)
    .eq("checkin_type", type)
    .single();

  if (error?.code === "PGRST116") return { data: null, error: null };
  return { data, error: error?.message || null };
}

export async function upsertCheckin(checkin: CheckinUpsert) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("checkins")
    .upsert(
      { ...checkin, user_id: user.id },
      { onConflict: "user_id,checkin_date,checkin_type" }
    )
    .select()
    .single();

  return { data, error: error?.message || null };
}

export async function getRecentCheckins(limit = 7) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .order("checkin_date", { ascending: false })
    .order("checkin_type", { ascending: true })
    .limit(limit);

  return { data, error: error?.message || null };
}
