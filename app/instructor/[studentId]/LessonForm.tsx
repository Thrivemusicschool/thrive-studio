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
}

const LEVEL_COLORS: Record<string, string> = {
  spark:  'bg-blue-100 border-blue-300 text-blue-700',
  groove: 'bg-purple-100 border-purple-300 text-purple-700',
  legend: 'bg-amber-100 border-amber-300 text-amber-700',
}

export default function LessonForm({ studentId, instructorId, allBadges, earnedBadgeIds }: Props) {
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

    router.push('/instructor')
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
        <label className="block text-sm font-black text-gray-700 mb-3">Award a Badge</label>
        <div className="flex flex-wrap gap-2">
          {allBadges.map(badge => {
            const earned = alreadyEarned.has(badge.id)
            const selected = selectedBadgeIds.has(badge.id)
            const levelStyle = LEVEL_COLORS[badge.level] ?? LEVEL_COLORS.spark

            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => toggleBadge(badge.id)}
                title={badge.description}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm font-bold transition-all ${
                  earned
                    ? `${levelStyle} opacity-60 cursor-default`
                    : selected
                    ? `${levelStyle} shadow-md scale-105`
                    : 'bg-gray-100 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span>{badge.emoji}</span>
                <span>{badge.name}</span>
                {earned && <span className="text-green-600">✓</span>}
                {selected && !earned && <span>✓</span>}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">✓ = already awarded. Select new badges to award this lesson.</p>
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
