import { getPaddlePrice, formatPaddlePrice } from '@/lib/paddle'
import type { Plan } from '@/components/SubscriptionPlanPicker'

// Fetches the live monthly/annual prices from Paddle so the UI never drifts
// from what's actually configured in the Paddle dashboard.
export async function getPaddlePlans(): Promise<Plan[]> {
  const [monthly, annual] = await Promise.all([
    getPaddlePrice(process.env.PADDLE_PRICE_ID_MONTHLY!),
    getPaddlePrice(process.env.PADDLE_PRICE_ID_ANNUAL!),
  ])

  const monthlyAmount = Number(monthly.unit_price.amount)
  const annualAmount = Number(annual.unit_price.amount)
  const savingsPct = monthlyAmount > 0 ? Math.round((1 - annualAmount / (monthlyAmount * 12)) * 100) : 0

  return [
    { priceId: monthly.id, label: 'Monthly', priceLabel: formatPaddlePrice(monthly) },
    { priceId: annual.id, label: 'Annual', priceLabel: formatPaddlePrice(annual), badge: savingsPct > 0 ? `Save ${savingsPct}%` : undefined },
  ]
}
