import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { changePaddleSubscriptionPlan } from '@/lib/paddle'

const ALLOWED_PRICE_IDS = [process.env.PADDLE_PRICE_ID_MONTHLY, process.env.PADDLE_PRICE_ID_ANNUAL]

// Switches the signed-in advertiser's own subscription to a different plan
// (monthly <-> annual). Ownership is verified server-side, and the target
// price must be one of our two known plans — never trust an arbitrary
// price id from the client.
export async function POST(request: NextRequest) {
  try {
    const { price_id } = await request.json()
    if (!price_id || !ALLOWED_PRICE_IDS.includes(price_id)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

    const service = createServiceClient()
    const { data: advertiser } = await service.from('advertisers').select('id, paddle_subscription_id').eq('user_id', user.id).single()
    if (!advertiser?.paddle_subscription_id) return NextResponse.json({ error: 'No active subscription' }, { status: 404 })

    const sub = await changePaddleSubscriptionPlan(advertiser.paddle_subscription_id, price_id)
    await service.from('advertisers').update({ subscription_status: sub.status }).eq('id', advertiser.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Paddle change-plan error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
