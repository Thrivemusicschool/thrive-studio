import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function InstructorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Instructor Dashboard</h1>
        <p className="text-gray-500 text-sm mb-1">Logged in as</p>
        <p className="text-gray-700 text-sm font-medium mb-8">{user?.email}</p>
        <p className="text-xs text-gray-400 mb-6">Features coming soon…</p>
        <LogoutButton />
      </div>
    </main>
  )
}
