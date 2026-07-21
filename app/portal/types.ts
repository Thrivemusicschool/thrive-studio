export type BadgeLevel =
  | 'spark' | 'groove' | 'legend'
  | 'bronze' | 'silver' | 'gold' | 'allstar'

export interface Badge {
  id: string
  name: string
  emoji: string
  family: string
  level: BadgeLevel
  description: string
}

export interface LeaderboardRow {
  studentId: string
  displayName: string
  totalMinutes: number
}

export interface PracticeSessionData {
  id: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
}

export interface InstrumentData {
  instrument: string
  instructorName: string | null
}

export interface GoalData {
  id: string
  goalText: string
  startDate: string
  durationDays: number
  instructorName: string | null
}

export interface StudentData {
  id: string
  firstName: string
  lastName: string
  instruments: InstrumentData[]
  journeyStartDate: string | null
  practiceStreak: number
  lessonStreak: number
  latestGoal: string | null
  latestGoalInstructorName: string | null
  currentGoal: GoalData | null
  recentSessions: PracticeSessionData[]
  earnedBadgeIds: string[]
}
