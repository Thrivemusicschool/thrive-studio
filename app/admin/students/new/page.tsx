import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'

export default async function NewStudentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-200 hover:text-white text-sm mb-2 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-black">Invite a New Family</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <InviteForm adminProfileId={user.id} />
      </main>
    </div>
  )
}
