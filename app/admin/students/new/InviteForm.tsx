'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INSTRUMENTS = ['Piano', 'Guitar', 'Ukulele', 'Voice', 'Drums', 'Bass', 'Violin', 'Other']

export default function InviteForm({ adminProfileId }: { adminProfileId: string }) {
  const [email, setEmail] = useState('')
  const [studentFirstName, setStudentFirstName] = useState('')
  const [instrument, setInstrument] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Please enter the family\'s email address.')
      return
    }

    setSending(true)
    setError(null)
    const supabase = createClient()

    const { error: inviteError } = await supabase.from('invites').insert({
      email: cleanEmail,
      created_by: adminProfileId,
      student_first_name: studentFirstName.trim() || null,
      instrument: instrument || null,
    })
    if (inviteError) {
      setError('Failed to create invite: ' + inviteError.message)
      setSending(false)
      return
    }

    // Send a magic link to the family. This creates their auth user and does
    // not affect the admin's current session.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
      },
    })
    if (otpError) {
      setError('Invite saved, but the email failed to send: ' + otpError.message)
      setSending(false)
      return
    }

    setSent(true)
    setSending(false)
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border-2 border-green-200 p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Invite sent!</h2>
        <p className="text-gray-500 text-sm mb-6">
          {email} will get an email with a link to set up their account.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setSent(false); setEmail(''); setStudentFirstName(''); setInstrument('') }}
            className="min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors"
          >
            Invite Another Family
          </button>
          <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">
          Parent / Family Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="parent@example.com"
          required
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">
          Student First Name <span className="text-gray-400 font-medium">(optional)</span>
        </label>
        <input
          type="text"
          value={studentFirstName}
          onChange={e => setStudentFirstName(e.target.value)}
          placeholder="e.g. Emma"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-black text-gray-700 mb-1">
          Instrument <span className="text-gray-400 font-medium">(optional)</span>
        </label>
        <select
          value={instrument}
          onChange={e => setInstrument(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-gray-800 text-sm bg-white"
        >
          <option value="">Not sure yet</option>
          {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black text-base rounded-xl transition-colors shadow-sm"
      >
        {sending ? 'Sending…' : '📨 Send Invite'}
      </button>
    </form>
  )
}
