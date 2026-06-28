import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './onboarding/OnboardingClient'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged in and onboarding complete -> dashboard
  if (user) {
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id, first_name, onboarding_complete')
      .eq('user_id', user.id)
      .single()

    if (influencer?.onboarding_complete) {
      redirect('/dashboard')
    }

    // Logged in but not complete -> show Sarah chat (will pick up from screenshots phase)
    return <OnboardingClient user={user} influencer={influencer} />
  }

  // Not logged in -> show Sarah chat (pre-auth, will resume from localStorage)
  return <OnboardingClient user={null} influencer={null} />
}
