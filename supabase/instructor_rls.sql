-- ============================================================
-- Instructor RLS Policies
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Instructors can read their own instructor record
create policy "Instructors can view own record"
  on public.instructors for select
  using (profile_id = auth.uid());

-- Instructors can read students assigned to them
create policy "Instructors can view their students"
  on public.students for select
  using (
    instructor_id in (
      select id from public.instructors where profile_id = auth.uid()
    )
  );

-- Instructors can view all lessons for their students
create policy "Instructors can view their students lessons"
  on public.lessons for select
  using (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

-- Instructors can insert lessons for their students
create policy "Instructors can insert lessons"
  on public.lessons for insert
  with check (
    instructor_id in (
      select id from public.instructors where profile_id = auth.uid()
    )
  );

-- Instructors can view practice sessions for their students
create policy "Instructors can view their students practice sessions"
  on public.practice_sessions for select
  using (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

-- Instructors can view all badges
create policy "Instructors can view badges"
  on public.badges for select
  using (true);

-- Instructors can view student badges for their students
create policy "Instructors can view their students badges"
  on public.student_badges for select
  using (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

-- Instructors can award badges to their students
create policy "Instructors can award badges to their students"
  on public.student_badges for insert
  with check (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

-- Instructors can view student goals for their students
create policy "Instructors can view their students goals"
  on public.student_goals for select
  using (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );
