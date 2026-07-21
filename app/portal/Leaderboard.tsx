'use client'

import type { LeaderboardRow } from './types'

const MEDAL = ['🥇', '🥈', '🥉']

function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function monthName(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long' })
}

export default function Leaderboard({
  rows,
  currentStudentId,
}: {
  rows: LeaderboardRow[]
  currentStudentId: string
}) {
  const myIndex = rows.findIndex(r => r.studentId === currentStudentId)
  // Always show the top 5, plus the current student's row if they're further down
  const top = rows.slice(0, 5)
  const showMeSeparately = myIndex >= 5
  const me = showMeSeparately ? rows[myIndex] : null

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-[4px_4px_0px_0px_#e5e7eb]">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-x-2">
        <h2 className="font-black text-gray-800 text-base">🏁 Practice Leaderboard</h2>
        <span className="text-xs font-bold text-gray-400">{monthName()}</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">Resets at the start of each month.</p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Nobody has practiced yet this month — be the first! 🎵
        </p>
      ) : (
        <div className="space-y-1.5">
          {top.map((row, i) => {
            const isMe = row.studentId === currentStudentId
            return (
              <div
                key={row.studentId}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  isMe ? 'bg-orange-50 border-2 border-orange-200' : 'bg-gray-50'
                }`}
              >
                <span className="w-7 text-center text-lg leading-none flex-shrink-0">
                  {MEDAL[i] ?? <span className="text-sm font-black text-gray-400">{i + 1}</span>}
                </span>
                <span className={`flex-1 min-w-0 truncate text-sm font-bold ${isMe ? 'text-orange-700' : 'text-gray-700'}`}>
                  {row.displayName}
                  {isMe && <span className="text-orange-500 font-black"> — you!</span>}
                </span>
                <span className={`text-sm font-black tabular-nums flex-shrink-0 ${isMe ? 'text-orange-600' : 'text-gray-500'}`}>
                  {fmtMinutes(row.totalMinutes)}
                </span>
              </div>
            )
          })}

          {showMeSeparately && me && (
            <>
              <p className="text-center text-gray-300 text-xs leading-none py-1">• • •</p>
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-orange-50 border-2 border-orange-200">
                <span className="w-7 text-center text-sm font-black text-orange-400 flex-shrink-0">
                  {myIndex + 1}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm font-bold text-orange-700">
                  {me.displayName}
                  <span className="text-orange-500 font-black"> — you!</span>
                </span>
                <span className="text-sm font-black tabular-nums text-orange-600 flex-shrink-0">
                  {fmtMinutes(me.totalMinutes)}
                </span>
              </div>
            </>
          )}

          {myIndex === -1 && (
            <p className="text-xs text-gray-400 italic pt-2">
              Log some practice this month to join the board!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
