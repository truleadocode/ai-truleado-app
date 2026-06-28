import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from '../onboarding/OnboardingClient'

export default async function InfluencerPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Show error if an advertiser tried to sign up / log in as a creator
  if (searchParams.error === 'already_advertiser') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'var(--white)', border: '1px solid var(--red-border)', borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Account already exists</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            This Google account is already registered as a <strong>brand / agency</strong> on Truleado.
            Please use a different email address to create a creator account.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href="/advertiser/dashboard" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none', padding: '10px 20px', border: '1px solid var(--gold-border)', borderRadius: 8, background: 'var(--gold-bg)' }}>
              Go to brand dashboard
            </a>
            <a href="/influencer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
              Use different account
            </a>
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

    if (influencer?.onboarding_complete) {
      redirect('/influencer/dashboard')
    }

    return <OnboardingClient user={user} influencer={influencer} />
  }

  return <OnboardingClient user={null} influencer={null} />
}
