'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Building2, Sparkles } from 'lucide-react'

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

function TruleadoLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <div className="w-7 h-7 rounded-[6px] bg-gold flex items-center justify-center">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="text-base font-extrabold tracking-tight text-foreground">Truleado</span>
    </Link>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/')
      else setChecking(false)
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

  if (checking) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col font-sans">
      <div className="border-b bg-card px-6 py-4">
        <TruleadoLogo />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-extrabold tracking-tight">Welcome back</CardTitle>
            <CardDescription>Log in to your Truleado account</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="brand" onValueChange={() => setError('')}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="brand" className="flex-1 gap-1.5">
                  <Building2 size={13} /> Brand / Agency
                </TabsTrigger>
                <TabsTrigger value="creator" className="flex-1 gap-1.5">
                  <Sparkles size={13} /> Creator
                </TabsTrigger>
              </TabsList>

              {/* Brand */}
              <TabsContent value="brand" className="space-y-3 mt-0">
                <Button variant="outline" className="w-full gap-2" onClick={googleBrand}>
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
                    onKeyDown={e => e.key === 'Enter' && emailBrandLogin()}
                    autoComplete="email" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw" className="text-xs">Password</Label>
                  <Input id="pw" type="password" placeholder="Your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && emailBrandLogin()}
                    autoComplete="current-password" className="h-9" />
                </div>

                {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}

                <Button
                  className="w-full bg-gold hover:bg-gold/90 text-white font-bold"
                  onClick={emailBrandLogin}
                  disabled={loading}
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  New here?{' '}
                  <Link href="/advertiser" className="text-gold font-bold no-underline hover:underline">
                    Create a brand account
                  </Link>
                </p>
              </TabsContent>

              {/* Creator */}
              <TabsContent value="creator" className="mt-0 space-y-4">
                <Button variant="outline" className="w-full gap-2" onClick={googleCreator}>
                  <GoogleIcon /> Continue with Google
                </Button>
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Creators sign in with Google only.<br />
                  New here?{' '}
                  <Link href="/influencer" className="text-gold font-bold no-underline hover:underline">
                    Create a creator account
                  </Link>
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
