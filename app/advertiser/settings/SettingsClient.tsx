'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Building2, Users, Check, Loader2, CreditCard, CheckCircle2 } from 'lucide-react'
import SubscriptionPlanPicker, { type Plan } from '@/components/SubscriptionPlanPicker'
import SubscriptionDetails, { type SubscriptionInfo } from '@/components/SubscriptionDetails'

interface Props {
  advertiser: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    company_name: string | null
    advertiser_type: string | null
    subscribed: boolean | null
    created_at: string
  }
  accountEmail: string
  paddle: { plans: Plan[]; env: 'sandbox' | 'production'; clientToken: string }
  subscription: SubscriptionInfo | null
}

export default function SettingsClient({ advertiser, accountEmail, paddle, subscription }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [showUpgraded, setShowUpgraded] = useState(searchParams.get('upgraded') === '1')
  useEffect(() => {
    if (searchParams.get('upgraded') !== '1') return
    // Strip the query param so a refresh/back-nav doesn't re-show the banner.
    router.replace('/advertiser/settings')
  }, [searchParams, router])

  const [firstName, setFirstName] = useState(advertiser.first_name || '')
  const [lastName, setLastName] = useState(advertiser.last_name || '')
  const [company, setCompany] = useState(advertiser.company_name || '')
  const [advType, setAdvType] = useState<'brand' | 'agency' | null>(
    advertiser.advertiser_type === 'brand' || advertiser.advertiser_type === 'agency' ? advertiser.advertiser_type : null
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: err } = await supabase.from('advertisers').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: company.trim() || null,
      advertiser_type: advType,
    }).eq('id', advertiser.id)
    if (err) {
      setError("Couldn't save your changes. Please try again.")
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your company profile and account.</p>
      </div>

      {showUpgraded && (
        <div className="max-w-2xl mb-6 flex items-start gap-2.5 rounded-lg border border-green-border bg-green-bg px-4 py-3">
          <CheckCircle2 size={16} className="text-green shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green">Payment successful</p>
            <p className="text-xs text-green/80 mt-0.5">You're now subscribed — unlimited briefs and creator matches are unlocked.</p>
          </div>
          <button onClick={() => setShowUpgraded(false)} className="text-green/60 hover:text-green text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* ── Company profile ─────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Company profile</CardTitle>
            <CardDescription className="text-xs">This is what creators see when you confirm a collaboration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-xs text-destructive bg-red-bg border border-red-border rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first">First name</Label>
                <Input id="first" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last">Last name</Label>
                <Input id="last" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>You are a…</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'brand' as const, label: 'Brand', Icon: Building2 },
                  { key: 'agency' as const, label: 'Agency', Icon: Users },
                ]).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdvType(key)}
                    className={cn(
                      'border rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition-colors',
                      advType === key ? 'border-gold bg-gold-bg text-gold' : 'border-border bg-card text-muted-foreground hover:border-gold/50'
                    )}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? 'Saved' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        {/* ── Account ─────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{accountEmail}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-border pt-3">
              <div>
                <p className="text-sm font-medium">Member since</p>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  {new Date(advertiser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Subscription ────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Subscription</CardTitle>
            <CardDescription className="text-xs">Your first brief is free. Subscribe for unlimited briefs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                <CreditCard size={16} className="text-gold" />
              </div>
              <div>
                <p className="text-sm font-medium inline-flex items-center gap-2">
                  Current plan
                  <Badge variant={advertiser.subscribed ? 'success' : 'outline'} className="text-[10px]">
                    {advertiser.subscribed ? 'Subscribed' : 'Free'}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {advertiser.subscribed ? 'Unlimited briefs · Unlimited creator matches' : '1 free brief included'}
                </p>
              </div>
            </div>
            {advertiser.subscribed && subscription ? (
              <SubscriptionDetails subscription={subscription} plans={paddle.plans} />
            ) : advertiser.subscribed ? (
              <p className="text-xs text-muted-foreground">
                Couldn't load your billing details right now. Contact <a href="mailto:support@truleado.com" className="text-gold no-underline hover:underline">support@truleado.com</a> to manage your subscription.
              </p>
            ) : (
              <SubscriptionPlanPicker
                advertiserId={advertiser.id}
                email={accountEmail}
                paddleEnv={paddle.env}
                clientToken={paddle.clientToken}
                plans={paddle.plans}
                buttonClassName="w-full bg-gold hover:bg-gold/90 text-white font-semibold"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
