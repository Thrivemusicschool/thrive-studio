import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentPortal from './StudentPortal'
import type { Badge, InstrumentData, PracticeSessionData, StudentData } from './types'

function calcPracticeStreak(sessions: Array<{ start_time: string }>): number {
  if (!sessions.length) return 0
  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const dates = new Set(sessions.map(s => dateKey(new Date(s.start_time))))
  const today = new Date()
  const startOffset = dates.has(dateKey(today)) ? 0 : 1
  let streak = 0
  for (let i = startOffset; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (dates.has(dateKey(d))) { streak++ } else { break }
  }
  return streak
}

function calcLessonStreak(lessons: Array<{ lesson_date: string }>): number {
  if (!lessons.length) return 0
  function mondayKey(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }
  const weeks = new Set(lessons.map(l => mondayKey(l.lesson_date)))
  const today = new Date()
  const todayKey = mondayKey(today.toISOString().split('T')[0])
  const startOffset = weeks.has(todayKey) ? 0 : 1
  let streak = 0
  for (let i = startOffset; i < 52; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    if (weeks.has(mondayKey(d.toISOString().split('T')[0]))) { streak++ } else { break }
  }
  return streak
}

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!family) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Almost there!</h2>
          <p className="text-gray-500 text-sm">Your account isn&apos;t fully set up yet. Please contact Thrive Music School.</p>
        </div>
      </div>
    )
  }

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [studentsResult, badgesResult] = await Promise.all([
    supabase.from('students').select('*').eq('family_id', family.id).eq('active', true).order('created_at'),
    supabase.from('badges').select('*').order('level'),
  ])

  const students = studentsResult.data ?? []
  const allBadges = (badgesResult.data ?? []) as Badge[]

  const studentDataList: StudentData[] = await Promise.all(
    students.map(async student => {
      const [
        instructorResult,
        lessonsResult,
        practiceResult,
        earnedResult,
        instrumentsResult,
        goalsResult,
      ] = await Promise.all([
        student.instructor_id
          ? supabase.from('instructors').select('first_name, last_name').eq('id', student.instructor_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('lessons').select('goals_for_next_week, lesson_date, instructor_id').eq('student_id', student.id).order('lesson_date', { ascending: false }).limit(60),
        supabase.from('practice_sessions').select('id, start_time, end_time, duration_minutes').eq('student_id', student.id).gte('start_time', sixtyDaysAgo.toISOString()).order('start_time', { ascending: false }),
        supabase.from('student_badges').select('badge_id').eq('student_id', student.id),
        supabase.from('student_instruments').select('instrument, instructor_id').eq('student_id', student.id).eq('active', true).order('sort_order'),
        supabase.from('student_goals').select('id, goal_text, start_date, duration_days, instructor_id').eq('student_id', student.id).eq('active', true).order('created_at', { ascending: false }).limit(1),
      ])

      const instructor = instructorResult.data
      const lessons = lessonsResult.data ?? []
      const practiceSessions = practiceResult.data ?? []
      const latestLesson = lessons[0] ?? null

      // Build instruments list — prefer student_instruments table, fall back to legacy field
      let instruments: InstrumentData[]
      const siRows = instrumentsResult.data ?? []

      if (siRows.length > 0) {
        instruments = await Promise.all(
          siRows.map(async row => {
            if (!row.instructor_id) return { instrument: row.instrument, instructorName: null }
            if (row.instructor_id === student.instructor_id && instructor) {
              return { instrument: row.instrument, instructorName: `${instructor.first_name} ${instructor.last_name}` }
            }
            const { data: gi } = await supabase.from('instructors').select('first_name, last_name').eq('id', row.instructor_id).single()
            return { instrument: row.instrument, instructorName: gi ? `${gi.first_name} ${gi.last_name}` : null }
          })
        )
      } else {
        instruments = [{
          instrument: student.instrument ?? 'Musician',
          instructorName: instructor ? `${instructor.first_name} ${instructor.last_name}` : null,
        }]
      }

      // Goal instructor
      let latestGoalInstructorName: string | null = null
      if (latestLesson?.instructor_id) {
        if (latestLesson.instructor_id === student.instructor_id && instructor) {
          latestGoalInstructorName = `${instructor.first_name} ${instructor.last_name}`
        } else {
          const { data: gi } = await supabase.from('instructors').select('first_name, last_name').eq('id', latestLesson.instructor_id).single()
          if (gi) latestGoalInstructorName = `${gi.first_name} ${gi.last_name}`
        }
      }

      const recentSessions = practiceSessions.filter(s => new Date(s.start_time) >= sevenDaysAgo) as PracticeSessionData[]

      // Resolve active 30-day goal
      const goalRow = goalsResult.data?.[0] ?? null
      let currentGoal: import('./types').GoalData | null = null
      if (goalRow) {
        let goalInstructorName: string | null = null
        if (goalRow.instructor_id) {
          if (goalRow.instructor_id === student.instructor_id && instructor) {
            goalInstructorName = `${instructor.first_name} ${instructor.last_name}`
          } else {
            const { data: gi } = await supabase.from('instructors').select('first_name, last_name').eq('id', goalRow.instructor_id).single()
            if (gi) goalInstructorName = `${gi.first_name} ${gi.last_name}`
          }
        }
        currentGoal = {
          id: goalRow.id,
          goalText: goalRow.goal_text,
          startDate: goalRow.start_date,
          durationDays: goalRow.duration_days,
          instructorName: goalInstructorName,
        }
      }

      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        instruments,
        journeyStartDate: student.journey_start_date,
        currentGoal,
        practiceStreak: calcPracticeStreak(practiceSessions),
        lessonStreak: calcLessonStreak(lessons),
        latestGoal: latestLesson?.goals_for_next_week ?? null,
        latestGoalInstructorName,
        recentSessions,
        earnedBadgeIds: (earnedResult.data ?? []).map(b => b.badge_id),
      }
    })
  )

  return <StudentPortal students={studentDataList} allBadges={allBadges} />
}
