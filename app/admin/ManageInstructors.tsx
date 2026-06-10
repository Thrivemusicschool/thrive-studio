'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Instructor {
  id: string
  first_name: string
  last_name: string
  active: boolean
}

export default function ManageInstructors({ instructors }: { instructors: Instructor[] }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function addInstructor(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter a first and last name.')
      return
    }
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('instructors').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    })
    if (insertError) {
      setError('Failed to add instructor: ' + insertError.message)
    } else {
      setFirstName('')
      setLastName('')
      router.refresh()
    }
    setBusy(false)
  }

  async function toggleActive(instructor: Instructor) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('instructors')
      .update({ active: !instructor.active })
      .eq('id', instructor.id)
    if (updateError) setError('Failed to update instructor: ' + updateError.message)
    else router.refresh()
    setBusy(false)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-black text-gray-800 mb-4">Instructors</h2>

      {instructors.length === 0 ? (
        <p className="text-gray-400 text-sm mb-4">No instructors yet.</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {instructors.map(i => (
            <li key={i.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className={`font-bold ${i.active ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                {i.first_name} {i.last_name}
                {!i.active && <span className="ml-2 no-underline text-xs font-medium text-gray-400">(inactive)</span>}
              </span>
              <button
                onClick={() => toggleActive(i)}
                disabled={busy}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  i.active
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}
              >
                {i.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addInstructor} className="space-y-3">
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
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black text-sm rounded-xl transition-colors"
        >
          + Add Instructor
        </button>
      </form>
    </section>
  )
}
