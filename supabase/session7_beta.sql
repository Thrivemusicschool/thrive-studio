-- ============================================================
-- Session 7 — Beta readiness
--   • manual practice entry (edit / delete)
--   • monthly leaderboard
--   • Chart Topper badge
--   • feedback inbox
-- Run this in the Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

-- ── 1. Practice sessions: families and admins can fix or remove entries ──
drop policy if exists "Families can update own practice" on public.practice_sessions;
create policy "Families can update own practice"
  on public.practice_sessions for update
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

drop policy if exists "Families can delete own practice" on public.practice_sessions;
create policy "Families can delete own practice"
  on public.practice_sessions for delete
  using (
    student_id in (
      select s.id from public.students s
      join public.families f on f.id = s.family_id
      where f.profile_id = auth.uid()
    )
  );

drop policy if exists "Admins can update practice" on public.practice_sessions;
create policy "Admins can update practice"
  on public.practice_sessions for update
  using (public.is_admin());

drop policy if exists "Admins can delete practice" on public.practice_sessions;
create policy "Admins can delete practice"
  on public.practice_sessions for delete
  using (public.is_admin());

-- ── 2. Monthly leaderboard ──
-- security definer so families can see the board without being able to
-- read other families' student records. Returns first name + last initial only.
create or replace function public.monthly_leaderboard()
returns table (
  student_id uuid,
  display_name text,
  total_minutes bigint
)
language sql
security definer set search_path = ''
stable
as $$
  select s.id,
         s.first_name || ' ' || left(s.last_name, 1) || '.',
         coalesce(sum(ps.duration_minutes), 0)::bigint
  from public.students s
  join public.practice_sessions ps
    on ps.student_id = s.id
   and ps.start_time >= date_trunc('month', now())
  where s.active = true
  group by s.id, s.first_name, s.last_name
  having coalesce(sum(ps.duration_minutes), 0) > 0
  order by 3 desc, 2 asc
  limit 25;
$$;

grant execute on function public.monthly_leaderboard() to authenticated;

-- ── 3. Chart Topper badge ──
insert into public.badges (name, emoji, family, level, description, sort_order)
select 'Chart Topper', '📈', 'practice', 'gold',
       'Finish #1 on the monthly practice leaderboard.', 35
where not exists (select 1 from public.badges where name = 'Chart Topper');

-- ── 4. Feedback inbox ──
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles,
  email text,
  kind text,
  message text not null,
  page text,
  created_at timestamp with time zone default now()
);

alter table public.feedback enable row level security;

-- Anyone signed in can send feedback
drop policy if exists "Users can send feedback" on public.feedback;
create policy "Users can send feedback"
  on public.feedback for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Only admins read the inbox
drop policy if exists "Admins can read feedback" on public.feedback;
create policy "Admins can read feedback"
  on public.feedback for select
  using (public.is_admin());

select
  (select count(*) from public.badges) as badge_count,
  (select count(*) from public.monthly_leaderboard()) as leaderboard_rows;
