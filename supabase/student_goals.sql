-- ============================================================
-- student_goals table
-- Instructor-set 30-day goals that appear after the 90-day journey
-- Run this in the Supabase SQL Editor
-- ============================================================

create table public.student_goals (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students on delete cascade,
  instructor_id uuid references public.instructors,
  goal_text text not null,
  start_date date default current_date,
  duration_days integer default 30,
  active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.student_goals enable row level security;

create policy "Families can view own student goals"
  on public.student_goals for select
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

create policy "Instructors can view all student goals"
  on public.student_goals for select
  using (true);

create policy "Instructors can insert student goals"
  on public.student_goals for insert
  with check (true);

create policy "Instructors can update student goals"
  on public.student_goals for update
  using (true);
