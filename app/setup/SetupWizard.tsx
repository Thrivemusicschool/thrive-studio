'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INSTRUMENTS = ['Piano', 'Guitar', 'Ukulele', 'Voice', 'Drums', 'Bass', 'Violin', 'Other']

interface Instructor {
  id: string
  first_name: string
  last_name: string
}

interface ExistingFamily {
  id: string
  setup_complete: boolean
  parent_first_name: string | null
  parent_last_name: string | null
  parent_phone: string | null
}

interface Props {
  profileId: string
  userEmail: string
  existingFamily: ExistingFamily | null
  instructors: Instructor[]
  prefillFirstName: string | null
  prefillInstrument: string | null
  addingAnother: boolean
}

export default function SetupWizard({
  profileId,
  userEmail,
  existingFamily,
  instructors,
  prefillFirstName,
  prefillInstrument,
  addingAnother,
}: Props) {
  const [step, setStep] = useState(1)

  // Step 1 — student
  const [firstName, setFirstName] = useState(prefillFirstName ?? '')
  const [lastName, setLastName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [instrument, setInstrument] = useState(prefillInstrument ?? '')
  const [instructorId, setInstructorId] = useState('')

  // Step 2 — parent
  const [parentFirstName, setParentFirstName] = useState(existingFamily?.parent_first_name ?? '')
  const [parentLastName, setParentLastName] = useState(existingFamily?.parent_last_name ?? '')
  const [parentPhone, setParentPhone] = useState(existingFamily?.parent_phone ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function validateStep1(): boolean {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter the student\'s first and last name.')
      return false
    }
    setError(null)
    return true
  }

  async function complete(skipParent: boolean) {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    // 1. Claim the family role on the profile (no-op if already set)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'family' })
      .eq('id', profileId)
    if (profileError) {
      setError('Failed to set up your account: ' + profileError.message)
      setSaving(false)
      return
    }

    // 2. Create or update the family row
    let familyId = existingFamily?.id ?? null
    const parentFields = skipParent
      ? {}
      : {
          parent_first_name: parentFirstName.trim() || null,
          parent_last_name: parentLastName.trim() || null,
          parent_phone: parentPhone.trim() || null,
        }

    if (familyId) {
      const { error: famError } = await supabase
        .from('families')
        .update({ ...parentFields, setup_complete: true })
        .eq('id', familyId)
      if (famError) {
        setError('Failed to save family info: ' + famError.message)
        setSaving(false)
        return
      }
    } else {
      const { data: fam, error: famError } = await supabase
        .from('families')
        .insert({ profile_id: profileId, ...parentFields, setup_complete: true })
        .select('id')
        .single()
      if (famError || !fam) {
        setError('Failed to save family info: ' + (famError?.message ?? 'unknown error'))
        setSaving(false)
        return
      }
      familyId = fam.id
    }

    // 3. Create the student with their journey starting today
    const { error: studentError } = await supabase.from('students').insert({
      family_id: familyId,
      instructor_id: instructorId || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      instrument: instrument || null,
      birthday: birthday || null,
      journey_start_date: new Date().toISOString().split('T')[0],
    })
    if (studentError) {
      setError('Failed to save student: ' + studentError.message)
      setSaving(false)
      return
    }

    // 4. Mark the invite as used (best-effort)
    if (userEmail) {
      await supabase.from('invites').update({ used: true }).eq('email', userEmail).eq('used', false)
    }

    setSaving(false)
    setStep(3)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-gray-800 placeholder-gray-400 text-base'

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-2.5 rounded-full transition-all ${
                n === step ? 'w-8 bg-orange-500' : n < step ? 'w-2.5 bg-orange-300' : 'w-2.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Student info ── */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
            <div className="text-4xl mb-3">🎵</div>
            <h1 className="text-2xl font-black text-gray-800 mb-1">
              {addingAnother ? 'Add another student' : 'Tell us about your student'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">This takes about a minute.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Emma" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">Birthday</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">Instrument</label>
                <select value={instrument} onChange={e => setInstrument(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Choose an instrument…</option>
                  {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">Instructor</label>
                <select value={instructorId} onChange={e => setInstructorId(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Not sure yet</option>
                  {instructors.map(i => (
                    <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                onClick={() => { if (validateStep1()) setStep(2) }}
                className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 text-white font-black text-base rounded-xl transition-colors shadow-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Parent info ── */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-2xl font-black text-gray-800 mb-1">Parent or guardian info</h1>
            <p className="text-gray-500 text-sm mb-6">So we know who to reach about {firstName.trim() || 'your student'}.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1">First name</label>
                  <input type="text" value={parentFirstName} onChange={e => setParentFirstName(e.target.value)} placeholder="Jordan" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1">Last name</label>
                  <input type="text" value={parentLastName} onChange={e => setParentLastName(e.target.value)} placeholder="Smith" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1">Phone</label>
                <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="(407) 555-0123" className={inputClass} />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                onClick={() => complete(false)}
                disabled={saving}
                className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black text-base rounded-xl transition-colors shadow-sm"
              >
                {saving ? 'Saving…' : 'Finish →'}
              </button>

              <button
                onClick={() => complete(true)}
                disabled={saving}
                className="w-full min-h-[48px] text-orange-600 hover:text-orange-700 font-bold text-sm rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-colors"
              >
                Skip — I&apos;m an adult student
              </button>

              <button
                onClick={() => { setError(null); setStep(1) }}
                disabled={saving}
                className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-black text-gray-800 mb-2">You&apos;re all set!</h1>
            <p className="text-gray-600 mb-8">
              {firstName.trim()} is ready to start their Thrive Studio journey! 🎵
            </p>
            <button
              onClick={() => { router.push('/portal'); router.refresh() }}
              className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 text-white font-black text-base rounded-xl transition-colors shadow-sm"
            >
              Go to my portal →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
