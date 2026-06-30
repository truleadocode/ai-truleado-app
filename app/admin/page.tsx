import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Users, UserCheck, Clock, Building2, Lock } from 'lucide-react'

function fmtFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(' ') || '—'
}

export const dynamic = 'force-dynamic'

const ADMIN_PASSWORD = '123123'
const COOKIE = 'admin_session'

async function login(formData: FormData) {
  'use server'
  const pw = formData.get('password')
  if (pw === ADMIN_PASSWORD) {
    cookies().set(COOKIE, 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })
    redirect('/admin')
  }
  redirect('/admin?error=1')
}

async function logout() {
  'use server'
  cookies().delete(COOKIE)
  redirect('/admin')
}

export default async function AdminPage({ searchParams }: { searchParams: { error?: string } }) {
  const authed = cookies().get(COOKIE)?.value === 'ok'

  // ── Password gate ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-6">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-8">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mx-auto mb-5">
              <Lock size={20} className="text-gold" />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-center mb-1">Admin access</h1>
            <p className="text-xs text-muted-foreground text-center mb-6">Enter the password to continue.</p>
            <form action={login} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoFocus required />
              </div>
              {searchParams.error && (
                <p className="text-xs text-destructive">Incorrect password. Try again.</p>
              )}
              <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white font-bold">
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Authenticated: stats + details ─────────────────────────
  // Service client (server-only) — bypasses RLS so this covers all rows.
  const service = createServiceClient()

  const [{ data: influencers }, { data: advertisers }] = await Promise.all([
    service
      .from('influencers')
      .select('id, first_name, last_name, email, city, country, primary_niche, onboarding_complete, created_at, influencer_platforms(platform, handle, followers)')
      .order('created_at', { ascending: false }),
    service
      .from('advertisers')
      .select('id, first_name, last_name, email, company_name, advertiser_type, subscribed, onboarding_complete, created_at')
      .order('created_at', { ascending: false }),
  ])

  const infs = influencers || []
  const advs = advertisers || []
  const onboarded = infs.filter((i: any) => i.onboarding_complete).length

  const stats = [
    { label: 'Total influencers', value: infs.length,             icon: Users,     accent: 'text-gold' },
    { label: 'Onboarded',         value: onboarded,               icon: UserCheck, accent: 'text-green' },
    { label: 'Onboarding incomplete', value: Math.max(0, infs.length - onboarded), icon: Clock, accent: 'text-muted-foreground' },
    { label: 'Advertisers',       value: advs.length,             icon: Building2, accent: 'text-blue' },
  ]

  return (
    <div className="min-h-screen bg-muted px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1">Admin</h1>
            <p className="text-sm text-muted-foreground">Overview of accounts on Truleado.</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">Sign out</Button>
          </form>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <Card key={label}>
              <CardContent className="pt-6 pb-6 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Icon size={20} className={accent} />
                </div>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight leading-none tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Influencers */}
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Influencers ({infs.length})</h2>
        <Card className="mb-10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infs.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No influencers yet.</TableCell>
                </TableRow>
              )}
              {infs.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{fullName(i.first_name, i.last_name)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{i.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{i.primary_niche || '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{[i.city, i.country].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(i.influencer_platforms || []).length === 0 ? '—' : (
                      <div className="flex flex-col gap-0.5">
                        {(i.influencer_platforms || []).map((p: any, idx: number) => (
                          <span key={idx} className="whitespace-nowrap">
                            <span className="capitalize text-foreground">{p.platform}</span>
                            {p.handle ? ` @${p.handle}` : ''} · <span className="tabular-nums">{fmtFollowers(p.followers)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.onboarding_complete ? 'success' : 'outline'}>
                      {i.onboarding_complete ? 'Onboarded' : 'Incomplete'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(i.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Advertisers */}
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Brands / Agencies ({advs.length})</h2>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advs.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No advertisers yet.</TableCell>
                </TableRow>
              )}
              {advs.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{a.company_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground capitalize whitespace-nowrap">{a.advertiser_type || '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{fullName(a.first_name, a.last_name)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{a.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={a.subscribed ? 'success' : 'outline'}>{a.subscribed ? 'Yes' : 'No'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.onboarding_complete ? 'success' : 'outline'}>
                      {a.onboarding_complete ? 'Onboarded' : 'Incomplete'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(a.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
