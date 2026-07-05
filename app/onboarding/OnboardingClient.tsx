'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import LanguageSelector from '@/components/LanguageSelector'
import ParseProgressCard, { type ParseStatus } from '@/components/ParseProgressCard'
import { cn, normalizeHandle } from '@/lib/utils'
import {
  Instagram, Music2, Youtube, Pin, Twitter, Linkedin, Facebook, Twitch, Ghost, Share2,
  Sparkles, PartyPopper, Upload, Check, ArrowLeft, ArrowRight, Loader2, type LucideIcon,
} from 'lucide-react'

const SESSION_KEY_LS = 'truleado_session_key'

// Keep in sync with: app/profile/edit/ProfileEditClient.tsx (ALL_PLATFORMS,
// RATE_FIELDS, UPLOAD_HINTS), app/profile/view/page.tsx (CONTENT_TYPES),
// app/dashboard/profile/page.tsx, components/ScreenshotGuide.tsx, and the
// PLATFORM_PROMPTS map in app/api/parse-screenshots/route.ts.
const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'pinterest', 'twitter', 'facebook', 'linkedin', 'twitch', 'snapchat']
const PLATFORM_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, youtube: Youtube, pinterest: Pin,
  twitter: Twitter, linkedin: Linkedin, facebook: Facebook, twitch: Twitch, snapchat: Ghost,
}
function platformIcon(platform: string): LucideIcon {
  return PLATFORM_ICONS[platform] || Share2
}

const NICHES = ['Fashion','Beauty','Lifestyle','Fitness','Food','Travel','Tech','Gaming','Finance','Parenting','Home','Wellness','Music','Art','Comedy','Sustainability']
const STYLES = ['Educational','Entertaining','Inspirational','Authentic/Raw','Aesthetic','Documentary','Storytelling']
const CATEGORIES = ['Fashion','Beauty','Skincare','Haircare','Fitness','Nutrition','Travel','Tech','Gaming','Finance','Food & Beverage','Home & Garden','Pets','Kids','Cars','Sustainability','Art','Music']
const POSTING_FREQUENCIES = ['Daily', '4-6x per week', '2-3x per week', 'Once a week', 'Less than once a week']
const RATE_FIELDS: Record<string, [string, string][]> = {
  instagram: [['Reel', 'reel'], ['Story', 'story'], ['Feed post', 'post']],
  tiktok:    [['Video', 'video']],
  youtube:   [['Integration', 'integration'], ['Video', 'video']],
  pinterest: [['Post', 'post']],
  twitter:   [['Post', 'post']],
  facebook:  [['Post', 'post'], ['Video', 'video']],
  linkedin:  [['Post', 'post'], ['Video', 'video']],
  twitch:    [['Stream', 'stream'], ['Video', 'video']],
  snapchat:  [['Story', 'story'], ['Post', 'post']],
}

const STEPS = ['Basics', 'Platforms', 'Content', 'About you', 'Brand fit', 'Rates'] as const

type Phase = 'loading' | 'form' | 'auth' | 'screenshots'

interface PlatformRow { id: string; platform: string; handle: string | null }
interface Props {
  user: { id: string; email?: string } | null
  influencer: { id: string; first_name?: string; onboarding_complete?: boolean } | null
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

export default function OnboardingClient({ user, influencer }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [stepIdx, setStepIdx] = useState(0)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [influencerId, setInfluencerId] = useState<string | null>(influencer?.id || null)
  const [firstNameDone, setFirstNameDone] = useState(influencer?.first_name || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Auth phase — email/password account creation (alternative to Google)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Screenshots phase (unchanged behavior from before)
  const [platforms, setPlatforms] = useState<PlatformRow[]>([])
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, string>>({})
  const [allUploaded, setAllUploaded] = useState(false)

  // ── Form state ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [handles, setHandles] = useState<Record<string, string>>({})

  const [primaryNiche, setPrimaryNiche] = useState('')
  const [contentStyle, setContentStyle] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [postingFrequency, setPostingFrequency] = useState('')

  const [bio, setBio] = useState('')

  const [brandLoves, setBrandLoves] = useState<string[]>([])
  const [brandNever, setBrandNever] = useState<string[]>([])

  const [rateState, setRateState] = useState<Record<string, string>>({})
  const [gifting, setGifting] = useState(false)
  const [revShare, setRevShare] = useState(false)
  const [exclusivity, setExclusivity] = useState(false)

  const initCalledRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    initSession()
  }, [])

