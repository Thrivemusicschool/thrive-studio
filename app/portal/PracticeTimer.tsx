'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PracticeSessionData } from './types'

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function fmtDuration(minutes: number | null): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Today as YYYY-MM-DD in the user's own timezone (not UTC). */
function todayLocal(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse YYYY-MM-DD as local noon, so the logged day never shifts across timezones. */
function localNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export default function PracticeTimer({
  studentId,
  recentSessions: initial,
}: {
  studentId: string
  recentSessions: PracticeSessionData[]
}) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sessions, setSessions] = useState(initial)
  const startRef = useRef<Date | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  // Manual add
  const [adding, setAdding] = useState(false)
  const [addDate, setAddDate] = useState(todayLocal())
  const [addMinutes, setAddMinutes] = useState('')

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMinutes, setEditMinutes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  function start() {
    startRef.current = new Date()
    setElapsed(0)
    setRunning(true)
    tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }

  async function stopAndSave() {
    if (tickRef.current) clearInterval(tickRef.current)
    setRunning(false)
    setSaving(true)

    const endTime = new Date()
    const durationMinutes = Math.max(1, Math.round(elapsed / 60))
    const supabase = createClient()

    const { data, error } = await supabase
      .from('practice_sessions')
      .insert({
        student_id: studentId,
        start_time: startRef.current!.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
      })
      .select()
      .single()

    if (!error && data) {
      setSessions(prev => [data as PracticeSessionData, ...prev])
      router.refresh()
    }

    setSaving(false)
    setElapsed(0)
  }

  async function addPastSession() {
    const mins = parseInt(addMinutes, 10)
    if (!addMinutes || isNaN(mins) || mins < 1) {
      setError('How many minutes? Enter a number like 20.')
      return
    }
    if (mins > 600) {
      setError('That looks too long — please enter 600 minutes or less.')
      return
    }
    if (addDate > todayLocal()) {
      setError('You can\'t log practice for a future date.')
      return
    }

    setSaving(true)
    setError(null)
    const startTime = localNoon(addDate)
    const endTime = new Date(startTime.getTime() + mins * 60_000)
    const supabase = createClient()

    const { data, error: insertError } = await supabase
      .from('practice_sessions')
      .insert({
        student_id: studentId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: mins,
      })
      .select()
      .single()

    if (insertError) {
      setError('Couldn\'t save that: ' + insertError.message)
      setSaving(false)
      return
    }

    setSessions(prev =>
      [data as PracticeSessionData, ...prev].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      )
    )
    setAdding(false)
    setAddMinutes('')
    setAddDate(todayLocal())
    setSaving(false)
    flash('Practice added! 🎵')
    router.refresh()
  }

  async function saveEdit(sessionId: string) {
    const mins = parseInt(editMinutes, 10)
    if (!editMinutes || isNaN(mins) || mins < 1 || mins > 600) {
      setError('Enter a number of minutes between 1 and 600.')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('practice_sessions')
      .update({ duration_minutes: mins })
      .eq('id', sessionId)

    if (updateError) {
      setError('Couldn\'t update that: ' + updateError.message)
      setSaving(false)
      return
    }

    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, duration_minutes: mins } : s))
    )
    setEditingId(null)
    setSaving(false)
    flash('Updated!')
    router.refresh()
  }

  async function deleteSession(sessionId: string) {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      setError('Couldn\'t delete that: ' + deleteError.message)
      setSaving(false)
      return
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setEditingId(null)
    setSaving(false)
    flash('Session removed.')
    router.refresh()
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-gray-800 text-base'

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-[4px_4px_0px_0px_#e5e7eb]">
      <h2 className="font-black text-gray-800 mb-4 text-base flex items-center gap-2">
        ⏱️ Practice Timer
      </h2>

      {running ? (
        <div className="text-center mb-5">
          <div className="text-6xl font-black text-orange-500 tabular-nums tracking-wider mb-5 py-2">
            {fmt(elapsed)}
          </div>
          <button
            onClick={stopAndSave}
            disabled={saving}
            className="w-full min-h-[52px] bg-gray-800 disabled:opacity-60 text-white font-black text-lg rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            {saving ? '💾 Saving…' : '⏹ Stop & Save'}
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl border-2 border-orange-700 shadow-[4px_4px_0px_0px_#9a3412] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all mb-4"
        >
          ▶ Start Practice Timer
        </button>
      )}

      {/* Manual entry */}
      {!running && (
        adding ? (
          <div className="bg-orange-50 rounded-2xl p-4 mb-5 space-y-3">
            <p className="text-sm font-black text-gray-700">Add practice you forgot to time</p>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">What day?</label>
              <input
                type="date"
                value={addDate}
                max={todayLocal()}
                onChange={e => setAddDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">How many minutes?</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={addMinutes}
                onChange={e => setAddMinutes(e.target.value)}
                placeholder="20"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addPastSession}
                disabled={saving}
                className="flex-1 min-h-[48px] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : 'Save practice'}
              </button>
              <button
                onClick={() => { setAdding(false); setError(null) }}
                disabled={saving}
                className="px-5 min-h-[48px] text-gray-500 font-bold rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setError(null) }}
            className="w-full min-h-[48px] mb-5 text-orange-600 hover:text-orange-700 font-bold text-sm rounded-xl border-2 border-dashed border-orange-200 hover:border-orange-300 transition-colors"
          >
            ＋ Log practice you forgot to time
          </button>
        )
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}
      {notice && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">{notice}</p>
      )}

      {/* Recent sessions */}
      <div>
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Recent Practice
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No sessions yet — let&apos;s go! 🎵</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.slice(0, 10).map(s => (
              <div key={s.id} className="py-2.5">
                {editingId === s.id ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 flex-1">{fmtDate(s.start_time)}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={600}
                        value={editMinutes}
                        onChange={e => setEditMinutes(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl border-2 border-orange-300 focus:border-orange-400 focus:outline-none text-gray-800 text-base"
                      />
                      <span className="text-sm text-gray-400">min</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={saving}
                        className="flex-1 min-h-[44px] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black text-sm rounded-xl transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setError(null) }}
                        disabled={saving}
                        className="px-4 min-h-[44px] text-gray-500 font-bold text-sm rounded-xl border-2 border-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        disabled={saving}
                        className="px-4 min-h-[44px] text-red-600 font-bold text-sm rounded-xl border-2 border-red-200 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(s.id)
                      setEditMinutes(String(s.duration_minutes ?? ''))
                      setError(null)
                    }}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <span className="text-sm text-gray-600">{fmtDate(s.start_time)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-black text-orange-500">
                        {fmtDuration(s.duration_minutes)}
                      </span>
                      <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors">
                        ✏️
                      </span>
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3">Tap any session to fix the minutes or remove it.</p>
      </div>
    </div>
  )
}
