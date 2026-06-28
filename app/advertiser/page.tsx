import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdvertiserOnboardingClient from './onboarding/AdvertiserOnboardingClient'

export default async function AdvertiserPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Show error if influencer tried to sign up as advertiser
  if (searchParams.error === 'already_influencer') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'var(--white)', border: '1px solid var(--red-border)', borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Account already exists</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            This Google account is already registered as a <strong>creator</strong> on Truleado.
            Please use a different email address to create a brand or agency account.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href="/influencer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none', padding: '10px 20px', border: '1px solid var(--gold-border)', borderRadius: 8, background: 'var(--gold-bg)' }}>
              Go to creator dashboard
            </a>
            <a href="/advertiser" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
              Use different account
            </a>
          </div>
        </div>
      </div>
    )
  }

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
