// =============================================================
// ProductiveDay — Database Types
// =============================================================
// Single source of truth for all data shapes.
// Mirrors the Supabase schema exactly.
// =============================================================

// ─── Profile ───────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  theme: "light" | "dark" | "system";
  week_starts_on: number; // 0=Sun, 1=Mon
  daily_goal_count: number;
  notification_enabled: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "full_name"
    | "avatar_url"
    | "timezone"
    | "theme"
    | "week_starts_on"
    | "daily_goal_count"
    | "notification_enabled"
    | "onboarding_completed"
  >
>;

// ─── Category ──────────────────────────────────────────────
export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export type CategoryInsert = Pick<Category, "name"> &
  Partial<Pick<Category, "color" | "icon" | "sort_order">>;

// ─── Task ──────────────────────────────────────────────────
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  tags: string[];
  sort_order: number;
  category_id: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: Category;
}

export type TaskInsert = Pick<Task, "title"> &
  Partial<
    Pick<
      Task,
      | "description"
      | "status"
      | "priority"
      | "due_date"
      | "scheduled_date"
      | "tags"
      | "sort_order"
      | "category_id"
      | "estimated_minutes"
    >
  >;

export type TaskUpdate = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "due_date"
    | "scheduled_date"
    | "completed_at"
    | "tags"
    | "sort_order"
    | "category_id"
    | "estimated_minutes"
    | "actual_minutes"
  >
>;

// ─── Daily Plan ────────────────────────────────────────────
export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  morning_intention: string | null;
  evening_reflection: string | null;
  energy_level: number | null; // 1-5
  productivity_score: number | null; // 1-5
  created_at: string;
  updated_at: string;
}

export type DailyPlanUpsert = Pick<DailyPlan, "plan_date"> &
  Partial<
    Pick<
      DailyPlan,
      | "morning_intention"
      | "evening_reflection"
      | "energy_level"
      | "productivity_score"
    >
  >;

// ─── Habit ─────────────────────────────────────────────────
export type HabitFrequency =
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "custom";

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  custom_days: number[];
  target_count: number;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed
  current_streak?: number;
  today_completed?: boolean;
  today_count?: number;
}

export type HabitInsert = Pick<Habit, "title"> &
  Partial<
    Pick<
      Habit,
      | "description"
      | "frequency"
      | "custom_days"
      | "target_count"
      | "color"
      | "icon"
      | "sort_order"
    >
  >;

export type HabitUpdate = Partial<
  Pick<
    Habit,
    | "title"
    | "description"
    | "frequency"
    | "custom_days"
    | "target_count"
    | "color"
    | "icon"
    | "is_active"
    | "sort_order"
  >
>;

// ─── Habit Completion ──────────────────────────────────────
export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;
  count: number;
  notes: string | null;
  created_at: string;
}

// ─── Check-in ──────────────────────────────────────────────
export type CheckinType = "morning" | "evening" | "weekly";

export interface Checkin {
  id: string;
  user_id: string;
  checkin_date: string;
  checkin_type: CheckinType;
  top_priorities: string[];
  mood_score: number | null;
  wins: string[];
  blockers: string[];
  lessons_learned: string | null;
  gratitude: string | null;
  week_rating: number | null;
  next_week_focus: string | null;
  created_at: string;
  updated_at: string;
}

export type CheckinUpsert = Pick<Checkin, "checkin_date" | "checkin_type"> &
  Partial<
    Pick<
      Checkin,
      | "top_priorities"
      | "mood_score"
      | "wins"
      | "blockers"
      | "lessons_learned"
      | "gratitude"
      | "week_rating"
      | "next_week_focus"
    >
  >;

// ─── Analytics ─────────────────────────────────────────────
export interface DailyStat {
  stat_date: string;
  tasks_created: number;
  tasks_completed: number;
  total_estimated_minutes: number;
  total_actual_minutes: number;
}

export interface WeeklySummary {
  user_id: string;
  week_start: string;
  tasks_completed: number;
  tasks_planned: number;
  high_priority_done: number;
  completion_rate: number | null;
}
