import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SUPPORT_EMAIL = 'support@thrivemusicschool.com'

const KIND_LABEL: Record<string, string> = {
  question: 'Question',
  comment: 'Comment',
  problem: 'Something broken',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: { kind?: string; message?: string; page?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'Please write a message first.' }, { status: 400 })
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'That message is too long.' }, { status: 400 })
  }

  const kind = KIND_LABEL[body.kind ?? ''] ?? 'Feedback'
  const page = (body.page ?? 'unknown').slice(0, 200)

  // Who sent it — role and name help Mike answer without digging
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Always store it, so nothing is lost even if email delivery fails
  const { error: insertError } = await supabase.from('feedback').insert({
    profile_id: user.id,
    email: user.email,
    kind: body.kind ?? 'comment',
    message,
    page,
  })

  const apiKey = process.env.RESEND_API_KEY
  let emailed = false

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Thrive Studio <${SUPPORT_EMAIL}>`,
          to: [SUPPORT_EMAIL],
          reply_to: user.email,
          subject: `[Thrive Studio] ${kind} from ${user.email}`,
          text: [
            `${kind} from ${user.email}`,
            `Role: ${profile?.role ?? 'unknown'}`,
            `Screen: ${page}`,
            '',
            '---',
            '',
            message,
            '',
            '---',
            'Reply to this email to respond directly.',
          ].join('\n'),
        }),
      })
      emailed = res.ok
    } catch {
      emailed = false
    }
  }

  if (insertError && !emailed) {
    return NextResponse.json(
      { error: 'Could not send that right now. Please email support@thrivemusicschool.com directly.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, emailed })
}
