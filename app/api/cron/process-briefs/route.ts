import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runMatchBrief } from '@/lib/matchBrief'

// Scheduled sweep (see vercel.json's `crons` entry) — this is the only true
// background job in the app. Without it, a brief only ever gets matched
// once, at submission time: creators who onboard afterward are never
// considered, and outreach that a creator ignores past its 48h
// response_timeout_at just sits there forever with no follow-up.
//
// Each run:
//  1. Times out any outreach past its response_timeout_at.
//  2. Re-runs matching for every brief that's still short on confirmed
//     creators and hasn't been marked match_exhausted — runMatchBrief only
//     scores/contacts creators it hasn't already touched, so this is safe
//     and cheap to run repeatedly.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data: timedOut } = await service
    .from('brief_matches')
    .update({ status: 'creator_timeout' })
    .eq('status', 'outreached')
    .lt('response_timeout_at', now)
    .select('id')

  const { data: briefs } = await service
    .from('briefs')
    .select('id, creators_needed, creators_confirmed')
    .in('status', ['submitted', 'matching'])
    .eq('match_exhausted', false)

  const results: { brief_id: string; ok: boolean; contacted?: number; newlyScored?: number; error?: string }[] = []

  for (const brief of briefs || []) {
    if ((brief.creators_confirmed || 0) >= (brief.creators_needed || 5)) continue
    try {
      const result = await runMatchBrief(service, brief.id)
      results.push({ brief_id: brief.id, ...result })
    } catch (err) {
      console.error('process-briefs: runMatchBrief failed for', brief.id, err)
      results.push({ brief_id: brief.id, ok: false, error: String(err) })
    }
  }

  return NextResponse.json({
    ok: true,
    timedOutMatches: timedOut?.length || 0,
    briefsChecked: briefs?.length || 0,
    briefsProcessed: results.length,
    results,
  })
}
