'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Building2, Sparkles, FileText, Users, ThumbsUp, ThumbsDown, Calendar, Clock } from 'lucide-react'

type BriefDetails = {
  product_description: string | null
  content_types: string[]
  platforms: string[]
  target_age_range: string | null
  target_gender: string | null
  target_countries: string[]
  tone_notes: string | null
  dos: string | null
  donts: string | null
}

type Gig = {
  id: string
  brand_category: string
  brand_name: string | null
  brand_revealed: boolean
  platform: string
  deliverables_summary: string
  budget_eur: number | null
  respond_by: string | null
  content_due_at: string | null
  go_live_at: string | null
  status: string
  offer_notes: string | null
  deliverables_checklist: any[]
  ai_match_score: number | null
  ai_match_reasoning: string | null
  brief_details: BriefDetails | null
}

type Message = {
  id: string
  content: string
  sender_type: string
  created_at: string
  read_by_influencer: boolean
}

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function statusInfo(status: string) {
  switch (status) {
    case 'offered':     return { label: 'New',            className: 'bg-gold-bg text-gold border-gold-border' }
    case 'confirmed':   return { label: 'Accepted',        className: 'bg-green-bg text-green border-green-border' }
    case 'in_progress': return { label: 'In progress',    className: 'bg-green-bg text-green border-green-border' }
    case 'complete':    return { label: 'Completed',      className: 'bg-green-bg text-green border-green-border' }
    case 'passed':      return { label: 'Passed',          className: 'bg-muted text-muted-foreground border-border' }
    default:            return { label: status,           className: 'bg-muted text-muted-foreground border-border' }
  }
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green'
  if (s >= 60) return 'text-gold'
  return 'text-muted-foreground'
}

const GIG_SELECT = 'id, brand_category, brand_name:brand_name_visible, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, goes_live_at, status, ai_outreach_draft, ai_match_score, ai_match_reasoning, brief_details'

