import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeRiskFlags, riskLevel, type RiskLevel } from '@/lib/risk'
import LogoutButton from '@/components/LogoutButton'
import ManageInstructors from './ManageInstructors'

const RISK_BADGE: Record<RiskLevel, { dot: string; label: string; chip: string }> = {
  red:    { dot: '🔴', label: 'At Risk',  chip: 'bg-red-50 text-red-700 border-red-200' },
  yellow: { dot: '🟡', label: 'Watch',    chip: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  green:  { dot: '🟢', label: 'On Track', chip: 'bg-green-50 text-green-700 border-green-200' },
}

function journeyDay(journeyStartDate: string | null): number | null {
  if (!journeyStartDate) return null
  return Math.max(1, Math.floor((Date.now() - new Date(journeyStartDate).getTime()) / 86_400_000) + 1)
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function AdminPage() {
  const supabase = await createClient()

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [studentsRes, instructorsRes, lessonsRes, practiceRes, badgesRes, studentBadgesRes, invitesRes, notesRes, feedbackRes] =
    await Promise.all([
      supabase.from('students').select('id, first_name, last_name, instrument, instructor_id, journey_start_date, created_at').eq('active', true).order('first_name'),
      supabase.from('instructors').select('id, first_name, last_name, email, active, profile_id').order('first_name'),
      supabase.from('lessons').select('student_id, lesson_date, goals_for_next_week').order('lesson_date', { ascending: false }),
      supabase.from('practice_sessions').select('student_id, start_time').gte('start_time', fourteenDaysAgo.toISOString()),
      supabase.from('badges').select('id, name'),
      supabase.from('student_badges').select('student_id, badge_id'),
      supabase.from('invites').select('id, email, student_first_name, created_at').eq('used', false).order('created_at', { ascending: false }),
      supabase.from('lessons').select('id, student_id, instructor_id, internal_note, lesson_date, created_at').not('internal_note', 'is', null).gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(25),
      supabase.from('feedback').select('id, email, kind, message, page, created_at').order('created_at', { ascending: false }).limit(10),
    ])

  const students = studentsRes.data ?? []
  const instructors = instructorsRes.data ?? []
  const lessons = lessonsRes.data ?? []
  const practice = practiceRes.data ?? []
  const invites = invitesRes.data ?? []

  const firstPieceBadgeId = (badgesRes.data ?? []).find(b => b.name === 'Piece Beginner')?.id
  const firstPieceStudents = new Set(
    (studentBadgesRes.data ?? []).filter(sb => sb.badge_id === firstPieceBadgeId).map(sb => sb.student_id)
  )

  const instructorName = new Map(instructors.map(i => [i.id, `${i.first_name} ${i.last_name}`]))
  const recentNotes = notesRes.data ?? []
  const recentFeedback = feedbackRes.data ?? []

  // Last lesson + last goal date per student (lessons are sorted desc)
  const lastLesson = new Map<string, string>()
  const lastGoal = new Map<string, string>()
  for (const l of lessons) {
    if (!lastLesson.has(l.student_id)) lastLesson.set(l.student_id, l.lesson_date)
    if (l.goals_for_next_week && !lastGoal.has(l.student_id)) lastGoal.set(l.student_id, l.lesson_date)
  }

  // Practice: last date per student + count this week
  const lastPractice = new Map<string, string>()
  const weekPracticeCount = new Map<string, number>()
  for (const p of practice) {
    const prev = lastPractice.get(p.student_id)
    if (!prev || p.start_time > prev) lastPractice.set(p.student_id, p.start_time)
    if (new Date(p.start_time) >= sevenDaysAgo) {
      weekPracticeCount.set(p.student_id, (weekPracticeCount.get(p.student_id) ?? 0) + 1)
    }
  }

  // Compute risk per student
  const rows = students.map(s => {
    const day = journeyDay(s.journey_start_date)
    const flags = computeRiskFlags({
      createdAt: s.created_at,
      journeyDay: day,
      lastLessonDate: lastLesson.get(s.id) ?? null,
      lastGoalDate: lastGoal.get(s.id) ?? null,
      lastPracticeDate: lastPractice.get(s.id) ?? null,
      hasFirstPieceBadge: firstPieceStudents.has(s.id),
    })
    return { student: s, day, flags, risk: riskLevel(flags) }
  })

  // ── Milestone watch: students inside a journey milestone window ──
  const MILESTONES = [
    { day: 30, from: 28, to: 35, label: 'Month 1 complete', sub: 'I can play something', emoji: '🌱' },
    { day: 60, from: 58, to: 65, label: 'Month 2 complete', sub: 'I can practice & improve', emoji: '🌿' },
    { day: 90, from: 88, to: 95, label: '90-Day Journey complete', sub: 'I can perform & belong', emoji: '🏆' },
  ]
  const milestoneGroups = MILESTONES.map(m => ({
    ...m,
    students: rows.filter(r => r.day !== null && r.day >= m.from && r.day <= m.to),
  })).filter(g => g.students.length > 0)

  // ── Stats ──
  const totalActive = students.length
  const atRiskCount = rows.filter(r => r.risk === 'red').length
  const totalWeekSessions = [...weekPracticeCount.values()].reduce((a, b) => a + b, 0)
  const avgPractice = totalActive > 0 ? (totalWeekSessions / totalActive).toFixed(1) : '0'

  // 90-day completions this month: day 90 fell within the current month
  const now = new Date()
  const completionsThisMonth = students.filter(s => {
    if (!s.journey_start_date) return false
    const day90 = new Date(s.journey_start_date)
    day90.setDate(day90.getDate() + 89)
    return day90 <= now && day90.getMonth() === now.getMonth() && day90.getFullYear() === now.getFullYear()
  }).length

  const stats = [
    { label: 'Active Students', value: totalActive, emoji: '🎓' },
    { label: 'Students At Risk', value: atRiskCount, emoji: '🚨' },
    { label: 'Avg Practice Sessions / Week', value: avgPractice, emoji: '⏱️' },
    { label: '90-Day Completions This Month', value: completionsThisMonth, emoji: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thrive-logo.png" alt="" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold">Thrive Studio</h1>
            <p className="text-indigo-200 text-sm">Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students/new"
            className="bg-white text-indigo-700 font-black text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            + Add New Student
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Overview stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="text-2xl mb-2">{stat.emoji}</div>
              <div className="text-3xl font-black text-gray-900">{stat.value}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Milestone watch ── */}
        <section className="bg-white rounded-2xl border-2 border-orange-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-1">🎉 Milestone Watch</h2>
          <p className="text-xs text-gray-400 mb-4">
            Students hitting a journey milestone right now — a great moment to celebrate or check in.
          </p>
          {milestoneGroups.length === 0 ? (
            <p className="text-gray-400 text-sm">No students are at a milestone this week.</p>
          ) : (
            <div className="space-y-5">
              {milestoneGroups.map(group => (
                <div key={group.day}>
                  <p className="text-xs font-black text-orange-600 uppercase tracking-wide mb-2">
                    {group.emoji} Day {group.day} · {group.label}
                    <span className="text-gray-400 font-bold normal-case tracking-normal"> — “{group.sub}”</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {group.students.map(({ student: s, day }) => (
                      <Link
                        key={s.id}
                        href={`/admin/students/${s.id}`}
                        className="flex items-center justify-between gap-3 bg-orange-50 hover:bg-orange-100 rounded-xl px-4 py-3 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-gray-800 truncate">
                            {s.first_name} {s.last_name}
                          </span>
                          <span className="block text-xs text-gray-500 truncate">
                            {s.instructor_id ? instructorName.get(s.instructor_id) ?? 'Unassigned' : 'Unassigned'}
                          </span>
                        </span>
                        <span className="text-sm font-black text-orange-600 flex-shrink-0">Day {day}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Internal notes feed (last 7 days) ── */}
        <section className="bg-white rounded-2xl border-2 border-dashed border-red-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-1">🔒 Internal Notes — Last 7 Days</h2>
          <p className="text-xs text-gray-400 mb-4">School only. Never visible to families.</p>
          {recentNotes.length === 0 ? (
            <p className="text-gray-400 text-sm">No internal notes in the past week.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map(note => {
                const student = students.find(s => s.id === note.student_id)
                return (
                  <div key={note.id} className="bg-red-50 rounded-xl px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                      <span className="text-sm font-black text-gray-800">
                        {student ? (
                          <Link href={`/admin/students/${student.id}`} className="hover:underline text-indigo-700">
                            {student.first_name} {student.last_name}
                          </Link>
                        ) : (
                          'Former student'
                        )}
                        {note.instructor_id && (
                          <span className="text-gray-400 font-medium"> · {instructorName.get(note.instructor_id) ?? 'Unknown instructor'}</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(note.lesson_date)}</span>
                    </div>
                    <p className="text-sm text-red-800">{note.internal_note}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Student table ── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <h2 className="text-lg font-black text-gray-800 px-6 pt-5 pb-3">All Students</h2>
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-gray-400 text-sm">No active students yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-black text-gray-400 uppercase tracking-wide border-y border-gray-100 bg-gray-50">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-4 py-3">Instructor</th>
                    <th className="px-4 py-3">Instrument</th>
                    <th className="px-4 py-3">Journey Day</th>
                    <th className="px-4 py-3">Last Lesson</th>
                    <th className="px-4 py-3">Practiced This Week</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student: s, day, risk }) => {
                    const badge = RISK_BADGE[risk]
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/admin/students/${s.id}`} className="font-bold text-indigo-700 hover:text-indigo-900">
                            {s.first_name} {s.last_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.instructor_id ? instructorName.get(s.instructor_id) ?? '—' : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.instrument ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{day ? `Day ${day}` : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(lastLesson.get(s.id) ?? null)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {weekPracticeCount.get(s.id)
                            ? `${weekPracticeCount.get(s.id)} session${weekPracticeCount.get(s.id) === 1 ? '' : 's'}`
                            : 'None'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${badge.chip}`}>
                            {badge.dot} {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Feedback inbox ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-black text-gray-800 mb-1">💬 Feedback Inbox</h2>
          <p className="text-xs text-gray-400 mb-4">
            Questions and problems sent from inside the app. Also emailed to you.
          </p>
          {recentFeedback.length === 0 ? (
            <p className="text-gray-400 text-sm">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map(f => (
                <div key={f.id} className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <span className="text-sm font-black text-gray-800">
                      {f.email}
                      <span className="text-gray-400 font-medium"> · {f.kind}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtDate(f.created_at)} · {f.page}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Manage section ── */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ManageInstructors instructors={instructors} />

          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-black text-gray-800 mb-4">Pending Invites</h2>
            {invites.length === 0 ? (
              <p className="text-gray-400 text-sm">No pending invites.</p>
            ) : (
              <ul className="space-y-2">
                {invites.map(inv => (
                  <li key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                    <div>
                      <span className="font-bold text-gray-700">{inv.email}</span>
                      {inv.student_first_name && (
                        <span className="text-gray-400"> · {inv.student_first_name}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{fmtDate(inv.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
