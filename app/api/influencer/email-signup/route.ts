import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Creates a new creator account with email + password (auto-confirmed).
// Does NOT write the profile here — /api/onboarding (complete_signup) does
// that once the client has signed in.
export async function POST(request: NextRequest) {
  const service = createServiceClient()

  try {
    let email: string, password: string
    try { ({ email, password } = await request.json()) } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    // Check if an account with this email already exists
    const { data: list } = await service.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existing) {
      // Is it a brand/agency account? Give a role-specific message.
      const { data: adv } = await service.from('advertisers').select('id').eq('user_id', existing.id).single()
      if (adv) {
        return NextResponse.json({ error: 'This email is already registered as a brand/agency. Please use a different email for your creator account.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'An account with this email already exists. Try logging in instead.' }, { status: 400 })
    }

    // Create the user, auto-confirmed (no email verification step)
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || 'Could not create account.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user_id: created.user.id })
  } catch (err) {
    console.error('Email signup error:', err)
    return NextResponse.json({ error: 'Something went wrong creating your account.' }, { status: 500 })
  }
}
