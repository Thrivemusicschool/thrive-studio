-- ============================================================
-- Session 4 — Enrollment Flow: RLS policies
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Helper: check if the current user is an admin.
-- security definer so it can read profiles without tripping RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Invites ──
-- Optional prefill info the admin can attach to an invite
alter table public.invites
  add column if not exists student_first_name text,
  add column if not exists instrument text;

drop policy if exists "Admins can create invites" on public.invites;
create policy "Admins can create invites"
  on public.invites for insert
  with check (public.is_admin());

drop policy if exists "Admins can view invites" on public.invites;
create policy "Admins can view invites"
  on public.invites for select
  using (public.is_admin());

drop policy if exists "Admins can update invites" on public.invites;
create policy "Admins can update invites"
  on public.invites for update
  using (public.is_admin());

-- Invited users see and mark their own invite during setup
drop policy if exists "Users can view own invite" on public.invites;
create policy "Users can view own invite"
  on public.invites for select
  using (email = (select auth.jwt() ->> 'email'));

drop policy if exists "Users can mark own invite used" on public.invites;
create policy "Users can mark own invite used"
  on public.invites for update
  using (email = (select auth.jwt() ->> 'email'));

-- ── Instructors: setup wizard needs the active-instructor dropdown ──
drop policy if exists "Authenticated users can view active instructors" on public.instructors;
create policy "Authenticated users can view active instructors"
  on public.instructors for select
  to authenticated
  using (active = true);

-- ── Profiles: allow a new user to claim the 'family' role (only that role) ──
drop policy if exists "Users can set own role to family" on public.profiles;
create policy "Users can set own role to family"
  on public.profiles for update
  using (auth.uid() = id)
  with check (role = 'family');

-- ── Families: owners manage their own family row ──
drop policy if exists "Families can view own family" on public.families;
create policy "Families can view own family"
  on public.families for select
  using (profile_id = auth.uid());

drop policy if exists "Families can create own family" on public.families;
create policy "Families can create own family"
  on public.families for insert
  with check (profile_id = auth.uid());

drop policy if exists "Families can update own family" on public.families;
create policy "Families can update own family"
  on public.families for update
  using (profile_id = auth.uid());

-- ── Students: families manage their own students ──
drop policy if exists "Families can view own students" on public.students;
create policy "Families can view own students"
  on public.students for select
  using (
    family_id in (select id from public.families where profile_id = auth.uid())
  );

drop policy if exists "Families can add own students" on public.students;
create policy "Families can add own students"
  on public.students for insert
  with check (
    family_id in (select id from public.families where profile_id = auth.uid())
  );

-- ── Family portal reads (lessons / practice / badges) ──
-- These may already exist if added manually during Session 2 — drop-if-exists keeps this idempotent.
drop policy if exists "Families can view own students lessons" on public.lessons;
create policy "Families can view own students lessons"
  on public.lessons for select
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

drop policy if exists "Families can log practice" on public.practice_sessions;
create policy "Families can log practice"
  on public.practice_sessions for insert
  with check (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

drop policy if exists "Families can view own practice" on public.practice_sessions;
create policy "Families can view own practice"
  on public.practice_sessions for select
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

drop policy if exists "Anyone authenticated can view badges" on public.badges;
create policy "Anyone authenticated can view badges"
  on public.badges for select
  to authenticated
  using (true);

drop policy if exists "Families can view own student badges" on public.student_badges;
create policy "Families can view own student badges"
  on public.student_badges for select
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

-- ============================================================
-- NOTE: To customize the invite email subject/body
-- ("Welcome to Thrive Studio 🎵"), edit the **Magic Link**
-- template under Authentication → Email Templates in the
-- Supabase dashboard. Email content cannot be set from code
-- with the anon key.
-- ============================================================
