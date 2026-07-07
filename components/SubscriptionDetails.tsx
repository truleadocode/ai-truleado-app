'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import type { Plan } from '@/components/SubscriptionPlanPicker'

export interface SubscriptionInfo {
  status: string
  planName: string | null
  priceId: string | null
  priceLabel: string | null
  nextBilledAt: string | null
  scheduledChange: { action: 'cancel' | 'pause' | 'resume'; effective_at: string; resume_at: string | null } | null
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success',
  trialing: 'success',
  past_due: 'warning',
  paused: 'outline',
  canceled: 'destructive',
}

export default function SubscriptionDetails({ subscription, plans }: { subscription: SubscriptionInfo; plans: Plan[] }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canceledEffective, setCanceledEffective] = useState<string | null>(null)

  const willCancel = subscription.scheduledChange?.action === 'cancel'
  const otherPlan = plans.find(p => p.priceId !== subscription.priceId)

  async function confirmCancel() {
    setCanceling(true)
    setError(null)
    const res = await fetch('/api/paddle/cancel', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || "Couldn't cancel your subscription. Please try again.")
      setCanceling(false)
      return
    }
    setCanceledEffective(data.scheduled_change?.effective_at || null)
    setConfirming(false)
    setCanceling(false)
    router.refresh()
  }

  async function switchPlan(priceId: string) {
    setSwitching(priceId)
    setError(null)
    const res = await fetch('/api/paddle/change-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_id: priceId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || "Couldn't switch plans. Please try again.")
      setSwitching(null)
      return
    }
    setSwitching(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Plan</span>
          <span className="text-[13px] font-medium">{subscription.planName || 'Truleado subscription'}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Price</span>
          <span className="text-[13px] font-medium">{subscription.priceLabel || '—'}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <Badge variant={STATUS_BADGE[subscription.status] || 'outline'} className="text-[10px] capitalize">
            {subscription.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted-foreground">{willCancel || canceledEffective ? 'Cancels on' : 'Next billing date'}</span>
          <span className="text-[13px] font-medium">
            {fmtDate(canceledEffective || subscription.scheduledChange?.effective_at || subscription.nextBilledAt) || '—'}
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!willCancel && !canceledEffective && otherPlan && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => switchPlan(otherPlan.priceId)}
          disabled={switching !== null}
          className="gap-1.5"
        >
          {switching === otherPlan.priceId ? (
            <Loader2 size={13} className="animate-spin" />
          ) : otherPlan.label === 'Annual' ? (
            <ArrowUpCircle size={13} />
          ) : (
            <ArrowDownCircle size={13} />
          )}
          Switch to {otherPlan.label} — {otherPlan.priceLabel}
        </Button>
      )}

      {willCancel || canceledEffective ? (
        <p className="text-xs text-muted-foreground">
          Your subscription is set to cancel — you'll keep unlimited briefs until then.
        </p>
      ) : confirming ? (
        <div className="rounded-lg border border-red-border bg-red-bg px-4 py-3 space-y-2.5">
          <p className="text-xs text-destructive inline-flex items-start gap-1.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            You'll lose access to unlimited briefs at the end of your current billing period. This can't be undone.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={confirmCancel} disabled={canceling} className="gap-1.5">
              {canceling && <Loader2 size={13} className="animate-spin" />}
              Yes, cancel subscription
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={canceling}>
              Never mind
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)} className="text-destructive hover:text-destructive">
          Cancel subscription
        </Button>
      )}
    </div>
  )
}
