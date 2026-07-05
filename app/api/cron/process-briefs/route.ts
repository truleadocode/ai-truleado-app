import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runMatchBrief } from '@/lib/matchBrief'

// Scheduled sweep (see vercel.json's `crons` entry) — this is the only true
// background job in the app. Without it, a brief only ever gets matched
// once, at submission time, and creators who onboard afterward are never
// considered. Re-runs matching for every brief that's still short on
// confirmed creators and hasn't been marked match_exhausted — runMatchBrief
// only scores/offers to creators it hasn't already touched, so this is safe
// and cheap to run repeatedly.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: briefs } = await service
    .from('briefs')
    .select('id, creators_needed, creators_confirmed')
    .in('status', ['submitted', 'matching'])
    .eq('match_exhausted', false)

  const results: { brief_id: string; ok: boolean; offered?: number; newlyScored?: number; error?: string }[] = []

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
    briefsChecked: briefs?.length || 0,
    briefsProcessed: results.length,
    results,
  })
}
