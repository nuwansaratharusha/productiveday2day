// =============================================================
// ProductiveDay — Habit Service (Supabase browser client)
// =============================================================
import { createClient } from "./client";
import type { HabitInsert, HabitUpdate } from "@/lib/types/database";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Get all active habits with today's status ─────────────
export async function getHabits() {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const { data: habits, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !habits) return { data: null, error: error?.message || null };

  const { data: completions } = await supabase
    .from("habit_completions")
    .select("habit_id, count")
    .eq("user_id", user.id)
    .eq("completed_date", today);

  const habitsWithStatus = await Promise.all(
    habits.map(async (habit) => {
      const completion = completions?.find((c) => c.habit_id === habit.id);
      const { data: streakData } = await supabase.rpc("get_habit_streak", {
        p_habit_id: habit.id,
      });
      return {
        ...habit,
        today_completed: (completion?.count || 0) >= habit.target_count,
        today_count: completion?.count || 0,
        current_streak: streakData || 0,
      };
    })
  );

  return { data: habitsWithStatus, error: null };
}

// ─── Create a habit ────────────────────────────────────────
export async function createHabit(habit: HabitInsert) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("habits")
    .insert({ ...habit, user_id: user.id })
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Update a habit ────────────────────────────────────────
export async function updateHabit(habitId: string, updates: HabitUpdate) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Archive a habit ───────────────────────────────────────
export async function archiveHabit(habitId: string) {
  return updateHabit(habitId, { is_active: false });
}

// ─── Toggle habit completion for today ─────────────────────
export async function toggleHabitCompletion(habitId: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("habit_completions")
    .select("id, count")
    .eq("habit_id", habitId)
    .eq("completed_date", today)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("id", existing.id);
    return { completed: false, error: error?.message || null };
  } else {
    const { error } = await supabase
      .from("habit_completions")
      .insert({ habit_id: habitId, user_id: user.id, completed_date: today, count: 1 });
    return { completed: true, error: error?.message || null };
  }
}

// ─── Increment habit count ─────────────────────────────────
export async function incrementHabitCount(habitId: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("habit_completions")
    .select("id, count")
    .eq("habit_id", habitId)
    .eq("completed_date", today)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("habit_completions")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
    return { count: existing.count + 1, error: error?.message || null };
  } else {
    const { error } = await supabase
      .from("habit_completions")
      .insert({ habit_id: habitId, user_id: user.id, completed_date: today, count: 1 });
    return { count: 1, error: error?.message || null };
  }
}

// ─── Get habit completion history ─────────────────────────
export async function getHabitHistory(habitId: string, startDate: string, endDate: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("habit_completions")
    .select("completed_date, count, notes")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .gte("completed_date", startDate)
    .lte("completed_date", endDate)
    .order("completed_date", { ascending: true });

  return { data, error: error?.message || null };
}
