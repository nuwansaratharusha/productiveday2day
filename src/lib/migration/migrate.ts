// =============================================================
// ProductiveDay — localStorage → Supabase Migration
// =============================================================
import { createClient } from "@/lib/supabase/client";

interface MigrationResult {
  tasks: number;
  plans: number;
  alreadyMigrated: boolean;
  error: string | null;
}

const MIGRATION_KEY = "productiveday_migrated";

export async function runMigration(): Promise<MigrationResult> {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return { tasks: 0, plans: 0, alreadyMigrated: true, error: null };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { tasks: 0, plans: 0, alreadyMigrated: false, error: "Not authenticated" };
  }

  let tasksMigrated = 0;
  let plansMigrated = 0;

  try {
    // ─── Migrate Tasks ──────────────────────────────────────
    const taskKeys = ["tasks", "todos", "productiveday_tasks", "day2day_tasks"];

    for (const key of taskKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [];
        if (items.length === 0) continue;

        const tasks = items.map((item: any, index: number) => ({
          user_id: user.id,
          title: item.title || item.text || item.name || `Task ${index + 1}`,
          description: item.description || item.details || null,
          status: mapStatus(item.status || item.completed || item.done),
          priority: mapPriority(item.priority),
          due_date: item.due_date || item.dueDate || null,
          scheduled_date: item.scheduled_date || item.scheduledDate || item.date || null,
          completed_at: item.completed_at || item.completedAt || null,
          tags: item.tags || [],
          sort_order: index,
        }));

        const { error } = await supabase.from("tasks").insert(tasks);
        if (!error) {
          tasksMigrated += tasks.length;
          localStorage.removeItem(key);
        }
      } catch {
        continue;
      }
    }

    // ─── Migrate Daily Plans ────────────────────────────────
    const planKeys = ["daily_plans", "plans", "notes", "productiveday_plans"];

    for (const key of planKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object"
          ? Object.entries(parsed).map(([date, value]) => ({
              date,
              ...(typeof value === "string" ? { morning_intention: value } : value),
            }))
          : [];

        if (items.length === 0) continue;

        const plans = items
          .filter((item: any) => item.date || item.plan_date)
          .map((item: any) => ({
            user_id: user.id,
            plan_date: item.date || item.plan_date,
            morning_intention: item.morning_intention || item.intention || item.plan || null,
            evening_reflection: item.evening_reflection || item.reflection || null,
            energy_level: item.energy_level || item.energy || null,
            productivity_score: item.productivity_score || item.score || null,
          }));

        if (plans.length > 0) {
          const { error } = await supabase
            .from("daily_plans")
            .upsert(plans, { onConflict: "user_id,plan_date" });

          if (!error) {
            plansMigrated += plans.length;
            localStorage.removeItem(key);
          }
        }
      } catch {
        continue;
      }
    }

    localStorage.setItem(MIGRATION_KEY, new Date().toISOString());

    return { tasks: tasksMigrated, plans: plansMigrated, alreadyMigrated: false, error: null };
  } catch (err) {
    return {
      tasks: tasksMigrated,
      plans: plansMigrated,
      alreadyMigrated: false,
      error: err instanceof Error ? err.message : "Migration failed",
    };
  }
}

function mapStatus(value: any): string {
  if (value === true || value === "completed" || value === "done") return "done";
  if (value === "in_progress" || value === "active" || value === "started") return "in_progress";
  if (value === "cancelled" || value === "deleted") return "cancelled";
  return "todo";
}

function mapPriority(value: any): string {
  if (!value) return "medium";
  const v = String(value).toLowerCase();
  if (v === "high" || v === "important" || v === "3") return "high";
  if (v === "low" || v === "1") return "low";
  if (v === "urgent" || v === "critical" || v === "4") return "urgent";
  return "medium";
}
