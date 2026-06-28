import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BriefDetailClient from './BriefDetailClient'

export default async function BriefDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/advertiser')

  const { data: advertiser } = await supabase.from('advertisers').select('id').eq('user_id', user.id).single()
  if (!advertiser) redirect('/advertiser')

  const { data: brief } = await supabase.from('briefs').select('*').eq('id', params.id).eq('advertiser_id', advertiser.id).single()
  if (!brief) redirect('/advertiser/dashboard')

  // Get matches that have been confirmed by creator (in shortlist)
  const { data: matches } = await supabase
    .from('brief_matches')
    .select(`
      id, score, score_breakdown, match_reason, status,
      contacted_at, creator_response, advertiser_decision,
      influencer:influencer_id (
        id, primary_niche, secondary_niches, content_style, bio, languages,
        platforms:influencer_platforms(platform, followers, engagement_rate, audience_age_range, audience_gender_split, audience_top_countries)
      )
    `)
    .eq('brief_id', params.id)
    .in('status', ['creator_confirmed','advertiser_confirmed','advertiser_passed','completed'])
    .order('score', { ascending: false })

  return <BriefDetailClient brief={brief} matches={matches || []} advertiser={advertiser} />
}
