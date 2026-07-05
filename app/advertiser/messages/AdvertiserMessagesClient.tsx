'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

type Gig = {
  id: string
  brand_category: string
  status: string
  influencer: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

type Message = {
  id: string
  content: string
  sender_type: string
  created_at: string
  read_by_advertiser: boolean
}

function creatorName(gig: Gig) {
  const inf = Array.isArray(gig.influencer) ? gig.influencer[0] : gig.influencer
  return [inf?.first_name, inf?.last_name].filter(Boolean).join(' ') || 'Creator'
}

export default function AdvertiserMessagesClient({ advertiserId }: { advertiserId: string }) {
  const supabase = createClient()
  const [gigs, setGigs] = useState<Gig[]>([])
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: briefIds } = await supabase.from('briefs').select('id').eq('advertiser_id', advertiserId)
      const ids = (briefIds || []).map(b => b.id)
      if (!ids.length) { setLoaded(true); return }

      const { data: gigsData } = await supabase
        .from('gigs')
        .select('id, brand_category, status, influencer:influencer_id(first_name, last_name)')
        .in('brief_id', ids)
        .order('created_at', { ascending: false })

      if (!gigsData) { setLoaded(true); return }

      const enriched = await Promise.all(gigsData.map(async gig => {
        const { data: msgs } = await supabase
          .from('gig_messages')
          .select('content, created_at')
          .eq('gig_id', gig.id)
          .eq('channel', 'brand')
          .order('created_at', { ascending: false })
          .limit(1)

        const { count: unread } = await supabase
          .from('gig_messages')
          .select('id', { count: 'exact', head: true })
          .eq('gig_id', gig.id)
          .eq('channel', 'brand')
          .eq('read_by_advertiser', false)
          .eq('sender_type', 'influencer')

        return { ...gig, last_message: msgs?.[0]?.content, last_message_at: msgs?.[0]?.created_at, unread_count: unread || 0 } as Gig
      }))

      // Only creators who've actually accepted (and so have at least the
      // auto-sent acceptance message) belong in the inbox — otherwise every
      // gig still awaiting a decision would clutter this list too.
      const withMessages = enriched.filter(g => g.last_message)
      setGigs(withMessages)
      if (withMessages.length > 0) selectGig(withMessages[0])
      setLoaded(true)
    }
    load()
  }, [advertiserId])

  async function selectGig(gig: Gig) {
    setSelectedGig(gig)
    const { data: msgs } = await supabase
      .from('gig_messages')
      .select('id, content, sender_type, created_at, read_by_advertiser')
      .eq('gig_id', gig.id)
      .eq('channel', 'brand')
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    await supabase.from('gig_messages')
      .update({ read_by_advertiser: true })
      .eq('gig_id', gig.id)
      .eq('channel', 'brand')
      .eq('sender_type', 'influencer')
      .eq('read_by_advertiser', false)

    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, unread_count: 0 } : g))
  }

  async function sendMessage() {
    if (!draft.trim() || !selectedGig) return
    setSending(true)
    const { data, error } = await supabase.from('gig_messages').insert({
      gig_id: selectedGig.id,
      channel: 'brand',
      sender_type: 'advertiser',
      content: draft.trim(),
      read_by_advertiser: true,
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setDraft('')
      setGigs(prev => prev.map(g => g.id === selectedGig.id ? { ...g, last_message: data.content, last_message_at: data.created_at } : g))
    }
    setSending(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDay = (ts: string) => {
    const d = new Date(ts)
    if (d.toDateString() === new Date().toDateString()) return 'Today'
    return d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loaded && gigs.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-5">
            <MessageSquare size={20} className="text-gold" />
          </div>
          <h3 className="font-semibold mb-1.5">No conversations yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Once you confirm a creator from a shortlist, a chat opens here automatically.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] border border-border rounded-xl overflow-hidden bg-card h-[calc(100vh-220px)] min-h-[420px]">

      {/* Conversation list */}
      <div className="border-r border-border overflow-y-auto hidden md:flex flex-col">
        {gigs.map(gig => (
          <div
            key={gig.id}
            onClick={() => selectGig(gig)}
            className={cn(
              'flex gap-2.5 px-4 py-3 cursor-pointer border-b border-border transition-colors duration-100',
              selectedGig?.id === gig.id ? 'bg-gold-bg' : 'bg-transparent'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[11px] font-semibold text-gold shrink-0">
              {creatorName(gig)[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-0.5">
                <p className="text-[13px] font-semibold text-foreground truncate">{creatorName(gig)}</p>
                <span className="text-[11px] text-muted-foreground/60 shrink-0">{gig.last_message_at ? formatDay(gig.last_message_at) : ''}</span>
              </div>
              {gig.last_message && (
                <p className={cn(
                  'text-[12px] whitespace-nowrap overflow-hidden text-ellipsis',
                  (gig.unread_count || 0) > 0 ? 'text-foreground font-medium' : 'text-muted-foreground font-normal'
                )}>{gig.last_message}</p>
              )}
            </div>
            {(gig.unread_count || 0) > 0 && (
              <div className="w-[18px] h-[18px] rounded-full bg-red flex items-center justify-center text-[10px] font-semibold text-white shrink-0 mt-0.5">{gig.unread_count}</div>
            )}
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex flex-col h-[420px] md:h-auto">
        {!selectedGig ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-muted-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[11px] font-semibold text-gold">
                {creatorName(selectedGig)[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-foreground leading-[1.2]">{creatorName(selectedGig)}</h4>
                <p className="text-[12px] text-muted-foreground">{selectedGig.brand_category} creator</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-6">No messages yet — say hello.</p>
              )}
              {messages.map((msg, i) => {
                const isAdvertiser = msg.sender_type === 'advertiser'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-[11px] text-muted-foreground/60 bg-muted px-2.5 py-[3px] rounded-[20px] border border-border">{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn(
                      'flex gap-2 items-end max-w-full',
                      isAdvertiser ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      {!isAdvertiser && (
                        <div className="w-7 h-7 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[10px] font-semibold text-gold shrink-0">
                          {creatorName(selectedGig)[0]?.toUpperCase() || 'C'}
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div className={cn(
                          'px-3.5 py-2.5 text-[13px] leading-[1.55]',
                          isAdvertiser
                            ? 'rounded-[14px_14px_3px_14px] bg-gold text-white'
                            : 'rounded-[14px_14px_14px_3px] bg-muted text-foreground border border-border'
                        )}>{msg.content}</div>
                        <p className={cn(
                          'text-[10px] mt-[3px] text-muted-foreground/60 opacity-70',
                          isAdvertiser ? 'text-right' : 'text-left'
                        )}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-3.5 border-t border-border flex gap-2.5 items-center shrink-0">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message ${creatorName(selectedGig)}…`}
                className="flex-1 bg-muted border border-border rounded-[20px] px-4 py-[9px] font-sans text-[13px] text-foreground outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
                className={cn(
                  'w-9 h-9 rounded-full bg-gold border-none flex items-center justify-center transition-opacity duration-150 shrink-0',
                  draft.trim() ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40'
                )}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M13 2L6.5 8.5M13 2L9 13l-2.5-4.5L2 6l11-4z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
