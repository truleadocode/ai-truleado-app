import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from '../onboarding/OnboardingClient'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function InfluencerPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (searchParams.error === 'already_advertiser') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-card border border-red-border rounded-2xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-5">⚠️</div>
          <h2 className="text-lg font-bold mb-3">Account already exists</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            This Google account is already registered as a <strong>brand / agency</strong> on Truleado.
            Please use a different email to create a creator account.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild className="bg-gold hover:bg-gold/90 text-white">
              <Link href="/advertiser/dashboard">Go to brand dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/influencer">Use different account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (user) {
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id, first_name, onboarding_complete')
      .eq('user_id', user.id)
      .single()

    if (influencer?.onboarding_complete) redirect('/influencer/dashboard')
    return <OnboardingClient user={user} influencer={influencer} />
  }

  return <OnboardingClient user={null} influencer={null} />
}
