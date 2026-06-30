import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BriefCreationClient from './BriefCreationClient'
import DashboardShell from '@/components/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function NewBriefPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/advertiser')

  const { data: advertiser } = await supabase.from('advertisers').select('*').eq('user_id', user.id).single()
  if (!advertiser) redirect('/advertiser')

  // Check if they need to subscribe (already used free brief)
  const { count } = await supabase.from('briefs').select('id', { count: 'exact', head: true }).eq('advertiser_id', advertiser.id).neq('status', 'draft')
  const needsSubscription = !advertiser.subscribed && (count || 0) >= 1

  return (
    <DashboardShell role="advertiser">
      <BriefCreationClient advertiser={advertiser} needsSubscription={needsSubscription} />
    </DashboardShell>
  )
}
