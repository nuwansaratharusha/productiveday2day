// =============================================================
// ProductiveDay — Client-side Data Hooks
// =============================================================
import { useState, useEffect, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, Habit, DailyPlan, Checkin } from "@/lib/types/database";

// ─── Generic action wrapper ────────────────────────────────
export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<{ data: TOutput | null; error: string | null }>
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: TInput) => {
      setError(null);
      let result: { data: TOutput | null; error: string | null } = { data: null, error: null };
      startTransition(async () => {
        result = await action(input);
        if (result.error) setError(result.error);
      });
      return result;
    },
    [action]
  );

  return { execute, isPending, error };
}

// ─── Real-time Tasks Hook ──────────────────────────────────
export function useRealtimeTasks(scheduledDate?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("tasks")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);

    const { data } = await query;
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [scheduledDate]);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchTasks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}

// ─── Real-time Habits Hook ─────────────────────────────────
export function useRealtimeHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHabits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!habitsData) { setLoading(false); return; }

    const { data: completions } = await supabase
      .from("habit_completions")
      .select("habit_id, count")
      .eq("user_id", user.id)
      .eq("completed_date", today);

    const enriched = habitsData.map((habit) => {
      const completion = completions?.find((c) => c.habit_id === habit.id);
      return {
        ...habit,
        today_completed: (completion?.count || 0) >= habit.target_count,
        today_count: completion?.count || 0,
      };
    });

    setHabits(enriched as Habit[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHabits();

    const channel = supabase
      .channel("habits-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_completions" }, () => fetchHabits())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchHabits]);

  return { habits, loading, refetch: fetchHabits };
}

// ─── Today's Plan Hook ─────────────────────────────────────
export function useDailyPlan(date: string) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_date", date)
        .single();

      setPlan(data as DailyPlan | null);
      setLoading(false);
    }
    fetchPlan();
  }, [date]);

  return { plan, loading };
}

// ─── Check-in Hook ─────────────────────────────────────────
export function useCheckin(date: string, type: string) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCheckin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("checkin_date", date)
        .eq("checkin_type", type)
        .single();

      setCheckin(data as Checkin | null);
      setLoading(false);
    }
    fetchCheckin();
  }, [date, type]);

  return { checkin, loading };
}
