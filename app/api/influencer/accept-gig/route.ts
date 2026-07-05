import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Influencer accepts a gig offer directly — no advertiser-side confirmation
// step. Reveals the brand name and opens the brand chat with an automatic
// first message so the advertiser immediately knows to follow up.
export async function POST(request: NextRequest) {
  const { gig_id } = await request.json()
  if (!gig_id) return NextResponse.json({ error: 'Missing gig_id' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const service = createServiceClient()

  const { data: influencer } = await service.from('influencers').select('id, first_name').eq('user_id', user.id).single()
  if (!influencer) return NextResponse.json({ error: 'Not an influencer account' }, { status: 403 })

  const { data: gig } = await service.from('gigs').select('id, influencer_id, status, brief_id, brand_name').eq('id', gig_id).single()
  if (!gig || gig.influencer_id !== influencer.id) return NextResponse.json({ error: 'Gig not found' }, { status: 404 })

  // Idempotent — accepting an already-accepted gig just no-ops.
  if (['confirmed', 'in_progress', 'complete'].includes(gig.status)) {
    return NextResponse.json({ ok: true, already: true })
  }

  const { data: brief } = await service.from('briefs').select('id, advertiser_id, creators_confirmed, brand_name').eq('id', gig.brief_id).single()
  const { data: advertiser } = brief
    ? await service.from('advertisers').select('first_name').eq('id', brief.advertiser_id).single()
    : { data: null }

  await service.from('gigs').update({ status: 'confirmed', brand_revealed: true }).eq('id', gig_id)

  if (brief) {
    await service.from('briefs').update({ creators_confirmed: (brief.creators_confirmed || 0) + 1 }).eq('id', brief.id)
  }

  const advertiserFirstName = advertiser?.first_name || 'there'
  await service.from('gig_messages').insert({
    gig_id,
    channel: 'brand',
    sender_type: 'influencer',
    content: `Hi ${advertiserFirstName}, I accept your brief, let's chat and figure out things!`,
    read_by_advertiser: false,
  })

  return NextResponse.json({ ok: true })
}
