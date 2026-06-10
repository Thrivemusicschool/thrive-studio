-- ============================================================
-- Session 5 — Admin Dashboard: RLS policies
-- Requires public.is_admin() from session4_enrollment.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Admins can read everything
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can view all instructors"
  on public.instructors for select
  using (public.is_admin());

create policy "Admins can view all families"
  on public.families for select
  using (public.is_admin());

create policy "Admins can view all students"
  on public.students for select
  using (public.is_admin());

create policy "Admins can view all lessons"
  on public.lessons for select
  using (public.is_admin());

create policy "Admins can view all practice sessions"
  on public.practice_sessions for select
  using (public.is_admin());

create policy "Admins can view all student badges"
  on public.student_badges for select
  using (public.is_admin());

-- Admins manage instructors (add / deactivate)
create policy "Admins can add instructors"
  on public.instructors for insert
  with check (public.is_admin());

create policy "Admins can update instructors"
  on public.instructors for update
  using (public.is_admin());

-- Admins can update students (e.g. reassign instructor, deactivate)
create policy "Admins can update students"
  on public.students for update
  using (public.is_admin());
