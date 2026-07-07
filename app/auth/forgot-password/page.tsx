'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MailCheck } from 'lucide-react'

function TruleadoLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <img src="/logo-mark-t-tile.png" alt="" width={28} height={28} className="w-7 h-7 rounded-[6px]" />
      <span className="text-base font-semibold tracking-tight text-foreground">Truleado</span>
    </Link>
  )
}

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit() {
    setError('')
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true)
    // Works for both creator and brand accounts — password reset operates
    // on the auth user, independent of which role table they belong to.
    // Supabase doesn't error when the email is unregistered (avoids
    // leaking which emails have accounts), so the same message covers both.
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (e) { setError(e.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col font-sans">
      <div className="border-b bg-card px-6 py-4">
        <TruleadoLogo />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">Reset your password</CardTitle>
            <CardDescription>We'll email you a link to set a new one.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {sent ? (
              <div className="text-center py-2">
                <div className="flex justify-center mb-3"><MailCheck size={28} className="text-gold" /></div>
                <p className="text-sm text-foreground font-medium mb-1">Check your inbox</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If an account exists for <strong>{email.trim()}</strong>, we've sent a link to reset your password.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    autoComplete="email" className="h-9" autoFocus />
                </div>

                {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}

                <Button className="w-full bg-gold hover:bg-gold/90 text-white font-semibold" onClick={submit} disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </>
            )}

            <p className="text-center text-xs pt-1">
              <Link href="/" className="text-muted-foreground no-underline hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={11} /> Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