export default function GigDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const gigId = params.id as string

  const [gig, setGig] = useState<Gig | null>(null)
  const [influencerId, setInfluencerId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [tab, setTab] = useState<'brief'|'chat'>('brief')
  const [statusFlash, setStatusFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) { router.push('/'); return }
      setInfluencerId(inf.id)

      const { data: gigData } = await supabase
        .from('gigs')
        .select(GIG_SELECT)
        .eq('id', gigId)
        .eq('influencer_id', inf.id)
        .single()

      if (!gigData) { router.push('/dashboard/gigs'); return }
      setGig(gigData as unknown as Gig)
      statusRef.current = (gigData as any).status

      const { data: msgs } = await supabase
        .from('gig_messages')
        .select('id, content, sender_type, created_at, read_by_influencer')
        .eq('gig_id', gigId)
        .eq('channel', 'brand')
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      await supabase.from('gig_messages')
        .update({ read_by_influencer: true })
        .eq('gig_id', gigId)
        .eq('channel', 'brand')
        .eq('sender_type', 'advertiser')
        .eq('read_by_influencer', false)
    }
    load()
  }, [gigId])

  // Realtime — status changes (advertiser-side actions) and new messages
  // land live, no manual refresh needed. A brief highlight flash marks a
  // status change so it doesn't just silently update.
  useEffect(() => {
    const channel = supabase.channel(`gig-detail-${gigId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gigs', filter: `id=eq.${gigId}` },
        (payload: any) => {
          const updated = payload.new
          // The raw `brand_name` column has no client-role SELECT grant (by
          // design — see brand_name_visible), so Realtime omits it from
          // this payload entirely. Only the generated, gated column is
          // actually visible here.
          setGig(prev => prev ? { ...prev, ...updated, brand_name: updated.brand_name_visible ?? prev.brand_name } : prev)
          if (statusRef.current && updated.status !== statusRef.current) {
            setStatusFlash(true)
            setTimeout(() => setStatusFlash(false), 1200)
          }
          statusRef.current = updated.status
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gig_messages', filter: `gig_id=eq.${gigId}` },
        (payload: any) => {
          const msg = payload.new
          if (msg.channel !== 'brand') return
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.sender_type === 'advertiser') {
            supabase.from('gig_messages').update({ read_by_influencer: true }).eq('id', msg.id)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [gigId])

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  async function sendMessage() {
    if (!draft.trim() || !influencerId) return
    setSending(true)
    const { data, error } = await supabase.from('gig_messages').insert({
      gig_id: gigId, channel: 'brand',
      sender_type: 'influencer', content: draft.trim(), read_by_influencer: true,
    }).select().single()
    if (!error && data) { setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]); setDraft('') }
    setSending(false)
  }

  async function acceptGig() {
    if (!gig || updatingStatus) return
    setUpdatingStatus(true)
    const res = await fetch('/api/influencer/accept-gig', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gig_id: gig.id }),
    })
    if (res.ok) {
      setGig(prev => prev ? { ...prev, status: 'confirmed', brand_revealed: true } : prev)
      setTab('chat')
      const { data: msgs } = await supabase
        .from('gig_messages')
        .select('id, content, sender_type, created_at, read_by_influencer')
        .eq('gig_id', gig.id)
        .eq('channel', 'brand')
        .order('created_at', { ascending: true })
      setMessages(msgs || [])
    }
    setUpdatingStatus(false)
  }

  async function passGig() {
    if (!gig || updatingStatus) return
    setUpdatingStatus(true)
    await supabase.from('gigs').update({ status: 'passed' }).eq('id', gig.id)
    router.push('/dashboard/gigs')
  }

  async function toggleDeliverable(idx: number) {
    if (!gig) return
    const updated = [...(gig.deliverables_checklist || [])]
    updated[idx] = { ...updated[idx], done: !updated[idx].done }
    setGig(prev => prev ? { ...prev, deliverables_checklist: updated } : prev)
    await supabase.from('gigs').update({ deliverables_checklist: updated }).eq('id', gig.id)
  }

  if (!gig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-[3px] border-border border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const st = statusInfo(gig.status)
  const checklist = gig.deliverables_checklist || []
  const doneCount = checklist.filter((d: any) => d.done).length
  const details = gig.brief_details

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  const formatDay = (ts: string) => {
    const d = new Date(ts)
    if (d.toDateString() === new Date().toDateString()) return 'Today'
    return d.toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' })
  }

  return (
    <div className="px-7 pt-6 pb-10 max-w-[700px]">
      {/* Back */}
      <Link href="/dashboard/gigs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground no-underline mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        Back to gigs
      </Link>

      {/* Header card */}
      <div className={cn(
        'bg-card border rounded-xl p-5 mb-4 transition-colors duration-700',
        statusFlash ? 'border-gold bg-gold-bg' : 'border-border',
      )}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <Building2 size={22} className="text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold mb-[3px]">{gig.brand_name || `${gig.brand_category} campaign`}</h2>
            <p className="text-[13px] text-muted-foreground capitalize">{gig.brand_category} · {gig.platform} · {gig.deliverables_summary}</p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-1 rounded-[20px] border flex-shrink-0 transition-transform duration-300',
            st.className, statusFlash && 'scale-110',
          )}>
            <span className="w-[5px] h-[5px] rounded-full bg-current inline-block" />
            {st.label}
          </span>
        </div>

        {/* Match score */}
        {gig.ai_match_score != null && (
          <div className="flex items-center gap-1.5 mb-3.5 text-[12px]">
            <Sparkles size={13} className={scoreColor(gig.ai_match_score)} />
            <span className={cn('font-semibold', scoreColor(gig.ai_match_score))}>{gig.ai_match_score}/100 match</span>
            <span className="text-muted-foreground">for your profile</span>
          </div>
        )}

        {/* Key info */}
        <div className="flex gap-2.5 flex-wrap">
          {gig.budget_eur && (
            <div className="bg-muted border border-border rounded-lg px-3.5 py-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Budget</p>
              <p className="text-[15px] font-semibold text-gold">{formatEur(gig.budget_eur)}</p>
            </div>
          )}
          {gig.respond_by && gig.status === 'offered' && (
            <div className="bg-muted border border-border rounded-lg px-3.5 py-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Respond by</p>
              <p className="text-[13px] font-semibold">{new Date(gig.respond_by).toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' })}</p>
            </div>
          )}
          {gig.content_due_at && (
            <div className="bg-muted border border-border rounded-lg px-3.5 py-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Content due</p>
              <p className="text-[13px] font-semibold">{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
            </div>
          )}
          {gig.go_live_at && (
            <div className="bg-muted border border-border rounded-lg px-3.5 py-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Goes live</p>
              <p className="text-[13px] font-semibold">{new Date(gig.go_live_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
            </div>
          )}
        </div>

        {/* Offer actions */}
        {gig.status === 'offered' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={passGig} disabled={updatingStatus} className="flex-1 bg-red-bg text-red border border-red-border rounded-[9px] py-[11px] text-[13px] font-semibold cursor-pointer font-[inherit] inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]">
              <ThumbsDown size={14} /> Pass
            </button>
            <button onClick={acceptGig} disabled={updatingStatus} className="flex-1 bg-gold text-white border-none rounded-[9px] py-[11px] text-[13px] font-semibold cursor-pointer font-[inherit] inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]">
              <ThumbsUp size={14} /> {updatingStatus ? 'Accepting…' : 'Accept'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-4">
        {['brief','chat'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={cn(
            'px-[18px] py-2 bg-transparent border-none border-b-2 text-[13px] font-semibold cursor-pointer font-[inherit] capitalize transition-colors',
            tab === t ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground',
          )}>
            {t === 'chat' ? `Chat with brand (${messages.length})` : 'Brief'}
          </button>
        ))}
      </div>

      {/* Brief tab */}
      {tab === 'brief' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Why matched */}
          {gig.ai_match_reasoning && (
            <div className="bg-accent border border-gold-border rounded-xl px-[18px] py-4">
              <p className="text-[11px] font-semibold text-gold tracking-[0.08em] uppercase mb-2 flex items-center gap-1.5">
                <Sparkles size={12} /> Why this is a good fit for you
              </p>
              <p className="text-[13px] leading-[1.65] text-foreground/85">{gig.ai_match_reasoning}</p>
            </div>
          )}

          {/* About the campaign */}
          {details?.product_description && (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-2.5 flex items-center gap-1.5">
                <FileText size={12} /> About this campaign
              </p>
              <p className="text-[13px] leading-[1.65] text-muted-foreground">{details.product_description}</p>
            </div>
          )}

          {/* Content requested */}
          {(details?.content_types?.length || details?.platforms?.length) ? (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-2.5">Content requested</p>
              <div className="flex gap-1.5 flex-wrap">
                {(details?.platforms || []).map(p => (
                  <span key={p} className="text-[11px] font-semibold bg-gold-bg text-gold border border-gold-border rounded-full px-2.5 py-1 capitalize">{p}</span>
                ))}
                {(details?.content_types || []).map(c => (
                  <span key={c} className="text-[11px] font-semibold bg-muted text-muted-foreground rounded-full px-2.5 py-1 capitalize">{c}</span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Audience & targeting */}
          {(details?.target_age_range || details?.target_gender || details?.target_countries?.length) ? (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-2.5 flex items-center gap-1.5">
                <Users size={12} /> Target audience
              </p>
              <div className="flex gap-4 flex-wrap text-[13px]">
                {details?.target_age_range && (
                  <span><strong className="text-foreground font-semibold">{details.target_age_range}</strong> <span className="text-muted-foreground">age</span></span>
                )}
                {details?.target_gender && details.target_gender !== 'all' && (
                  <span className="text-muted-foreground capitalize">{details.target_gender}</span>
                )}
                {details?.target_countries?.length ? (
                  <span className="text-muted-foreground">{details.target_countries.join(', ')}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Brand guidelines */}
          {(details?.tone_notes || details?.dos || details?.donts) ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {(details?.tone_notes || details?.dos) && (
                <div className="bg-green-bg border border-green-border rounded-xl px-[18px] py-4">
                  <p className="text-[11px] font-semibold text-green tracking-[0.08em] uppercase mb-2 flex items-center gap-1.5">
                    <ThumbsUp size={12} /> Do
                  </p>
                  <p className="text-[13px] leading-[1.6] text-foreground/85">{details?.dos || details?.tone_notes}</p>
                </div>
              )}
              {details?.donts && (
                <div className="bg-red-bg border border-red-border rounded-xl px-[18px] py-4">
                  <p className="text-[11px] font-semibold text-red tracking-[0.08em] uppercase mb-2 flex items-center gap-1.5">
                    <ThumbsDown size={12} /> Don't
                  </p>
                  <p className="text-[13px] leading-[1.6] text-foreground/85">{details.donts}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Timeline recap */}
          {(gig.content_due_at || gig.go_live_at) && (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-2.5 flex items-center gap-1.5">
                <Calendar size={12} /> Timeline
              </p>
              <div className="flex gap-5 text-[13px] text-muted-foreground">
                {gig.content_due_at && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Content due {new Date(gig.content_due_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</span>}
                {gig.go_live_at && <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> Goes live {new Date(gig.go_live_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</span>}
              </div>
            </div>
          )}

          {/* Deliverables checklist */}
          {checklist.length > 0 && (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">Deliverables</p>
                <span className="text-xs text-muted-foreground">{doneCount}/{checklist.length} done</span>
              </div>
              <div className="h-1 bg-border rounded mb-3.5 overflow-hidden">
                <div className="h-full bg-gold rounded transition-[width] duration-300" style={{ width:`${(doneCount/checklist.length)*100}%` }} />
              </div>
              {checklist.map((item: any, i: number) => (
                <div key={i} onClick={() => toggleDeliverable(i)} className={cn(
                  'flex items-start gap-2.5 py-2.5 cursor-pointer',
                  i < checklist.length - 1 ? 'border-b border-border' : '',
                )}>
                  <div className={cn(
                    'w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 mt-px transition-all',
                    item.done ? 'border-none bg-green' : 'border-[1.5px] border-border bg-transparent',
                  )}>
                    {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-foreground"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <p className={cn('text-[13px] font-medium', item.done ? 'line-through text-muted-foreground' : 'text-foreground')}>{item.label || item.title || item.text || JSON.stringify(item)}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!gig.ai_match_reasoning && !details?.product_description && !details?.content_types?.length && checklist.length === 0 && (
            <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No brief details yet. More info will show up once the brand adds it.</p>
            </div>
          )}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto p-4 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-6">
                  {gig.status === 'confirmed' || gig.status === 'in_progress' || gig.status === 'complete'
                    ? 'No messages yet — say hello to the brand.'
                    : 'Chat opens once you accept this gig.'}
                </p>
              )}
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-[3px] rounded-[20px]">{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn('flex gap-2 items-end', isInfluencer ? 'flex-row-reverse' : 'flex-row')}>
                      {!isInfluencer && (
                        <div className="w-[26px] h-[26px] rounded-full bg-accent border border-gold-border flex items-center justify-center text-[9px] font-semibold text-gold flex-shrink-0">
                          {gig.brand_name?.[0]?.toUpperCase() || 'B'}
                        </div>
                      )}
                      <div className="max-w-[70%]">
                        <div className={cn(
                          'px-[13px] py-[9px] text-[13px] leading-[1.5]',
                          isInfluencer
                            ? 'rounded-[12px_12px_4px_12px] bg-gold text-white border-none'
                            : 'rounded-[12px_12px_12px_4px] bg-muted text-foreground border border-border',
                        )}>{msg.content}</div>
                        <p className={cn('text-[11px] text-muted-foreground mt-0.5', isInfluencer ? 'text-right' : 'text-left')}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Message the brand..."
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted-foreground font-[inherit] outline-none focus:border-gold transition-colors"
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} className={cn(
                'bg-gold border-none rounded-lg w-[38px] h-[38px] flex-shrink-0 flex items-center justify-center transition-all active:scale-90',
                draft.trim() ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40',
              )}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white"><path d="M12 7L2 2l1.5 5L2 12l10-5z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
