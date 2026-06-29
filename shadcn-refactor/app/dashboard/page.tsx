import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import OpportunityCards from './OpportunityCards'

export default async function InfluencerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: influencer } = await supabase
    .from('influencers')
    .select('id, first_name, onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (!influencer) redirect('/influencer')
  if (!influencer.onboarding_complete) redirect('/influencer')

  const { data: opportunities } = await supabase
    .from('brief_matches')
    .select(`
      id, status, outreach_message,
      briefs:brief_id(
        platforms, content_types, budget_per_creator_eur,
        budget_flexible, go_live_date, niche_fit
      )
    `)
    .eq('influencer_id', influencer.id)
    .eq('status', 'outreached')
    .order('created_at', { ascending: false })

  return (
    <DashboardShell role="influencer">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Hey, {influencer.first_name} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here are the brand campaigns we think are a great fit for you.
        </p>
      </div>

      {/* Opportunities */}
      <OpportunityCards
        opportunities={opportunities || []}
        influencerId={influencer.id}
      />
    </DashboardShell>
  )
}
