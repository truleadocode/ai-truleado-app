import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import BriefDetailClient from './BriefDetailClient'

export const dynamic = 'force-dynamic'

export default async function BriefDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brief } = await supabase
    .from('briefs')
    .select(`
      id, brand_name, product_description, status,
      platforms, content_types, creators_needed,
      budget_per_creator_eur, budget_flexible,
      go_live_date, niche_fit, target_countries,
      target_age_range,
      advertisers!inner(user_id)
    `)
    .eq('id', params.id)
    .single()

  if (!brief) notFound()

  // Security: only the advertiser who owns this brief can see it
  const adv = brief.advertisers as any
  if (adv?.user_id !== user.id) redirect('/advertiser/dashboard')

  // Matching/scoring is now separate from the offer/accept lifecycle: gigs
  // is the source of truth for who's been offered the brief and whether
  // they accepted or passed. Creators the AI scored but hasn't offered a
  // gig to yet (still queued for the next batch) aren't shown here.
  const service = createServiceClient()
  const { data: gigs } = await service
    .from('gigs')
    .select(`
      id, status, ai_match_score, ai_match_reasoning, brand_revealed,
      influencer_id,
      influencers(first_name, last_name, email,
        influencer_platforms(platform, handle, followers, engagement_rate)
      )
    `)
    .eq('brief_id', params.id)
    .order('ai_match_score', { ascending: false })

  // PII guard: the advertiser only sees the creator's email once that
  // creator has accepted the gig.
  const safeMatches = (gigs || []).map((g: any) => {
    const revealed = ['confirmed', 'in_progress', 'complete'].includes(g.status)
    const inf = Array.isArray(g.influencers) ? g.influencers[0] : g.influencers
    return {
      id: g.id,
      status: g.status,
      score: g.ai_match_score,
      match_reason: g.ai_match_reasoning,
      influencer_id: g.influencer_id,
      influencers: inf ? { ...inf, email: revealed ? inf.email : undefined } : inf,
    }
  })

  return (
    <DashboardShell role="advertiser">
      {/* Supabase infers the to-one `influencers` relation as an array; at
          runtime it's a single object, matching BriefDetailClient's Match type. */}
      <BriefDetailClient brief={brief} initialMatches={safeMatches as any} />
    </DashboardShell>
  )
}
