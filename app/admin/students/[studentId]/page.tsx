import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeRiskFlags, riskLevel } from '@/lib/risk'

function journeyDay(journeyStartDate: string | null): number | null {
  if (!journeyStartDate) return null
  return Math.max(1, Math.floor((Date.now() - new Date(journeyStartDate).getTime()) / 86_400_000) + 1)
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, instrument, instructor_id, family_id, journey_start_date, birthday, created_at, active')
    .eq('id', studentId)
    .single()

  if (!student) redirect('/admin')

  const [instructorRes, familyRes, lessonsRes, practiceRes, badgesRes, earnedRes] = await Promise.all([
    student.instructor_id
      ? supabase.from('instructors').select('first_name, last_name').eq('id', student.instructor_id).single()
      : Promise.resolve({ data: null }),
    student.family_id
      ? supabase.from('families').select('parent_first_name, parent_last_name, parent_phone').eq('id', student.family_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('lessons').select('id, lesson_date, goals_for_next_week, internal_note').eq('student_id', studentId).order('lesson_date', { ascending: false }),
    supabase.from('practice_sessions').select('id, start_time, duration_minutes').eq('student_id', studentId).order('start_time', { ascending: false }).limit(50),
    supabase.from('badges').select('id, name, emoji'),
    supabase.from('student_badges').select('badge_id, awarded_at').eq('student_id', studentId).order('awarded_at', { ascending: false }),
  ])

  const instructor = instructorRes.data
  const family = familyRes.data
  const lessons = lessonsRes.data ?? []
  const practice = practiceRes.data ?? []
  const badgeMap = new Map((badgesRes.data ?? []).map(b => [b.id, b]))
  const earned = earnedRes.data ?? []

  const day = journeyDay(student.journey_start_date)
  const firstSongBadgeId = (badgesRes.data ?? []).find(b => b.name === 'First Song')?.id
  const lastGoalLesson = lessons.find(l => l.goals_for_next_week)

  const flags = computeRiskFlags({
    createdAt: student.created_at,
    journeyDay: day,
    lastLessonDate: lessons[0]?.lesson_date ?? null,
    lastGoalDate: lastGoalLesson?.lesson_date ?? null,
    lastPracticeDate: practice[0]?.start_time ?? null,
    hasFirstSongBadge: earned.some(e => e.badge_id === firstSongBadgeId),
  })
  const risk = riskLevel(flags)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white text-sm mb-2 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-black">{student.first_name} {student.last_name}</h1>
          {student.instrument && <span className="text-indigo-200 font-medium">· {student.instrument}</span>}
          {day && <span className="text-indigo-300 text-sm">Day {day} of 90</span>}
          {!student.active && <span className="text-red-300 text-sm font-bold">INACTIVE</span>}
        </div>
        <p className="text-indigo-200 text-sm mt-1">
          Instructor: {instructor ? `${instructor.first_name} ${instructor.last_name}` : 'Unassigned'}
          {family?.parent_first_name && (
            <> · Parent: {family.parent_first_name} {family.parent_last_name}{family.parent_phone && ` (${family.parent_phone})`}</>
          )}
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Risk flags ── */}
        <section className={`rounded-2xl border-2 p-6 ${
          risk === 'red' ? 'bg-red-50 border-red-200' :
          risk === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
            Risk Status: {risk === 'red' ? '🔴 At Risk' : risk === 'yellow' ? '🟡 Watch' : '🟢 On Track'}
          </h2>
          {flags.length === 0 ? (
            <p className="text-sm text-green-700 font-medium">No risk flags triggered. Keep it up!</p>
          ) : (
            <ul className="space-y-1.5">
              {flags.map((f, i) => (
                <li key={i} className="text-sm font-medium text-gray-700">
                  {f.level === 'red' ? '🔴' : '🟡'} {f.reason}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Lesson history (including internal notes) ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">Lesson History</h2>
          {lessons.length === 0 ? (
            <p className="text-gray-400 text-sm">No lessons logged yet.</p>
          ) : (
            <div className="space-y-4">
              {lessons.map(lesson => (
                <div key={lesson.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1.5">
                    {fmtDate(lesson.lesson_date)}
                  </p>
                  {lesson.goals_for_next_week && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-bold">Goal:</span> {lesson.goals_for_next_week}
                    </p>
                  )}
                  {lesson.internal_note && (
                    <p className="text-sm text-red-700 bg-red-50 border border-dashed border-red-200 rounded-xl px-3 py-2">
                      🔒 <span className="font-bold">Internal:</span> {lesson.internal_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Badge history ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">Badge History</h2>
          {earned.length === 0 ? (
            <p className="text-gray-400 text-sm">No badges awarded yet.</p>
          ) : (
            <ul className="space-y-2">
              {earned.map((e, i) => {
                const badge = badgeMap.get(e.badge_id)
                return (
                  <li key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                    <span className="font-bold text-gray-700">
                      {badge?.emoji} {badge?.name ?? 'Unknown badge'}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(e.awarded_at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Practice history ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-4">Practice History</h2>
          {practice.length === 0 ? (
            <p className="text-gray-400 text-sm">No practice sessions logged yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {practice.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{fmtDateTime(p.start_time)}</span>
                  <span className="font-bold text-indigo-600">{p.duration_minutes ?? 0} min</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
