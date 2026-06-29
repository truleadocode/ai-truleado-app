'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'

const SESSION_KEY_LS = 'truleado_adv_session_key'

type Phase = 'loading' | 'chat' | 'brief_choice' | 'brief_chat' | 'auth' | 'done'
interface Message { role: 'sarah' | 'user'; text: string }
interface Props {
  user: { id: string; email?: string } | null
  advertiser: { id: string; onboarding_complete?: boolean } | null
  embedded?: boolean
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function AdvertiserOnboardingClient({ user, advertiser, embedded = false }: Props) {
  const router = useRouter()
  const [phase, setPhase]               = useState<Phase>('loading')
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [step, setStep]                 = useState('greeting')
  const [sessionKey, setSessionKey]     = useState<string | null>(null)
  const [sessionData, setSessionData]   = useState<Record<string, any>>({})
  const [briefData, setBriefData]       = useState<Record<string, any>>({})
  const [isThinking, setIsThinking]     = useState(false)
  const [isResumePrompt, setIsResumePrompt] = useState(false)
  const [resumeStep, setResumeStep]     = useState('greeting')

  const [authMode, setAuthMode]     = useState<'signup' | 'login'>('signup')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [authError, setAuthError]   = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const bottomRef     = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)
  const initCalledRef = useRef(false)
  const fileRef       = useRef<HTMLInputElement>(null)
  const supabase      = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, isThinking, phase])

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    initSession()
  }, [])

  async function initSession(forceNew = false) {
    const storedKey = (!forceNew && typeof window !== 'undefined') ? localStorage.getItem(SESSION_KEY_LS) : null
    const res = await fetch('/api/advertiser/sarah-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', session_key: storedKey, user_id: user?.id || null, advertiser_id: advertiser?.id || null }),
    })
    if (!res.ok) { setPhase('chat'); addSarah("Hey! I'm Sarah from Truleado. What's your name?"); return }
    const data = await res.json()
    if (data.session_key) { localStorage.setItem(SESSION_KEY_LS, data.session_key); setSessionKey(data.session_key) }
    if (data.phase === 'done') { router.push('/advertiser/dashboard') }
    else if (data.phase === 'brief_choice') { setPhase('brief_choice'); addSarah(data.sarah_reply) }
    else if (data.phase === 'resume') {
      setResumeStep(data.step); setStep(data.step); setSessionData(data.data || {})
      setIsResumePrompt(true); setPhase('chat'); addSarah(data.sarah_reply)
    } else { setStep(data.step || 'greeting'); setPhase('chat'); addSarah(data.sarah_reply) }
  }

  const addSarah = (text: string) => setMessages(prev => [...prev, { role: 'sarah', text }])
  const addUser  = (text: string) => setMessages(prev => [...prev, { role: 'user', text }])

  async function continueFromStep(s: string) {
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/sarah-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_continue', session_key: sessionKey, step: s }),
      })
      const data = await res.json()
      if (data.step) setStep(data.step)
      setIsResumePrompt(false); addSarah(data.sarah_reply); setPhase(data.phase || 'chat')
    } finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  async function startFresh() {
    localStorage.removeItem(SESSION_KEY_LS)
    setMessages([]); setSessionKey(null); setSessionData({}); setBriefData({})
    setStep('greeting'); setResumeStep('greeting'); setIsResumePrompt(false); setPhase('loading')
    await new Promise(r => setTimeout(r, 50))
    initCalledRef.current = false; initCalledRef.current = true
    await initSession(true)
  }

  async function sendOnboardingMessage(text: string) {
    addUser(text); setInput(''); setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/sarah-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', session_key: sessionKey, step, user_message: text, data: sessionData }),
      })
      const data = await res.json()
      if (data.extracted) setSessionData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply || 'Got it!')
      if (data.phase === 'brief_choice') setPhase('brief_choice')
      else if (data.phase === 'auth') setPhase('auth')
    } catch { addSarah("Sorry, I had a hiccup — can you say that again? 😅") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  function startBriefChat() {
    setPhase('brief_chat'); setStep('brand')
    addSarah("Let's build your brief! I'll ask you a few quick questions.\n\nFirst — what's the brand name and what are you promoting?")
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function sendBriefMessage(text: string) {
    addUser(text); setInput(''); setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/brief-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', session_key: sessionKey, step, user_message: text, data: briefData, advertiser_id: advertiser?.id || null }),
      })
      const data = await res.json()
      if (data.error) { addSarah(`Something went wrong: ${data.error}`); return }
      if (data.extracted) setBriefData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply || 'Got it!')
      if (data.phase === 'review') {
        setBriefData(data.session_data || briefData)
        addSarah(`That's everything I need! Here's a quick summary:\n\n${buildSummary(data.session_data || briefData)}\n\nType "yes" to submit, or tell me what to change.`)
        setStep('brief_confirm')
      }
    } catch { addSarah("Sorry, I had a hiccup — can you say that again? 😅") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  async function handleFileUpload(file: File) {
    setPhase('brief_chat'); addSarah('Got it — reading your brief now...'); setIsThinking(true)
    const formData = new FormData()
    formData.append('file', file); formData.append('advertiser_id', advertiser?.id || 'pending')
    try {
      const res = await fetch('/api/advertiser/parse-brief', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.extracted && data.extracted.confidence !== 'low') {
        setBriefData(data.extracted)
        addSarah(`Here's what I found:\n\n${buildSummary(data.extracted)}\n\nDoes this look right? Type "yes" to submit.`)
        setStep('brief_confirm')
      } else {
        addSarah("I had trouble reading that. Let me ask you directly — what's the brand name and what are you promoting?")
        setStep('brand')
      }
    } catch { addSarah("Something went wrong. What's the brand name and what are you promoting?"); setStep('brand') }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  function buildSummary(d: Record<string, any>) {
    const lines: string[] = []
    if (d.brand_name)          lines.push(`Brand: ${d.brand_name}`)
    if (d.product_description) lines.push(`Product: ${d.product_description}`)
    if (d.platforms?.length)   lines.push(`Platforms: ${d.platforms.join(', ')}`)
    if (d.content_types?.length) lines.push(`Content: ${d.content_types.join(', ')}`)
    if (d.creators_needed)     lines.push(`Creators: ${d.creators_needed}`)
    if (d.budget_flexible)     lines.push('Budget: Flexible')
    else if (d.budget_per_creator_eur) lines.push(`Budget: €${Math.round(d.budget_per_creator_eur / 100)} per creator`)
    if (d.target_age_range)    lines.push(`Audience: ${d.target_age_range}`)
    if (d.target_countries?.length) lines.push(`Countries: ${d.target_countries.join(', ')}`)
    if (d.go_live_date)        lines.push(`Go-live: ${d.go_live_date}`)
    if (d.niche_fit)           lines.push(`Niche: ${d.niche_fit}`)
    return lines.join('\n')
  }

  async function handleBriefConfirm(text: string) {
    addUser(text); setInput('')
    if (['yes','looks good','correct','submit','yep','ok','sure'].includes(text.trim().toLowerCase())) {
      addSarah("Perfect! Create your account below to submit your brief and see your creator shortlist when it's ready.")
      setPhase('auth')
    } else {
      addSarah('No problem — what would you like to change?'); setStep('brand')
    }
  }

  function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/advertiser-callback?sk=${sk}`, queryParams: { prompt: 'select_account' } },
    })
  }

  async function handleEmailAuth() {
    setAuthError('')
    if (!email.trim() || !password.trim()) { setAuthError('Please enter both email and password.'); return }
    setAuthLoading(true)
    try {
      if (authMode === 'signup') {
        const res = await fetch('/api/advertiser/email-signup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        })
        const data = await res.json()
        if (!res.ok) { setAuthError(data.error || 'Could not create account.'); setAuthLoading(false); return }
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) { setAuthError(authMode === 'login' ? 'Incorrect email or password.' : signInErr.message); setAuthLoading(false); return }

      const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
      const finRes = await fetch('/api/advertiser/finalize-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_key: sk }),
      })
      const finData = await finRes.json()
      if (finData.error === 'already_influencer') {
        await supabase.auth.signOut()
        setAuthError('This email is registered as a creator. Please use a different email for your brand account.')
        setAuthLoading(false); return
      }
      router.push('/advertiser/dashboard')
    } catch { setAuthError('Something went wrong. Please try again.'); setAuthLoading(false) }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return
    const trimmed = text.trim().toLowerCase()
    if (isResumePrompt) {
      const isYes = ['yes','yeah','sure','ok','yep','continue','yup'].includes(trimmed)
      const isNo  = ['no','nope','start fresh','restart','start over'].includes(trimmed)
      addUser(text); setInput('')
      if (isYes) { await continueFromStep(resumeStep); return }
      if (isNo)  { addSarah('No problem, starting fresh!'); await startFresh(); return }
      addSarah('Just say "yes" to continue or "no" to start over.')
      return
    }
    if (phase === 'chat') await sendOnboardingMessage(text)
    else if (phase === 'brief_chat') {
      if (step === 'brief_confirm') await handleBriefConfirm(text)
      else await sendBriefMessage(text)
    }
  }

  const showInput = phase === 'chat' || phase === 'brief_chat'

  return (
    <div className={cn(
      'bg-muted flex flex-col font-sans',
      embedded ? 'h-full rounded-2xl border border-border overflow-hidden' : 'min-h-screen'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center text-sm">✨</div>
        <div>
          <p className="text-sm font-semibold">Sarah Chen</p>
          <p className="text-[11px] text-muted-foreground">Creator Partnerships · Truleado</p>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
          For brands & agencies
        </span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 max-w-2xl w-full mx-auto">
        {phase === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center text-muted-foreground text-sm">
              <div className="text-2xl mb-2">✨</div>Getting things ready…
            </div>
          </div>
        )}

        {phase !== 'loading' && (
          <div className="flex-1 flex flex-col gap-3.5 p-4 overflow-y-auto min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'sarah'
                    ? 'bg-card border border-border shadow-sm rounded-[4px_18px_18px_18px]'
                    : 'bg-gold text-white rounded-[18px_4px_18px_18px]'
                )}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex">
                <div className="bg-card border border-border shadow-sm rounded-[4px_18px_18px_18px] px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
                      style={{ animation: `dot-bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Brief choice cards */}
            {phase === 'brief_choice' && !isThinking && (
              <div className="grid grid-cols-2 gap-3 my-1">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-card border-2 border-border rounded-2xl p-4 text-left hover:border-gold transition-colors cursor-pointer font-sans"
                >
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-sm font-bold mb-1">Upload my brief</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Already have a brief? I'll read it and extract everything.</p>
                </button>
                <button
                  onClick={startBriefChat}
                  className="bg-card border-2 border-border rounded-2xl p-4 text-left hover:border-gold transition-colors cursor-pointer font-sans"
                >
                  <div className="text-2xl mb-2">💬</div>
                  <p className="text-sm font-bold mb-1">Build with Sarah</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">I'll ask you a few questions and put your brief together.</p>
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
            )}

            {/* Auth */}
            {phase === 'auth' && !isThinking && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <p className="text-base font-bold text-center mb-1">
                  {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                </p>
                <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
                  {authMode === 'signup' ? 'Your brief is saved — create an account to submit it.' : 'Log in to submit your brief and view your shortlist.'}
                </p>

                <Button variant="outline" className="w-full gap-2 mb-4" onClick={signInWithGoogle}>
                  <GoogleIcon /> Continue with Google
                </Button>

                <div className="flex items-center gap-3 mb-4">
                  <Separator className="flex-1" />
                  <span className="text-[11px] text-muted-foreground font-medium">OR</span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="adv-email" className="text-xs mb-1.5 block">Email</Label>
                    <Input id="adv-email" type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                      autoComplete="email" className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="adv-pw" className="text-xs mb-1.5 block">Password</Label>
                    <Input id="adv-pw" type="password"
                      placeholder={authMode === 'signup' ? 'Create a password (min 6 chars)' : 'Your password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      className="h-9" />
                  </div>

                  {authError && <p className="text-xs text-destructive leading-relaxed">{authError}</p>}

                  <Button
                    className="w-full bg-gold hover:bg-gold/90 text-white font-bold"
                    onClick={handleEmailAuth} disabled={authLoading}
                  >
                    {authLoading ? 'Just a moment…' : authMode === 'signup' ? 'Create account & submit brief' : 'Log in & submit brief'}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  {authMode === 'signup' ? 'Already have an account?' : 'New to Truleado?'}{' '}
                  <button
                    onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError('') }}
                    className="text-gold font-bold bg-transparent border-none cursor-pointer text-xs p-0 font-sans"
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
          <div className="px-4 py-3 border-t border-border bg-card flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder={isResumePrompt ? 'Say "yes" to continue or "no" to start fresh…' : 'Type your answer…'}
              disabled={isThinking}
              className="flex-1 h-10 px-4 rounded-full border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 font-sans"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                input.trim() && !isThinking ? 'bg-gold text-white' : 'bg-border text-muted-foreground'
              )}
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
