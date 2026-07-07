'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  advertiserId: string
  email: string | null
  priceId: string
  paddleEnv: 'sandbox' | 'production'
  clientToken: string
  className?: string
  children: React.ReactNode
}

export default function UpgradeButton({ advertiserId, email, priceId, paddleEnv, clientToken, className, children }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openCheckout() {
    setLoading(true)
    setError(null)
    try {
      const { initializePaddle } = await import('@paddle/paddle-js')
      const paddle = await initializePaddle({
        environment: paddleEnv,
        token: clientToken,
        eventCallback: async (event) => {
          if (event.name !== 'checkout.completed') return
          const transactionId = event.data?.transaction_id
          if (!transactionId) return
          const res = await fetch('/api/paddle/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_id: transactionId }),
          })
          // Land on Settings regardless of where checkout was opened from
          // (it can also be triggered from the brief-creation paywall) so
          // there's one consistent place that confirms the upgrade worked.
          if (res.ok) router.push('/advertiser/settings?upgraded=1')
        },
      })
      paddle?.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: { advertiser_id: advertiserId },
      })
    } catch (err) {
      console.error('Paddle checkout error:', err)
      setError("Couldn't open checkout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button className={className} onClick={openCheckout} disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
        {children}
      </Button>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  )
}
