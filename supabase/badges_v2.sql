-- ============================================================
-- Badges v2 — Thrive Music School's real badge list (20 badges)
-- Replaces the original placeholder badges.
-- NOTE: clears any previously awarded badges (test data only).
-- Run this in the Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

alter table public.badges
  add column if not exists sort_order integer default 100;

-- Allow the new tier levels
alter table public.badges drop constraint if exists badges_level_check;
alter table public.badges add constraint badges_level_check
  check (level in ('spark', 'groove', 'legend', 'bronze', 'silver', 'gold', 'allstar'));

-- Wipe old badges + old (test) awards
delete from public.student_badges;
delete from public.badges;

insert into public.badges (name, emoji, family, level, description, sort_order) values
('Perfect Week — Bronze',    '🔥', 'practice',    'bronze',  'Complete 5 practice sessions in one week.', 10),
('Perfect Week — Silver',    '🔥', 'practice',    'silver',  'Complete 5 practice sessions per week for 3 separate weeks.', 20),
('Perfect Week — Gold',      '🔥', 'practice',    'gold',    'Complete 5 practice sessions per week for 6 weeks or more.', 30),
('Piece Beginner',           '🎼', 'repertoire',  'spark',   'Complete an easy-level piece from beginning to end with no errors and no stops.', 40),
('Piece Expert',             '🎯', 'repertoire',  'groove',  'Complete a medium-level piece with 90% accuracy or higher.', 50),
('Piece Master',             '👑', 'repertoire',  'legend',  'Complete a highly difficult song with 90% accuracy or higher.', 60),
('Song Collector — Bronze',  '🎵', 'repertoire',  'bronze',  'Complete 5 songs.', 70),
('Song Collector — Silver',  '🎵', 'repertoire',  'silver',  'Complete 10 songs.', 80),
('Song Collector — Gold',    '🎵', 'repertoire',  'gold',    'Complete 25 songs.', 90),
('Song Finder',              '🧭', 'progress',    'spark',   'Find a song you want to learn and work with your teacher to learn it.', 100),
('Goal Getter',              '🚀', 'progress',    'groove',  'Set a personal music goal with your teacher and complete it.', 110),
('First Recording',          '🎬', 'performance', 'spark',   'Record and submit your first full song or performance video.', 120),
('Family Performance',       '🎤', 'performance', 'spark',   'Perform a piece you are currently working on for your family.', 130),
('Recital Badge — Bronze',   '🥉', 'performance', 'bronze',  'Complete 1 recital performance.', 140),
('Recital Badge — Silver',   '🥈', 'performance', 'silver',  'Complete 2 recital performances.', 150),
('Recital Badge — Gold',     '🥇', 'performance', 'gold',    'Complete 3 recital performances.', 160),
('Recital Badge — All Star', '🌠', 'performance', 'allstar', 'Complete 4 recital performances.', 170),
('90 Day Badge',             '🏆', 'progress',    'legend',  'Stay enrolled and actively learning at Thrive Music School for 90 days.', 180),
('Building the Band',        '🎸', 'community',   'groove',  'Invite a friend or family member who enrolls in music lessons at Thrive Music School.', 190),
('Student of the Month',     '🌟', 'recognition', 'legend',  'Awarded to the student who showed exceptional effort, growth, attitude, practice consistency, and encouragement during the month.', 200);

-- Everyone logged in can SEE badges (this was why the award section was empty)
drop policy if exists "Anyone authenticated can view badges" on public.badges;
create policy "Anyone authenticated can view badges"
  on public.badges for select
  to authenticated
  using (true);

-- Instructors can award badges to their own students
drop policy if exists "Instructors can award badges to their students" on public.student_badges;
create policy "Instructors can award badges to their students"
  on public.student_badges for insert
  with check (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "Instructors can view their students badges" on public.student_badges;
create policy "Instructors can view their students badges"
  on public.student_badges for select
  using (
    student_id in (
      select id from public.students where instructor_id in (
        select id from public.instructors where profile_id = auth.uid()
      )
    )
  );

-- Admins can award too
drop policy if exists "Admins can award badges" on public.student_badges;
create policy "Admins can award badges"
  on public.student_badges for insert
  with check (public.is_admin());

select count(*) as badge_count from public.badges;
