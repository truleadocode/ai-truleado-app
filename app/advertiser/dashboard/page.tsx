import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, Zap, FileText, Users, Radar, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'blue' | 'outline' }> = {
  draft:          { label: 'Draft',            variant: 'outline' },
  submitted:      { label: 'Matching',         variant: 'blue'    },
  matching:       { label: 'Matching',         variant: 'blue'    },
  shortlist_ready:{ label: 'Shortlist ready',  variant: 'success' },
  outreached:     { label: 'Outreached',       variant: 'warning' },
  completed:      { label: 'Completed',        variant: 'outline' },
}

export default async function AdvertiserDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, first_name, company_name')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  const { data: briefs } = await supabase
    .from('briefs')
    .select('id, brand_name, product_description, status, creators_needed, created_at, brief_matches(id, status)')
    .eq('advertiser_id', advertiser.id)
    .order('created_at', { ascending: false })

  const briefList = briefs || []
  const activeBriefs = briefList.filter(b => !['draft', 'completed'].includes(b.status))
  const matching = briefList.filter(b => ['submitted', 'matching'].includes(b.status)).length
  const shortlistsReady = briefList.filter(b => b.status === 'shortlist_ready').length
  const creatorsConfirmed = briefList.reduce((sum, b) =>
    sum + ((b.brief_matches as any[]) || []).filter(m => m.status === 'advertiser_confirmed' || m.status === 'completed').length, 0)

  const stats = [
    { label: 'Active briefs',       value: activeBriefs.length, icon: FileText,    accent: 'text-gold' },
    { label: 'In matching',         value: matching,            icon: Radar,       accent: 'text-blue' },
    { label: 'Shortlists ready',    value: shortlistsReady,     icon: Users,       accent: 'text-amber' },
    { label: 'Creators confirmed',  value: creatorsConfirmed,   icon: CheckCircle, accent: 'text-green' },
  ]

  const recent = briefList.slice(0, 4)

  return (
    <DashboardShell role="advertiser">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {advertiser.first_name ? `Welcome back, ${advertiser.first_name}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {advertiser.company_name ? `Here's what's happening with ${advertiser.company_name}'s campaigns.` : "Here's what's happening with your campaigns."}
          </p>
        </div>
        <Button className="bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5" asChild>
          <Link href="/advertiser/briefs/new">
            <Zap size={14} /> New brief
          </Link>
        </Button>
      </div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Icon size={18} className={accent} />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight leading-none font-mono tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Recent briefs ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent briefs</h2>
        {briefList.length > 0 && (
          <Link href="/advertiser/briefs" className="text-xs font-semibold text-gold no-underline inline-flex items-center gap-0.5 hover:gap-1 transition-all">
            View all <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {briefList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText size={36} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-1.5">No briefs yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Create your first campaign brief and Sarah will find the right creators for you.
            </p>
            <Button className="bg-gold hover:bg-gold/90 text-white font-semibold" asChild>
              <Link href="/advertiser/briefs/new">Create first brief</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {recent.map((brief, i) => {
            const matches   = (brief.brief_matches as any[]) || []
            const confirmed = matches.filter(m => m.status === 'advertiser_confirmed' || m.status === 'completed').length
            const statusCfg = STATUS_MAP[brief.status] || STATUS_MAP.submitted
            const isDraft   = brief.status === 'draft'
            return (
              <Link
                key={brief.id}
                href={isDraft ? `/advertiser/briefs/new?draft=${brief.id}` : `/advertiser/briefs/${brief.id}`}
                className={`no-underline flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{brief.brand_name || 'Untitled brief'}</p>
                  <p className="text-xs text-muted-foreground truncate">{brief.product_description || '—'}</p>
                </div>
                {!isDraft && (
                  <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0 hidden sm:block">
                    {confirmed}/{brief.creators_needed || 5} confirmed
                  </span>
                )}
                <Badge variant={statusCfg.variant} className="shrink-0 text-[10px]">{statusCfg.label}</Badge>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </Card>
      )}
    </DashboardShell>
  )
}
