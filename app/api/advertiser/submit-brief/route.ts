import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { advertiser_id, status: requestedStatus, ...briefData } = body
    const service = createServiceClient()

    // Only 'draft' is selectable by the client; anything else falls back to
    // a real submission so existing callers (and any unexpected input) keep
    // the original behaviour.
    const status = requestedStatus === 'draft' ? 'draft' : 'submitted'

    // Check if this is their first submitted brief — drafts never count
    // against the free-brief allowance, matching the gate in page.tsx.
    const { count } = await service.from('briefs').select('id', { count: 'exact', head: true }).eq('advertiser_id', advertiser_id).neq('status', 'draft')
    const isFreeBrief = status === 'submitted' && (count || 0) === 0

    // Auto-generate title
    const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    const title = briefData.title || `${briefData.brand_name || 'Brief'} — ${briefData.product_description?.slice(0,30) || 'Campaign'} · ${month}`

    const { data: brief, error } = await service.from('briefs').insert({
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
    }).select('id').single()

    if (error) throw error

    // Only kick off matching for a real submission — a draft isn't ready
    // for creators to see yet.
    if (status === 'submitted') {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/advertiser/match-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_id: brief.id }),
      }).catch(console.error)
    }

    return NextResponse.json({ brief_id: brief.id, is_free: isFreeBrief, status })
  } catch (err) {
    console.error('Submit brief error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
