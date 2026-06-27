'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) { router.push('/'); return }
      setInfluencerId(inf.id)

      // Load gigs with last message
      const { data: gigsData } = await supabase
        .from('gigs')
        .select('id, brand_category, brand_name, brand_revealed, status')
        .eq('influencer_id', inf.id)
        .order('created_at', { ascending: false })

      if (!gigsData) return

      // For each gig, get last message + unread count
      const enriched = await Promise.all(gigsData.map(async gig => {
        const { data: msgs } = await supabase
          .from('gig_messages')
          .select('content, created_at, read_by_influencer')
          .eq('gig_id', gig.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { count: unread } = await supabase
          .from('gig_messages')
          .select('id', { count: 'exact', head: true })
          .eq('gig_id', gig.id)
          .eq('read_by_influencer', false)
          .eq('sender_type', 'sarah')

        return {
          ...gig,
          last_message: msgs?.[0]?.content,
          last_message_at: msgs?.[0]?.created_at,
          unread_count: unread || 0,
        }
      }))

      const withMessages = enriched.filter(g => g.last_message)
      setGigs(withMessages)
      if (withMessages.length > 0) selectGig(withMessages[0], inf.id)
    }
    load()
  }, [])

  async function selectGig(gig: Gig, infId?: string) {
    setSelectedGig(gig)
    const id = infId || influencerId
    const { data: msgs } = await supabase
      .from('gig_messages')
      .select('id, content, sender_type, created_at, read_by_influencer')
      .eq('gig_id', gig.id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    // Mark sarah's messages as read
    await supabase.from('gig_messages')
      .update({ read_by_influencer: true })
      .eq('gig_id', gig.id)
      .eq('sender_type', 'sarah')
      .eq('read_by_influencer', false)

    // Update gig list unread counts
    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, unread_count: 0 } : g))
  }

  async function sendMessage() {
    if (!draft.trim() || !selectedGig || !influencerId) return
    setSending(true)
    const { data, error } = await supabase.from('gig_messages').insert({
      gig_id: selectedGig.id,
      influencer_id: influencerId,
      sender_type: 'influencer',
      content: draft.trim(),
      read_by_influencer: true,
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setDraft('')
    }
    setSending(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  const formatDay = (ts: string) => {
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    return d.toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' })
  }

  return (
    <div style={{ display:'flex', height:'calc(100vh - 56px)' }}>
      {/* Conversation list */}
      <div style={{ width:280, flexShrink:0, borderRight:'1px solid var(--line)', overflowY:'auto', background:'var(--bg)' }}>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--line)' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--muted)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Conversations</p>
        </div>
        {gigs.length === 0 && (
          <p style={{ padding:'24px 16px', fontSize:13, color:'var(--muted)', textAlign:'center' }}>No messages yet</p>
        )}
        {gigs.map(gig => (
          <div key={gig.id} onClick={() => selectGig(gig)} style={{
            display:'flex', gap:10, padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--line)',
            background: selectedGig?.id === gig.id ? 'var(--acc2)' : 'transparent',
            transition:'background 0.15s',
          }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#090E1A', flexShrink:0 }}>SC</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <p style={{ fontSize:13, fontWeight:700, color:selectedGig?.id === gig.id ? 'var(--acc)' : 'var(--fg)' }}>Sarah Chen</p>
                <p style={{ fontSize:11, color:'var(--muted)' }}>{gig.last_message_at ? formatDay(gig.last_message_at) : ''}</p>
              </div>
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
              {gig.last_message && (
                <p style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight: (gig.unread_count || 0) > 0 ? 600 : 400 }}>{gig.last_message}</p>
              )}
            </div>
            {(gig.unread_count || 0) > 0 && (
              <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0, marginTop:2 }}>{gig.unread_count}</div>
            )}
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg)' }}>
        {!selectedGig ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <p style={{ fontSize:14, color:'var(--muted)' }}>Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ height:56, borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#090E1A' }}>SC</div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, lineHeight:1.2 }}>Sarah Chen</p>
                <p style={{ fontSize:12, color:'var(--muted)' }}>{selectedGig.brand_revealed ? selectedGig.brand_name : selectedGig.brand_category}</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:8 }}>
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign:'center', margin:'8px 0' }}>
                        <span style={{ fontSize:11, color:'var(--muted)', background:'var(--bg2)', padding:'3px 10px', borderRadius:20 }}>{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', flexDirection: isInfluencer ? 'row-reverse' : 'row', gap:8, alignItems:'flex-end' }}>
                      {!isInfluencer && (
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#090E1A', flexShrink:0 }}>SC</div>
                      )}
                      <div style={{ maxWidth:'68%' }}>
                        <div style={{
                          padding:'10px 14px', borderRadius: isInfluencer ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isInfluencer ? 'var(--acc)' : 'var(--bg2)',
                          color: isInfluencer ? '#090E1A' : 'var(--fg)',
                          fontSize:13, lineHeight:1.5,
                          border: isInfluencer ? 'none' : '1px solid var(--line)',
                        }}>{msg.content}</div>
                        <p style={{ fontSize:11, color:'var(--muted)', marginTop:3, textAlign: isInfluencer ? 'right' : 'left' }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--line)', display:'flex', gap:8, flexShrink:0 }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Type a message..."
                style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--fg)', fontFamily:'inherit', outline:'none', resize:'none' }}
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} style={{
                background:'var(--acc)', border:'none', borderRadius:10, width:40, height:40, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                opacity: draft.trim() ? 1 : 0.4, transition:'opacity 0.2s',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l2 6-2 6 12-6z" fill="#090E1A"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
