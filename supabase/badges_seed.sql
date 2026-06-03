-- Run this in the Supabase SQL Editor to seed the badges table

insert into public.badges (name, emoji, family, level, description) values
('First Step',          '🏅', 'progress',     'spark',  'Completed your very first lesson'),
('First Song',          '🎵', 'progress',     'spark',  'Played your first recognizable song'),
('Practice Spark',      '⚡', 'practice',     'spark',  '4 practice sessions in one week'),
('Rhythm Builder',      '🥁', 'practice',     'groove', '2 weeks of consistent practice'),
('Brave Performer',     '🎤', 'performance',  'spark',  'Performed for someone other than your teacher'),
('Music Explorer',      '🧭', 'progress',     'groove', 'Chose your own song or challenge'),
('90-Day Musician',     '🏆', 'progress',     'legend', 'Completed the full 90-Day Journey'),
('Student of the Month','🌟', 'recognition',  'legend', 'Recognized by Thrive Music School for exceptional effort, growth, and heart');
