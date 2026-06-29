'use client'
import { useState } from 'react'
import OnboardingClient from './onboarding/OnboardingClient'
import AdvertiserOnboardingClient from './advertiser/onboarding/AdvertiserOnboardingClient'
import { cn } from '@/lib/utils'

export default function MarketingChat() {
  const [tab, setTab] = useState<'brand' | 'creator'>('brand')

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tab switcher */}
      <div className="inline-flex gap-1 p-1 bg-muted border border-border rounded-xl mb-5">
        {([['brand', 'For Brands & Agencies'], ['creator', 'For Creators']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live embedded chat */}
      <div className="w-full max-w-[560px] h-[600px] max-h-[74vh]">
        {tab === 'brand'
          ? <AdvertiserOnboardingClient key="brand"   user={null} advertiser={null} embedded />
          : <OnboardingClient           key="creator" user={null} influencer={null} embedded />
        }
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        {tab === 'brand'
          ? 'First brief is free · No credit card required'
          : 'Always free for creators · Get matched in minutes'}
      </p>
    </div>
  )
}
