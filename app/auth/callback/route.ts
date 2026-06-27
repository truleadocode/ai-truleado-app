import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  // Check if influencer row exists
  const service = createServiceClient()
  const { data: influencer } = await service
    .from('influencers')
    .select('id, onboarding_complete, onboarding_step')
    .eq('user_id', user.id)
    .single()

  if (!influencer) {
    // New user — create influencer row
    const email = user.email!
    const fullName = user.user_metadata?.full_name || ''
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    await service.from('influencers').insert({
      user_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: user.user_metadata?.avatar_url || null,
      status: 'pending',
      onboarding_complete: false,
      onboarding_step: 1,
    })

    return NextResponse.redirect(`${origin}/onboarding`)
  }

  if (!influencer.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
