'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SESSION_KEY_LS = 'truleado_adv_session_key'

type Phase = 'loading' | 'chat' | 'brief_choice' | 'brief_chat' | 'auth' | 'done'

interface Message {
  role: 'sarah' | 'user'
  text: string
}

interface Props {
  user: { id: string; email?: string } | null
  advertiser: { id: string; onboarding_complete?: boolean } | null
  embedded?: boolean
}

export default function AdvertiserOnboardingClient({ user, advertiser, embedded = false }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('greeting')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [briefData, setBriefData] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [isResumePrompt, setIsResumePrompt] = useState(false)
  const [resumeStep, setResumeStep] = useState('greeting')

  // Email/password auth state
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initCalledRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, phase])

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    initSession()
  }, [])

  async function initSession(forceNew = false) {
    const storedKey = (!forceNew && typeof window !== 'undefined')
      ? localStorage.getItem(SESSION_KEY_LS) : null

    const res = await fetch('/api/advertiser/sarah-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init',
        session_key: storedKey,
        user_id: user?.id || null,
        advertiser_id: advertiser?.id || null,
      }),
    })

    if (!res.ok) {
      setPhase('chat')
      addSarah(`Hey! I'm Sarah from Truleado. What's your name?`)
      return
    }

    const data = await res.json()
    if (data.session_key) {
      localStorage.setItem(SESSION_KEY_LS, data.session_key)
      setSessionKey(data.session_key)
    }

    if (data.phase === 'done') {
      router.push('/advertiser/dashboard')
    } else if (data.phase === 'brief_choice') {
      setPhase('brief_choice')
      addSarah(data.sarah_reply)
    } else if (data.phase === 'resume') {
      setResumeStep(data.step)
      setStep(data.step)
      setSessionData(data.data || {})
      setIsResumePrompt(true)
      setPhase('chat')
      addSarah(data.sarah_reply)
    } else {
      setStep(data.step || 'greeting')
      setPhase('chat')
      addSarah(data.sarah_reply)
    }
  }

  function addSarah(text: string) {
    setMessages(prev => [...prev, { role: 'sarah', text }])
  }
  function addUser(text: string) {
    setMessages(prev => [...prev, { role: 'user', text }])
  }

  async function continueFromStep(s: string) {
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/sarah-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_continue', session_key: sessionKey, step: s }),
      })
      const data = await res.json()
      if (data.step) setStep(data.step)
      setIsResumePrompt(false)
      addSarah(data.sarah_reply)
      setPhase(data.phase || 'chat')
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function startFresh() {
    localStorage.removeItem(SESSION_KEY_LS)
    setMessages([]); setSessionKey(null); setSessionData({}); setBriefData({})
    setStep('greeting'); setResumeStep('greeting')
    setIsResumePrompt(false); setPhase('loading')
    await new Promise(r => setTimeout(r, 50))
    initCalledRef.current = false
    initCalledRef.current = true
    await initSession(true)
  }

  // ── ONBOARDING CHAT ─────────────────────────────────────────────
  async function sendOnboardingMessage(text: string) {
    addUser(text); setInput('')
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/sarah-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          session_key: sessionKey,
          step,
          user_message: text,
          data: sessionData,
        }),
      })
      const data = await res.json()
      if (data.extracted) setSessionData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply || "Got it!")
      if (data.phase === 'brief_choice') setPhase('brief_choice')
      else if (data.phase === 'auth') setPhase('auth')
    } catch {
      addSarah("Sorry, I had a hiccup — can you say that again? 😅")
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── START BRIEF CHAT INLINE ──────────────────────────────────────
  function startBriefChat() {
    setPhase('brief_chat')
    setStep('brand')
    addSarah(`Let's build your brief! I'll ask you a few quick questions.\n\nFirst — what's the brand name and what are you promoting?`)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── BRIEF CHAT ───────────────────────────────────────────────────
  async function sendBriefMessage(text: string) {
    addUser(text); setInput('')
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/brief-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          session_key: sessionKey,
          step,
          user_message: text,
          data: briefData,
          advertiser_id: advertiser?.id || null,
        }),
      })
      const data = await res.json()

      if (data.error) {
        addSarah(`Something went wrong — let me try again. ${data.error}`)
        return
      }

      if (data.extracted) setBriefData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply || "Got it!")

      if (data.phase === 'review') {
        setBriefData(data.session_data || briefData)
        addSarah(`That's everything I need! Here's a quick summary:\n\n${buildBriefSummary(data.session_data || briefData)}\n\nType "yes" to submit, or tell me what to change.`)
        setStep('brief_confirm')
      }
    } catch (e) {
      addSarah("Sorry, I had a hiccup — can you say that again? 😅")
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── UPLOAD BRIEF ─────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    setPhase('brief_chat')
    addSarah(`Got it — reading your brief now...`)
    setIsThinking(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('advertiser_id', advertiser?.id || 'pending')

    try {
      const res = await fetch('/api/advertiser/parse-brief', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.extracted && data.extracted.confidence !== 'low') {
        setBriefData(data.extracted)
        addSarah(`Here's what I found in your brief:\n\n${buildBriefSummary(data.extracted)}\n\nDoes this look right? Type "yes" to submit, or tell me what to change.`)
        setStep('brief_confirm')
      } else {
        addSarah(`I had some trouble reading that brief. Let me ask you a few quick questions instead.\n\nWhat's the brand name and what are you promoting?`)
        setStep('brand')
      }
    } catch {
      addSarah(`Something went wrong. Let me ask you directly — what's the brand name and what are you promoting?`)
      setStep('brand')
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function buildBriefSummary(d: Record<string, any>) {
    const lines: string[] = []
    if (d.brand_name) lines.push(`Brand: ${d.brand_name}`)
    if (d.product_description) lines.push(`Product: ${d.product_description}`)
    if (d.platforms?.length) lines.push(`Platforms: ${d.platforms.join(', ')}`)
    if (d.content_types?.length) lines.push(`Content: ${d.content_types.join(', ')}`)
    if (d.creators_needed) lines.push(`Creators: ${d.creators_needed}`)
    if (d.budget_flexible) lines.push(`Budget: Flexible`)
    else if (d.budget_per_creator_eur) lines.push(`Budget: €${Math.round(d.budget_per_creator_eur / 100)} per creator`)
    if (d.target_age_range) lines.push(`Audience: ${d.target_age_range}`)
    if (d.target_countries?.length) lines.push(`Countries: ${d.target_countries.join(', ')}`)
    if (d.go_live_date) lines.push(`Go-live: ${d.go_live_date}`)
    if (d.niche_fit) lines.push(`Niche: ${d.niche_fit}`)
    return lines.join('\n')
  }

  async function handleBriefConfirm(text: string) {
    const trimmed = text.trim().toLowerCase()
    addUser(text); setInput('')
    if (['yes', 'looks good', 'correct', 'submit', 'yep', 'ok', 'sure'].includes(trimmed)) {
      addSarah(`Perfect! Create your account below to submit your brief and see your creator shortlist when it's ready.`)
      setPhase('auth')
    } else {
      addSarah(`No problem — what would you like to change?`)
      setStep('brand')
    }
  }

  // ── AUTH: GOOGLE ─────────────────────────────────────────────────
  function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    localStorage.setItem('truleado_pending_brief', JSON.stringify(briefData))
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/advertiser-callback?sk=${sk}`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  // ── AUTH: EMAIL/PASSWORD ─────────────────────────────────────────
  async function handleEmailAuth() {
    setAuthError('')
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password.')
      return
    }
    setAuthLoading(true)

    try {
      if (authMode === 'signup') {
        const res = await fetch('/api/advertiser/email-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setAuthError(data.error || 'Could not create account.')
          setAuthLoading(false)
          return
        }
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInErr) {
        setAuthError(authMode === 'login' ? 'Incorrect email or password.' : signInErr.message)
        setAuthLoading(false)
        return
      }

      const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
      const finRes = await fetch('/api/advertiser/finalize-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_key: sk }),
      })
      const finData = await finRes.json()

      if (finData.error === 'already_influencer') {
        await supabase.auth.signOut()
        setAuthError('This email is registered as a creator. Please use a different email for your brand account.')
        setAuthLoading(false)
        return
      }

      router.push('/advertiser/dashboard')
    } catch (e) {
      setAuthError('Something went wrong. Please try again.')
      setAuthLoading(false)
    }
  }

  // ── MESSAGE ROUTER ───────────────────────────────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return
    const trimmed = text.trim().toLowerCase()

    if (isResumePrompt) {
      const isYes = ['yes','yeah','sure','ok','yep','continue','yup'].includes(trimmed)
      const isNo = ['no','nope','start fresh','restart','start over'].includes(trimmed)
      addUser(text); setInput('')
      if (isYes) { await continueFromStep(resumeStep); return }
      if (isNo) { addSarah('No problem, starting fresh!'); await startFresh(); return }
      addSarah('Just say "yes" to continue or "no" to start over.')
      return
    }

    if (phase === 'chat') {
      await sendOnboardingMessage(text)
    } else if (phase === 'brief_chat') {
      if (step === 'brief_confirm') {
        await handleBriefConfirm(text)
      } else {
        await sendBriefMessage(text)
      }
    }
  }

  const bubbleStyle = (role: 'sarah' | 'user') => ({
    maxWidth: '80%',
    padding: '12px 16px',
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
    borderRadius: role === 'sarah' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
    background: role === 'sarah' ? 'var(--white)' : 'var(--gold)',
    color: role === 'sarah' ? 'var(--text)' : '#fff',
    border: role === 'sarah' ? '1px solid var(--border)' : 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  })

  const inputFieldStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const showInput = phase === 'chat' || phase === 'brief_chat'
  const showMessages = phase !== 'loading'

  return (
    <div style={{
      minHeight: embedded ? 0 : '100vh',
      height: embedded ? '100%' : undefined,
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
      borderRadius: embedded ? 16 : 0,
      border: embedded ? '1px solid var(--border)' : undefined,
      overflow: embedded ? 'hidden' : undefined,
    }}>
      <div style={{ padding: '14px 24px', background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✨</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Sarah Chen</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Creator Partnerships · Truleado</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>For brands & agencies</div>
      </div>

      <div style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>Getting things ready…
            </div>
          </div>
        )}

        {showMessages && (
          <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={bubbleStyle(msg.role)}>{msg.text}</div>
              </div>
            ))}

            {isThinking && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'var(--white)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {phase === 'brief_choice' && !isThinking && (
              <div style={{ margin: '4px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ background: 'var(--white)', border: '2px solid var(--border)', borderRadius: 14, padding: '20px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Upload my brief</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>Already have a brief? I'll read it and extract everything.</p>
                  </button>
                  <button
                    onClick={startBriefChat}
                    style={{ background: 'var(--white)', border: '2px solid var(--border)', borderRadius: 14, padding: '20px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>💬</div>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Build with Sarah</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>I'll ask you a few questions and put together your brief.</p>
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                />
              </div>
            )}

            {phase === 'auth' && !isThinking && (
              <div style={{ margin: '8px 0', padding: 24, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
                  {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
                  {authMode === 'signup'
                    ? 'Your brief is saved — create an account to submit it.'
                    : 'Log in to submit your brief and view your shortlist.'}
                </p>

                <button
                  onClick={signInWithGoogle}
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth() }}
                    style={inputFieldStyle}
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    placeholder={authMode === 'signup' ? 'Create a password (min 6 chars)' : 'Your password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEmailAuth() }}
                    style={inputFieldStyle}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  />

                  {authError && (
                    <p style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5, padding: '2px 2px' }}>{authError}</p>
                  )}

                  <button
                    onClick={handleEmailAuth}
                    disabled={authLoading}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--gold)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: authLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: authLoading ? 0.7 : 1, marginTop: 4 }}
                  >
                    {authLoading
                      ? 'Just a moment…'
                      : authMode === 'signup' ? 'Create account & submit brief' : 'Log in & submit brief'}
                  </button>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', marginTop: 16 }}>
                  {authMode === 'signup' ? 'Already have an account?' : 'New to Truleado?'}{' '}
                  <button
                    onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, padding: 0 }}
                  >
                    {authMode === 'signup' ? 'Log in' : 'Create an account'}
                  </button>
                </p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {showInput && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder={isResumePrompt ? 'Say "yes" to continue or "no" to start fresh…' : 'Type your answer…'}
              disabled={isThinking}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', opacity: isThinking ? 0.6 : 1 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() && !isThinking ? 'var(--gold)' : 'var(--border)', border: 'none', cursor: input.trim() && !isThinking ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() && !isThinking ? '#fff' : 'var(--text-3)'} />
              </svg>
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </div>
  )
}
