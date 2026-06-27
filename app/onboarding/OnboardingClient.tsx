'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const SESSION_KEY_LS = 'truleado_session_key'
const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  youtube: '▶️',
  pinterest: '📌',
}

type Phase = 'loading' | 'chat' | 'auth' | 'screenshots' | 'done'

interface ChatMessage {
  role: 'sarah' | 'user'
  text: string
  chips?: string[]
}

interface Platform {
  id: string
  platform: string
  handle: string | null
}

interface Props {
  user: { id: string; email?: string } | null
  influencer: { id: string; first_name?: string; onboarding_complete?: boolean } | null
}

export default function OnboardingClient({ user, influencer }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('greeting')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [influencerId, setInfluencerId] = useState<string | null>(influencer?.id || null)
  const [firstName, setFirstName] = useState<string>(influencer?.first_name || '')
  const [isThinking, setIsThinking] = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, string>>({})
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null)
  const [allUploaded, setAllUploaded] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initCalledRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    initSession()
  }, [])

  async function initSession(forceNew = false) {
    const storedKey = (!forceNew && typeof window !== 'undefined') ? localStorage.getItem(SESSION_KEY_LS) : null

    const res = await fetch('/api/sarah-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init',
        session_key: storedKey,
        user_id: user?.id || null,
        influencer_id: influencer?.id || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Sarah chat init failed:', err)
      setPhase('chat')
      addSarahMessage("Hey! 👋 I'm Sarah from Truleado. What's your name?")
      return
    }

    const data = await res.json()

    if (data.session_key) {
      localStorage.setItem(SESSION_KEY_LS, data.session_key)
      setSessionKey(data.session_key)
    }

    if (data.phase === 'screenshots') {
      setPlatforms(data.platforms || [])
      setInfluencerId(data.influencer_id)
      if (data.first_name) setFirstName(data.first_name)
      setPhase('screenshots')
      setupRealtimeForScreenshots(data.influencer_id, data.platforms || [])
    } else if (data.phase === 'merge_needed') {
      await mergeSession(data.session_key)
    } else if (data.phase === 'resume') {
      setStep(data.step)
      setSessionData(data.data || {})
      setPhase('chat')
      addSarahMessage(data.sarah_reply, data.chips || [])
    } else if (data.phase === 'chat') {
      setStep(data.step)
      setPhase('chat')
      addSarahMessage(data.sarah_reply, [])
    }
  }

  async function mergeSession(sk: string) {
    if (!user?.id || !influencer?.id) return
    const res = await fetch('/api/sarah-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'merge',
        session_key: sk || sessionKey,
        user_id: user.id,
        influencer_id: influencer.id,
      }),
    })
    const data = await res.json()
    if (data.phase === 'screenshots') {
      setPlatforms(data.platforms || [])
      setInfluencerId(data.influencer_id)
      if (data.first_name) setFirstName(data.first_name)
      setPhase('screenshots')
      setupRealtimeForScreenshots(data.influencer_id, data.platforms || [])
    }
  }

  function setupRealtimeForScreenshots(infId: string, plats: Platform[]) {
    const initial: Record<string, string> = {}
    for (const p of plats) initial[p.id] = 'pending'
    setPlatformStatuses(initial)

    supabase.channel('onboarding-platform-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'influencer_platforms',
        filter: `influencer_id=eq.${infId}`,
      }, (payload: any) => {
        const updated = payload.new
        setPlatformStatuses(prev => ({ ...prev, [updated.id]: updated.parse_status || 'pending' }))
      })
      .subscribe()
  }

  useEffect(() => {
    if (phase !== 'screenshots' || platforms.length === 0) return
    const statusVals = Object.values(platformStatuses)
    if (statusVals.length === 0) return
    const allDone = platforms.every(p => {
      const s = platformStatuses[p.id]
      return s === 'complete' || s === 'failed'
    })
    if (allDone) setAllUploaded(true)
  }, [platformStatuses, phase, platforms])

  function addSarahMessage(text: string, chips: string[] = []) {
    setMessages(prev => [
      ...prev.map(m => ({ ...m, chips: [] })),
      { role: 'sarah' as const, text, chips },
    ])
  }

  function addUserMessage(text: string) {
    setMessages(prev => [...prev, { role: 'user' as const, text }])
  }

  async function continueFromStep(currentStep: string) {
    addUserMessage("Yes, let's continue")
    setIsThinking(true)
    try {
      const res = await fetch('/api/sarah-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_continue', session_key: sessionKey, step: currentStep }),
      })
      const data = await res.json()
      if (data.step) setStep(data.step)
      addSarahMessage(data.sarah_reply, data.chips || [])
    } catch {
      addSarahMessage("Let's pick up where we left off! What was your answer?")
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function startFresh() {
    addUserMessage('Start fresh')
    localStorage.removeItem(SESSION_KEY_LS)
    setMessages([])
    setSessionKey(null)
    setSessionData({})
    setStep('greeting')
    setPhase('loading')
    initCalledRef.current = false
    // Small delay so state settles before re-init
    await new Promise(r => setTimeout(r, 50))
    initCalledRef.current = true
    await initSession(true)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return

    // Handle resume chip choices without going through the message action
    if (text === 'Yes, continue') {
      setMessages(prev => prev.map(m => ({ ...m, chips: [] })))
      await continueFromStep(step)
      return
    }
    if (text === 'Start fresh') {
      setMessages(prev => prev.map(m => ({ ...m, chips: [] })))
      await startFresh()
      return
    }

    addUserMessage(text)
    setInput('')
    setIsThinking(true)
    setMessages(prev => prev.map(m => ({ ...m, chips: [] })))

    try {
      const res = await fetch('/api/sarah-chat', {
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

      if (data.extracted) setSessionData((prev: Record<string, any>) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)

      addSarahMessage(data.sarah_reply, data.chips || [])
      if (data.phase === 'auth') setPhase('auth')
    } catch {
      addSarahMessage("Sorry, I had a hiccup — can you say that again? 😅")
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?onboarding=true&sk=${sk}` },
    })
  }

  async function handleScreenshotUpload(platformId: string, files: FileList) {
    if (!files.length || !influencerId) return
    setUploadingPlatform(platformId)
    setPlatformStatuses(prev => ({ ...prev, [platformId]: 'processing' }))

    const formData = new FormData()
    formData.append('influencer_id', influencerId)
    formData.append('platform_id', platformId)
    for (const f of Array.from(files)) formData.append('screenshots', f)

    fetch('/api/parse-screenshots', { method: 'POST', body: formData })
      .catch(console.error)
      .finally(() => setUploadingPlatform(null))
  }

  async function completeOnboarding() {
    await fetch('/api/sarah-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        session_key: sessionKey,
        influencer_id: influencerId,
      }),
    })
    localStorage.removeItem(SESSION_KEY_LS)
    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--gold-bg)', border: '2px solid var(--gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>✨</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sarah Chen</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Creator Partnerships · Truleado</div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 640, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
              Getting things ready…
            </div>
          </div>
        )}

        {(phase === 'chat' || phase === 'auth') && (
          <>
            <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'sarah' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                    background: msg.role === 'sarah' ? 'var(--white)' : 'var(--gold)',
                    color: msg.role === 'sarah' ? 'var(--text)' : '#fff',
                    fontSize: 14,
                    lineHeight: 1.6,
                    boxShadow: 'var(--shadow)',
                    border: msg.role === 'sarah' ? '1px solid var(--border)' : 'none',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                  {msg.chips && msg.chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '80%' }}>
                      {msg.chips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => sendMessage(chip)}
                          disabled={isThinking}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: '1px solid var(--gold-border)',
                            background: 'var(--gold-bg)',
                            color: 'var(--gold)',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: isThinking ? 'default' : 'pointer',
                            opacity: isThinking ? 0.6 : 1,
                            fontFamily: 'inherit',
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '4px 18px 18px 18px',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--text-3)',
                        display: 'inline-block',
                        animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {phase === 'auth' && (
                <div style={{
                  margin: '8px 0',
                  padding: 20,
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  boxShadow: 'var(--shadow)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                    Your info is saved — just sign in to continue.
                  </div>
                  <button
                    onClick={signInWithGoogle}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      padding: '12px 24px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      color: 'var(--text)',
                      fontSize: 14, fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {phase === 'chat' && (
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--white)',
                display: 'flex',
                gap: 8,
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                  placeholder="Type your answer…"
                  disabled={isThinking}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 24,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: 14,
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    opacity: isThinking ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isThinking}
                  style={{
                    width: 40, height: 40,
                    borderRadius: '50%',
                    background: input.trim() && !isThinking ? 'var(--gold)' : 'var(--border)',
                    border: 'none',
                    cursor: input.trim() && !isThinking ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() && !isThinking ? '#fff' : 'var(--text-3)'} />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'screenshots' && (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              padding: '16px 20px',
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              boxShadow: 'var(--shadow)',
              fontSize: 14,
              color: 'var(--text)',
              lineHeight: 1.6,
            }}>
              {firstName ? `Amazing, ${firstName}! 🎉` : 'Amazing! 🎉'} Last step — upload some screenshots from your platforms so brands can see your stats at a glance.
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'var(--gold-bg)',
              borderLeft: '3px solid var(--gold)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-2)',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--gold)' }}>What to upload:</strong> your profile page + post/reel insights. Instagram: profile + tap any post → View Insights. TikTok: profile + Analytics overview.
            </div>

            {platforms.map(p => {
              const status = platformStatuses[p.id] || 'pending'
              const isProcessing = status === 'processing' || uploadingPlatform === p.id
              const isComplete = status === 'complete'
              const isFailed = status === 'failed'

              return (
                <div key={p.id} style={{
                  padding: 20,
                  background: 'var(--white)',
                  border: `1px solid ${isComplete ? '#a7f3d0' : 'var(--border)'}`,
                  borderRadius: 16,
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[p.platform] || '📱'}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{p.platform}</div>
                        {p.handle && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>@{p.handle}</div>}
                      </div>
                    </div>
                    {isComplete && (
                      <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)' }}>
                        Parsed ✓
                      </span>
                    )}
                    {isFailed && (
                      <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--red-bg)', color: 'var(--red)' }}>
                        Try again
                      </span>
                    )}
                  </div>

                  {isProcessing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                      <span style={{
                        display: 'inline-block', width: 14, height: 14,
                        border: '2px solid var(--border)', borderTopColor: 'var(--gold)',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                      Reading your screenshots…
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 16px',
                      border: '2px dashed var(--border)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      fontSize: 13,
                    }}>
                      📤 {isComplete ? 'Upload more screenshots' : 'Upload screenshots'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.length) handleScreenshotUpload(p.id, e.target.files) }}
                      />
                    </label>
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {allUploaded && (
                <button
                  onClick={completeOnboarding}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--gold)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Go to my dashboard →
                </button>
              )}
              <button
                onClick={completeOnboarding}
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Skip for now — I'll add screenshots later
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
