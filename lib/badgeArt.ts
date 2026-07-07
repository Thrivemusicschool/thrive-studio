// Maps badge names to their SVG artwork in /public/badges.
// Badges without artwork fall back to their emoji everywhere.
const ART: Record<string, string> = {
  'Perfect Week — Bronze': 'perfect-week-bronze.svg',
  'Perfect Week — Silver': 'perfect-week-silver.svg',
  'Perfect Week — Gold': 'perfect-week-gold.svg',
  'Piece Beginner': 'piece-beginner.svg',
  'Piece Expert': 'piece-expert.svg',
  'Piece Master': 'piece-master.svg',
  'Song Collector — Bronze': 'song-collector-bronze.svg',
  'Song Collector — Silver': 'song-collector-silver.svg',
  'Song Collector — Gold': 'song-collector-gold.svg',
  'Song Finder': 'song-finder.svg',
  'Goal Getter': 'goal-getter.svg',
  'First Recording': 'first-recording.svg',
  'Family Performance': 'family-performance.svg',
  'Recital Badge — Bronze': 'recital-bronze.svg',
  'Recital Badge — Silver': 'recital-silver.svg',
  'Recital Badge — Gold': 'recital-gold.svg',
  'Recital Badge — All Star': 'recital-all-star.svg',
  '90 Day Badge': 'ninety-day.svg',
  'Building the Band': 'building-the-band.svg',
  'Student of the Month': 'student-of-the-month.svg',
}

export function badgeImageUrl(name: string): string | null {
  const file = ART[name]
  return file ? `/badges/${file}` : null
}