  function prefill(data: Record<string, any>) {
    setFirstName(data.first_name || '')
    setLastName(data.last_name || '')
    setCity(data.city || '')
    setCountry(data.country || '')
    const plats: any[] = data.platforms || []
    setSelectedPlatforms(plats.map(p => p.platform))
    setHandles(Object.fromEntries(plats.map(p => [p.platform, p.handle || ''])))
    setPrimaryNiche(data.primary_niche || '')
    setContentStyle(data.content_style || '')
    setLanguages(data.languages || [])
    setPostingFrequency(data.posting_frequency || '')
    setBio(data.bio || '')
    setBrandLoves(data.brand_loves || [])
    setBrandNever(data.brand_never || [])
    const ratesParsed = data.rates_parsed || {}
    if (ratesParsed.rates?.length) {
      setRateState(Object.fromEntries(ratesParsed.rates.map((r: any) => [`${r.platform}__${r.content_type}`, String(Math.round((r.rate_eur_cents || 0) / 100))])))
    }
    setGifting(Boolean(ratesParsed.open_to_gifting))
    setRevShare(Boolean(ratesParsed.open_to_rev_share))
    setExclusivity(Boolean(ratesParsed.open_to_exclusivity))
  }

  async function initSession() {
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY_LS) : null
    const res = await fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', session_key: storedKey, user_id: user?.id || null, influencer_id: influencer?.id || null }),
    })
    if (!res.ok) { setPhase('form'); return }
    const data = await res.json()

    if (data.session_key) { localStorage.setItem(SESSION_KEY_LS, data.session_key); setSessionKey(data.session_key) }
    if (data.influencer_id) setInfluencerId(data.influencer_id)

    if (data.phase === 'screenshots') {
      setPlatforms(data.platforms || [])
      if (data.first_name) setFirstNameDone(data.first_name)
      setPhase('screenshots')
      setupRealtime(data.influencer_id, data.platforms || [])
    } else {
      prefill(data.data || {})
      setPhase('form')
    }
  }

  function setupRealtime(infId: string, plats: PlatformRow[]) {
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

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  }

  const stepValid = [
    firstName.trim().length > 0,
    selectedPlatforms.length > 0 && selectedPlatforms.every(p => (handles[p] || '').trim().length > 0),
    primaryNiche.trim().length > 0,
    bio.trim().length > 0,
    true,
    true,
  ]

  function buildPayload() {
    const rates = Object.entries(rateState)
      .filter(([, v]) => v && v.trim() !== '')
      .map(([key, v]) => {
        const [platform, content_type] = key.split('__')
        return { platform, content_type, rate_eur_cents: Math.round(parseFloat(v) * 100) }
      })

    return {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      platforms: selectedPlatforms.map(p => ({ platform: p, handle: (handles[p] || '').trim() || null })),
      primary_niche: primaryNiche,
      content_style: contentStyle || null,
      languages,
      posting_frequency: postingFrequency || null,
      bio: bio.trim(),
      brand_loves: brandLoves,
      brand_never: brandNever,
      rates,
      open_to_gifting: gifting,
      open_to_rev_share: revShare,
      open_to_exclusivity: exclusivity,
    }
  }

  function enterScreenshots(data: any) {
    setPlatforms(data.platforms || [])
    setInfluencerId(data.influencer_id)
    if (data.first_name) setFirstNameDone(data.first_name)
    setPhase('screenshots')
    setupRealtime(data.influencer_id, data.platforms || [])
  }

  async function finishForm() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', session_key: sessionKey, influencer_id: influencerId, data: buildPayload() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSaveError(data.error || 'Something went wrong. Please try again.'); return }

      if (data.phase === 'screenshots') {
        enterScreenshots(data)
      } else {
        setPhase('auth')
      }
    } catch {
      setSaveError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function signInWithGoogle() {
    const sk = sessionKey || localStorage.getItem(SESSION_KEY_LS)
    const skParam = sk ? `&sk=${encodeURIComponent(sk)}` : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?onboarding=true${skParam}`, queryParams: { prompt: 'select_account' } },
    })
  }

  async function signUpWithEmail() {
    if (authLoading) return
    if (!authEmail.trim() || !authPassword) { setAuthError('Enter an email and password.'); return }
    setAuthLoading(true)
    setAuthError(null)
    try {
      const signupRes = await fetch('/api/influencer/email-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      })
      const signupData = await signupRes.json().catch(() => ({}))
      if (!signupRes.ok) { setAuthError(signupData.error || 'Could not create your account.'); return }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
      if (signInErr) { setAuthError(signInErr.message); return }

      const completeRes = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_signup', session_key: sessionKey }),
      })
      const completeData = await completeRes.json().catch(() => ({}))
      if (completeRes.status === 403 && completeData.error === 'already_advertiser') {
        await supabase.auth.signOut()
        setAuthError('This email is already registered as a brand/agency. Please use a different email for your creator account.')
        return
      }
      if (!completeRes.ok) { setAuthError(completeData.error || 'Something went wrong. Please try again.'); return }

      localStorage.removeItem(SESSION_KEY_LS)
      enterScreenshots(completeData)
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
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
    await fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', session_key: sessionKey, influencer_id: influencerId }),
    })
    localStorage.removeItem(SESSION_KEY_LS)
    window.location.href = '/dashboard'
  }

  const chip = (selected: boolean, color: 'gold' | 'green' | 'red' = 'gold') => cn(
    'px-3 py-1.5 rounded-full border text-xs font-semibold capitalize transition-colors',
    selected
      ? color === 'green' ? 'border-green-border bg-green-bg text-green'
      : color === 'red' ? 'border-red-border bg-red-bg text-red'
      : 'border-gold bg-gold-bg text-gold'
      : 'border-border bg-card text-muted-foreground hover:border-gold/50'
  )

  const textareaClass = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[90px] resize-y'
  const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <div className="min-h-screen bg-muted flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-card border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center text-gold"><Sparkles size={16} /></div>
        <div>
          <p className="text-sm font-semibold">Truleado</p>
          <p className="text-[11px] text-muted-foreground">Creator onboarding</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 max-w-xl w-full mx-auto px-4 py-8">
        {phase === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center text-muted-foreground text-sm">
              <div className="flex justify-center mb-2 text-gold"><Sparkles size={24} /></div>Getting things ready…
            </div>
          </div>
        )}

        {phase === 'form' && (
          <div className="flex-1 flex flex-col">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Step {stepIdx + 1} of {STEPS.length}</p>
                <p className="text-xs font-semibold text-gold">{STEPS[stepIdx]}</p>
              </div>
              <Progress value={((stepIdx + 1) / STEPS.length) * 100} className="h-1.5" />
            </div>

            {saveError && (
              <p className="text-xs text-destructive bg-red-bg border border-red-border rounded-lg px-3 py-2 mb-4">{saveError}</p>
            )}

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-5">
              {/* Step 0: Basics */}
              {stepIdx === 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">Tell us about you</h2>
                  <p className="text-xs text-muted-foreground mb-4">Basic info so brands know who they're working with.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fn">First name</Label>
                      <Input id="fn" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ln">Last name</Label>
                      <Input id="ln" value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={city} onChange={e => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={country} onChange={e => setCountry(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Platforms */}
              {stepIdx === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">Which platforms are you on?</h2>
                  <p className="text-xs text-muted-foreground mb-4">Select all that apply, then add your handle.</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PLATFORMS.map(p => {
                      const Icon = platformIcon(p)
                      return (
                        <button key={p} type="button" onClick={() => togglePlatform(p)} className={cn(chip(selectedPlatforms.includes(p)), 'inline-flex items-center gap-1.5')}>
                          <Icon size={13} /> {p}
                        </button>
                      )
                    })}
                  </div>
                  {selectedPlatforms.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {selectedPlatforms.map(p => (
                        <div key={p} className="space-y-1.5">
                          <Label htmlFor={`h-${p}`} className="capitalize">{p} handle</Label>
                          <Input id={`h-${p}`} value={handles[p] || ''} onChange={e => setHandles(prev => ({ ...prev, [p]: normalizeHandle(e.target.value) }))} placeholder="@username" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Content */}
              {stepIdx === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">Your content</h2>
                  <p className="text-xs text-muted-foreground mb-4">Helps us match you with the right brands.</p>
                  <div className="space-y-1.5">
                    <Label>Primary niche</Label>
                    <div className="flex flex-wrap gap-2">
                      {NICHES.map(n => (
                        <button key={n} type="button" onClick={() => setPrimaryNiche(n)} className={chip(primaryNiche === n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Content style <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {STYLES.map(s => (
                        <button key={s} type="button" onClick={() => setContentStyle(contentStyle === s ? '' : s)} className={chip(contentStyle === s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Languages <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <LanguageSelector value={languages} onChange={setLanguages} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="freq">Posting frequency <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <select id="freq" value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} className={selectClass}>
                      <option value="">Select…</option>
                      {POSTING_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Bio */}
              {stepIdx === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">About you</h2>
                  <p className="text-xs text-muted-foreground mb-4">2-3 sentences about you and your content — this is what brands read first.</p>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} className={textareaClass} placeholder="e.g. I'm a skincare creator sharing honest reviews and routines for sensitive skin…" autoFocus />
                </div>
              )}

              {/* Step 4: Brand fit */}
              {stepIdx === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">Brand fit</h2>
                  <p className="text-xs text-muted-foreground mb-4">Optional, but helps us pitch you to the right brands.</p>
                  <div className="space-y-1.5">
                    <Label>Categories you love working with</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.filter(c => !brandNever.includes(c)).map(c => (
                        <button key={c} type="button" onClick={() => { toggle(brandLoves, setBrandLoves, c); setBrandNever(prev => prev.filter(x => x !== c)) }} className={chip(brandLoves.includes(c), 'green')}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categories you'd never do</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.filter(c => !brandLoves.includes(c)).map(c => (
                        <button key={c} type="button" onClick={() => { toggle(brandNever, setBrandNever, c); setBrandLoves(prev => prev.filter(x => x !== c)) }} className={chip(brandNever.includes(c), 'red')}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Rates */}
              {stepIdx === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight mb-1">Your rates</h2>
                  <p className="text-xs text-muted-foreground mb-4">Optional — a rough idea helps brands come in with realistic offers.</p>
                  {selectedPlatforms.length === 0 && (
                    <p className="text-xs text-muted-foreground">No platforms selected — skip this and add rates later from your profile.</p>
                  )}
                  {selectedPlatforms.map(platform => (
                    <div key={platform} className="bg-muted border border-border rounded-xl px-4 py-3.5">
                      <p className="text-sm font-semibold mb-3 capitalize">{platform}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(RATE_FIELDS[platform] || [['Post', 'post']]).map(([label, ct]) => {
                          const key = `${platform}__${ct}`
                          return (
                            <div key={ct}>
                              <label className="text-[11px] text-muted-foreground block mb-1">{label} (€)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">€</span>
                                <Input className="pl-[22px]" type="number" min="0" placeholder="0"
                                  value={rateState[key] || ''}
                                  onChange={e => setRateState(prev => ({ ...prev, [key]: e.target.value }))} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="bg-muted border border-border rounded-xl px-4 py-1">
                    {([
                      ['Open to gifting', gifting, setGifting],
                      ['Open to rev-share', revShare, setRevShare],
                      ['Open to exclusivity', exclusivity, setExclusivity],
                    ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set], i) => (
                      <div key={label} className={cn('flex items-center justify-between py-2.5', i > 0 && 'border-t border-border')}>
                        <p className="text-[13px] font-medium">{label}</p>
                        <button type="button" onClick={() => set(!val)} className={cn('w-[38px] h-[21px] rounded-[11px] border-none cursor-pointer relative transition-colors', val ? 'bg-green' : 'bg-border')}>
                          <span className="absolute w-[15px] h-[15px] rounded-full bg-white top-[3px] left-[3px] transition-transform" style={{ transform: val ? 'translateX(17px)' : 'none' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div className="flex gap-2.5">
              {stepIdx > 0 && (
                <Button variant="outline" onClick={() => setStepIdx(i => i - 1)} className="gap-1.5" disabled={saving}>
                  <ArrowLeft size={14} /> Back
                </Button>
              )}
              {stepIdx < STEPS.length - 1 ? (
                <Button
                  onClick={() => stepValid[stepIdx] && setStepIdx(i => i + 1)}
                  disabled={!stepValid[stepIdx]}
                  className="flex-1 bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5"
                >
                  Continue <ArrowRight size={14} />
                </Button>
              ) : (
                <Button onClick={finishForm} disabled={saving} className="flex-1 bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Finish
                </Button>
              )}
            </div>
            {!stepValid[stepIdx] && stepIdx !== 4 && stepIdx !== 5 && (
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                {stepIdx === 0 && 'First name is required.'}
                {stepIdx === 1 && 'Select at least one platform and add its handle.'}
                {stepIdx === 2 && 'Pick a primary niche.'}
                {stepIdx === 3 && 'A short bio is required.'}
              </p>
            )}
          </div>
        )}

        {phase === 'auth' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm w-full">
              <div className="flex justify-center mb-4"><PartyPopper size={28} className="text-gold" /></div>
              <h2 className="text-base font-semibold mb-1.5 text-center">You're all set!</h2>
              <p className="text-xs text-muted-foreground mb-5 text-center">Your info is saved — just create your account to continue.</p>

              {authError && (
                <p className="text-xs text-destructive bg-red-bg border border-red-border rounded-lg px-3 py-2 mb-4">{authError}</p>
              )}

              <Button variant="outline" onClick={signInWithGoogle} disabled={authLoading} className="gap-2 w-full mb-4">
                <GoogleIcon /> Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">or create with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input id="auth-email" type="email" autoComplete="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input id="auth-password" type="password" autoComplete="new-password" minLength={6}
                    value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') signUpWithEmail() }} />
                  <p className="text-[11px] text-muted-foreground">At least 6 characters.</p>
                </div>
                <Button onClick={signUpWithEmail} disabled={authLoading} className="w-full bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5">
                  {authLoading && <Loader2 size={14} className="animate-spin" />} Create account
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 'screenshots' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0">
            <div className="bg-card border border-border rounded-2xl p-4 text-sm text-foreground leading-relaxed shadow-sm">
              <span className="inline-flex items-center gap-1.5">
                {firstNameDone ? `Amazing, ${firstNameDone}!` : 'Amazing!'}
                <PartyPopper size={16} className="text-gold shrink-0" />
              </span>{' '}
              Last step — upload some screenshots from your platforms so brands can see your real stats.
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
                    {(() => { const Icon = platformIcon(p.platform); return <Icon size={20} className="text-foreground shrink-0" /> })()}
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
                      <Upload size={14} className="shrink-0" /> {raw === 'complete' ? 'Upload more screenshots' : 'Upload screenshots'}
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
