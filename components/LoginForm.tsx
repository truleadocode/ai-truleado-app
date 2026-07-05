'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Building2, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function TruleadoMark({ light = false }: { light?: boolean }) {
  return (
    <div className={cn('w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0', light ? 'bg-white/12' : 'bg-brand')}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

const SESSION_KEY_LS = 'truleado_session_key'

type Mode = 'login' | 'signup'

// Small pill segmented control shared by both role tabs to flip between
// signing in and creating a new account without leaving the page.
function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-muted rounded-full p-1 mb-5">
      {(['login', 'signup'] as Mode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'h-8 rounded-full text-[13px] font-medium transition-colors',
            mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m === 'login' ? 'Log in' : 'Sign up'}
        </button>
      ))}
    </div>
  )
}

type Role = 'brand' | 'creator'

// Left-panel copy swaps with the active role tab.
const PANEL_CONTENT: Record<Role, { badge: string; headline: string; body: string; points: string[] }> = {
  brand: {
    badge: 'Brand-to-creator matching',
    headline: 'Great campaigns start with the right match.',
    body: 'Upload a brief, and let AI find, offer, and connect you with creators who actually fit — no cold outreach, no guesswork.',
    points: ['AI reads and scores every brief', 'Matched creators land in their Gigs feed', 'Accept, chat, and go — no back-and-forth'],
  },
  creator: {
    badge: 'Creator opportunities',
    headline: 'Get matched with brands that fit your content.',
    body: 'Set up your profile once, and let AI bring the right brand offers straight to your Gigs feed — you just accept or pass.',
    points: ['Your profile is scored against every brief', 'New offers land directly in your Gigs feed', 'Accept a gig and start chatting right away'],
  },
}

