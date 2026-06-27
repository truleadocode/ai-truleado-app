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

      const { data: gigsData } = await supabase
        .from('gigs')
        .select('id, brand_category, brand_name, brand_revealed, status')
        .eq('influencer_id', inf.id)
        .order('created_at', { ascending: false })

      if (!gigsData) return

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

        return { ...gig, last_message: msgs?.[0]?.content, last_message_at: msgs?.[0]?.created_at, unread_count: unread || 0 }
      }))

      const withMessages = enriched.filter(g => g.last_message)
      setGigs(withMessages)
      if (withMessages.length > 0) selectGig(withMessages[0], inf.id)
    }
    load()
  }, [])

  async function selectGig(gig: Gig, infId?: string) {
    setSelectedGig(gig)
    const { data: msgs } = await supabase
      .from('gig_messages')
      .select('id, content, sender_type, created_at, read_by_influencer')
      .eq('gig_id', gig.id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    await supabase.from('gig_messages')
      .update({ read_by_influencer: true })
      .eq('gig_id', gig.id)
      .eq('sender_type', 'sarah')
      .eq('read_by_influencer', false)

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

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDay = (ts: string) => {
    const d = new Date(ts)
    if (d.toDateString() === new Date().toDateString()) return 'Today'
    return d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 54px)', margin: 0 }} className="messages-layout">

      {/* Conversation list */}
      <div style={{ borderRight: '1px solid var(--border)', background: 'var(--white)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="msg-list">
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>Messages</div>
        {gigs.length === 0 && (
          <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>No messages yet</p>
        )}
        {gigs.map(gig => (
          <div key={gig.id} onClick={() => selectGig(gig)} style={{
            display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer',
            borderBottom: '1px solid var(--border)',
            background: selectedGig?.id === gig.id ? 'var(--gold-bg)' : 'transparent',
            transition: 'background 0.1s',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-bg)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>SC</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sarah Chen</p>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{gig.last_message_at ? formatDay(gig.last_message_at) : ''}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
              {gig.last_message && (
                <p style={{ fontSize: 12, color: (gig.unread_count || 0) > 0 ? 'var(--text)' : 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: (gig.unread_count || 0) > 0 ? 500 : 400 }}>{gig.last_message}</p>
              )}
            </div>
            {(gig.unread_count || 0) > 0 && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>{gig.unread_count}</div>
            )}
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--white' }} className="chat-panel">
        {!selectedGig ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Select a conversation</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-bg)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>SC</div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>Sarah Chen</h4>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Creator Partnerships · Truleado</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                Online
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '8px 0' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: isInfluencer ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', maxWidth: '100%' }}>
                      {!isInfluencer && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-bg)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>SC</div>
                      )}
                      <div style={{ maxWidth: '75%' }}>
                        <div style={{
                          padding: '10px 14px', fontSize: 13, lineHeight: 1.55,
                          borderRadius: isInfluencer ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                          background: isInfluencer ? 'var(--gold)' : 'var(--surface)',
                          color: isInfluencer ? '#fff' : 'var(--text)',
                          border: isInfluencer ? 'none' : '1px solid var(--border)',
                        }}>{msg.content}</div>
                        <p style={{ fontSize: 10, marginTop: 3, textAlign: isInfluencer ? 'right' : 'left', color: 'var(--text-3)', opacity: 0.7 }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--white)', flexShrink: 0 }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Reply to Sarah…"
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '9px 16px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text)', outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: draft.trim() ? 'pointer' : 'not-allowed', opacity: draft.trim() ? 1 : 0.4,
                transition: 'opacity 0.15s', flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M13 2L6.5 8.5M13 2L9 13l-2.5-4.5L2 6l11-4z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .messages-layout { grid-template-columns: 1fr !important; height: auto !important; }
          .msg-list { display: none !important; }
          .chat-panel { height: calc(100vh - 52px - 56px) !important; }
        }
      `}</style>
    </div>
  )
}
