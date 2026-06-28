import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdvertiserOnboardingClient from './onboarding/AdvertiserOnboardingClient'

export default async function AdvertiserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id, onboarding_complete')
      .eq('user_id', user.id)
      .single()

    if (advertiser?.onboarding_complete) {
      redirect('/advertiser/dashboard')
    }

    return <AdvertiserOnboardingClient user={user} advertiser={advertiser} />
  }

  return <AdvertiserOnboardingClient user={null} advertiser={null} />
}
