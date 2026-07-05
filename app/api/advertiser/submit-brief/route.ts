import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runMatchBrief } from '@/lib/matchBrief'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { advertiser_id, status: requestedStatus, ...briefData } = body
    const service = createServiceClient()

    // Only 'draft' is selectable by the client; anything else falls back to
    // a real submission so existing callers (and any unexpected input) keep
    // the original behaviour.
    const status = requestedStatus === 'draft' ? 'draft' : 'submitted'

    // Ownership: the brief must be created for the authed user's own
    // advertiser account — advertiser_id comes from the client.
    const { data: { user } } = await createClient().auth.getUser()
    const { data: advertiser } = await service.from('advertisers').select('user_id, subscribed').eq('id', advertiser_id).single()
    if (!user || !advertiser || advertiser.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if this is their first submitted brief — drafts never count
    // against the free-brief allowance, matching the gate in page.tsx.
    const { count } = await service.from('briefs').select('id', { count: 'exact', head: true }).eq('advertiser_id', advertiser_id).neq('status', 'draft')
    const isFreeBrief = status === 'submitted' && (count || 0) === 0

    // Enforce the free-brief gate server-side too — the client check in
    // briefs/new/page.tsx alone can be bypassed by calling this API directly.
    if (status === 'submitted' && !advertiser.subscribed && (count || 0) >= 1) {
      return NextResponse.json({ error: 'Subscription required to submit more briefs.' }, { status: 403 })
    }

    // Auto-generate title
    const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    const title = briefData.title || `${briefData.brand_name || 'Brief'} — ${briefData.product_description?.slice(0,30) || 'Campaign'} · ${month}`

    const briefRow = {
      advertiser_id,
      title,
      brand_name: briefData.brand_name,
      product_description: briefData.product_description,
      target_age_range: briefData.target_age_range,
      target_gender: briefData.target_gender || 'all',
      target_countries: briefData.target_countries,
      target_languages: briefData.target_languages,
      platforms: briefData.platforms,
      content_types: briefData.content_types,
      creators_needed: briefData.creators_needed || 5,
      budget_per_creator_eur: briefData.budget_per_creator_eur,
      budget_flexible: briefData.budget_flexible || false,
      go_live_date: briefData.go_live_date,
      niche_fit: briefData.niche_fit,
      tone_notes: briefData.tone_notes,
      dos: briefData.dos,
      donts: briefData.donts,
      status,
      is_free_brief: isFreeBrief,
      source: briefData.source || 'chat',
      uploaded_brief_path: briefData.uploaded_brief_path,
      raw_brief_text: briefData.raw_brief_text,
    }

    // Resuming a saved draft updates that row in place — otherwise every
    // save/submit of a resumed draft would spawn a duplicate brief.
    const draftId = body.draft_id || null
    let brief: { id: string } | null = null
    if (draftId) {
      const { data: existing } = await service.from('briefs').select('id, advertiser_id, status').eq('id', draftId).single()
      if (!existing || existing.advertiser_id !== advertiser_id || existing.status !== 'draft') {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
      }
      const { data, error } = await service.from('briefs').update(briefRow).eq('id', draftId).select('id').single()
      if (error) throw error
      brief = data
    } else {
      const { data, error } = await service.from('briefs').insert(briefRow).select('id').single()
      if (error) throw error
      brief = data
    }

    // Only kick off matching for a real submission — a draft isn't ready
    // for creators to see yet.
    if (status === 'submitted') {
      // Direct call, not a self-fetch — a server calling its own HTTP
      // endpoint for an unawaited "fire and forget" job is fragile (no
      // guarantee the request completes before this function's process is
      // frozen/recycled). The process-briefs cron sweep re-runs this for
      // any brief that's still short on confirmed creators, so this call
      // failing outright isn't fatal — but there's no reason to take on
      // that risk when a plain function call works just as well.
      runMatchBrief(service, brief.id).catch(console.error)
    }

    return NextResponse.json({ brief_id: brief.id, is_free: isFreeBrief, status })
  } catch (err) {
    console.error('Submit brief error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
