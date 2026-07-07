import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BriefCreationClient from './BriefCreationClient'
import DashboardShell from '@/components/DashboardShell'
import { getPaddlePlans } from '@/lib/paddlePlans'

export const dynamic = 'force-dynamic'

export default async function NewBriefPage({ searchParams }: { searchParams: { draft?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/advertiser')

  const { data: advertiser } = await supabase.from('advertisers').select('*').eq('user_id', user.id).single()
  if (!advertiser) redirect('/advertiser')

  // Check if they need to subscribe (already used free brief)
  const { count } = await supabase.from('briefs').select('id', { count: 'exact', head: true }).eq('advertiser_id', advertiser.id).neq('status', 'draft')
  const needsSubscription = !advertiser.subscribed && (count || 0) >= 1

  // Resume a saved draft (?draft=<brief_id>) — scoped to this advertiser.
  let draftBrief = null
  if (searchParams.draft) {
    const { data } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', searchParams.draft)
      .eq('advertiser_id', advertiser.id)
      .eq('status', 'draft')
      .single()
    draftBrief = data
  }

  return (
    <DashboardShell role="advertiser">
      <BriefCreationClient
        advertiser={advertiser}
        needsSubscription={needsSubscription}
        draftBrief={draftBrief}
        paddle={{
          plans: needsSubscription ? await getPaddlePlans() : [],
          env: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
          clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        }}
      />
    </DashboardShell>
  )
}
