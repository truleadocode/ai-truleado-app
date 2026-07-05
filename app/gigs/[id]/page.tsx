'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Building2, Lock } from 'lucide-react'

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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) { router.push('/'); return }
      setInfluencerId(inf.id)

      // Explicit column list: direct select of brand_name is revoked for
      // client roles — brand_name_visible is null until brand_revealed.
      const { data: gigData } = await supabase
        .from('gigs')
        .select('id, brand_category, brand_name:brand_name_visible, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, goes_live_at, status, ai_outreach_draft')
        .eq('id', gigId)
        .eq('influencer_id', inf.id)
        .single()

      if (!gigData) { router.push('/dashboard'); return }
      // offer_notes / deliverables_checklist / go_live_at aren't columns on
      // gigs (never returned, even by the old select('*')) — the UI already
      // null-guards them, so the cast preserves prior behavior.
      setGig(gigData as unknown as Gig)

      const { data: msgs } = await supabase
        .from('gig_messages')
        .select('id, content, sender_type, created_at, read_by_influencer')
        .eq('gig_id', gigId)
        .eq('channel', 'brand')
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      // Mark the brand's messages read
      await supabase.from('gig_messages')
        .update({ read_by_influencer: true })
        .eq('gig_id', gigId)
        .eq('channel', 'brand')
        .eq('sender_type', 'advertiser')
        .eq('read_by_influencer', false)
    }
    load()
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
    if (!error && data) { setMessages(prev => [...prev, data]); setDraft('') }
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
      // Reload the chat so the auto-sent acceptance message shows up.
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
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
            {gig.brand_revealed ? <Building2 size={22} className="text-muted-foreground" /> : <Lock size={22} className="text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold mb-[3px]">
              {gig.brand_revealed ? gig.brand_name : `${gig.brand_category} campaign`}
            </h2>
            <p className="text-[13px] text-muted-foreground">{gig.platform} · {gig.deliverables_summary}</p>
            {!gig.brand_revealed && <p className="text-[11px] text-muted-foreground mt-1">Brand name revealed once you confirm the deal.</p>}
          </div>
          <span className={cn('inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-1 rounded-[20px] border flex-shrink-0', st.className)}>
            <span className="w-[5px] h-[5px] rounded-full bg-current inline-block" />
            {st.label}
          </span>
        </div>

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
            <button onClick={passGig} disabled={updatingStatus} className="flex-1 bg-red-bg text-red border border-red-border rounded-[9px] py-[11px] text-[13px] font-semibold cursor-pointer font-[inherit]">
              Pass
            </button>
            <button onClick={acceptGig} disabled={updatingStatus} className="flex-1 bg-gold text-white border-none rounded-[9px] py-[11px] text-[13px] font-semibold cursor-pointer font-[inherit]">
              Accept
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
        <div>
          {gig.offer_notes && (
            <div className="bg-card border border-border rounded-xl px-[18px] py-4 mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-2.5">Brief summary</p>
              <p className="text-[13px] leading-[1.65] text-muted-foreground">{gig.offer_notes}</p>
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

          {!gig.offer_notes && checklist.length === 0 && (
            <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No brief details yet. More info will show up once the brand adds it.</p>
            </div>
          )}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto p-4 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-6">
                  {gig.status === 'confirmed' || gig.status === 'in_progress' || gig.status === 'complete'
                    ? 'No messages yet — say hello to the brand.'
                    : 'Chat opens once the brand confirms this gig.'}
                </p>
              )}
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-[3px] rounded-[20px]">{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn('flex gap-2 items-end', isInfluencer ? 'flex-row-reverse' : 'flex-row')}>
                      {!isInfluencer && (
                        <div className="w-[26px] h-[26px] rounded-full bg-accent border border-gold-border flex items-center justify-center text-[9px] font-semibold text-gold flex-shrink-0">
                          {(gig.brand_revealed ? gig.brand_name : gig.brand_category)?.[0]?.toUpperCase() || 'B'}
                        </div>
                      )}
                      <div className="max-w-[70%]">
                        <div className={cn(
                          'px-[13px] py-[9px] text-[13px] leading-[1.5]',
                          isInfluencer
                            ? 'rounded-[12px_12px_4px_12px] bg-gold text-foreground border-none'
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
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-[9px] text-[13px] text-foreground font-[inherit] outline-none"
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} className={cn(
                'bg-gold border-none rounded-lg w-[38px] h-[38px] flex-shrink-0 flex items-center justify-center transition-opacity',
                draft.trim() ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40',
              )}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-foreground"><path d="M12 7L2 2l1.5 5L2 12l10-5z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
