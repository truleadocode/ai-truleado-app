'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { CalendarDays, Sparkles, FileText, Check, Instagram, Youtube, Twitter, Linkedin, Music2, Pin, Share2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Opportunity {
  id: string
  status: string
  outreach_message: string | null
  briefs: {
    platforms?: string[]
    content_types?: string[]
    budget_per_creator_eur?: number | null
    budget_flexible?: boolean
    go_live_date?: string | null
    niche_fit?: string | null
  } | null
}

interface Props {
  opportunities: Opportunity[]
  influencerId: string
}

// SVG icons (Lucide) rather than emoji — consistent, themeable, crisp at any size.
const PLATFORM_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, youtube: Youtube, pinterest: Pin, twitter: Twitter, linkedin: Linkedin,
}
function platformIcon(p: string): LucideIcon {
  return PLATFORM_ICONS[p] || Share2
}

const HOW_IT_WORKS = [
  ['Brands submit a campaign brief', 'Sarah reviews it against creators in our network.'],
  ["She reaches out if you're a fit", "You'll see the opportunity right here, with budget and deliverables."],
  ['You decide', 'Say yes to what works for you — brands reach out directly to collaborate.'],
] as const

function budgetLabel(opp: Opportunity) {
  const b = opp.briefs
  if (!b) return null
  if (b.budget_flexible) return 'Budget flexible'
  if (b.budget_per_creator_eur) return `€${Math.round(b.budget_per_creator_eur / 100)} per creator`
  return null
}

export default function OpportunityCards({ opportunities, influencerId }: Props) {
  const [statuses, setStatuses] = useState<Record<string, 'pending' | 'interested' | 'declined'>>(
    Object.fromEntries(opportunities.map(o => [o.id, 'pending']))
  )

  async function respond(matchId: string, response: 'interested' | 'declined') {
    // Optimistic update; roll back if the request fails (error-recovery).
    setStatuses(prev => ({ ...prev, [matchId]: response }))
    try {
      const res = await fetch('/api/influencer/respond-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, response, influencer_id: influencerId }),
      })
      if (!res.ok) throw new Error('request failed')
    } catch {
      setStatuses(prev => ({ ...prev, [matchId]: 'pending' }))
    }
  }

  const active  = opportunities.filter(o => statuses[o.id] === 'pending')
  const past    = opportunities.filter(o => statuses[o.id] !== 'pending')

  if (opportunities.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-14 h-14 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center mx-auto mb-5">
          <Sparkles size={22} className="text-gold" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No opportunities yet</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          We'll reach out the moment a brand campaign is a great fit for your audience.
        </p>

        <div className="text-left bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How it works</p>
          {HOW_IT_WORKS.map(([title, desc], i) => (
            <div key={title} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent border border-gold-border text-gold text-xs font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            New opportunities
          </h2>
          <div className="space-y-4">
            {active.map(opp => {
              const b      = opp.briefs || {}
              const budget = budgetLabel(opp)

              return (
                <Card key={opp.id} className="border-border">
                  <CardContent className="pt-5 pb-3">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center shrink-0"><Sparkles size={16} className="text-gold" /></div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Sarah Chen · Truleado</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Brand partnership opportunity</p>
                      </div>
                    </div>

                    {opp.outreach_message && (
                      <div className="bg-muted rounded-xl px-4 py-3 mb-4 text-sm text-foreground leading-relaxed">
                        {opp.outreach_message}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {(b.platforms || []).map((p: string) => {
                        const Icon = platformIcon(p)
                        return (
                          <Badge key={p} variant="secondary" className="text-[10px] gap-1 font-semibold capitalize">
                            <Icon size={10} />{p}
                          </Badge>
                        )
                      })}
                      {(b.content_types || []).map((c: string) => (
                        <Badge key={c} variant="secondary" className="text-[10px] font-semibold capitalize">
                          {c.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {budget && (
                        <Badge variant="gold" className="text-[10px] font-semibold">{budget}</Badge>
                      )}
                      {b.go_live_date && (
                        <Badge variant="secondary" className="text-[10px] gap-1 font-semibold">
                          <CalendarDays size={10} />
                          {new Date(b.go_live_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="gap-2 pb-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-muted-foreground hover:text-destructive hover:border-destructive"
                      onClick={() => respond(opp.id, 'declined')}
                    >
                      Not for me
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5"
                      onClick={() => respond(opp.id, 'interested')}
                    >
                      <Check size={14} /> I'm interested
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <FileText size={14} /> Past responses
          </h2>
          <div className="space-y-3">
            {past.map(opp => (
              <div key={opp.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3 opacity-60">
                <div className="flex gap-2 flex-wrap">
                  {(opp.briefs?.platforms || []).map((p: string) => {
                    const Icon = platformIcon(p)
                    return (
                      <span key={p} className="text-[10px] font-semibold text-muted-foreground capitalize inline-flex items-center gap-1">
                        <Icon size={10} /> {p}
                      </span>
                    )
                  })}
                </div>
                <Badge variant={statuses[opp.id] === 'interested' ? 'success' : 'outline'} className="text-[10px] shrink-0">
                  {statuses[opp.id] === 'interested' ? 'Interested' : 'Passed'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
