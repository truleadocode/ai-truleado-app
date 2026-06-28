'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SESSION_KEY_LS = 'truleado_adv_session_key'
const BRIEF_SESSION_KEY_LS = 'truleado_brief_session_key'

type Phase = 'loading' | 'chat' | 'brief_choice' | 'auth' | 'done'

interface Message {
  role: 'sarah' | 'user'
  text: string
}

interface Props {
  user: { id: string; email?: string } | null
  advertiser: { id: string; onboarding_complete?: boolean } | null
}

export default function AdvertiserOnboardingClient({ user, advertiser }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('greeting')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [isResumePrompt, setIsResumePrompt] = useState(false)
  const [resumeStep, setResumeStep] = useState('greeting')
  const [firstName, setFirstName] = useState('')

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
    if (data.first_name) setFirstName(data.first_name)

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
    } else if (data.phase === 'chat') {
      setStep(data.step)
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
    setMessages([]); setSessionKey(null); setSessionData({})
    setStep('greeting'); setResumeStep('greeting')
    setIsResumePrompt(false); setPhase('loading')
    await new Promise(r => setTimeout(r, 50))
    initCalledRef.current = false
    initCalledRef.current = true
    await initSession(true)
  }

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
      if (data.first_name) setFirstName(data.first_name)

      addSarah(data.sarah_reply)

      if (data.phase === 'brief_choice') {
        setPhase('brief_choice')
      } else if (data.phase === 'auth') {
        setPhase('auth')
      }
    } catch {
      addSarah("Sorry, I had a hiccup — can you say that again? 😅")
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    const briefSk = localStorage.getItem(BRIEF_SESSION_KEY_LS)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/advertiser-callback?sk=${sk}&bsk=${briefSk || ''}`,
      },
    })
  }

  function goToBriefChat() {
    // Store session key and go to brief creation page
    window.location.href = '/advertiser/briefs/new?from=onboarding'
  }

  function goToBriefUpload() {
    fileRef.current?.click()
  }

  async function handleFileUpload(file: File) {
    // Store session key in localStorage so brief page can pick it up
    // Redirect to brief creation with upload mode
    window.location.href = '/advertiser/briefs/new?from=onboarding&mode=upload'
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✨</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Sarah Chen</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Creator Partnerships · Truleado</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>For brands &amp; agencies</div>
      </div>

      {/* Chat + phases */}
      <div style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
              Getting things ready…
            </div>
          </div>
        )}

        {/* Chat messages — always visible once started */}
        {phase !== 'loading' && (
          <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
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

            {/* Brief choice — shown after 3 questions are answered */}
            {phase === 'brief_choice' && !isThinking && (
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    onClick={goToBriefUpload}
                    style={{
                      background: 'var(--white)', border: '2px solid var(--border)',
                      borderRadius: 14, padding: '20px 16px', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Upload my brief</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>Already have a brief? I'll read it and extract everything.</p>
                  </button>
                  <button
                    onClick={goToBriefChat}
                    style={{
                      background: 'var(--white)', border: '2px solid var(--border)',
                      borderRadius: 14, padding: '20px 16px', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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

            {/* Auth gate — shown after brief is built/uploaded (not before) */}
            {phase === 'auth' && !isThinking && (
              <div style={{ margin: '8px 0', padding: 20, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                  Your brief is saved — sign in to see your shortlist when it's ready.
                </p>
                <button
                  onClick={signInWithGoogle}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input bar — only shown during chat phase */}
        {phase === 'chat' && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder={isResumePrompt ? 'Say "yes" to continue or "no" to start fresh…' : 'Type your answer…'}
              disabled={isThinking}
              autoFocus
              style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', opacity: isThinking ? 0.6 : 1 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() && !isThinking ? 'var(--gold)' : 'var(--border)', border: 'none', cursor: input.trim() && !isThinking ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() && !isThinking ? '#fff' : 'var(--text-3)'} />
              </svg>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </div>
  )
}
