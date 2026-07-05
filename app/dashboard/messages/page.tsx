'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Gig = {
  id: string
  brand_category: string
  brand_name: string | null
  brand_revealed: boolean
  status: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

type Message = {
  id: string
  content: string
  sender_type: string
  created_at: string
  read_by_influencer: boolean
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [influencerId, setInfluencerId] = useState<string | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedGigRef = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) { router.push('/'); return }
      setInfluencerId(inf.id)

      const { data: gigsData } = await supabase
        .from('gigs')
        .select('id, brand_category, brand_name:brand_name_visible, brand_revealed, status')
        .eq('influencer_id', inf.id)
        .order('created_at', { ascending: false })

      if (!gigsData) return

      const enriched = await Promise.all(gigsData.map(async gig => {
        const { data: msgs } = await supabase
          .from('gig_messages')
          .select('content, created_at, read_by_influencer')
          .eq('gig_id', gig.id)
          .eq('channel', 'brand')
          .order('created_at', { ascending: false })
          .limit(1)

        const { count: unread } = await supabase
          .from('gig_messages')
          .select('id', { count: 'exact', head: true })
          .eq('gig_id', gig.id)
          .eq('channel', 'brand')
          .eq('read_by_influencer', false)
          .eq('sender_type', 'advertiser')

        return { ...gig, last_message: msgs?.[0]?.content, last_message_at: msgs?.[0]?.created_at, unread_count: unread || 0 }
      }))

      const withMessages = enriched.filter(g => g.last_message)
      setGigs(withMessages)
      if (withMessages.length > 0) selectGig(withMessages[0], inf.id)
    }
    load()
  }, [])

  // Realtime — new messages land live across every conversation: the open
  // thread appends immediately, others just bump their preview/unread badge.
  useEffect(() => {
    if (!influencerId) return
    const channel = supabase.channel(`influencer-messages-${influencerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gig_messages' },
        (payload: any) => {
          const msg = payload.new
          if (msg.channel !== 'brand') return
          setGigs(prev => {
            if (!prev.some(g => g.id === msg.gig_id)) return prev
            return prev.map(g => g.id === msg.gig_id
              ? { ...g, last_message: msg.content, last_message_at: msg.created_at, unread_count: msg.sender_type === 'advertiser' && selectedGigRef.current !== msg.gig_id ? (g.unread_count || 0) + 1 : g.unread_count }
              : g)
          })
          if (selectedGigRef.current === msg.gig_id) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
            if (msg.sender_type === 'advertiser') {
              supabase.from('gig_messages').update({ read_by_influencer: true }).eq('id', msg.id)
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [influencerId])

  async function selectGig(gig: Gig, infId?: string) {
    setSelectedGig(gig)
    selectedGigRef.current = gig.id
    const { data: msgs } = await supabase
      .from('gig_messages')
      .select('id, content, sender_type, created_at, read_by_influencer')
      .eq('gig_id', gig.id)
      .eq('channel', 'brand')
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    await supabase.from('gig_messages')
      .update({ read_by_influencer: true })
      .eq('gig_id', gig.id)
      .eq('channel', 'brand')
      .eq('sender_type', 'advertiser')
      .eq('read_by_influencer', false)

    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, unread_count: 0 } : g))
  }

  async function sendMessage() {
    if (!draft.trim() || !selectedGig || !influencerId) return
    setSending(true)
    const { data, error } = await supabase.from('gig_messages').insert({
      gig_id: selectedGig.id,
      channel: 'brand',
      sender_type: 'influencer',
      content: draft.trim(),
      read_by_influencer: true,
    }).select().single()

    if (!error && data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
      setGigs(prev => prev.map(g => g.id === selectedGig.id ? { ...g, last_message: data.content, last_message_at: data.created_at } : g))
      setDraft('')
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

  const brandLabel = (gig: Gig) => gig.brand_name || `${gig.brand_category} brand`
  const brandInitial = (gig: Gig) => brandLabel(gig)[0]?.toUpperCase() || 'B'

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] m-0 h-auto md:h-[calc(100vh-54px)]">

      {/* Conversation list */}
      <div className="border-r border-border bg-card overflow-y-auto hidden md:flex flex-col">
        <div className="px-[18px] pt-4 pb-3 border-b border-border text-[14px] font-semibold text-foreground shrink-0">Messages</div>
        {gigs.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-muted-foreground text-center">No messages yet. Chat opens once a brand confirms a gig with you.</p>
        )}
        {gigs.map(gig => (
          <div
            key={gig.id}
            onClick={() => selectGig(gig)}
            className={cn(
              'flex gap-2.5 px-4 py-3 cursor-pointer border-b border-border transition-colors duration-100',
              selectedGig?.id === gig.id ? 'bg-gold-bg' : 'bg-transparent'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[11px] font-semibold text-gold shrink-0">{brandInitial(gig)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-0.5">
                <p className="text-[13px] font-semibold text-foreground truncate">{brandLabel(gig)}</p>
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
      <div className="flex flex-col bg-card h-[calc(100vh-52px-56px)] md:h-auto">
        {!selectedGig ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-muted-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[11px] font-semibold text-gold">{brandInitial(selectedGig)}</div>
              <div>
                <h4 className="text-[14px] font-semibold text-foreground leading-[1.2]">{brandLabel(selectedGig)}</h4>
                <p className="text-[12px] text-muted-foreground">Direct chat about this gig</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-6">No messages yet — say hello.</p>
              )}
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-[11px] text-muted-foreground/60 bg-muted px-2.5 py-[3px] rounded-[20px] border border-border">{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn(
                      'flex gap-2 items-end max-w-full',
                      isInfluencer ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      {!isInfluencer && (
                        <div className="w-7 h-7 rounded-full bg-accent border-[1.5px] border-gold-border flex items-center justify-center text-[10px] font-semibold text-gold shrink-0">{brandInitial(selectedGig)}</div>
                      )}
                      <div className="max-w-[75%]">
                        <div className={cn(
                          'px-3.5 py-2.5 text-[13px] leading-[1.55]',
                          isInfluencer
                            ? 'rounded-[14px_14px_3px_14px] bg-gold text-white'
                            : 'rounded-[14px_14px_14px_3px] bg-muted text-foreground border border-border'
                        )}>{msg.content}</div>
                        <p className={cn(
                          'text-[10px] mt-[3px] text-muted-foreground/60 opacity-70',
                          isInfluencer ? 'text-right' : 'text-left'
                        )}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-3.5 border-t border-border flex gap-2.5 items-center bg-card shrink-0">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message ${brandLabel(selectedGig)}…`}
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