// This IS the app's home page (see app/page.tsx) — there's no separate
// /login route. Middleware already redirects a fully-onboarded, logged-in
// user away from "/" before this ever renders, but an authenticated user
// with incomplete onboarding still lands here, so this component sends
// them onward to continue rather than looping back to "/".
export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState<Role>('brand')

  const [brandMode, setBrandMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [creatorMode, setCreatorMode] = useState<Mode>('login')
  const [creatorEmail, setCreatorEmail] = useState('')
  const [creatorPassword, setCreatorPassword] = useState('')
  const [creatorError, setCreatorError] = useState('')
  const [creatorLoading, setCreatorLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setChecking(false); return }

      const { data: advertiser } = await supabase.from('advertisers').select('id').eq('user_id', data.user.id).single()
      if (advertiser) { router.push('/advertiser'); return }

      const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', data.user.id).single()
      if (influencer) { router.push('/influencer'); return }

      // Authenticated but no role row at all (e.g. a failed signup) —
      // nothing productive to redirect to, so just show the form.
      setChecking(false)
    })
  }, [])

  function googleCreator() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } },
    })
  }

  function googleBrand() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/advertiser-callback`, queryParams: { prompt: 'select_account' } },
    })
  }

  async function emailBrandLogin() {
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (e) { setError('Incorrect email or password.'); setLoading(false); return }

    const fin = await fetch('/api/advertiser/finalize-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_key: null }),
    })
    const finData = await fin.json()
    if (finData.error === 'already_influencer') {
      await supabase.auth.signOut()
      setError('This is a creator account — switch to the Creator tab to log in.')
      setLoading(false)
      return
    }
    router.push('/advertiser/dashboard')
  }

  async function emailBrandSignup() {
    setError('')
    if (!email.trim() || !password) { setError('Enter an email and password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/advertiser/email-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not create your account.'); setLoading(false); return }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) { setError(signInErr.message); setLoading(false); return }

      await fetch('/api/advertiser/finalize-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_key: null }),
      })
      router.push('/advertiser')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function emailCreatorLogin() {
    setCreatorError('')
    if (!creatorEmail.trim() || !creatorPassword) { setCreatorError('Enter your email and password.'); return }
    setCreatorLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email: creatorEmail.trim(), password: creatorPassword })
    if (e) { setCreatorError('Incorrect email or password.'); setCreatorLoading(false); return }

    const sk = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY_LS) : null
    const fin = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_signup', session_key: sk }),
    })
    const finData = await fin.json()
    if (finData.error === 'already_advertiser') {
      await supabase.auth.signOut()
      setCreatorError('This is a brand account — switch to the Advertisers tab to log in.')
      setCreatorLoading(false)
      return
    }
    // Let /influencer decide: dashboard if onboarding is complete, otherwise resume the form.
    router.push('/influencer')
  }

  async function emailCreatorSignup() {
    setCreatorError('')
    if (!creatorEmail.trim() || !creatorPassword) { setCreatorError('Enter an email and password.'); return }
    if (creatorPassword.length < 6) { setCreatorError('Password must be at least 6 characters.'); return }
    setCreatorLoading(true)
    try {
      const res = await fetch('/api/influencer/email-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail.trim(), password: creatorPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setCreatorError(data.error || 'Could not create your account.'); setCreatorLoading(false); return }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: creatorEmail.trim(), password: creatorPassword })
      if (signInErr) { setCreatorError(signInErr.message); setCreatorLoading(false); return }

      const sk = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY_LS) : null
      await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_signup', session_key: sk }),
      })
      localStorage.removeItem(SESSION_KEY_LS)
      router.push('/influencer')
    } catch {
      setCreatorError('Something went wrong. Please try again.')
      setCreatorLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted font-sans grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

      {/* ── Left — brand panel (hidden on small screens) ─────────────── */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-brand-900 text-white px-14 py-12">
        {/* Decorative — soft violet-on-violet glow, the one ember dot is the
            single accent element on this viewport per brand rules. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute bottom-[-140px] left-[-80px] w-[380px] h-[380px] rounded-full bg-brand-700/50 blur-3xl" />
        </div>

        <Link href="/" className="relative flex items-center gap-2.5 no-underline">
          <TruleadoMark light />
          <span className="text-base font-semibold tracking-tight text-white">Truleado</span>
        </Link>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/10 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ember-400" />
            {PANEL_CONTENT[role].badge}
          </span>
          <h1 className="font-serif text-[2.75rem] leading-[1.1] font-semibold tracking-tight mb-5">
            {PANEL_CONTENT[role].headline}
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed mb-8">
            {PANEL_CONTENT[role].body}
          </p>
          <ul className="space-y-3">
            {PANEL_CONTENT[role].points.map(point => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-white/85">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Check size={10} strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Truleado. All rights reserved.</p>
      </div>

      {/* ── Right — auth card ─────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen">
        <div className="px-6 py-5 lg:hidden">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <TruleadoMark />
            <span className="text-base font-semibold tracking-tight text-foreground">Truleado</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-7 text-center lg:text-left">
              <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Welcome to Truleado</h2>
              <p className="text-sm text-muted-foreground mt-1">Log in or create an account to continue.</p>
            </div>

            <Tabs value={role} onValueChange={v => { setRole(v as Role); setError(''); setCreatorError('') }}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="brand" className="flex-1 gap-1.5">
                  <Building2 size={13} /> Advertisers
                </TabsTrigger>
                <TabsTrigger value="creator" className="flex-1 gap-1.5">
                  <Sparkles size={13} /> Creator
                </TabsTrigger>
              </TabsList>

              {/* ── Brand ──────────────────────────────────────────── */}
              <TabsContent value="brand" className="mt-0">
                <ModeSwitch mode={brandMode} onChange={m => { setBrandMode(m); setError('') }} />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2 font-normal" onClick={googleBrand}>
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <div className="flex items-center gap-3 py-1">
                    <Separator className="flex-1" />
                    <span className="text-[11px] text-muted-foreground font-medium">OR</span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <Input id="email" type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (brandMode === 'login' ? emailBrandLogin() : emailBrandSignup())}
                      autoComplete="email" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw" className="text-xs">Password</Label>
                    <Input id="pw" type="password" placeholder={brandMode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (brandMode === 'login' ? emailBrandLogin() : emailBrandSignup())}
                      autoComplete={brandMode === 'login' ? 'current-password' : 'new-password'} className="h-10" />
                  </div>

                  {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}

                  <Button
                    className="w-full bg-ember hover:bg-ember-600 text-white font-medium"
                    onClick={brandMode === 'login' ? emailBrandLogin : emailBrandSignup}
                    disabled={loading}
                  >
                    {loading ? (brandMode === 'login' ? 'Logging in…' : 'Creating account…') : (brandMode === 'login' ? 'Log in' : 'Create brand account')}
                  </Button>

                  {brandMode === 'login' ? (
                    <p className="text-center text-xs">
                      <Link href="/auth/forgot-password" className="text-muted-foreground no-underline hover:underline">
                        Forgot password?
                      </Link>
                    </p>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground leading-relaxed">
                      By creating an account you agree to be contacted about your campaigns.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* ── Creator ────────────────────────────────────────── */}
              <TabsContent value="creator" className="mt-0">
                <ModeSwitch mode={creatorMode} onChange={m => { setCreatorMode(m); setCreatorError('') }} />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2 font-normal" onClick={googleCreator}>
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <div className="flex items-center gap-3 py-1">
                    <Separator className="flex-1" />
                    <span className="text-[11px] text-muted-foreground font-medium">OR</span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creator-email" className="text-xs">Email</Label>
                    <Input id="creator-email" type="email" placeholder="you@example.com"
                      value={creatorEmail} onChange={e => setCreatorEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (creatorMode === 'login' ? emailCreatorLogin() : emailCreatorSignup())}
                      autoComplete="email" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creator-pw" className="text-xs">Password</Label>
                    <Input id="creator-pw" type="password" placeholder={creatorMode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      value={creatorPassword} onChange={e => setCreatorPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (creatorMode === 'login' ? emailCreatorLogin() : emailCreatorSignup())}
                      autoComplete={creatorMode === 'login' ? 'current-password' : 'new-password'} className="h-10" />
                  </div>

                  {creatorError && <p className="text-xs text-destructive leading-relaxed">{creatorError}</p>}

                  <Button
                    className="w-full bg-ember hover:bg-ember-600 text-white font-medium"
                    onClick={creatorMode === 'login' ? emailCreatorLogin : emailCreatorSignup}
                    disabled={creatorLoading}
                  >
                    {creatorLoading ? (creatorMode === 'login' ? 'Logging in…' : 'Creating account…') : (creatorMode === 'login' ? 'Log in' : 'Create creator account')}
                  </Button>

                  {creatorMode === 'login' ? (
                    <p className="text-center text-xs">
                      <Link href="/auth/forgot-password" className="text-muted-foreground no-underline hover:underline">
                        Forgot password?
                      </Link>
                    </p>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground leading-relaxed">
                      Next you'll tell us about your content — takes about 2 minutes.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
