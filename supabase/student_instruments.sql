-- ============================================================
-- student_instruments table
-- Supports students taking multiple instruments with different teachers
-- Run this in the Supabase SQL Editor
-- ============================================================

create table public.student_instruments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students on delete cascade,
  instrument text not null,
  instructor_id uuid references public.instructors,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.student_instruments enable row level security;

-- Families can read their students' instruments
create policy "Families can view own student instruments"
  on public.student_instruments for select
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

-- Instructors can manage student instruments (we'll tighten this later)
create policy "Instructors can view all student instruments"
  on public.student_instruments for select
  using (true);
