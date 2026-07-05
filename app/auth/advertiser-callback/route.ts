import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Google OAuth callback for advertisers. The onboarding form passes the
// collected profile as query params (fn/ln/co/ty) so a brand-new Google
// signup keeps the company details entered before the redirect.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) return NextResponse.redirect(`${origin}/advertiser`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/advertiser`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/advertiser`)

  const service = createServiceClient()

  // ── Cross-role guard: block accounts already registered as creators ──
  const { data: existingInfluencer } = await service
    .from('influencers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingInfluencer) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/advertiser?error=already_influencer`)
  }

  // Profile collected by the onboarding form (absent on plain logins)
  const profile = {
    first_name: searchParams.get('fn') || '',
    last_name: searchParams.get('ln') || '',
    company_name: searchParams.get('co') || null,
    advertiser_type: searchParams.get('ty') || null,
  }

  const { data: existing } = await service
    .from('advertisers').select('id, company_name').eq('user_id', user.id).single()

  if (!existing) {
    // Fall back to the Google account name if the form fields are absent
    const fullName = user.user_metadata?.full_name || ''
    const parts = fullName.trim().split(' ')
    await service.from('advertisers').insert({
      user_id: user.id,
      email: user.email!,
      first_name: profile.first_name || parts[0] || '',
      last_name: profile.last_name || parts.slice(1).join(' ') || '',
      company_name: profile.company_name,
      advertiser_type: profile.advertiser_type,
      onboarding_complete: true,
    })
  } else if (profile.company_name && !existing.company_name) {
    // Existing row created without details (e.g. earlier plain login) —
    // fill it from the form.
    await service.from('advertisers').update({
      first_name: profile.first_name || undefined,
      last_name: profile.last_name || undefined,
      company_name: profile.company_name,
      advertiser_type: profile.advertiser_type,
      onboarding_complete: true,
    }).eq('id', existing.id)
  }

  return NextResponse.redirect(`${origin}/advertiser/dashboard`)
}
