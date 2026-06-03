-- ============================================================
-- Thrive Studio — full database schema
-- Run this in the Supabase SQL Editor
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text check (role in ('admin', 'instructor', 'family')),
  created_at timestamp with time zone default now()
);

create table public.instructors (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles,
  first_name text not null,
  last_name text not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table public.families (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles,
  parent_first_name text,
  parent_last_name text,
  parent_phone text,
  setup_complete boolean default false,
  created_at timestamp with time zone default now()
);

create table public.students (
  id uuid default gen_random_uuid() primary key,
  family_id uuid references public.families,
  instructor_id uuid references public.instructors,
  first_name text not null,
  last_name text not null,
  instrument text,
  birthday date,
  journey_start_date date,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students,
  instructor_id uuid references public.instructors,
  lesson_date date default current_date,
  goals_for_next_week text,
  internal_note text,
  created_at timestamp with time zone default now()
);

create table public.practice_sessions (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_minutes integer,
  created_at timestamp with time zone default now()
);

create table public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text,
  family text,
  level text check (level in ('spark', 'groove', 'legend')),
  description text
);

create table public.student_badges (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students,
  badge_id uuid references public.badges,
  awarded_by uuid references public.instructors,
  awarded_at timestamp with time zone default now()
);

create table public.invites (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  created_by uuid references public.profiles,
  used boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.instructors enable row level security;
alter table public.families enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.invites enable row level security;

-- Profiles: users can read their own row
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- ============================================================
-- Trigger: auto-create profile row on new user signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
