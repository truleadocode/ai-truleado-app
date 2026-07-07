import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import SettingsClient from './SettingsClient'
import { getPaddlePlans } from '@/lib/paddlePlans'
import { getPaddleSubscription, formatPaddlePrice, type PaddleSubscription } from '@/lib/paddle'

export const dynamic = 'force-dynamic'

export default async function AdvertiserSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, email, first_name, last_name, company_name, advertiser_type, subscribed, subscription_status, paddle_subscription_id, created_at')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  // Paddle is the source of truth for billing details (price, next charge,
  // scheduled cancellation) — fetch live rather than mirroring it all in our
  // own DB, which would just be another thing to keep in sync.
  let subscription: PaddleSubscription | null = null
  if (advertiser.paddle_subscription_id) {
    try {
      subscription = await getPaddleSubscription(advertiser.paddle_subscription_id)
    } catch (err) {
      console.error('Failed to fetch Paddle subscription:', err)
    }
  }

  const currentPrice = subscription?.items[0]?.price

  return (
    <DashboardShell role="advertiser">
      <SettingsClient
        advertiser={advertiser}
        accountEmail={user.email || advertiser.email}
        paddle={{
          plans: await getPaddlePlans(),
          env: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
          clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        }}
        subscription={subscription ? {
          status: subscription.status,
          // Derived from the interval, not the Paddle product/price name —
          // those are freeform dashboard labels that don't reliably say
          // "Monthly" vs "Annual".
          planName: currentPrice?.billing_cycle?.interval === 'year' ? 'Annual' : 'Monthly',
          priceId: currentPrice?.id || null,
          priceLabel: currentPrice ? formatPaddlePrice(currentPrice) : null,
          nextBilledAt: subscription.next_billed_at,
          scheduledChange: subscription.scheduled_change,
        } : null}
      />
    </DashboardShell>
  )
}
