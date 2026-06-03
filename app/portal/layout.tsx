import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nunito } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'family') redirect('/login')

  return (
    <div className={`${nunito.variable} font-[family-name:var(--font-nunito)]`}>
      {children}
    </div>
  )
}
