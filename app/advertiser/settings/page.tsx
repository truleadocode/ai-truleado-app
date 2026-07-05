import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdvertiserSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, email, first_name, last_name, company_name, advertiser_type, subscribed, created_at')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  return (
    <DashboardShell role="advertiser">
      <SettingsClient advertiser={advertiser} accountEmail={user.email || advertiser.email} />
    </DashboardShell>
  )
}
