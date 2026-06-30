'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Users, TrendingUp, Star, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Match {
  id: string
  status: string
  score: number | null
  match_reason: string | null
  influencer_id: string
  influencers: {
    first_name: string
    last_name?: string
    email?: string
    influencer_platforms?: { platform: string; handle: string | null; followers: number | null; engagement_rate: number | null }[]
  }
}

interface Brief {
  id: string
  brand_name: string
  product_description: string
  status: string
  platforms?: string[]
  content_types?: string[]
  creators_needed?: number
  budget_per_creator_eur?: number
  budget_flexible?: boolean
  go_live_date?: string
  niche_fit?: string
  target_countries?: string[]
  target_age_range?: string
}

interface Props {
  brief: Brief
  initialMatches: Match[]
}

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green'
  if (s >= 60) return 'text-gold'
  return 'text-destructive'
}
function scoreBarColor(s: number) {
  if (s >= 80) return 'bg-green'
  if (s >= 60) return 'bg-gold'
  return 'bg-destructive'
}

function MatchCard({ match, onConfirm, onPass }: { match: Match; onConfirm: () => void; onPass: () => void }) {
  const [localStatus, setLocalStatus] = useState(match.status)
  const [loading, setLoading] = useState(false)
  const inf = match.influencers
  const plat = inf.influencer_platforms?.[0]
  const score = match.score || 0

  const isConfirmed = localStatus === 'advertiser_confirmed' || localStatus === 'completed'
  const isPassed    = localStatus === 'advertiser_passed'

  async function handleConfirm() {
    setLoading(true)
    const res = await fetch('/api/advertiser/confirm-creator', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id }),
    })
    if (res.ok) { setLocalStatus('advertiser_confirmed'); onConfirm() }
    setLoading(false)
  }

  async function handlePass() {
    setLoading(true)
    const res = await fetch('/api/advertiser/pass-creator', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id }),
    })
    if (res.ok) { setLocalStatus('advertiser_passed'); onPass() }
    setLoading(false)
  }

  return (
    <Card className={cn(
      'transition-all border-2',
      isConfirmed ? 'border-green-border bg-green-bg/20'
      : isPassed  ? 'border-border opacity-50'
      :              'border-border hover:border-gold/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gold/20 border-2 border-gold-border flex items-center justify-center text-gold font-bold text-sm shrink-0">
            {inf.first_name?.[0]}{inf.last_name?.[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">{inf.first_name} {inf.last_name}</span>
              {isConfirmed && <Badge variant="success" className="text-[10px]">Confirmed</Badge>}
              {isPassed    && <Badge variant="outline" className="text-[10px] text-muted-foreground">Passed</Badge>}
            </div>
            {plat && (
              <p className="text-[11px] text-muted-foreground capitalize">
                {plat.handle ? `@${plat.handle} · ` : ''}{plat.platform}
              </p>
            )}
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div className={cn('text-2xl font-extrabold tabular-nums', scoreColor(score))}>{score}</div>
            <div className="text-[10px] text-muted-foreground">/&nbsp;100</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Users size={11}/>, label: 'Followers',  val: fmt(plat?.followers || null) },
            { icon: <TrendingUp size={11}/>, label: 'Engagement', val: plat?.engagement_rate ? `${plat.engagement_rate.toFixed(1)}%` : '—' },
            { icon: <Star size={11}/>, label: 'Match score', val: `${score}/100` },
          ].map(({ icon, label, val }) => (
            <div key={label} className="bg-muted rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-0.5 text-muted-foreground mb-0.5">{icon}</div>
              <div className="text-[11px] font-bold text-foreground">{val}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Score bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', scoreBarColor(score))}
            style={{ width: `${score}%` }} />
        </div>

        {/* Why matched */}
        {match.match_reason && (
          <div className="bg-accent border border-gold-border rounded-lg p-3">
            <p className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1">Why we matched them</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{match.match_reason}</p>
          </div>
        )}
      </CardContent>

      {!isConfirmed && !isPassed && (
        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline" size="sm"
            className="flex-1 gap-1.5 hover:border-destructive hover:text-destructive"
            onClick={handlePass} disabled={loading}
          >
            <XCircle size={13} /> Pass
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-gold hover:bg-gold/90 text-white font-bold"
            onClick={handleConfirm} disabled={loading}
          >
            <CheckCircle size={13} /> Confirm
          </Button>
        </CardFooter>
      )}

      {isConfirmed && inf.email && (
        <CardFooter className="pt-0">
          <p className="w-full text-center text-[11px] text-green font-semibold">
            ✓ Handoff email sent · {inf.email}
          </p>
        </CardFooter>
      )}
    </Card>
  )
}

export default function BriefDetailClient({ brief, initialMatches }: Props) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const supabase = createClient()

  // Live Realtime updates for new matches
  useEffect(() => {
    const channel = supabase.channel(`brief-matches-${brief.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brief_matches', filter: `brief_id=eq.${brief.id}` },
        async () => {
          const { data } = await supabase
            .from('brief_matches')
            .select(`
              id, status, score, match_reason, influencer_id,
              influencers(first_name, last_name, email,
                influencer_platforms(platform, handle, followers, engagement_rate)
              )
            `)
            .eq('brief_id', brief.id)
            .in('status', ['creator_confirmed','advertiser_confirmed','advertiser_passed','completed'])
            .order('score', { ascending: false })
          if (data) setMatches(data as any)
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [brief.id])

  const confirmed = matches.filter(m => m.status === 'advertiser_confirmed' || m.status === 'completed').length
  const needed    = brief.creators_needed || 1

  return (
    <div className="space-y-6">
      {/* ── Back + title ────────────────────────────────── */}
      <div>
        <Link href="/advertiser/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors no-underline mb-4">
          <ArrowLeft size={13} /> Back to briefs
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{brief.brand_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{brief.product_description}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(brief.platforms || []).map(p => (
              <span key={p} className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-2.5 py-1 capitalize">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Confirmation progress ────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold">Creator confirmation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {confirmed} of {needed} creators confirmed
            </p>
          </div>
          <span className="text-2xl font-extrabold text-gold">{confirmed}<span className="text-muted-foreground text-base font-normal">/{needed}</span></span>
        </div>
        <Progress value={Math.min(100, (confirmed / needed) * 100)} className="h-2" />
      </div>

      {/* ── Match cards ─────────────────────────────────── */}
      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">⏳</div>
          <p className="text-sm font-semibold mb-1">Finding your creators…</p>
          <p className="text-xs text-muted-foreground">We're reaching out to matched creators. Check back soon.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {matches.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              onConfirm={() => setMatches(prev => prev.map(x => x.id === m.id ? { ...x, status: 'advertiser_confirmed' } : x))}
              onPass={   () => setMatches(prev => prev.map(x => x.id === m.id ? { ...x, status: 'advertiser_passed' }    : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
