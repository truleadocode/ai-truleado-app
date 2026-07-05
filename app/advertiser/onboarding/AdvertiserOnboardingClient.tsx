'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Building2, Users, Loader2, ArrowLeft } from 'lucide-react'

type Mode = 'signup' | 'login'
type Step = 'details' | 'account'

// Official Google brand colors — allowed exception to the token rule.
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

interface Props {
  user: { id: string; email?: string } | null
  advertiser: { id: string; onboarding_complete?: boolean } | null
}

export default function AdvertiserOnboardingClient({ user, advertiser }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const alreadyOnboarded = Boolean(user && advertiser?.onboarding_complete)
  // Already fully onboarded — go straight to the dashboard.
  useEffect(() => {
    if (alreadyOnboarded) router.replace('/advertiser/dashboard')
  }, [alreadyOnboarded, router])

  const [mode, setMode] = useState<Mode>('signup')
  const [step, setStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Details
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [advType, setAdvType] = useState<'brand' | 'agency' | null>(null)

  // Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const detailsValid = firstName.trim().length > 0 && company.trim().length > 0 && advType !== null

  if (alreadyOnboarded) return null

  function profilePayload() {
    return {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: company.trim(),
      advertiser_type: advType,
    }
  }

  async function finalize(profile: Record<string, any> | null) {
    const res = await fetch('/api/advertiser/finalize-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile ? { profile } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 403 && data.error === 'already_influencer') {
      await supabase.auth.signOut()
      setError('This email is already registered as a creator. Please use a different email for your brand account.')
      return false
    }
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      return false
    }
    return true
  }

  // Google OAuth. On signup we carry the form's profile through the
  // redirect as query params so the callback can create the row with it.
  async function signInWithGoogle(withProfile: boolean) {
    if (loading) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (withProfile) {
      params.set('fn', firstName.trim())
      params.set('ln', lastName.trim())
      params.set('co', company.trim())
      if (advType) params.set('ty', advType)
    }
    const qs = params.toString()
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/advertiser-callback${qs ? `?${qs}` : ''}` },
    })
    if (oauthErr) {
      setError(oauthErr.message)
      setLoading(false)
    }
    // On success the browser navigates away — no state reset needed.
  }

  // Authed user without a completed profile: details form only.
  async function submitDetailsAuthed() {
    if (!detailsValid || loading) return
    setLoading(true)
    setError(null)
    if (await finalize(profilePayload())) {
      router.push('/advertiser/dashboard')
      router.refresh()
    } else {
      setLoading(false)
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/advertiser/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not create your account. Please try again.')
        return
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) {
        setError(signInErr.message)
        return
      }
      if (await finalize(profilePayload())) {
        router.push('/advertiser/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) {
        setError(signInErr.message === 'Invalid login credentials' ? 'Incorrect email or password.' : signInErr.message)
        return
      }
      // Ensures the advertiser row exists and blocks creator accounts.
      if (await finalize(null)) {
        router.push('/advertiser/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const heading =
    mode === 'login' ? 'Welcome back'
    : step === 'details' ? 'Tell us about your business'
    : 'Create your account'

  const subheading =
    mode === 'login' ? 'Log in to manage your briefs and creator shortlists.'
    : step === 'details' ? 'A few details so creators know who they’re working with.'
    : 'Save your details and see your creator matches.'

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-6 py-10 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <span className="text-xl font-semibold tracking-tight text-foreground">Truleado</span>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8">
            <h1 className="text-lg font-semibold tracking-tight text-center mb-1">{heading}</h1>
            <p className="text-xs text-muted-foreground text-center mb-6">{subheading}</p>

            {error && (
              <p className="text-xs text-destructive bg-red-bg border border-red-border rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            {/* ── Login ─────────────────────────────────── */}
            {mode === 'login' && (
              <form onSubmit={submitLogin} className="space-y-4">
                <Button type="button" variant="outline" disabled={loading} onClick={() => signInWithGoogle(false)} className="w-full gap-2 font-semibold">
                  <GoogleIcon /> Continue with Google
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold/90 text-white font-semibold gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />} Log in
                </Button>
              </form>
            )}

            {/* ── Signup step 1: details ─────────────────── */}
            {mode === 'signup' && step === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first">First name</Label>
                    <Input id="first" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last">Last name</Label>
                    <Input id="last" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" autoComplete="organization" placeholder="e.g. Acme GmbH" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>You are a…</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'brand' as const, label: 'Brand', desc: 'We promote our own products', Icon: Building2 },
                      { key: 'agency' as const, label: 'Agency', desc: 'We run campaigns for clients', Icon: Users },
                    ]).map(({ key, label, desc, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAdvType(key)}
                        className={cn(
                          'border rounded-xl p-4 text-left transition-colors',
                          advType === key
                            ? 'border-gold bg-gold-bg'
                            : 'border-border bg-card hover:border-gold/50'
                        )}
                      >
                        <Icon size={18} className={cn('mb-2', advType === key ? 'text-gold' : 'text-muted-foreground')} />
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {user ? (
                  <Button onClick={submitDetailsAuthed} disabled={!detailsValid || loading} className="w-full bg-gold hover:bg-gold/90 text-white font-semibold gap-2">
                    {loading && <Loader2 size={14} className="animate-spin" />} Continue to dashboard
                  </Button>
                ) : (
                  <Button onClick={() => detailsValid && setStep('account')} disabled={!detailsValid} className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">
                    Continue
                  </Button>
                )}
              </div>
            )}

            {/* ── Signup step 2: account ─────────────────── */}
            {mode === 'signup' && step === 'account' && !user && (
              <form onSubmit={submitSignup} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Back
                </button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => signInWithGoogle(true)} className="w-full gap-2 font-semibold">
                  <GoogleIcon /> Continue with Google
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">At least 6 characters.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold/90 text-white font-semibold gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />} Create account
                </Button>
              </form>
            )}

            {/* Mode switch */}
            {!user && (
              <p className="text-xs text-muted-foreground text-center mt-6">
                {mode === 'signup' ? (
                  <>Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(null) }} className="text-gold font-semibold hover:underline">Log in</button>
                  </>
                ) : (
                  <>New to Truleado?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setStep('details'); setError(null) }} className="text-gold font-semibold hover:underline">Create an account</button>
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Looking to get brand deals as a creator?{' '}
          <Link href="/influencer" className="text-gold font-semibold no-underline hover:underline">Join as a creator</Link>
        </p>

        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Need help? <a href="mailto:support@truleado.com" className="text-gold no-underline hover:underline">support@truleado.com</a>
        </p>
      </div>
    </div>
  )
}
