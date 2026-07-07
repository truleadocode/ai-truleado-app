import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPaddleTransaction, getPaddleSubscription } from '@/lib/paddle'

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

// Confirms a just-completed Paddle checkout for the signed-in advertiser.
// The client only tells us a transaction id — we re-fetch it from Paddle
// directly so a forged/replayed call can't grant a free subscription.
export async function POST(request: NextRequest) {
  try {
    const { transaction_id } = await request.json()
    if (!transaction_id) return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 })

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: advertiser } = await service.from('advertisers').select('id').eq('user_id', user.id).single()
    if (!advertiser) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const txn = await getPaddleTransaction(transaction_id)

    if (txn.custom_data?.advertiser_id !== advertiser.id) {
      return NextResponse.json({ error: 'Transaction does not belong to this account' }, { status: 403 })
    }
    if (txn.status !== 'completed' && txn.status !== 'paid') {
      return NextResponse.json({ error: 'Transaction not completed' }, { status: 400 })
    }

    // Prefer the subscription's own status over assuming "completed
    // transaction" == "active subscription" — keeps this consistent with
    // how the webhook derives state, and correct if Paddle ever starts the
    // subscription in a non-`active` state (e.g. a trial).
    const status = txn.subscription_id
      ? (await getPaddleSubscription(txn.subscription_id)).status
      : 'active'

    await service.from('advertisers').update({
      subscribed: ACTIVE_STATUSES.has(status),
      subscription_status: status,
      paddle_customer_id: txn.customer_id,
      paddle_subscription_id: txn.subscription_id,
    }).eq('id', advertiser.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Paddle confirm error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
