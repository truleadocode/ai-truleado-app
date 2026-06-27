import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: influencer } = await supabase
    .from('influencers')
    .select('id, onboarding_complete, onboarding_step, first_name, last_name, email')
    .eq('user_id', user.id)
    .single()

  if (!influencer) redirect('/')
  if (influencer.onboarding_complete) redirect('/dashboard')

  return <OnboardingClient influencer={influencer} userId={user.id} />
}
