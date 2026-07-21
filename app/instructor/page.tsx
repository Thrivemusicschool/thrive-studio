import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import FeedbackWidget from '@/components/FeedbackWidget'

function dotColor(lastLessonDate: string | null): 'green' | 'yellow' | 'red' {
  if (!lastLessonDate) return 'red'
  const days = Math.floor((Date.now() - new Date(lastLessonDate).getTime()) / 86_400_000)
  if (days < 8) return 'green'
  if (days < 15) return 'yellow'
  return 'red'
}

function journeyLabel(
  journeyStartDate: string | null,
  activeGoal: { startDate: string; durationDays: number } | null
): string {
  if (!journeyStartDate) return 'Journey not started'
  const day = Math.max(1, Math.floor((Date.now() - new Date(journeyStartDate).getTime()) / 86_400_000) + 1)
  if (day <= 90) return `Day ${day} of 90`
  if (activeGoal) {
    const goalDay = Math.max(1, Math.floor((Date.now() - new Date(activeGoal.startDate).getTime()) / 86_400_000) + 1)
    const capped = Math.min(goalDay, activeGoal.durationDays)
    return `Goal: Day ${capped} of ${activeGoal.durationDays}`
  }
  return `Day ${day} — Journey complete`
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return 'No lessons yet'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DOT: Record<string, string> = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
}

export default async function InstructorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get instructor record
  const { data: instructor } = await supabase
    .from('instructors')
    .select('id, first_name, last_name')
    .eq('profile_id', user.id)
    .single()

  if (!instructor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Instructor profile not set up</h2>
          <p className="text-gray-500 text-sm mb-4">
            An admin needs to create your instructor record in the database.
          </p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  // Fetch students assigned to this instructor
  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, instrument, journey_start_date')
    .eq('instructor_id', instructor.id)
    .eq('active', true)
    .order('first_name')

  const studentIds = (students ?? []).map(s => s.id)

  // Fetch last lesson per student + active 30-day goals
  const [lessonsResult, goalsResult] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('lessons').select('student_id, lesson_date').in('student_id', studentIds).order('lesson_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    studentIds.length > 0
      ? supabase.from('student_goals').select('student_id, start_date, duration_days').in('student_id', studentIds).eq('active', true)
      : Promise.resolve({ data: [] }),
  ])

  const lessons = lessonsResult.data ?? []
  const goals = goalsResult.data ?? []

  // Map last lesson date per student
  const lastLessonMap = new Map<string, string>()
  for (const l of lessons) {
    if (!lastLessonMap.has(l.student_id)) lastLessonMap.set(l.student_id, l.lesson_date)
  }

  // Map active goal per student
  const goalMap = new Map<string, { startDate: string; durationDays: number }>()
  for (const g of goals) {
    if (!goalMap.has(g.student_id)) goalMap.set(g.student_id, { startDate: g.start_date, durationDays: g.duration_days })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thrive-logo.png" alt="" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold">Thrive Studio</h1>
            <p className="text-indigo-200 text-sm">
              {instructor.first_name} {instructor.last_name} · Instructor
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-gray-800 mb-6">Your Students</h2>

        {!students?.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <p className="font-medium">No students assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(student => {
              const lastLesson = lastLessonMap.get(student.id) ?? null
              const activeGoal = goalMap.get(student.id) ?? null
              const color = dotColor(lastLesson)

              return (
                <Link
                  key={student.id}
                  href={`/instructor/${student.id}`}
                  className="block bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className={`flex items-center gap-4 p-5 border-l-4 rounded-2xl ${
                    color === 'green' ? 'border-l-green-400' :
                    color === 'yellow' ? 'border-l-yellow-400' :
                    'border-l-red-400'
                  }`}>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT[color]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-black text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {student.first_name} {student.last_name}
                        </span>
                        {student.instrument && (
                          <span className="text-sm text-gray-500 font-medium">· {student.instrument}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                        <span className="font-medium text-indigo-600">
                          {journeyLabel(student.journey_start_date, activeGoal)}
                        </span>
                        <span>Last lesson: {fmtDate(lastLesson)}</span>
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-indigo-400 text-xl transition-colors">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="text-center pt-8">
          <FeedbackWidget tone="cool" />
        </div>
      </main>
    </div>
  )
}
