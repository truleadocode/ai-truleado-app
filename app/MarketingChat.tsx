'use client'

import { useState } from 'react'
import OnboardingClient from './onboarding/OnboardingClient'
import AdvertiserOnboardingClient from './advertiser/onboarding/AdvertiserOnboardingClient'

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '9px 18px',
    borderRadius: 9,
    border: 'none',
    background: active ? 'var(--white)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-2)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }
}

export default function MarketingChat() {
  const [tab, setTab] = useState<'brand' | 'creator'>('brand')

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18 }}>
        <button onClick={() => setTab('brand')} style={tabBtn(tab === 'brand')}>For Brands &amp; Agencies</button>
        <button onClick={() => setTab('creator')} style={tabBtn(tab === 'creator')}>For Creators</button>
      </div>

      {/* Embedded live chat — the CTA */}
      <div style={{ width: '100%', maxWidth: 560, height: 600, maxHeight: '74vh' }}>
        {tab === 'brand' ? (
          <AdvertiserOnboardingClient key="brand" user={null} advertiser={null} embedded />
        ) : (
          <OnboardingClient key="creator" user={null} influencer={null} embedded />
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, textAlign: 'center' }}>
        {tab === 'brand'
          ? 'First brief is free · No credit card required'
          : 'Always free for creators · Get matched in minutes'}
      </p>
    </div>
  )
}
