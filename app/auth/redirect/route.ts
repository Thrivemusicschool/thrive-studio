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
