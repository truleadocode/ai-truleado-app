import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OpportunityCards from './OpportunityCards'

export const dynamic = 'force-dynamic'

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

  // No <DashboardShell> here — app/dashboard/layout.tsx already wraps every
  // page under /dashboard/* with one. Wrapping again produced two nested
  // headers, which is what was showing up on screen.
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Hey, {influencer.first_name} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here are the brand campaigns we think are a great fit for you.
        </p>
      </div>

      {/* Supabase infers the to-one `briefs` relation as an array; at runtime
          it's a single object, matching OpportunityCards' Opportunity type. */}
      <OpportunityCards
        opportunities={(opportunities || []) as any}
        influencerId={influencer.id}
      />
    </>
  )
}
