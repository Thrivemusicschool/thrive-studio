'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Badge {
  id: string
  name: string
  emoji: string
  level: string
  description: string
}

interface Props {
  studentId: string
  instructorId: string
  allBadges: Badge[]
  earnedBadgeIds: string[]
  returnTo?: string
}

const LEVEL_COLORS: Record<string, string> = {
  spark:   'bg-blue-100 border-blue-300 text-blue-700',
  groove:  'bg-purple-100 border-purple-300 text-purple-700',
  legend:  'bg-amber-100 border-amber-300 text-amber-700',
  bronze:  'bg-orange-100 border-orange-300 text-orange-800',
  silver:  'bg-slate-100 border-slate-300 text-slate-600',
  gold:    'bg-yellow-100 border-yellow-400 text-yellow-700',
  allstar: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700',
}

export default function LessonForm({ studentId, instructorId, allBadges, earnedBadgeIds, returnTo = '/instructor' }: Props) {
  const [lessonCompleted, setLessonCompleted] = useState(true)
  const [goalText, setGoalText] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const alreadyEarned = new Set(earnedBadgeIds)

  function toggleBadge(id: string) {
    if (alreadyEarned.has(id)) return // already awarded, can't un-award here
    setSelectedBadgeIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!goalText.trim()) {
      setError('Please enter this week\'s goal before saving.')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    // 1. Insert lesson row if lesson was completed
    if (lessonCompleted) {
      const { error: lessonError } = await supabase.from('lessons').insert({
        student_id: studentId,
        instructor_id: instructorId,
        lesson_date: new Date().toISOString().split('T')[0],
        goals_for_next_week: goalText.trim(),
        internal_note: internalNote.trim() || null,
      })
      if (lessonError) {
        setError('Failed to save lesson: ' + lessonError.message)
        setSaving(false)
        return
      }
    }

    // 2. Award selected badges (only new ones)
    const newBadges = [...selectedBadgeIds].filter(id => !alreadyEarned.has(id))
    if (newBadges.length > 0) {
      const { error: badgeError } = await supabase.from('student_badges').insert(
        newBadges.map(badgeId => ({
          student_id: studentId,
          badge_id: badgeId,
          awarded_by: instructorId,
        }))
      )
      if (badgeError) {
        setError('Lesson saved but failed to award badges: ' + badgeError.message)
        setSaving(false)
        return
      }
    }

    router.push(returnTo)
    router.refresh()
  }

  return (
    <div className="space-y-6">

      {/* Lesson Completed Toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => setLessonCompleted(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${lessonCompleted ? 'bg-indigo-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${lessonCompleted ? 'translate-x-6' : ''}`} />
        </div>
        <span className="font-bold text-gray-700">
          {lessonCompleted ? '✅ Lesson completed today' : '⬜ Mark lesson as completed'}
        </span>
      </label>
      {lessonCompleted && (
        <p className="text-xs text-indigo-500 -mt-4">
          This will count toward the student&apos;s lesson streak.
        </p>
      )}

      {/* This Week's Goal */}
      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">
          This Week&apos;s Goal <span className="text-red-500">*</span>
        </label>
        <textarea
          value={goalText}
          onChange={e => setGoalText(e.target.value)}
          placeholder="What should they practice this week?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-gray-800 placeholder-gray-400 resize-none text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Visible to student and parent.</p>
      </div>

      {/* Internal Note */}
      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">
          🔒 Internal Note — School Only
        </label>
        <textarea
          value={internalNote}
          onChange={e => setInternalNote(e.target.value)}
          placeholder="Parent concerns, scheduling notes, anything sensitive..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-red-300 focus:border-red-400 focus:outline-none text-gray-800 placeholder-red-300 resize-none text-sm bg-red-50"
        />
        <p className="text-xs text-red-400 mt-1 font-medium">Not visible to student or parent.</p>
      </div>

      {/* Award a Badge */}
      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">Award a Badge</label>
        <p className="text-xs text-gray-400 mb-3">
          Tap to select — awarded when you save. Grayed-out badges are already earned.
        </p>
        {allBadges.length === 0 ? (
          <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            No badges found — the badge list hasn&apos;t been loaded into the database yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allBadges.map(badge => {
              const earned = alreadyEarned.has(badge.id)
              const selected = selectedBadgeIds.has(badge.id)
              const levelStyle = LEVEL_COLORS[badge.level] ?? LEVEL_COLORS.spark

              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => toggleBadge(badge.id)}
                  disabled={earned}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[56px] rounded-xl border-2 text-left transition-all ${
                    earned
                      ? 'bg-gray-100 border-gray-200 opacity-50 cursor-default'
                      : selected
                      ? `${levelStyle} shadow-md ring-2 ring-indigo-300`
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <span className="text-2xl leading-none flex-shrink-0" style={{ filter: earned ? 'grayscale(1)' : 'none' }}>
                    {badge.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-black leading-tight ${earned ? 'text-gray-400' : 'text-gray-800'}`}>
                      {badge.name} {earned && '✓'}
                    </span>
                    <span className={`block text-xs leading-tight mt-0.5 ${earned ? 'text-gray-300' : 'text-gray-400'}`}>
                      {badge.description}
                    </span>
                  </span>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-black ${
                    earned
                      ? 'border-gray-300 text-gray-300'
                      : selected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 text-transparent'
                  }`}>
                    ✓
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black text-base rounded-xl transition-colors shadow-sm"
      >
        {saving ? 'Saving…' : '✓ Save & Back to Roster'}
      </button>
    </div>
  )
}
