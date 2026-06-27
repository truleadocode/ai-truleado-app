'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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
    case 'offered':     return { label: 'Offer received',   color:'var(--gold)',   bg:'var(--gold-bg)',          border:'var(--gold-border)' }
    case 'interested':  return { label: 'Interest sent',    color:'var(--blue)',  bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.25)' }
    case 'confirmed':   return { label: 'Confirmed',        color:'var(--green)', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)' }
    case 'in_progress': return { label: 'In progress',      color:'var(--green)', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)' }
    case 'complete':    return { label: 'Completed',        color:'var(--green)', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)' }
    default:            return { label: status, color:'var(--text-2)', bg:'var(--surface)', border:'var(--border)' }
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

      const { data: gigData } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', gigId)
        .eq('influencer_id', inf.id)
        .single()

      if (!gigData) { router.push('/dashboard'); return }
      setGig(gigData)

      const { data: msgs } = await supabase
        .from('gig_messages')
        .select('id, content, sender_type, created_at, read_by_influencer')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      // Mark sarah's messages read
      await supabase.from('gig_messages')
        .update({ read_by_influencer: true })
        .eq('gig_id', gigId)
        .eq('sender_type', 'sarah')
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
      gig_id: gigId, influencer_id: influencerId,
      sender_type: 'influencer', content: draft.trim(), read_by_influencer: true,
    }).select().single()
    if (!error && data) { setMessages(prev => [...prev, data]); setDraft('') }
    setSending(false)
  }

  async function expressInterest() {
    if (!gig || updatingStatus) return
    setUpdatingStatus(true)
    await supabase.from('gigs').update({ status: 'interested' }).eq('id', gig.id)
    setGig(prev => prev ? { ...prev, status: 'interested' } : prev)
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
    <div style={{ padding:'24px 28px 40px', maxWidth:700 }}>
      {/* Back */}
      <Link href="/dashboard/gigs" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--text-2)', textDecoration:'none', marginBottom:20 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        Back to gigs
      </Link>

      {/* Header card */}
      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'20px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
            {gig.brand_revealed ? '🌿' : '🔒'}
          </div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:17, fontWeight:800, marginBottom:3 }}>
              {gig.brand_revealed ? gig.brand_name : `${gig.brand_category} campaign`}
            </h2>
            <p style={{ fontSize:13, color:'var(--text-2)' }}>{gig.platform} · {gig.deliverables_summary}</p>
            {!gig.brand_revealed && <p style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>Brand name revealed once you confirm the deal.</p>}
          </div>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, flexShrink:0 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />
            {st.label}
          </span>
        </div>

        {/* Key info */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {gig.budget_eur && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
              <p style={{ fontSize:10, color:'var(--text-2)', marginBottom:2 }}>Budget</p>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--gold)' }}>{formatEur(gig.budget_eur)}</p>
            </div>
          )}
          {gig.respond_by && gig.status === 'offered' && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
              <p style={{ fontSize:10, color:'var(--text-2)', marginBottom:2 }}>Respond by</p>
              <p style={{ fontSize:13, fontWeight:700 }}>{new Date(gig.respond_by).toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' })}</p>
            </div>
          )}
          {gig.content_due_at && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
              <p style={{ fontSize:10, color:'var(--text-2)', marginBottom:2 }}>Content due</p>
              <p style={{ fontSize:13, fontWeight:700 }}>{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
            </div>
          )}
          {gig.go_live_at && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
              <p style={{ fontSize:10, color:'var(--text-2)', marginBottom:2 }}>Goes live</p>
              <p style={{ fontSize:13, fontWeight:700 }}>{new Date(gig.go_live_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
            </div>
          )}
        </div>

        {/* Offer actions */}
        {gig.status === 'offered' && (
          <div style={{ display:'flex', gap:8, marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
            <button onClick={expressInterest} disabled={updatingStatus} style={{ flex:1, background:'var(--gold)', color:'#fff', border:'none', borderRadius:9, padding:'11px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              I&apos;m interested
            </button>
            <button onClick={passGig} disabled={updatingStatus} style={{ flex:1, background:'var(--red2,rgba(248,113,113,0.1))', color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:9, padding:'11px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Not interested
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:1, borderBottom:'1px solid var(--border)', marginBottom:16 }}>
        {['brief','chat'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} style={{
            padding:'8px 18px', background:'transparent', border:'none', borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--text)' : 'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            textTransform:'capitalize', transition:'color 0.15s',
          }}>
            {t === 'chat' ? `Chat (${messages.length})` : 'Brief'}
          </button>
        ))}
      </div>

      {/* Brief tab */}
      {tab === 'brief' && (
        <div>
          {gig.offer_notes && (
            <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Brief from Sarah</p>
              <p style={{ fontSize:13, lineHeight:1.65, color:'var(--text-2)' }}>{gig.offer_notes}</p>
            </div>
          )}

          {/* Deliverables checklist */}
          {checklist.length > 0 && (
            <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Deliverables</p>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>{doneCount}/{checklist.length} done</span>
              </div>
              <div style={{ height:4, background:'var(--border)', borderRadius:4, marginBottom:14, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'var(--gold)', borderRadius:4, width:`${(doneCount/checklist.length)*100}%`, transition:'width 0.3s' }} />
              </div>
              {checklist.map((item: any, i: number) => (
                <div key={i} onClick={() => toggleDeliverable(i)} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom: i < checklist.length - 1 ? '1px solid var(--border)' : 'none', cursor:'pointer' }}>
                  <div style={{
                    width:18, height:18, borderRadius:5, border: item.done ? 'none' : '1.5px solid var(--border)',
                    background: item.done ? 'var(--green)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1,
                    transition:'all 0.2s',
                  }}>
                    {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-2)' : 'var(--text)' }}>{item.label || item.title || item.text || JSON.stringify(item)}</p>
                    {item.description && <p style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!gig.offer_notes && checklist.length === 0 && (
            <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'32px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, color:'var(--text-2)' }}>No brief details yet. Sarah will add more info once confirmed.</p>
            </div>
          )}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <div>
          <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ maxHeight:420, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
              {messages.length === 0 && (
                <p style={{ textAlign:'center', fontSize:13, color:'var(--text-2)', padding:'24px 0' }}>No messages yet</p>
              )}
              {messages.map((msg, i) => {
                const isInfluencer = msg.sender_type === 'influencer'
                const showDate = i === 0 || formatDay(messages[i-1].created_at) !== formatDay(msg.created_at)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign:'center', margin:'8px 0' }}>
                        <span style={{ fontSize:11, color:'var(--text-2)', background:'var(--surface)', padding:'3px 10px', borderRadius:20 }}>{formatDay(msg.created_at)}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', flexDirection: isInfluencer ? 'row-reverse' : 'row', gap:8, alignItems:'flex-end' }}>
                      {!isInfluencer && (
                        <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>SC</div>
                      )}
                      <div style={{ maxWidth:'70%' }}>
                        <div style={{
                          padding:'9px 13px', borderRadius: isInfluencer ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: isInfluencer ? 'var(--gold)' : 'var(--surface)',
                          color: isInfluencer ? '#090E1A' : 'var(--text)',
                          fontSize:13, lineHeight:1.5,
                          border: isInfluencer ? 'none' : '1px solid var(--border)',
                        }}>{msg.content}</div>
                        <p style={{ fontSize:11, color:'var(--text-2)', marginTop:2, textAlign: isInfluencer ? 'right' : 'left' }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'12px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Message Sarah..."
                style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none' }}
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} style={{
                background:'var(--gold)', border:'none', borderRadius:8, width:38, height:38, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                opacity: draft.trim() ? 1 : 0.4, transition:'opacity 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7L2 2l1.5 5L2 12l10-5z" fill="#090E1A"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
