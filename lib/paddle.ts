const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

export async function getPaddleTransaction(transactionId: string) {
  const res = await fetch(`${PADDLE_API_BASE}/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Paddle API error: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data as { id: string; status: string; customer_id: string; subscription_id: string | null; custom_data: Record<string, any> | null }
}

export interface PaddleSubscription {
  id: string
  status: string
  customer_id: string
  custom_data: Record<string, any> | null
  next_billed_at: string | null
  current_billing_period: { starts_at: string; ends_at: string } | null
  scheduled_change: { action: 'cancel' | 'pause' | 'resume'; effective_at: string; resume_at: string | null } | null
  items: { price: PaddlePrice; product: { name: string }; quantity: number }[]
}

export async function getPaddleSubscription(subscriptionId: string) {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Paddle API error: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data as PaddleSubscription
}

// Cancels at the end of the current billing period by default — the
// advertiser keeps access they already paid for instead of losing it
// immediately, which is the standard SaaS cancellation behaviour.
export async function cancelPaddleSubscription(subscriptionId: string, effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period') {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ effective_from: effectiveFrom }),
  })
  if (!res.ok) throw new Error(`Paddle API error: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data as PaddleSubscription
}

// Switches an existing subscription to a different price in place — Paddle
// handles proration itself, so an upgrade bills the difference immediately
// and a downgrade credits the account, rather than us having to compute it.
export async function changePaddleSubscriptionPlan(subscriptionId: string, priceId: string) {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      proration_billing_mode: 'prorated_immediately',
    }),
  })
  if (!res.ok) throw new Error(`Paddle API error: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data as PaddleSubscription
}

interface PaddlePrice {
  id: string
  billing_cycle: { interval: 'day' | 'week' | 'month' | 'year'; frequency: number } | null
  unit_price: { amount: string; currency_code: string }
}

export async function getPaddlePrice(priceId: string) {
  const res = await fetch(`${PADDLE_API_BASE}/prices/${priceId}`, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Paddle API error: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data as PaddlePrice
}

// Paddle amounts are in the currency's smallest unit (e.g. cents, paise).
export function formatPaddlePrice(price: PaddlePrice) {
  const amount = Number(price.unit_price.amount) / 100
  const formatted = new Intl.NumberFormat('en', { style: 'currency', currency: price.unit_price.currency_code }).format(amount)
  const perLabel = price.billing_cycle?.interval === 'year' ? '/year' : '/month'
  return `${formatted}${perLabel}`
}
