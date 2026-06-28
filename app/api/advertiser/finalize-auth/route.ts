import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Called after the client has an authenticated session (post sign-in),
// for BOTH email/password and as a shared helper. Ensures the advertiser
// row exists, blocks influencer cross-role, and saves any pending brief.
export async function POST(request: Request) {
  const { session_key } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const service = createServiceClient()

  // Cross-role guard: block accounts already registered as creators
  const { data: inf } = await service.from('influencers').select('id').eq('user_id', user.id).single()
  if (inf) {
    return NextResponse.json({ error: 'already_influencer' }, { status: 403 })
  }

  // Ensure advertiser row exists
  let { data: advertiser } = await service.from('advertisers').select('id').eq('user_id', user.id).single()

  if (!advertiser) {
    const { data: onb } = await service
      .from('advertiser_onboarding_sessions').select('*').eq('session_key', session_key).single()

    const { data: newAdv } = await service.from('advertisers').insert({
      user_id: user.id,
      email: user.email!,
      first_name: onb?.first_name || '',
      last_name: onb?.last_name || '',
      company_name: onb?.company_name || null,
      advertiser_type: onb?.advertiser_type || null,
      onboarding_complete: true,
    }).select('id').single()

    advertiser = newAdv

    if (onb) {
      await service.from('advertiser_onboarding_sessions')
        .update({ user_id: user.id, advertiser_id: advertiser?.id, completed: true })
        .eq('session_key', session_key)
    }
  }

  // Save pending brief from brief_sessions
  if (advertiser?.id && session_key) {
    const { data: bs } = await service.from('brief_sessions').select('*').eq('session_key', session_key).single()

    if (bs && bs.brand_name && !bs.completed) {
      const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
      const title = `${bs.brand_name} — ${(bs.product_description || 'Campaign').slice(0, 30)} · ${month}`

      const { data: brief } = await service.from('briefs').insert({
        advertiser_id: advertiser.id,
        title,
        brand_name: bs.brand_name,
        product_description: bs.product_description,
        target_age_range: bs.target_age_range,
        target_gender: bs.target_gender || 'all',
        target_countries: bs.target_countries,
        platforms: bs.platforms,
        content_types: bs.content_types,
        creators_needed: bs.creators_needed || 5,
        budget_per_creator_eur: bs.budget_per_creator_eur,
        budget_flexible: bs.budget_flexible || false,
        go_live_date: bs.go_live_date,
        niche_fit: bs.niche_fit,
        tone_notes: bs.tone_notes,
        dos: bs.dos,
        donts: bs.donts,
        status: 'submitted',
        is_free_brief: true,
        source: 'chat',
      }).select('id').single()

      await service.from('brief_sessions')
        .update({ completed: true, advertiser_id: advertiser.id })
        .eq('session_key', session_key)

      if (brief?.id) {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/advertiser/match-brief`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brief_id: brief.id }),
        }).catch(console.error)
      }
    }
  }

  return NextResponse.json({ ok: true, advertiser_id: advertiser?.id })
}
