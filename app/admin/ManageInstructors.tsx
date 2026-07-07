'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Instructor {
  id: string
  first_name: string
  last_name: string
  email: string | null
  active: boolean
  profile_id: string | null
}

export default function ManageInstructors({ instructors }: { instructors: Instructor[] }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function addInstructor(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter a first and last name.')
      return
    }
    setAdding(true)
    setError(null)
    setNotice(null)
    const supabase = createClient()
    const cleanEmail = email.trim().toLowerCase()

    const { error: insertError } = await supabase.from('instructors').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: cleanEmail || null,
    })
    if (insertError) {
      setError('Failed to add instructor: ' + insertError.message)
      setAdding(false)
      return
    }

    // Email them a setup link — first login claims their instructor account
    if (cleanEmail) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect`,
        },
      })
      if (otpError) {
        setError('Instructor added, but the invite email failed: ' + otpError.message)
        setAdding(false)
        router.refresh()
        return
      }
      setNotice(`Invite sent to ${cleanEmail}.`)
    }

    setFirstName('')
    setLastName('')
    setEmail('')
    setAdding(false)
    router.refresh()
  }

  async function toggleActive(instructor: Instructor) {
    setBusyId(instructor.id)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('instructors')
      .update({ active: !instructor.active })
      .eq('id', instructor.id)
    if (updateError) setError('Failed to update instructor: ' + updateError.message)
    router.refresh()
    setBusyId(null)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-black text-gray-800 mb-4">Instructors</h2>

      {instructors.length === 0 ? (
        <p className="text-gray-400 text-sm mb-4">No instructors yet.</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {instructors.map(i => (
            <li key={i.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm gap-3">
              <div className="min-w-0">
                {i.active ? (
                  <Link
                    href={`/admin/instructors/${i.id}`}
                    className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                  >
                    {i.first_name} {i.last_name} →
                  </Link>
                ) : (
                  <span className="font-bold text-gray-400 line-through">
                    {i.first_name} {i.last_name}
                  </span>
                )}
                <div className="text-xs text-gray-400 truncate">
                  {!i.active && 'Inactive · '}
                  {i.email ?? 'No email on file'}
                  {i.email && !i.profile_id && ' · hasn’t logged in yet'}
                </div>
              </div>
              <button
                onClick={() => toggleActive(i)}
                disabled={busyId === i.id}
                className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                  i.active
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}
              >
                {busyId === i.id ? '…' : i.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addInstructor} className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-sm font-black text-gray-700">Add an instructor</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm text-gray-800 placeholder-gray-400"
          />
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm text-gray-800 placeholder-gray-400"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email (optional — sends them a login link)"
          className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm text-gray-800 placeholder-gray-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {notice && <p className="text-xs text-green-600">{notice}</p>}
        <button
          type="submit"
          disabled={adding}
          className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black text-sm rounded-xl transition-colors"
        >
          {adding ? 'Adding…' : '+ Add Instructor'}
        </button>
      </form>
    </section>
  )
}
