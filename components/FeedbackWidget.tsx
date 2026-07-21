'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const KINDS = [
  { value: 'question', label: '❓ Question' },
  { value: 'comment', label: '💬 Comment' },
  { value: 'problem', label: '🔧 Something’s broken' },
]

export default function FeedbackWidget({ tone = 'warm' }: { tone?: 'warm' | 'cool' }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('question')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  const accent = tone === 'warm'
    ? { text: 'text-orange-600 hover:text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300', ring: 'focus:border-orange-400' }
    : { text: 'text-indigo-600 hover:text-indigo-800', btn: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300', ring: 'focus:border-indigo-400' }

  async function send() {
    if (!message.trim()) {
      setError('Please write a message first.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, message, page: pathname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSending(false)
        return
      }
      setSent(true)
      setMessage('')
    } catch {
      setError('Could not reach the server. Please check your connection.')
    }
    setSending(false)
  }

  function close() {
    setOpen(false)
    setSent(false)
    setError(null)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-sm font-bold ${accent.text} transition-colors`}
      >
        💬 Questions, comments, or a problem?
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={close}>
      <div
        className="bg-white rounded-2xl border-2 border-gray-200 p-6 w-full max-w-sm text-left"
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-3">📬</div>
            <h3 className="font-black text-gray-800 text-lg mb-2">Thank you!</h3>
            <p className="text-gray-500 text-sm mb-6">
              Your message went straight to Thrive Music School. We&apos;ll get back to you soon.
            </p>
            <button
              onClick={close}
              className={`w-full min-h-[48px] ${accent.btn} text-white font-black rounded-xl transition-colors`}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-black text-gray-800 text-lg mb-1">Get in touch</h3>
            <p className="text-gray-500 text-sm mb-4">
              Questions, ideas, or something not working? Tell us — it goes right to the school.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {KINDS.map(k => (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={`px-3 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                    kind === k.value
                      ? 'bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="What&apos;s on your mind?"
              className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 ${accent.ring} focus:outline-none text-gray-800 placeholder-gray-400 resize-none text-base mb-3`}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={sending}
                className={`flex-1 min-h-[48px] ${accent.btn} text-white font-black rounded-xl transition-colors`}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                onClick={close}
                disabled={sending}
                className="px-5 min-h-[48px] text-gray-500 font-bold rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
