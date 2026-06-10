import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetupWizard from './SetupWizard'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>
}) {
  const { add } = await searchParams
  const addingAnother = add === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [familyResult, instructorsResult, inviteResult] = await Promise.all([
    supabase.from('families').select('id, setup_complete, parent_first_name, parent_last_name, parent_phone').eq('profile_id', user.id).maybeSingle(),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('first_name'),
    supabase.from('invites').select('student_first_name, instrument').eq('email', user.email ?? '').eq('used', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const family = familyResult.data

  // Already set up and not explicitly adding another student → portal
  if (family?.setup_complete && !addingAnother) redirect('/portal')

  return (
    <SetupWizard
      profileId={user.id}
      userEmail={user.email ?? ''}
      existingFamily={family ?? null}
      instructors={instructorsResult.data ?? []}
      prefillFirstName={inviteResult.data?.student_first_name ?? null}
      prefillInstrument={inviteResult.data?.instrument ?? null}
      addingAnother={addingAnother}
    />
  )
}
