import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cancelPaddleSubscription } from '@/lib/paddle'

// Cancels the signed-in advertiser's own subscription — ownership is
// verified server-side via their `paddle_subscription_id`, never trusting a
// subscription id the client might pass in.
export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: advertiser } = await service.from('advertisers').select('id, paddle_subscription_id').eq('user_id', user.id).single()
    if (!advertiser?.paddle_subscription_id) return NextResponse.json({ error: 'No active subscription' }, { status: 404 })

    const sub = await cancelPaddleSubscription(advertiser.paddle_subscription_id)

    // Don't flip `subscribed` yet — access should continue until the period
    // actually ends. The webhook will set it false once Paddle marks the
    // subscription `canceled` at the scheduled effective date.
    await service.from('advertisers').update({ subscription_status: sub.status }).eq('id', advertiser.id)

    return NextResponse.json({ ok: true, scheduled_change: sub.scheduled_change })
  } catch (err) {
    console.error('Paddle cancel error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
