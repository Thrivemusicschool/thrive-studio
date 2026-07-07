import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${origin}/setup`)
  }

  // No role yet? If an instructor record was created for this email,
  // claim it (links profile + sets role) and go to the instructor view.
  if (!profile.role) {
    const { data: claimed } = await supabase.rpc('claim_instructor')
    if (claimed) {
      // First login: have them set a password before anything else
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }
  }

  switch (profile.role) {
    case 'admin':
      return NextResponse.redirect(`${origin}/admin`)
    case 'instructor':
      return NextResponse.redirect(`${origin}/instructor`)
    case 'family':
      return NextResponse.redirect(`${origin}/portal`)
    default:
      return NextResponse.redirect(`${origin}/setup`)
  }
}
