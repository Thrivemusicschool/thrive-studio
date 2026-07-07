'use client'

import { useState } from 'react'
import type { Badge } from './types'

const LEVEL_STYLE: Record<
  Badge['level'],
  { bg: string; border: string; text: string; shadow: string }
> = {
  spark:   { bg: 'bg-blue-100',    border: 'border-blue-300',    text: 'text-blue-700',    shadow: 'shadow-[3px_3px_0px_0px_#93c5fd]' },
  groove:  { bg: 'bg-purple-100',  border: 'border-purple-300',  text: 'text-purple-700',  shadow: 'shadow-[3px_3px_0px_0px_#d8b4fe]' },
  legend:  { bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-700',   shadow: 'shadow-[3px_3px_0px_0px_#fcd34d]' },
  bronze:  { bg: 'bg-orange-100',  border: 'border-orange-300',  text: 'text-orange-800',  shadow: 'shadow-[3px_3px_0px_0px_#fdba74]' },
  silver:  { bg: 'bg-slate-100',   border: 'border-slate-300',   text: 'text-slate-600',   shadow: 'shadow-[3px_3px_0px_0px_#cbd5e1]' },
  gold:    { bg: 'bg-yellow-100',  border: 'border-yellow-400',  text: 'text-yellow-700',  shadow: 'shadow-[3px_3px_0px_0px_#facc15]' },
  allstar: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-700', shadow: 'shadow-[3px_3px_0px_0px_#f0abfc]' },
}

export default function BadgeWall({
  allBadges,
  earnedBadgeIds,
}: {
  allBadges: Badge[]
  earnedBadgeIds: string[]
}) {
  const [selected, setSelected] = useState<Badge | null>(null)
  const earned = new Set(earnedBadgeIds)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-[4px_4px_0px_0px_#e5e7eb]">
      <h2 className="font-black text-gray-800 mb-4 text-base flex items-center gap-2">
        🏆 Badge Wall
      </h2>

      <div className="grid grid-cols-4 gap-2">
        {allBadges.map(badge => {
          const isEarned = earned.has(badge.id)
          const style = LEVEL_STYLE[badge.level] ?? LEVEL_STYLE.spark
          return (
            <button
              key={badge.id}
              onClick={() => setSelected(badge)}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 min-h-[80px] active:scale-95 transition-transform ${
                isEarned
                  ? `${style.bg} ${style.border} ${style.shadow}`
                  : 'bg-gray-100 border-gray-200'
              }`}
            >
              <span
                className="text-2xl leading-none mb-1"
                style={{ filter: isEarned ? 'none' : 'grayscale(1)', opacity: isEarned ? 1 : 0.4 }}
              >
                {badge.emoji}
              </span>
              {!isEarned && (
                <span className="absolute top-1 right-1 text-[9px]">🔒</span>
              )}
              <span
                className={`text-[9px] font-bold text-center leading-tight ${
                  isEarned ? style.text : 'text-gray-400'
                }`}
              >
                {badge.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Badge detail bottom sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl border-2 border-gray-200 p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const isEarned = earned.has(selected.id)
              const style = LEVEL_STYLE[selected.level] ?? LEVEL_STYLE.spark
              return (
                <>
                  <div className="text-center mb-4">
                    <span
                      className="text-5xl leading-none"
                      style={{ filter: isEarned ? 'none' : 'grayscale(1)', opacity: isEarned ? 1 : 0.5 }}
                    >
                      {selected.emoji}
                    </span>
                    <h3 className={`mt-2 font-black text-xl ${isEarned ? style.text : 'text-gray-400'}`}>
                      {selected.name}
                    </h3>
                    <span
                      className={`inline-block mt-1 text-xs font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {selected.level}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm text-center leading-relaxed mb-4">
                    {selected.description}
                  </p>

                  {isEarned ? (
                    <p className="text-center text-sm font-black text-green-600 mb-4">
                      ✅ You earned this badge!
                    </p>
                  ) : (
                    <p className="text-center text-xs text-gray-400 italic mb-4">
                      🔒 Not yet — keep going! You&apos;ve got this.
                    </p>
                  )}

                  <button
                    onClick={() => setSelected(null)}
                    className="w-full min-h-[48px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
