-- ============================================================
-- Session 6 — Instructor invites, admin lesson logging, demo data
-- Run this in the Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

-- Instructors can now have an email (used to invite them)
alter table public.instructors
  add column if not exists email text;

-- When an invited instructor logs in for the first time, link their
-- login to the instructor record the admin created, and give them
-- the instructor role.
create or replace function public.claim_instructor()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  uemail text;
begin
  select email into uemail from public.profiles where id = auth.uid();
  if uemail is null then
    return false;
  end if;

  update public.instructors
  set profile_id = auth.uid()
  where profile_id is null
    and email is not null
    and lower(email) = lower(uemail);

  if not found then
    return false;
  end if;

  update public.profiles set role = 'instructor' where id = auth.uid();
  return true;
end;
$$;

grant execute on function public.claim_instructor() to authenticated;

-- Admins can log lessons and award badges on an instructor's behalf
drop policy if exists "Admins can insert lessons" on public.lessons;
create policy "Admins can insert lessons"
  on public.lessons for insert
  with check (public.is_admin());

drop policy if exists "Admins can award badges" on public.student_badges;
create policy "Admins can award badges"
  on public.student_badges for insert
  with check (public.is_admin());

-- Clean up: remove duplicate Mike Larson rows that have no login and
-- no students (leftover test entries)
delete from public.instructors i
where i.profile_id is null
  and i.first_name = 'Mike'
  and i.last_name = 'Larson'
  and not exists (select 1 from public.students s where s.instructor_id = i.id);

-- Create a demo student assigned to Mike Larson (the instructor login
-- tied to miklarson1@gmail.com), so the instructor roster has someone
insert into public.students (instructor_id, first_name, last_name, instrument, journey_start_date)
select i.id, 'Demo', 'Student', 'Piano', current_date
from public.instructors i
join public.profiles p on p.id = i.profile_id
where p.email = 'miklarson1@gmail.com'
  and not exists (
    select 1 from public.students s
    where s.first_name = 'Demo' and s.last_name = 'Student'
  )
limit 1;

-- Show the result
select i.first_name, i.last_name, i.email, i.active,
       (i.profile_id is not null) as has_login,
       (select count(*) from public.students s where s.instructor_id = i.id) as students
from public.instructors i
order by i.first_name;
