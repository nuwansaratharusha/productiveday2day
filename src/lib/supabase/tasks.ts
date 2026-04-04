// =============================================================
// ProductiveDay — Task Service (Supabase browser client)
// =============================================================
import { createClient } from "./client";
import type { TaskInsert, TaskUpdate, TaskStatus } from "@/lib/types/database";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Get tasks (with optional filters) ────────────────────
export async function getTasks(filters?: {
  status?: TaskStatus;
  scheduled_date?: string;
  category_id?: string;
}) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  let query = supabase
    .from("tasks")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.scheduled_date) query = query.eq("scheduled_date", filters.scheduled_date);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);

  const { data, error } = await query;
  return { data, error: error?.message || null };
}

// ─── Get tasks for a specific date ────────────────────────
export async function getTasksForDate(date: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("tasks")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .eq("scheduled_date", date)
    .order("sort_order", { ascending: true });

  return { data, error: error?.message || null };
}

// ─── Create a task ─────────────────────────────────────────
export async function createTask(task: TaskInsert) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: user.id })
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Update a task ─────────────────────────────────────────
export async function updateTask(taskId: string, updates: TaskUpdate) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (updates.status === "done" && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }
  if (updates.status && updates.status !== "done") {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error: error?.message || null };
}

// ─── Toggle task completion ────────────────────────────────
export async function toggleTaskComplete(taskId: string) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: task } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) return { data: null, error: "Task not found" };

  const newStatus = task.status === "done" ? "todo" : "done";
  return updateTask(taskId, { status: newStatus });
}

// ─── Delete a task ─────────────────────────────────────────
export async function deleteTask(taskId: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  return { error: error?.message || null };
}

// ─── Reorder tasks ─────────────────────────────────────────
export async function reorderTasks(taskIds: string[], startOrder = 0) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const updates = taskIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ sort_order: startOrder + index })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  return { error: firstError?.error?.message || null };
}

// ─── Bulk create (for localStorage migration) ──────────────
export async function bulkCreateTasks(tasks: TaskInsert[]) {
  const { supabase, user } = await getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const tasksWithUser = tasks.map((task, i) => ({
    ...task,
    user_id: user.id,
    sort_order: i,
  }));

  const { data, error } = await supabase
    .from("tasks")
    .insert(tasksWithUser)
    .select();

  return { data, error: error?.message || null };
}
