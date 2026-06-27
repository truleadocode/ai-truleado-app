import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let influencer = null
  if (user) {
    const { data } = await supabase
      .from('influencers')
      .select('id, first_name, onboarding_complete')
      .eq('user_id', user.id)
      .single()
    influencer = data

    if (influencer?.onboarding_complete) redirect('/dashboard')
  }

  return <OnboardingClient user={user} influencer={influencer} />
}
