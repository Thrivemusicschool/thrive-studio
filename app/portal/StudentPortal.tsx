'use client'

import { useState } from 'react'
import PracticeTimer from './PracticeTimer'
import BadgeWall from './BadgeWall'
import LogoutButton from '@/components/LogoutButton'
import type { Badge, StudentData } from './types'

const PHASES = [
  { label: 'Month 1', sub: 'I can play something' },
  { label: 'Month 2', sub: 'I can practice & improve' },
  { label: 'Month 3', sub: 'I can perform & belong' },
]

function getDayNumber(journeyStartDate: string): number {
  const start = new Date(journeyStartDate)
  const today = new Date()
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1)
}

function currentPhase(day: number): 0 | 1 | 2 {
  if (day <= 30) return 0
  if (day <= 60) return 1
  return 2
}

function practiceStreakEmoji(streak: number): string {
  if (streak >= 7) return '🔥🔥'
  if (streak >= 5) return '🔥'
  if (streak >= 2) return '😊'
  if (streak >= 1) return '👍'
  return '🎯'
}

function ThirtyDayGoal({ goal }: { goal: import('./types').GoalData }) {
  const start = new Date(goal.startDate)
  const today = new Date()
  const dayNumber = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1)
  const progress = Math.min((dayNumber / goal.durationDays) * 100, 100)
  const done = dayNumber > goal.durationDays

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-[4px_4px_0px_0px_#e9d5ff]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-black text-gray-800 text-base">30-Day Goal</h2>
        {done ? (
          <span className="text-sm font-black text-purple-500">🎉 Complete!</span>
        ) : (
          <span className="text-2xl font-black text-purple-600 tabular-nums leading-none">
            Day {dayNumber}
            <span className="text-sm font-bold text-gray-400"> / {goal.durationDays}</span>
          </span>
        )}
      </div>
      <p className="text-gray-700 text-sm font-bold mb-3">{goal.goalText}</p>
      <div className="h-5 bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7 0%, #f97316 100%)' }}
        />
      </div>
      {goal.instructorName && (
        <p className="text-xs text-purple-500 font-bold mt-2">— Set by {goal.instructorName}</p>
      )}
    </div>
  )
}

export default function StudentPortal({
  students,
  allBadges,
}: {
  students: StudentData[]
  allBadges: Badge[]
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!students.length) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎵</div>
          <p className="text-gray-600 font-bold">No students found yet.</p>
          <p className="text-gray-400 text-sm">Check back after your first lesson!</p>
          <div className="pt-4"><LogoutButton /></div>
        </div>
      </div>
    )
  }

  const student = students[activeIndex]
  const dayNumber = student.journeyStartDate ? getDayNumber(student.journeyStartDate) : null
  const progress = dayNumber ? Math.min((dayNumber / 90) * 100, 100) : 0
  const phase = dayNumber ? currentPhase(dayNumber) : 0
  const journeyDone = (dayNumber ?? 0) > 90

  return (
    <div className="min-h-screen bg-[#FFF8F0]">

      {/* Student Tabs */}
      {students.length > 1 && (
        <div className="sticky top-0 z-20 bg-[#FFF8F0] border-b-2 border-orange-100">
          <div className="flex overflow-x-auto">
            {students.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIndex(i)}
                className={`flex-shrink-0 px-5 py-3.5 text-sm font-black tracking-wide border-b-4 transition-all ${
                  i === activeIndex
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {s.firstName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-6 pb-16 space-y-4">

        {/* ── 1. Header ── */}
        <div className="text-center py-2">
          <h1 className="text-3xl font-black text-gray-900 leading-tight">
            {student.firstName}&apos;s Progress
          </h1>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {student.instruments.map((inst, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-white border-2 border-gray-200 rounded-full px-3 py-1 text-sm font-bold text-gray-700 shadow-sm"
              >
                <span className="text-base">🎵</span>
                {inst.instrument}
                {inst.instructorName && (
                  <span className="text-gray-400 font-medium">· {inst.instructorName}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ── 2. Streak Row ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-4 text-center shadow-[4px_4px_0px_0px_#fed7aa]">
            <div className="text-3xl leading-none mb-1">
              {practiceStreakEmoji(student.practiceStreak)}
            </div>
            <div className="text-5xl font-black text-orange-500 tabular-nums leading-none my-2">
              {student.practiceStreak}
            </div>
            <div className="text-[11px] font-black text-orange-400 uppercase tracking-widest">
              Day Streak
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 text-center shadow-[4px_4px_0px_0px_#bfdbfe]">
            <div className="text-3xl leading-none mb-1">📅</div>
            <div className="text-5xl font-black text-blue-500 tabular-nums leading-none my-2">
              {student.lessonStreak}
            </div>
            <div className="text-[11px] font-black text-blue-400 uppercase tracking-widest">
              Lesson Streak
            </div>
          </div>
        </div>

        {/* ── 3. 90-Day Journey ── */}
        {student.journeyStartDate && !journeyDone && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-[4px_4px_0px_0px_#e5e7eb]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-gray-800 text-base">90-Day Journey</h2>
              <span className="text-2xl font-black text-blue-600 tabular-nums leading-none">
                Day {dayNumber}
                <span className="text-sm font-bold text-gray-400"> / 90</span>
              </span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #f97316 100%)' }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PHASES.map((p, i) => {
                const done = i < phase
                const active = i === phase
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-2.5 border-2 text-center ${
                      active ? 'bg-blue-50 border-blue-300' : done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="text-sm mb-0.5">
                      {done ? '✅' : active ? '▶️' : '⭕'}
                    </div>
                    <div className={`text-[11px] font-black ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                      {p.label}
                    </div>
                    <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{p.sub}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 3b. 30-Day Goal (replaces journey bar after day 90) ── */}
        {student.journeyStartDate && journeyDone && (
          student.currentGoal
            ? <ThirtyDayGoal goal={student.currentGoal} />
            : (
              <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-[4px_4px_0px_0px_#fcd34d] text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="font-black text-amber-700 text-lg mb-1">90-Day Journey Complete!</h2>
                <p className="text-gray-500 text-sm">
                  You&apos;re on Day <span className="font-black text-amber-600">{dayNumber}</span> of your music story.
                </p>
                <p className="text-gray-400 text-sm mt-2 italic">
                  Your instructor will set your next 30-day goal soon!
                </p>
              </div>
            )
        )}

        {/* ── 4. This Week's Practice Goals ── */}
        <div className="bg-white rounded-2xl border-2 border-teal-200 p-5 shadow-[4px_4px_0px_0px_#99f6e4]">
          <h2 className="font-black text-gray-800 mb-3 flex items-center gap-2 text-base">
            🎯 This Week&apos;s Practice Goals
          </h2>
          {student.latestGoal ? (
            <>
              <p className="text-gray-700 text-base leading-relaxed">{student.latestGoal}</p>
              {student.latestGoalInstructorName && (
                <p className="mt-3 text-sm text-teal-600 font-bold">
                  — From {student.latestGoalInstructorName}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">
              Your instructor will add your first goal after your lesson!
            </p>
          )}
        </div>

        {/* ── 5. Practice Timer ── */}
        <PracticeTimer studentId={student.id} recentSessions={student.recentSessions} />

        {/* ── 6. Badge Wall ── */}
        <BadgeWall allBadges={allBadges} earnedBadgeIds={student.earnedBadgeIds} />

        <div className="text-center pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
