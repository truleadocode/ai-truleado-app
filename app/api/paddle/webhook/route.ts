import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false
  const parts = Object.fromEntries(signatureHeader.split(';').map(p => p.split('=')))
  const { ts, h1 } = parts
  if (!ts || !h1) return false
  // Reject stale signatures — without this, a captured payload + signature
  // pair could be replayed indefinitely.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false
  const computed = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
  const a = Buffer.from(computed)
  const b = Buffer.from(h1)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Subscription statuses that should keep the advertiser unlocked. `past_due`
// is included deliberately — Paddle's dunning flow retries the card for
// days before the subscription actually lapses to `canceled`/`paused`, and
// cutting access on the first failed charge would be overly punitive.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

// Source of truth is the subscription object's own `status` field, not the
// webhook event name — Paddle can fire many event types for the same
// underlying state, and re-deriving from `status` makes this handler
// idempotent no matter which event triggered it or how many times it's
// redelivered.
async function syncSubscription(service: ReturnType<typeof createServiceClient>, sub: any) {
  const subscriptionId: string | undefined = sub?.id
  const customerId: string | undefined = sub?.customer_id
  const advertiserId: string | undefined = sub?.custom_data?.advertiser_id
  const status: string | undefined = sub?.status
  if (!status) return

  const updates = {
    subscribed: ACTIVE_STATUSES.has(status),
    subscription_status: status,
    paddle_subscription_id: subscriptionId,
    paddle_customer_id: customerId,
  }

  if (advertiserId) {
    await service.from('advertisers').update(updates).eq('id', advertiserId)
  } else if (subscriptionId) {
    await service.from('advertisers').update(updates).eq('paddle_subscription_id', subscriptionId)
  } else if (customerId) {
    await service.from('advertisers').update(updates).eq('paddle_customer_id', customerId)
  }
}

// Keeps `advertisers.subscribed`/`subscription_status` in sync with Paddle's
// real state — the confirm endpoint only handles the initial checkout;
// renewals, cancellations, and failed payments only ever reach us here.
export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  const rawBody = await request.text()

  // Fail closed: an unverifiable webhook is worse than a missing one — never
  // trust billing-state changes without a valid signature.
  if (!secret) {
    console.error('PADDLE_WEBHOOK_SECRET is not configured — refusing to process webhook.')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  if (!verifySignature(rawBody, request.headers.get('paddle-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.canceled':
      case 'subscription.paused':
      case 'subscription.resumed':
      case 'subscription.past_due':
      case 'subscription.trialing':
        await syncSubscription(service, event.data)
        break

      // Fallback for the rare case where the client never reaches
      // /api/paddle/confirm (tab closed mid-redirect, etc). If the
      // transaction is tied to a subscription, look it up so we sync from
      // its real status rather than assuming "completed transaction" means
      // "active subscription" (it also fires for one-off/failed-retry txns).
      case 'transaction.completed': {
        const txn = event.data
        const advertiserId = txn?.custom_data?.advertiser_id
        if (txn?.subscription_id) {
          const { getPaddleSubscription } = await import('@/lib/paddle')
          const sub = await getPaddleSubscription(txn.subscription_id)
          await syncSubscription(service, { ...sub, custom_data: sub?.custom_data || { advertiser_id: advertiserId } })
        }
        break
      }

      default:
        console.log(`Unhandled Paddle event type: ${event.event_type}`)
    }
  } catch (err) {
    console.error('Paddle webhook processing error:', err)
    // Signal failure so Paddle retries delivery — the event was valid, we
    // just failed to apply it (e.g. a transient DB error).
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
