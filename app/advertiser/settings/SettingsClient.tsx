'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Building2, Users, Check, Loader2, CreditCard } from 'lucide-react'

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
}

export default function SettingsClient({ advertiser, accountEmail }: Props) {
  const supabase = createClient()
  const router = useRouter()

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              {!advertiser.subscribed && (
                <Button
                  variant="outline"
                  className="font-semibold"
                  onClick={() => alert('Paddle checkout coming soon. For now, contact hello@truleado.com to subscribe.')}
                >
                  Upgrade — $99/month
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
