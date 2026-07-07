import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function dotColor(lastLessonDate: string | null): 'green' | 'yellow' | 'red' {
  if (!lastLessonDate) return 'red'
  const days = Math.floor((Date.now() - new Date(lastLessonDate).getTime()) / 86_400_000)
  if (days < 8) return 'green'
  if (days < 15) return 'yellow'
  return 'red'
}

const DOT: Record<string, string> = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return 'No lessons yet'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminInstructorPage({
  params,
}: {
  params: Promise<{ instructorId: string }>
}) {
  const { instructorId } = await params
  const supabase = await createClient()

  const { data: instructor } = await supabase
    .from('instructors')
    .select('id, first_name, last_name, email, active')
    .eq('id', instructorId)
    .single()

  if (!instructor) redirect('/admin')

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, instrument, journey_start_date')
    .eq('instructor_id', instructorId)
    .eq('active', true)
    .order('first_name')

  const studentIds = (students ?? []).map(s => s.id)
  const { data: lessons } = studentIds.length
    ? await supabase
        .from('lessons')
        .select('student_id, lesson_date')
        .in('student_id', studentIds)
        .order('lesson_date', { ascending: false })
    : { data: [] }

  const lastLessonMap = new Map<string, string>()
  for (const l of lessons ?? []) {
    if (!lastLessonMap.has(l.student_id)) lastLessonMap.set(l.student_id, l.lesson_date)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white text-sm mb-2 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-black">
          {instructor.first_name} {instructor.last_name}&apos;s Students
        </h1>
        <p className="text-indigo-200 text-sm mt-1">
          {instructor.email ?? 'No email on file'} · You&apos;re viewing this roster as admin
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!students?.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <p className="font-medium">No students assigned to this instructor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(student => {
              const lastLesson = lastLessonMap.get(student.id) ?? null
              const color = dotColor(lastLesson)
              return (
                <Link
                  key={student.id}
                  href={`/admin/students/${student.id}`}
                  className="block bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className={`flex items-center gap-4 p-5 border-l-4 rounded-2xl ${
                    color === 'green' ? 'border-l-green-400' :
                    color === 'yellow' ? 'border-l-yellow-400' :
                    'border-l-red-400'
                  }`}>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT[color]}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-lg font-black text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {student.first_name} {student.last_name}
                      </span>
                      {student.instrument && (
                        <span className="text-sm text-gray-500 font-medium"> · {student.instrument}</span>
                      )}
                      <div className="text-sm text-gray-500 mt-1">Last lesson: {fmtDate(lastLesson)}</div>
                    </div>
                    <span className="text-gray-300 group-hover:text-indigo-400 text-xl transition-colors">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
