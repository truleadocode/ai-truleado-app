import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import AdvertiserMessagesClient from './AdvertiserMessagesClient'

export const dynamic = 'force-dynamic'

export default async function AdvertiserMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  return (
    <DashboardShell role="advertiser">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Direct chat with your confirmed creators.</p>
      </div>
      <AdvertiserMessagesClient advertiserId={advertiser.id} />
    </DashboardShell>
  )
}
