export type RiskLevel = 'red' | 'yellow' | 'green'

export interface RiskFlag {
  level: 'red' | 'yellow'
  reason: string
}

export interface RiskInput {
  createdAt: string
  journeyDay: number | null
  lastLessonDate: string | null
  lastGoalDate: string | null
  lastPracticeDate: string | null
  hasFirstPieceBadge: boolean
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export function computeRiskFlags(input: RiskInput): RiskFlag[] {
  const flags: RiskFlag[] = []
  const accountAge = daysSince(input.createdAt)

  // ── RED ──
  if (input.lastLessonDate && daysSince(input.lastLessonDate) >= 14) {
    flags.push({ level: 'red', reason: `No lesson in ${daysSince(input.lastLessonDate)} days` })
  }
  if (!input.lastLessonDate && accountAge > 14) {
    flags.push({ level: 'red', reason: 'No lesson at all and account is over 14 days old' })
  }
  if (accountAge > 14 && (!input.lastPracticeDate || daysSince(input.lastPracticeDate) >= 14)) {
    flags.push({ level: 'red', reason: 'No practice logged in 14 days' })
  }

  // ── YELLOW ──
  if (accountAge > 7 && (!input.lastPracticeDate || daysSince(input.lastPracticeDate) >= 7)) {
    // only add if not already covered by the 14-day red flag
    if (!flags.some(f => f.reason === 'No practice logged in 14 days')) {
      flags.push({ level: 'yellow', reason: 'No practice logged in 7 days' })
    }
  }
  if (accountAge > 14 && (!input.lastGoalDate || daysSince(input.lastGoalDate) >= 14)) {
    flags.push({ level: 'yellow', reason: 'No instructor goal set in 14 days' })
  }
  if ((input.journeyDay ?? 0) > 35 && !input.hasFirstPieceBadge) {
    flags.push({ level: 'yellow', reason: 'Past Day 35 with no Piece Beginner badge' })
  }

  return flags
}

export function riskLevel(flags: RiskFlag[]): RiskLevel {
  if (flags.some(f => f.level === 'red')) return 'red'
  if (flags.some(f => f.level === 'yellow')) return 'yellow'
  return 'green'
}
