import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Influencer onboarding backend. Plain structured form data in, structured
// writes out — no chat, no AI extraction. Two entry paths:
//  - Pre-auth: form answers persist to `onboarding_sessions` (localStorage
//    session key), then `merge` (server-to-server, from the OAuth callback)
//    copies them onto the influencer/platforms/rates rows.
//  - Post-auth with an incomplete profile: `save` writes directly.
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, session_key, user_id, influencer_id } = body
  const service = createServiceClient()

  // ── INIT ────────────────────────────────────────────────────────
  if (action === 'init') {
    try {
      if (user_id && influencer_id) {
        const { data: inf } = await service
          .from('influencers')
          .select('first_name, last_name, city, country, languages, primary_niche, secondary_niches, content_style, posting_frequency, bio, brand_loves, brand_never')
          .eq('id', influencer_id)
          .single()

        const { data: platforms } = await service
          .from('influencer_platforms')
          .select('id, platform, handle')
          .eq('influencer_id', influencer_id)

        // Profile already has real content (e.g. a completed pre-auth form
        // was just merged, or this is a returning incomplete signup) —
        // skip straight to screenshots. Otherwise show the form.
        const hasProfile = Boolean(inf?.primary_niche || inf?.bio || (platforms && platforms.length > 0))

        if (hasProfile) {
          return NextResponse.json({ phase: 'screenshots', influencer_id, platforms: platforms || [], first_name: inf?.first_name })
        }
        return NextResponse.json({ phase: 'form', influencer_id, data: inf || {} })
      }

      if (session_key) {
        const { data: session } = await service
          .from('onboarding_sessions')
          .select('*')
          .eq('session_key', session_key)
          .single()

        if (session && !session.completed) {
          return NextResponse.json({ phase: 'form', session_key, data: session })
        }
      }

      const newKey = `tr_${crypto.randomUUID()}`
      await service.from('onboarding_sessions').insert({
        session_key: newKey,
        current_step: 'form',
        last_seen_at: new Date().toISOString(),
      })

      return NextResponse.json({ phase: 'form', session_key: newKey, data: {} })
    } catch (err) {
      console.error('Init error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // ── SAVE (form submitted) ──────────────────────────────────────────
  if (action === 'save') {
    const { data } = body
    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    try {
      if (influencer_id) {
        // Already authed — write straight to the real tables.
        await service.from('influencers').update({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          city: data.city || null,
          country: data.country || null,
          languages: data.languages || [],
          primary_niche: data.primary_niche || null,
          secondary_niches: data.secondary_niches || [],
          content_style: data.content_style || null,
          posting_frequency: data.posting_frequency || null,
          bio: data.bio || null,
          brand_loves: data.brand_loves || [],
          brand_never: data.brand_never || [],
          open_to_gifting: data.open_to_gifting || false,
          open_to_rev_share: data.open_to_rev_share || false,
          open_to_exclusivity: data.open_to_exclusivity || false,
        }).eq('id', influencer_id)

        const createdPlatforms: any[] = []
        for (const p of (data.platforms || [])) {
          const { data: existing } = await service
            .from('influencer_platforms').select('id, platform, handle')
            .eq('influencer_id', influencer_id).eq('platform', p.platform).single()
          if (existing) {
            if (p.handle && p.handle !== existing.handle) {
              await service.from('influencer_platforms').update({ handle: p.handle }).eq('id', existing.id)
            }
            createdPlatforms.push({ ...existing, handle: p.handle || existing.handle })
          } else {
            const { data: created } = await service.from('influencer_platforms')
              .insert({ influencer_id, platform: p.platform, handle: p.handle || null, parse_status: 'pending' })
              .select('id, platform, handle').single()
            if (created) createdPlatforms.push(created)
          }
        }

        if (data.rates?.length) {
          await service.from('influencer_rates').upsert(
            data.rates.map((r: any) => ({ influencer_id, platform: r.platform, content_type: r.content_type, rate_eur: r.rate_eur_cents, currency: 'EUR' })),
            { onConflict: 'influencer_id,platform,content_type' }
          )
        }

        return NextResponse.json({ phase: 'screenshots', influencer_id, platforms: createdPlatforms, first_name: data.first_name })
      }

      // Pre-auth — persist onto the session row.
      if (!session_key) return NextResponse.json({ error: 'Missing session_key' }, { status: 400 })

      await service.from('onboarding_sessions').update({
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        city: data.city || null,
        country: data.country || null,
        languages: data.languages || [],
        platforms: data.platforms || [],
        primary_niche: data.primary_niche || null,
        secondary_niches: data.secondary_niches || [],
        content_style: data.content_style || null,
        posting_frequency: data.posting_frequency || null,
        bio: data.bio || null,
        brand_loves: data.brand_loves || [],
        brand_never: data.brand_never || [],
        rates_parsed: {
          rates: data.rates || [],
          open_to_gifting: data.open_to_gifting || false,
          open_to_rev_share: data.open_to_rev_share || false,
          open_to_exclusivity: data.open_to_exclusivity || false,
        },
        current_step: 'form_done',
        last_seen_at: new Date().toISOString(),
      }).eq('session_key', session_key)

      return NextResponse.json({ phase: 'auth', session_key })
    } catch (err) {
      console.error('Save error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // ── MERGE (server-to-server, called from the OAuth callback) ──────
  if (action === 'merge') {
    if (!session_key || !user_id || !influencer_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: session } = await service
      .from('onboarding_sessions')
      .select('*')
      .eq('session_key', session_key)
      .single()

    if (!session) {
      const { data: platforms } = await service
        .from('influencer_platforms').select('id, platform, handle').eq('influencer_id', influencer_id)
      return NextResponse.json({ phase: 'screenshots', influencer_id, platforms: platforms || [] })
    }

    const influencerUpdates: Record<string, any> = {}
    if (session.first_name) influencerUpdates.first_name = session.first_name
    if (session.last_name) influencerUpdates.last_name = session.last_name
    if (session.city) influencerUpdates.city = session.city
    if (session.country) influencerUpdates.country = session.country
    if (session.languages?.length) influencerUpdates.languages = session.languages
    if (session.primary_niche) influencerUpdates.primary_niche = session.primary_niche
    if (session.secondary_niches?.length) influencerUpdates.secondary_niches = session.secondary_niches
    if (session.content_style) influencerUpdates.content_style = session.content_style
    if (session.posting_frequency) influencerUpdates.posting_frequency = session.posting_frequency
    if (session.bio) influencerUpdates.bio = session.bio
    if (session.brand_loves?.length) influencerUpdates.brand_loves = session.brand_loves
    if (session.brand_never?.length) influencerUpdates.brand_never = session.brand_never

    const ratesParsed = session.rates_parsed || {}
    if ('open_to_gifting' in ratesParsed) influencerUpdates.open_to_gifting = ratesParsed.open_to_gifting || false
    if ('open_to_rev_share' in ratesParsed) influencerUpdates.open_to_rev_share = ratesParsed.open_to_rev_share || false
    if ('open_to_exclusivity' in ratesParsed) influencerUpdates.open_to_exclusivity = ratesParsed.open_to_exclusivity || false

    if (Object.keys(influencerUpdates).length > 0) {
      await service.from('influencers').update(influencerUpdates).eq('id', influencer_id)
    }

    const platforms: any[] = session.platforms || []
    const createdPlatforms: any[] = []

    for (const p of platforms) {
      const { data: existing } = await service
        .from('influencer_platforms').select('id, platform, handle')
        .eq('influencer_id', influencer_id).eq('platform', p.platform).single()

      if (existing) {
        createdPlatforms.push(existing)
      } else {
        const { data: created } = await service.from('influencer_platforms')
          .insert({ influencer_id, platform: p.platform, handle: p.handle || null, parse_status: 'pending' })
          .select('id, platform, handle').single()
        if (created) createdPlatforms.push(created)
      }
    }

    if (ratesParsed.rates?.length) {
      await service.from('influencer_rates').upsert(
        ratesParsed.rates.map((r: any) => ({ influencer_id, platform: r.platform, content_type: r.content_type, rate_eur: r.rate_eur_cents, currency: 'EUR' })),
        { onConflict: 'influencer_id,platform,content_type' }
      )
    }

    await service.from('onboarding_sessions').update({
      user_id, influencer_id, completed: true, last_seen_at: new Date().toISOString(),
    }).eq('session_key', session_key)

    return NextResponse.json({
      phase: 'screenshots',
      influencer_id,
      platforms: createdPlatforms,
      first_name: session.first_name,
    })
  }

  // ── COMPLETE ──────────────────────────────────────────────────────
  if (action === 'complete') {
    const { influencer_id: infId } = body
    if (infId) {
      await service.from('influencers').update({ onboarding_complete: true }).eq('id', infId)
    }
    if (session_key) {
      await service.from('onboarding_sessions').update({ completed: true, screenshots_done: true }).eq('session_key', session_key)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
