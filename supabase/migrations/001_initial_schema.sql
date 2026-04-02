-- =============================================================
-- ProductiveDay — Database Schema & RLS Policies
-- =============================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- ─── Profiles Table ────────────────────────────────────────
-- Stores public user profile info (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (for initial signup)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ─── Tasks Table ───────────────────────────────────────────
-- Core task management (migrating from localStorage)
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  scheduled_date date,
  completed_at timestamp with time zone,
  tags text[] default '{}',
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Users can only see their own tasks
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

-- Users can create their own tasks
create policy "Users can create own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

-- Users can update their own tasks
create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

-- Users can delete their own tasks
create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);


-- ─── Daily Plans Table ─────────────────────────────────────
-- Tracks daily planning sessions and reflections
create table if not exists public.daily_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_date date not null,
  morning_intention text,
  evening_reflection text,
  energy_level integer check (energy_level between 1 and 5),
  productivity_score integer check (productivity_score between 1 and 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- One plan per user per day
  unique(user_id, plan_date)
);

-- Enable RLS
alter table public.daily_plans enable row level security;

create policy "Users can view own daily plans"
  on public.daily_plans for select
  using (auth.uid() = user_id);

create policy "Users can create own daily plans"
  on public.daily_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily plans"
  on public.daily_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily plans"
  on public.daily_plans for delete
  using (auth.uid() = user_id);


-- ─── Indexes for Performance ───────────────────────────────
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_user_scheduled on public.tasks(user_id, scheduled_date);
create index if not exists idx_daily_plans_user_date on public.daily_plans(user_id, plan_date);


-- ─── Auto-update updated_at ────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger on_tasks_updated
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create trigger on_daily_plans_updated
  before update on public.daily_plans
  for each row execute procedure public.handle_updated_at();


-- ─── Auto-create Profile on Signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: when a new user signs up, auto-create their profile
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
