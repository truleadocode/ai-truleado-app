import { createClient } from '@/lib/supabase/server'
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

  const { data: matches } = await supabase
    .from('brief_matches')
    .select(`
      id, status, score, match_reason,
      influencer_id,
      influencers(first_name, last_name, email,
        influencer_platforms(platform, handle, followers, engagement_rate)
      )
    `)
    .eq('brief_id', params.id)
    .in('status', ['creator_confirmed','advertiser_confirmed','advertiser_passed','completed'])
    .order('score', { ascending: false })

  return (
    <DashboardShell role="advertiser">
      {/* Supabase infers the to-one `influencers` relation as an array; at
          runtime it's a single object, matching BriefDetailClient's Match type. */}
      <BriefDetailClient brief={brief} initialMatches={(matches || []) as any} />
    </DashboardShell>
  )
}
