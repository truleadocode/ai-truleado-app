'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SESSION_KEY_LS = 'truleado_brief_session_key'

type Phase = 'loading' | 'choose' | 'chat' | 'upload' | 'review' | 'submitting' | 'done'

interface Message { role: 'sarah' | 'user'; text: string }

export default function BriefCreationClient({ advertiser, needsSubscription }: { advertiser: any; needsSubscription: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('choose')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('brand')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isThinking])

  // Paddle subscription gate
  if (needsSubscription) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif', padding:24 }}>
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:20, padding:'40px 36px', maxWidth:480, width:'100%', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔓</div>
          <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px', marginBottom:10 }}>Unlock unlimited briefs</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6, marginBottom:28 }}>You've used your free brief. Subscribe to submit unlimited briefs and keep finding the right creators.</p>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 24px', marginBottom:24 }}>
            <p style={{ fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>$99 <span style={{ fontSize:14, fontWeight:500, color:'var(--text-2)' }}>/month</span></p>
            <p style={{ fontSize:13, color:'var(--text-2)', marginTop:4 }}>Unlimited briefs · Unlimited creator matches</p>
          </div>
          <button
            onClick={() => {
              // Paddle checkout — TODO: replace with real Paddle.js integration
              alert('Paddle checkout coming soon. For now, contact hello@truleado.com to subscribe.')
            }}
            style={{ width:'100%', background:'var(--gold)', color:'#fff', border:'none', borderRadius:12, padding:'14px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:12 }}
          >
            Subscribe — $99/month
          </button>
          <button onClick={() => router.push('/advertiser/dashboard')} style={{ background:'transparent', border:'none', fontSize:13, color:'var(--text-3)', cursor:'pointer', fontFamily:'inherit' }}>Go back to dashboard</button>
        </div>
      </div>
    )
  }

  async function startChat() {
    setPhase('loading')
    const newKey = `trbrf_${crypto.randomUUID()}`
    localStorage.setItem(SESSION_KEY_LS, newKey)
    setSessionKey(newKey)
    await fetch('/api/advertiser/brief-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', session_key: newKey, advertiser_id: advertiser.id }),
    })
    setPhase('chat')
    addSarah(`Let's build your brief! First — what's the brand name and what are you promoting?`)
    setStep('brand')
  }

  async function handleFileUpload(file: File) {
    setUploadedFile(file)
    setUploading(true)
    setPhase('upload')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('advertiser_id', advertiser.id)
    const res = await fetch('/api/advertiser/parse-brief', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)
    if (data.extracted) {
      setReviewData(data.extracted)
      setSessionData(data.extracted)
      setPhase('review')
    } else {
      // Fallback to chat
      setPhase('chat')
      addSarah(`I had trouble reading that brief — let me ask you a few questions instead. What's the brand name and what are you promoting?`)
      setStep('brand')
    }
  }

  async function submitBrief(data: Record<string, any>) {
    setPhase('submitting')
    const res = await fetch('/api/advertiser/submit-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advertiser_id: advertiser.id, ...data }),
    })
    const result = await res.json()
    if (result.brief_id) {
      router.push(`/advertiser/briefs/${result.brief_id}`)
    }
  }

  function addSarah(text: string) { setMessages(prev => [...prev, { role: 'sarah', text }]) }
  function addUser(text: string) { setMessages(prev => [...prev, { role: 'user', text }]) }

  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return
    addUser(text); setInput('')
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/brief-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', session_key: sessionKey, step, user_message: text, data: sessionData, advertiser_id: advertiser.id }),
      })
      const data = await res.json()
      if (data.extracted) setSessionData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply)
      if (data.phase === 'review') { setReviewData(data.session_data); setPhase('review') }
    } catch { addSarah("Sorry, I had a hiccup — can you say that again? 😅") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  if (phase === 'choose') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif', padding:24 }}>
        <div style={{ maxWidth:560, width:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--gold-bg)', border:'2px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 16px' }}>✨</div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>Create a brief</h2>
            <p style={{ fontSize:14, color:'var(--text-2)' }}>How would you like to get started?</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <button onClick={startChat} style={{ background:'var(--white)', border:'2px solid var(--border)', borderRadius:16, padding:'28px 20px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ fontSize:28, marginBottom:12 }}>💬</div>
              <p style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Build with Sarah</p>
              <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.5 }}>Answer a few questions and Sarah will put together your brief.</p>
            </button>
            <button onClick={() => fileRef.current?.click()} style={{ background:'var(--white)', border:'2px solid var(--border)', borderRadius:16, padding:'28px 20px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ fontSize:28, marginBottom:12 }}>📄</div>
              <p style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Upload your brief</p>
              <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.5 }}>Already have a brief? Upload it and Sarah will extract everything.</p>
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
        </div>
      </div>
    )
  }

  if (phase === 'upload') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif' }}>
        <div style={{ textAlign:'center', color:'var(--text-2)' }}>
          <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <p style={{ fontSize:14, fontWeight:500 }}>Reading your brief…</p>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:6 }}>{uploadedFile?.name}</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (phase === 'review' && reviewData) {
    const fields = [
      ['Brand', reviewData.brand_name],
      ['Product', reviewData.product_description],
      ['Platforms', reviewData.platforms?.join(', ')],
      ['Content', reviewData.content_types?.join(', ')],
      ['Creators needed', reviewData.creators_needed],
      ['Budget per creator', reviewData.budget_flexible ? 'Flexible' : reviewData.budget_per_creator_eur ? `€${Math.round(reviewData.budget_per_creator_eur/100)}` : '—'],
      ['Target audience', [reviewData.target_age_range, reviewData.target_gender, reviewData.target_countries?.join(', ')].filter(Boolean).join(' · ')],
      ['Go-live date', reviewData.go_live_date],
      ['Niche', reviewData.niche_fit],
      ['Tone notes', reviewData.tone_notes],
    ]
    return (
      <div style={{ minHeight:'100vh', background:'var(--surface)', fontFamily:'Inter, sans-serif', padding:24 }}>
        <div style={{ maxWidth:600, margin:'0 auto', paddingTop:32 }}>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:6 }}>Does this look right?</h2>
          <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:24 }}>Here's what I extracted from your brief. Review and submit.</p>
          <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:14, padding:'4px 20px', marginBottom:20 }}>
            {fields.filter(([,v]) => v).map(([label, value]) => (
              <div key={String(label)} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-2)', fontWeight:500 }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:500, textAlign:'right', maxWidth:'60%' }}>{String(value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setPhase('chat'); setStep('brand'); addSarah("Let me ask you a few questions to fill in any gaps.") }} style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'var(--text)' }}>
              Edit with Sarah
            </button>
            <button onClick={() => submitBrief(reviewData)} style={{ flex:2, background:'var(--gold)', color:'#fff', border:'none', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Submit brief →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'submitting') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <p style={{ fontSize:14, color:'var(--text-2)', fontWeight:500 }}>Submitting your brief…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Chat phase
  return (
    <div style={{ minHeight:'100vh', background:'var(--surface)', display:'flex', flexDirection:'column', fontFamily:'Inter, sans-serif' }}>
      <div style={{ padding:'14px 20px', background:'var(--white)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--gold-bg)', border:'2px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✨</div>
        <div>
          <div style={{ fontSize:13, fontWeight:600 }}>Sarah Chen</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>Building your brief</div>
        </div>
      </div>
      <div style={{ flex:1, maxWidth:640, width:'100%', margin:'0 auto', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, padding:'24px 16px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'80%', padding:'12px 16px', fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap',
                borderRadius: msg.role === 'sarah' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                background: msg.role === 'sarah' ? 'var(--white)' : 'var(--gold)',
                color: msg.role === 'sarah' ? 'var(--text)' : '#fff',
                border: msg.role === 'sarah' ? '1px solid var(--border)' : 'none',
              }}>{msg.text}</div>
            </div>
          ))}
          {isThinking && (
            <div style={{ display:'flex' }}>
              <div style={{ padding:'12px 16px', borderRadius:'4px 18px 18px 18px', background:'var(--white)', border:'1px solid var(--border)', display:'flex', gap:4, alignItems:'center' }}>
                {[0,1,2].map(i => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-3)', display:'inline-block', animation:`bounce 1.2s ${i*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--white)', display:'flex', gap:8 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Type your answer…" disabled={isThinking} autoFocus
            style={{ flex:1, padding:'10px 14px', borderRadius:24, border:'1px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--text)', outline:'none', fontFamily:'inherit' }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isThinking}
            style={{ width:40, height:40, borderRadius:'50%', background: input.trim() ? 'var(--gold)' : 'var(--border)', border:'none', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() ? '#fff' : 'var(--text-3)'} /></svg>
          </button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
