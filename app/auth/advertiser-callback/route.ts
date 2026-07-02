import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const sessionKey = searchParams.get('sk')

  if (!code) return NextResponse.redirect(`${origin}/advertiser`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/advertiser`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/advertiser`)

  const service = createServiceClient()

  // ── CROSS-ROLE GUARD ─────────────────────────────────────────────
  // Block influencers from signing up as advertisers with the same email
  const { data: existingInfluencer } = await service
    .from('influencers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingInfluencer) {
    // Sign them out and redirect with error
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/advertiser?error=already_influencer`
    )
  }

  // ── MERGE SESSION ─────────────────────────────────────────────────
  if (sessionKey) {
    const mergeRes = await fetch(`${origin}/api/advertiser/sarah-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', session_key: sessionKey, user_id: user.id }),
    })
    const mergeData = await mergeRes.json().catch(() => ({}))
    const advertiserId = mergeData.advertiser_id

    // ── SAVE BRIEF if session has brief data ──────────────────────
    if (advertiserId) {
      // Check brief_sessions for this session key
      const { data: briefSession } = await service
        .from('brief_sessions')
        .select('*')
        .eq('session_key', sessionKey)
        .single()

      if (briefSession && briefSession.brand_name && !briefSession.completed) {
        // Auto-submit the brief
        const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
        const title = `${briefSession.brand_name} — ${(briefSession.product_description || 'Campaign').slice(0, 30)} · ${month}`

        const { data: brief } = await service.from('briefs').insert({
          advertiser_id: advertiserId,
          title,
          brand_name: briefSession.brand_name,
          product_description: briefSession.product_description,
          target_age_range: briefSession.target_age_range,
          target_gender: briefSession.target_gender || 'all',
          target_countries: briefSession.target_countries,
          platforms: briefSession.platforms,
          content_types: briefSession.content_types,
          creators_needed: briefSession.creators_needed || 5,
          budget_per_creator_eur: briefSession.budget_per_creator_eur,
          budget_flexible: briefSession.budget_flexible || false,
          go_live_date: briefSession.go_live_date,
          niche_fit: briefSession.niche_fit,
          tone_notes: briefSession.tone_notes,
          dos: briefSession.dos,
          donts: briefSession.donts,
          status: 'submitted',
          is_free_brief: true,
          source: 'chat',
        }).select('id').single()

        // Mark brief session as completed
        await service
          .from('brief_sessions')
          .update({ completed: true, advertiser_id: advertiserId })
          .eq('session_key', sessionKey)

        // Fire matching (fire and forget)
        if (brief?.id) {
          fetch(`${origin}/api/advertiser/match-brief`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.SUPABASE_SERVICE_ROLE_KEY! },
            body: JSON.stringify({ brief_id: brief.id }),
          }).catch(console.error)
        }
      }
    }
  } else {
    // Direct sign-in — ensure advertiser row exists
    const { data: existing } = await service
      .from('advertisers').select('id').eq('user_id', user.id).single()
    if (!existing) {
      const fullName = user.user_metadata?.full_name || ''
      const parts = fullName.trim().split(' ')
      await service.from('advertisers').insert({
        user_id: user.id,
        email: user.email!,
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        onboarding_complete: true,
      })
    }
  }

  return NextResponse.redirect(`${origin}/advertiser/dashboard`)
}
