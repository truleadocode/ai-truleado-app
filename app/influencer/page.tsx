import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from '../onboarding/OnboardingClient'

export default async function InfluencerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id, first_name, onboarding_complete')
      .eq('user_id', user.id)
      .single()

    if (influencer?.onboarding_complete) {
      redirect('/influencer/dashboard')
    }

    return <OnboardingClient user={user} influencer={influencer} />
  }

  return <OnboardingClient user={null} influencer={null} />
}
