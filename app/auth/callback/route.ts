import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const sessionKey = searchParams.get('sk')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const service = createServiceClient()

  // ── CROSS-ROLE GUARD ─────────────────────────────────────────────
  // Block advertisers from signing up as creators with the same email
  const { data: existingAdvertiser } = await service
    .from('advertisers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingAdvertiser) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/influencer?error=already_advertiser`)
  }

  // Check if influencer row exists
  const { data: influencer } = await service
    .from('influencers')
    .select('id, onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (!influencer) {
    // New user — create influencer row
    const fullName = user.user_metadata?.full_name || ''
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const { data: newInfluencer } = await service.from('influencers').insert({
      user_id: user.id,
      email: user.email!,
      first_name: firstName,
      last_name: lastName,
      avatar_url: user.user_metadata?.avatar_url || null,
      status: 'pending',
      onboarding_complete: false,
    }).select('id').single()

    // If we have a session key from the pre-auth onboarding form, merge it
    if (sessionKey && newInfluencer) {
      await fetch(`${origin}/api/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          session_key: sessionKey,
          user_id: user.id,
          influencer_id: newInfluencer.id,
        }),
      })
    }

    // Go to the dedicated influencer onboarding page — Sarah resumes at screenshots
    return NextResponse.redirect(`${origin}/influencer`)
  }

  if (influencer.onboarding_complete) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Not complete — resume onboarding on the dedicated page
  return NextResponse.redirect(`${origin}/influencer`)
}
