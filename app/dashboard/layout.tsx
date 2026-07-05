import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: influencer } = await supabase
    .from('influencers')
    .select('id, first_name, last_name, avatar_url, status, onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (!influencer) redirect('/')
  // Was redirecting to /onboarding, which doesn't exist as a route in this
  // app — the real onboarding entry point is /influencer.
  if (!influencer.onboarding_complete) redirect('/influencer')

  const { data: gigRows } = await supabase
    .from('gigs')
    .select('id')
    .eq('influencer_id', influencer.id)

  const gigIds = (gigRows || []).map(g => g.id)

  const { count: unreadMessages } = await supabase
    .from('gig_messages')
    .select('id', { count: 'exact', head: true })
    .eq('read_by_influencer', false)
    .eq('channel', 'brand')
    .in('gig_id', gigIds.length ? gigIds : ['00000000-0000-0000-0000-000000000000'])

  const { count: unreadSarah } = await supabase
    .from('gig_messages')
    .select('id', { count: 'exact', head: true })
    .eq('read_by_influencer', false)
    .eq('channel', 'sarah')
    .in('gig_id', gigIds.length ? gigIds : ['00000000-0000-0000-0000-000000000000'])

  const { count: unreadNotifs } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('influencer_id', influencer.id)
    .eq('read', false)

  const { count: activeGigs } = await supabase
    .from('gigs')
    .select('id', { count: 'exact', head: true })
    .eq('influencer_id', influencer.id)
    .in('status', ['offered', 'interested', 'confirmed', 'in_progress'])

  return (
    <DashboardShell
      influencer={influencer}
      unreadMessages={unreadMessages || 0}
      unreadSarah={unreadSarah || 0}
      unreadNotifs={unreadNotifs || 0}
      activeGigs={activeGigs || 0}
    >
      {children}
    </DashboardShell>
  )
}
