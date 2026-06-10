import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LessonForm from './LessonForm'

function calcAvgPractice(sessions: Array<{ duration_minutes: number | null }>): number {
  if (!sessions.length) return 0
  const total = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
  return Math.round(total / 7)
}

function journeyLabel(journeyStartDate: string | null): string {
  if (!journeyStartDate) return 'Journey not started'
  const day = Math.max(1, Math.floor((Date.now() - new Date(journeyStartDate).getTime()) / 86_400_000) + 1)
  return day <= 90 ? `Day ${day} of 90` : `Day ${day} — Journey complete`
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get this instructor's record
  const { data: instructor } = await supabase
    .from('instructors')
    .select('id, first_name, last_name')
    .eq('profile_id', user.id)
    .single()

  if (!instructor) redirect('/instructor')

  // Verify this student belongs to this instructor
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, instrument, journey_start_date')
    .eq('id', studentId)
    .eq('instructor_id', instructor.id)
    .single()

  if (!student) redirect('/instructor')

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Fetch lesson history, practice sessions, badges in parallel
  const [lessonsResult, practiceResult, allBadgesResult, earnedResult] = await Promise.all([
    supabase
      .from('lessons')
      // NOTE: internal_note intentionally excluded — visible to instructor only via this page's form
      .select('goals_for_next_week, lesson_date')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(5),
    supabase
      .from('practice_sessions')
      .select('duration_minutes')
      .eq('student_id', studentId)
      .gte('start_time', sevenDaysAgo.toISOString()),
    supabase.from('badges').select('*').order('level'),
    supabase.from('student_badges').select('badge_id').eq('student_id', studentId),
  ])

  const lastLesson = lessonsResult.data?.[0] ?? null
  const avgPractice = calcAvgPractice(practiceResult.data ?? [])
  const allBadges = allBadgesResult.data ?? []
  const earnedBadgeIds = (earnedResult.data ?? []).map(b => b.badge_id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-6 py-4">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white text-sm mb-2 transition-colors"
        >
          ← Back to Roster
        </Link>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-black">
            {student.first_name} {student.last_name}
          </h1>
          {student.instrument && (
            <span className="text-indigo-200 font-medium">· {student.instrument}</span>
          )}
          <span className="text-indigo-300 text-sm">{journeyLabel(student.journey_start_date)}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── BEFORE LESSON (readonly) ── */}
        <section className="bg-gray-100 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Before Lesson
          </h2>

          <div className="mb-5">
            <p className="text-sm font-bold text-gray-500 mb-1">Last Week&apos;s Goal</p>
            {lastLesson?.goals_for_next_week ? (
              <p className="text-gray-800 leading-relaxed">{lastLesson.goals_for_next_week}</p>
            ) : (
              <p className="text-gray-400 italic">First lesson — no previous goals yet</p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-gray-200">
            <span className="text-lg">⏱️</span>
            <div>
              <span className="text-sm font-bold text-gray-700">Daily Practice Average: </span>
              {avgPractice > 0 ? (
                <span className="text-sm text-indigo-600 font-black">{avgPractice} min/day</span>
              ) : (
                <span className="text-sm text-gray-400 italic">No practice logged this week</span>
              )}
              <span className="text-xs text-gray-400 ml-1">(last 7 days)</span>
            </div>
          </div>
        </section>

        {/* ── AFTER LESSON (form) ── */}
        <section className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            After Lesson
          </h2>
          <LessonForm
            studentId={studentId}
            instructorId={instructor.id}
            allBadges={allBadges}
            earnedBadgeIds={earnedBadgeIds}
          />
        </section>

      </main>
    </div>
  )
}
