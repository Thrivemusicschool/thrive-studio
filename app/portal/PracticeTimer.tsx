'use client'

import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

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
      setSessions(prev => [data as PracticeSessionData, ...prev].slice(0, 7))
    }

    setSaving(false)
    setElapsed(0)
  }

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
          className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl border-2 border-orange-700 shadow-[4px_4px_0px_0px_#9a3412] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all mb-5"
        >
          ▶ Start Practice Timer
        </button>
      )}

      {/* Last 7 days */}
      <div>
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Last 7 Days
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No sessions yet — let&apos;s go! 🎵</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.slice(0, 7).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{fmtDate(s.start_time)}</span>
                <span className="text-sm font-black text-orange-500">
                  {fmtDuration(s.duration_minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
