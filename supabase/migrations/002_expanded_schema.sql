-- =============================================================
-- ProductiveDay — Migration 002: Expanded Schema
-- =============================================================
-- Run AFTER 001_initial_schema.sql in Supabase SQL Editor
-- Adds: habits, streaks, accountability check-ins, categories,
--        and analytics views for the dashboard
-- =============================================================


-- ─── Categories ────────────────────────────────────────────
-- User-defined categories for organizing tasks
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text default '#10b981',
  icon text default 'folder',
  sort_order integer default 0,
  created_at timestamptz default now() not null
);

alter table public.categories enable row level security;

create policy "Users can manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add category_id to tasks (nullable for uncategorized tasks)
alter table public.tasks
  add column if not exists category_id uuid references public.categories(id) on delete set null;

-- Add estimated and actual duration for time tracking
alter table public.tasks
  add column if not exists estimated_minutes integer,
  add column if not exists actual_minutes integer;


-- ─── Habits ────────────────────────────────────────────────
-- Recurring habits that users want to build
create table if not exists public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  frequency text default 'daily' check (frequency in ('daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  custom_days integer[] default '{}',  -- 0=Sun, 1=Mon, ... 6=Sat
  target_count integer default 1,       -- e.g. "drink 8 glasses of water"
  color text default '#10b981',
  icon text default 'check-circle',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.habits enable row level security;

create policy "Users can manage own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── Habit Completions ─────────────────────────────────────
-- Track each time a habit is completed
create table if not exists public.habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null,
  count integer default 1,  -- how many times completed that day
  notes text,
  created_at timestamptz default now() not null,

  unique(habit_id, completed_date)
);

alter table public.habit_completions enable row level security;

create policy "Users can manage own habit completions"
  on public.habit_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── Accountability Check-ins ──────────────────────────────
-- Daily or weekly self-accountability entries
create table if not exists public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  checkin_date date not null,
  checkin_type text default 'daily' check (checkin_type in ('morning', 'evening', 'weekly')),

  -- Morning check-in fields
  top_priorities text[] default '{}',    -- top 3 things to accomplish
  mood_score integer check (mood_score between 1 and 5),

  -- Evening check-in fields
  wins text[] default '{}',             -- what went well
  blockers text[] default '{}',         -- what blocked progress
  lessons_learned text,
  gratitude text,

  -- Weekly review fields
  week_rating integer check (week_rating between 1 and 10),
  next_week_focus text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(user_id, checkin_date, checkin_type)
);

alter table public.checkins enable row level security;

create policy "Users can manage own checkins"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── User Preferences / Settings ──────────────────────────
-- Extended user settings beyond the profile
alter table public.profiles
  add column if not exists theme text default 'system' check (theme in ('light', 'dark', 'system')),
  add column if not exists week_starts_on integer default 1 check (week_starts_on between 0 and 6),
  add column if not exists daily_goal_count integer default 5,
  add column if not exists notification_enabled boolean default true,
  add column if not exists onboarding_completed boolean default false;


-- ─── Indexes ───────────────────────────────────────────────
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_habits_user on public.habits(user_id) where is_active = true;
create index if not exists idx_habit_completions_habit_date on public.habit_completions(habit_id, completed_date);
create index if not exists idx_habit_completions_user_date on public.habit_completions(user_id, completed_date);
create index if not exists idx_checkins_user_date on public.checkins(user_id, checkin_date);
create index if not exists idx_tasks_category on public.tasks(category_id) where category_id is not null;


-- ─── Triggers ──────────────────────────────────────────────
create trigger on_habits_updated
  before update on public.habits
  for each row execute procedure public.handle_updated_at();

create trigger on_checkins_updated
  before update on public.checkins
  for each row execute procedure public.handle_updated_at();


-- ─── Analytics: Streak Calculator Function ─────────────────
-- Returns the current streak length for a given habit
create or replace function public.get_habit_streak(p_habit_id uuid)
returns integer as $$
declare
  streak integer := 0;
  check_date date := current_date;
  found boolean;
begin
  loop
    select exists(
      select 1 from public.habit_completions
      where habit_id = p_habit_id and completed_date = check_date
    ) into found;

    if not found then
      -- Allow today to be incomplete (streak counts up to yesterday)
      if check_date = current_date then
        check_date := check_date - 1;
        continue;
      end if;
      exit;
    end if;

    streak := streak + 1;
    check_date := check_date - 1;
  end loop;

  return streak;
end;
$$ language plpgsql security definer;


-- ─── Analytics: Weekly Summary View ────────────────────────
-- Aggregated stats for the current week
create or replace view public.weekly_summary as
select
  t.user_id,
  date_trunc('week', current_date)::date as week_start,
  count(*) filter (where t.status = 'done' and t.completed_at >= date_trunc('week', current_date)) as tasks_completed,
  count(*) filter (where t.status = 'todo' and t.scheduled_date >= date_trunc('week', current_date) and t.scheduled_date < date_trunc('week', current_date) + interval '7 days') as tasks_planned,
  count(*) filter (where t.status = 'done' and t.completed_at >= date_trunc('week', current_date) and t.priority = 'high') as high_priority_done,
  round(
    count(*) filter (where t.status = 'done' and t.completed_at >= date_trunc('week', current_date))::numeric /
    nullif(count(*) filter (where t.scheduled_date >= date_trunc('week', current_date) and t.scheduled_date < date_trunc('week', current_date) + interval '7 days'), 0)::numeric * 100,
    1
  ) as completion_rate
from public.tasks t
group by t.user_id;


-- ─── Analytics: Daily Task Stats Function ──────────────────
-- Returns task stats for a date range (for charts)
create or replace function public.get_daily_stats(
  p_user_id uuid,
  p_start_date date default current_date - 30,
  p_end_date date default current_date
)
returns table (
  stat_date date,
  tasks_created bigint,
  tasks_completed bigint,
  total_estimated_minutes bigint,
  total_actual_minutes bigint
) as $$
begin
  return query
  select
    d.dt::date as stat_date,
    count(t.id) filter (where t.created_at::date = d.dt) as tasks_created,
    count(t.id) filter (where t.completed_at::date = d.dt) as tasks_completed,
    coalesce(sum(t.estimated_minutes) filter (where t.scheduled_date = d.dt), 0) as total_estimated_minutes,
    coalesce(sum(t.actual_minutes) filter (where t.completed_at::date = d.dt), 0) as total_actual_minutes
  from generate_series(p_start_date, p_end_date, '1 day'::interval) d(dt)
  left join public.tasks t on t.user_id = p_user_id
    and (t.created_at::date = d.dt or t.completed_at::date = d.dt or t.scheduled_date = d.dt)
  group by d.dt
  order by d.dt;
end;
$$ language plpgsql security definer;
