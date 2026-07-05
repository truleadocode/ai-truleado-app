'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

function TruleadoLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <div className="w-7 h-7 rounded-[6px] bg-gold flex items-center justify-center">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-foreground">Truleado</span>
    </Link>
  )
}

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // The reset-link redirect leaves Supabase to establish a recovery
    // session from the URL automatically; we just wait for it to appear.
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setStatus('ready')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session) setStatus('ready')
    })

    const timeout = setTimeout(() => {
      if (cancelled) return
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled && !data.session) setStatus('invalid')
      })
    }, 3000)

    return () => { cancelled = true; sub.subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function submit() {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(e.message); return }
    setStatus('done')
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col font-sans">
      <div className="border-b bg-card px-6 py-4">
        <TruleadoLogo />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">Set a new password</CardTitle>
            {status === 'ready' && <CardDescription>Choose a new password for your account.</CardDescription>}
          </CardHeader>

          <CardContent>
            {status === 'checking' && (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Loader2 size={22} className="animate-spin mb-3" />
                <p className="text-xs">Verifying your reset link…</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="text-center py-2">
                <div className="flex justify-center mb-3"><AlertTriangle size={28} className="text-red" /></div>
                <p className="text-sm text-foreground font-medium mb-1">This link has expired</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Reset links are only valid for a short time. Request a new one to continue.
                </p>
                <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white font-semibold">
                  <Link href="/auth/forgot-password">Request a new link</Link>
                </Button>
              </div>
            )}

            {status === 'ready' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs">New password</Label>
                  <Input id="password" type="password" placeholder="At least 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" className="h-9" autoFocus minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-xs">Confirm password</Label>
                  <Input id="confirm" type="password" placeholder="Re-enter your password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    autoComplete="new-password" className="h-9" />
                </div>

                {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}

                <Button className="w-full bg-gold hover:bg-gold/90 text-white font-semibold" onClick={submit} disabled={loading}>
                  {loading ? 'Saving…' : 'Save new password'}
                </Button>
              </div>
            )}

            {status === 'done' && (
              <div className="text-center py-2">
                <div className="flex justify-center mb-3"><CheckCircle size={28} className="text-green" /></div>
                <p className="text-sm text-foreground font-medium mb-1">Password updated</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">You can now log in with your new password.</p>
                <Button className="w-full bg-gold hover:bg-gold/90 text-white font-semibold" onClick={() => { supabase.auth.signOut(); router.push('/') }}>
                  Go to login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
