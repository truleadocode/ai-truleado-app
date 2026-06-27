import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileEditClient from './ProfileEditClient'

export default async function ProfileEditPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: inf } = await supabase.from('influencers').select('*').eq('user_id', user.id).single()
  if (!inf || !inf.onboarding_complete) redirect('/onboarding')

  const { data: platforms } = await supabase.from('influencer_platforms').select('*').eq('influencer_id', inf.id).order('created_at')
  const { data: rates } = await supabase.from('influencer_rates').select('*').eq('influencer_id', inf.id)

  return <ProfileEditClient influencer={inf} platforms={platforms || []} rates={rates || []} />
}
