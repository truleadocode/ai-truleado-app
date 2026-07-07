'use client'

import { useState } from 'react'
import UpgradeButton from '@/components/UpgradeButton'
import { cn } from '@/lib/utils'

export interface Plan {
  priceId: string
  label: string
  priceLabel: string
  badge?: string
}

interface Props {
  advertiserId: string
  email: string | null
  paddleEnv: 'sandbox' | 'production'
  clientToken: string
  plans: Plan[]
  buttonClassName?: string
}

export default function SubscriptionPlanPicker({ advertiserId, email, paddleEnv, clientToken, plans, buttonClassName }: Props) {
  const [selectedId, setSelectedId] = useState(plans[0]?.priceId)
  const selected = plans.find(p => p.priceId === selectedId) || plans[0]
  if (!selected) return null

  return (
    <div>
      {plans.length > 1 && (
        <div className="flex gap-2 mb-3">
          {plans.map(p => (
            <button
              key={p.priceId}
              type="button"
              onClick={() => setSelectedId(p.priceId)}
              className={cn(
                'flex-1 border rounded-lg px-3 py-2 text-left transition-colors relative',
                p.priceId === selectedId ? 'border-gold bg-gold-bg' : 'border-border bg-card hover:border-gold/50'
              )}
            >
              {p.badge && (
                <span className="absolute -top-2 right-2 text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-green-bg text-green border border-green-border">
                  {p.badge}
                </span>
              )}
              <p className="text-xs font-semibold text-foreground">{p.label}</p>
              <p className="text-[11px] text-muted-foreground">{p.priceLabel}</p>
            </button>
          ))}
        </div>
      )}

      <UpgradeButton
        advertiserId={advertiserId}
        email={email}
        priceId={selected.priceId}
        paddleEnv={paddleEnv}
        clientToken={clientToken}
        className={buttonClassName}
      >
        Subscribe — {selected.priceLabel}
      </UpgradeButton>
    </div>
  )
}
