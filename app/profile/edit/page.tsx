import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileEditClient from './ProfileEditClient'

export default async function ProfileEditPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: inf } = await supabase.from('influencers').select('*').eq('user_id', user.id).single()
  if (!inf || !inf.onboarding_complete) redirect('/onboarding')

  const [{ data: platforms }, { data: rates }, { data: rawScreenshots }] = await Promise.all([
    supabase.from('influencer_platforms').select('*').eq('influencer_id', inf.id).order('created_at'),
    supabase.from('influencer_rates').select('*').eq('influencer_id', inf.id),
    supabase.from('influencer_screenshots').select('*').eq('influencer_id', inf.id).order('created_at', { ascending: false }),
  ])

  // Generate signed URLs for stored screenshots using service client
  const service = createServiceClient()
  const screenshotsWithUrls = await Promise.all(
    (rawScreenshots || []).map(async (s) => {
      const { data } = await service.storage
        .from('influencer-screenshots')
        .createSignedUrl(s.storage_path, 3600)
      return { ...s, signedUrl: data?.signedUrl || null }
    })
  )

  // Group screenshots by platform_id
  const screenshotsByPlatform: Record<string, typeof screenshotsWithUrls> = {}
  for (const s of screenshotsWithUrls) {
    if (!screenshotsByPlatform[s.platform_id]) screenshotsByPlatform[s.platform_id] = []
    screenshotsByPlatform[s.platform_id].push(s)
  }

  return (
    <ProfileEditClient
      influencer={inf}
      platforms={platforms || []}
      rates={rates || []}
      screenshotsByPlatform={screenshotsByPlatform}
    />
  )
}
