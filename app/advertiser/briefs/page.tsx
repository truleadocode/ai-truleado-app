import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { ChevronRight, Zap, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'blue' | 'outline' }> = {
  draft:          { label: 'Draft',            variant: 'outline' },
  submitted:      { label: 'Matching',         variant: 'blue'    },
  matching:       { label: 'Matching',         variant: 'blue'    },
  shortlist_ready:{ label: 'Shortlist ready',  variant: 'success' },
  outreached:     { label: 'Outreached',       variant: 'warning' },
  completed:      { label: 'Completed',        variant: 'outline' },
}

export default async function AdvertiserBriefsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, company_name')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  const { data: briefs } = await supabase
    .from('briefs')
    .select(`
      id, brand_name, product_description, status,
      platforms, creators_needed, go_live_date,
      gigs(id, status)
    `)
    .eq('advertiser_id', advertiser.id)
    .order('created_at', { ascending: false })

  const briefList = briefs || []

  return (
    <DashboardShell role="advertiser">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Briefs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {briefList.length === 0 ? 'No briefs yet — create your first one below.' : `${briefList.length} campaign${briefList.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button className="bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5" asChild>
          <Link href="/advertiser/briefs/new">
            <Zap size={14} /> New brief
          </Link>
        </Button>
      </div>

      {briefList.length === 0 ? (
        /* ── Empty state ─────────────────────────── */
        <div className="text-center py-24">
          <FileText size={40} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No briefs yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Create your first campaign brief and we'll find the right creators for you.
          </p>
          <Button className="bg-gold hover:bg-gold/90 text-white font-semibold" asChild>
            <Link href="/advertiser/briefs/new">Create first brief</Link>
          </Button>
        </div>
      ) : (
        /* ── Brief grid ───────────────────────────── */
        <div className="grid sm:grid-cols-2 gap-4">
          {briefList.map(brief => {
            const gigs      = (brief.gigs as any[]) || []
            const confirmed = gigs.filter(g => ['confirmed', 'in_progress', 'complete'].includes(g.status)).length
            const needed    = brief.creators_needed || 1
            const pct       = Math.min(100, Math.round((confirmed / needed) * 100))
            const statusCfg = STATUS_MAP[brief.status] || STATUS_MAP.submitted
            const isDraft   = brief.status === 'draft'

            return (
              <Link
                key={brief.id}
                href={isDraft ? `/advertiser/briefs/new?draft=${brief.id}` : `/advertiser/briefs/${brief.id}`}
                className="no-underline group"
              >
                <Card className="h-full transition-shadow hover:shadow-md border-border group-hover:border-gold/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold truncate">{brief.brand_name || 'Untitled brief'}</CardTitle>
                        <CardDescription className="text-xs mt-1 line-clamp-2">{brief.product_description}</CardDescription>
                      </div>
                      <Badge variant={statusCfg.variant} className="shrink-0 text-[10px]">
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-3">
                    {/* Platform chips */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {(brief.platforms || []).map((p: string) => (
                        <span key={p} className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5 capitalize">{p}</span>
                      ))}
                    </div>

                    {isDraft ? (
                      <p className="text-[11px] text-muted-foreground">Not submitted yet — click to pick up where you left off.</p>
                    ) : (
                      /* Confirmation bar */
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Creators confirmed</span>
                          <span className="font-semibold text-foreground">{confirmed}/{needed}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0 pb-3">
                    <span className="ml-auto text-xs font-semibold text-gold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                      {isDraft ? 'Continue' : 'View'} <ChevronRight size={13} />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
