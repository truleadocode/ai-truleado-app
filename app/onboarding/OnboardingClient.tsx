'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import ParseProgressCard, { type ParseStatus } from '@/components/ParseProgressCard'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'

const SESSION_KEY_LS = 'truleado_session_key'

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', pinterest: '📌',
}

type Phase = 'loading' | 'chat' | 'auth' | 'screenshots' | 'done'

interface ChatMessage { role: 'sarah' | 'user'; text: string }
interface Platform    { id: string; platform: string; handle: string | null }
interface Props {
  user: { id: string; email?: string } | null
  influencer: { id: string; first_name?: string; onboarding_complete?: boolean } | null
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

export default function OnboardingClient({ user, influencer, embedded = false }: Props) {
  const [phase, setPhase]                     = useState<Phase>('loading')
  const [messages, setMessages]               = useState<ChatMessage[]>([])
  const [input, setInput]                     = useState('')
  const [step, setStep]                       = useState('greeting')
  const [sessionKey, setSessionKey]           = useState<string | null>(null)
  const [sessionData, setSessionData]         = useState<Record<string, any>>({})
  const [platforms, setPlatforms]             = useState<Platform[]>([])
  const [influencerId, setInfluencerId]       = useState<string | null>(influencer?.id || null)
  const [firstName, setFirstName]             = useState(influencer?.first_name || '')
  const [isThinking, setIsThinking]           = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, string>>({})
  const [allUploaded, setAllUploaded]         = useState(false)
  const [isResumePrompt, setIsResumePrompt]   = useState(false)
  const [resumeStep, setResumeStep]           = useState('greeting')

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const initCalledRef = useRef(false)
  const supabase     = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isThinking])

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    initSession()
  }, [])

  async function initSession(forceNew = false) {
    const storedKey = (!forceNew && typeof window !== 'undefined') ? localStorage.getItem(SESSION_KEY_LS) : null
    const res = await fetch('/api/sarah-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', session_key: storedKey, user_id: user?.id || null, influencer_id: influencer?.id || null }),
    })
    if (!res.ok) { setPhase('chat'); addS("Hey! 👋 I'm Sarah from Truleado. What's your name?"); return }

    const data = await res.json()
    if (data.session_key) { localStorage.setItem(SESSION_KEY_LS, data.session_key); setSessionKey(data.session_key) }

    if (data.phase === 'screenshots') {
      setPlatforms(data.platforms || []); setInfluencerId(data.influencer_id)
      if (data.first_name) setFirstName(data.first_name)
      setPhase('screenshots'); setupRealtime(data.influencer_id, data.platforms || [])
    } else if (data.phase === 'merge_needed') {
      await mergeSession(data.session_key)
    } else if (data.phase === 'resume') {
      setResumeStep(data.step); setStep(data.step); setSessionData(data.data || {})
      setIsResumePrompt(true); setPhase('chat'); addS(data.sarah_reply)
    } else {
      setStep(data.step); setPhase('chat'); addS(data.sarah_reply)
    }
  }

  async function mergeSession(sk: string) {
    if (!user?.id || !influencer?.id) return
    const res = await fetch('/api/sarah-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', session_key: sk || sessionKey, user_id: user.id, influencer_id: influencer.id }),
    })
    const data = await res.json()
    if (data.phase === 'screenshots') {
      setPlatforms(data.platforms || []); setInfluencerId(data.influencer_id)
      if (data.first_name) setFirstName(data.first_name)
      setPhase('screenshots'); setupRealtime(data.influencer_id, data.platforms || [])
    }
  }

  function setupRealtime(infId: string, plats: Platform[]) {
    const initial: Record<string, string> = {}
    for (const p of plats) initial[p.id] = 'pending'
    setPlatformStatuses(initial)
    supabase.channel('onboarding-platform-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'influencer_platforms', filter: `influencer_id=eq.${infId}` },
        (payload: any) => {
          const u = payload.new
          setPlatformStatuses(prev => ({ ...prev, [u.id]: u.parse_status || 'pending' }))
        }
      ).subscribe()
  }

  useEffect(() => {
    if (phase !== 'screenshots' || platforms.length === 0) return
    const statusVals = Object.values(platformStatuses)
    if (!statusVals.length) return
    const allDone = platforms.every(p => {
      const s = platformStatuses[p.id]
      return s === 'complete' || s === 'failed'
    })
    if (allDone) setAllUploaded(true)
  }, [platformStatuses, phase, platforms])

  const addS = (text: string) => setMessages(prev => [...prev, { role: 'sarah', text }])
  const addU = (text: string) => setMessages(prev => [...prev, { role: 'user',  text }])

  async function continueFromStep(s: string) {
    setIsThinking(true)
    try {
      const res = await fetch('/api/sarah-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_continue', session_key: sessionKey, step: s }),
      })
      const data = await res.json()
      if (data.step) setStep(data.step)
      setIsResumePrompt(false); addS(data.sarah_reply)
    } catch { addS("Let's pick up where we left off!") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  async function startFresh() {
    localStorage.removeItem(SESSION_KEY_LS)
    setMessages([]); setSessionKey(null); setSessionData({})
    setStep('greeting'); setResumeStep('greeting'); setIsResumePrompt(false); setPhase('loading')
    await new Promise(r => setTimeout(r, 50))
    initCalledRef.current = false; initCalledRef.current = true
    await initSession(true)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return
    const trimmed = text.trim().toLowerCase()

    if (isResumePrompt) {
      const isYes = ['yes','yeah','sure','ok','yep','continue','yup',"let's go",'lets go'].includes(trimmed)
      const isNo  = ['no','nope','start fresh','restart','start over','fresh','new'].includes(trimmed)
      addU(text); setInput('')
      if (isYes) { await continueFromStep(resumeStep); return }
      if (isNo)  { addS('No problem, starting fresh!'); await startFresh(); return }
      addS('Just say "yes" to continue where we left off, or "no" to start over.')
      return
    }

    addU(text); setInput(''); setIsThinking(true)
    try {
      const res = await fetch('/api/sarah-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', session_key: sessionKey, step, user_message: text, data: sessionData }),
      })
      const data = await res.json()
      if (data.extracted) setSessionData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addS(data.sarah_reply)
      if (data.phase === 'auth') setPhase('auth')
    } catch { addS("Sorry, I had a hiccup — can you say that again? 😅") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  async function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?onboarding=true&sk=${sk}`, queryParams: { prompt: 'select_account' } },
    })
  }

  async function handleScreenshotUpload(platformId: string, files: FileList) {
    if (!files.length || !influencerId) return
    setPlatformStatuses(prev => ({ ...prev, [platformId]: 'processing' }))
    const formData = new FormData()
    formData.append('influencer_id', influencerId)
    formData.append('platform_id', platformId)
    for (const f of Array.from(files)) formData.append('screenshots', f)
    fetch('/api/parse-screenshots', { method: 'POST', body: formData }).catch(console.error)
  }

  async function completeOnboarding() {
    await fetch('/api/sarah-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', session_key: sessionKey, influencer_id: influencerId }),
    })
    localStorage.removeItem(SESSION_KEY_LS)
    window.location.href = '/dashboard'
  }

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
      </div>

      <div className="flex-1 flex flex-col min-h-0 max-w-2xl w-full mx-auto">
        {phase === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center text-muted-foreground text-sm">
              <div className="text-2xl mb-2">✨</div>Getting things ready…
            </div>
          </div>
        )}

        {(phase === 'chat' || phase === 'auth') && (
          <>
            <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'sarah'
                      ? 'bg-card border border-border text-foreground shadow-sm rounded-[4px_18px_18px_18px]'
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

              {phase === 'auth' && !isThinking && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                  <p className="text-xs text-muted-foreground mb-4">Your info is saved — just sign in to continue.</p>
                  <Button variant="outline" onClick={signInWithGoogle} className="gap-2 w-full">
                    <GoogleIcon /> Continue with Google
                  </Button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {phase === 'chat' && (
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
          </>
        )}

        {phase === 'screenshots' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
            <div className="bg-card border border-border rounded-2xl p-4 text-sm text-foreground leading-relaxed shadow-sm">
              {firstName ? `Amazing, ${firstName}! 🎉` : 'Amazing! 🎉'} Last step — upload some screenshots from your platforms so brands can see your real stats.
            </div>

            <div className="bg-accent border-l-4 border-gold rounded-lg px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-gold">What to upload:</strong> your profile page + post/reel insights. Instagram: profile + tap any post → View Insights.
            </div>

            {platforms.map(p => {
              const raw = platformStatuses[p.id] || 'pending'
              const parseStatus: ParseStatus =
                raw === 'processing' ? 'processing' :
                raw === 'complete'   ? 'complete'   :
                raw === 'failed'     ? 'failed'     : 'idle'
              const showProgress = parseStatus !== 'idle'

              return (
                <div key={p.id} className={cn(
                  'bg-card border rounded-2xl p-5 shadow-sm transition-colors',
                  parseStatus === 'complete' ? 'border-green-border' : 'border-border'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{PLATFORM_ICONS[p.platform] || '📱'}</span>
                    <div>
                      <p className="text-sm font-semibold capitalize">{p.platform}</p>
                      {p.handle && <p className="text-xs text-muted-foreground">@{p.handle}</p>}
                    </div>
                  </div>

                  {showProgress ? (
                    <ParseProgressCard status={parseStatus} onSettled={() =>
                      setPlatformStatuses(prev => ({ ...prev, [p.id]: parseStatus === 'complete' ? 'complete' : 'pending' }))
                    } />
                  ) : (
                    <label className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl cursor-pointer text-muted-foreground text-xs hover:border-gold hover:text-gold transition-colors">
                      📤 {raw === 'complete' ? 'Upload more screenshots' : 'Upload screenshots'}
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.length) handleScreenshotUpload(p.id, e.target.files) }} />
                    </label>
                  )}
                </div>
              )
            })}

            <div className="flex flex-col gap-2 mt-1 pb-4">
              {allUploaded && (
                <Button onClick={completeOnboarding} className="bg-gold hover:bg-gold/90 text-white font-semibold">
                  Go to my dashboard →
                </Button>
              )}
              <Button variant="ghost" onClick={completeOnboarding} className="text-muted-foreground text-xs">
                Skip for now — I'll add screenshots later
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
