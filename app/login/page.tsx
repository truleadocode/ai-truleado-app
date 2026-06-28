'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'brand' | 'creator'>('brand')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // If already logged in, let middleware route them from root
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/')
      } else {
        setChecking(false)
      }
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

    // Ensure advertiser row exists + guard against creator accounts
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const googleBtnStyle: React.CSSProperties = {
    width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)',
    color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }

  const GoogleIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
  )

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text)' }}>Truleado</span>
        </Link>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '32px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', textAlign: 'center', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginBottom: 24 }}>Log in to your Truleado account.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24 }}>
            <button
              onClick={() => { setTab('brand'); setError('') }}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: tab === 'brand' ? 'var(--white)' : 'transparent', color: tab === 'brand' ? 'var(--text)' : 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'brand' ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}
            >
              Brand / Agency
            </button>
            <button
              onClick={() => { setTab('creator'); setError('') }}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: tab === 'creator' ? 'var(--white)' : 'transparent', color: tab === 'creator' ? 'var(--text)' : 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'creator' ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}
            >
              Creator
            </button>
          </div>

          {tab === 'brand' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={googleBrand} style={googleBtnStyle}>{GoogleIcon} Continue with Google</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') emailBrandLogin() }} style={inputStyle} autoComplete="email" />
              <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') emailBrandLogin() }} style={inputStyle} autoComplete="current-password" />
              {error && <p style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>{error}</p>}
              <button onClick={emailBrandLogin} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--gold)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', marginTop: 4 }}>
                New here? <Link href="/advertiser" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>Create a brand account</Link>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={googleCreator} style={googleBtnStyle}>{GoogleIcon} Continue with Google</button>
              {error && <p style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>{error}</p>}
              <p style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                Creators sign in with Google.<br/>
                New here? <Link href="/influencer" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>Create a creator account</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
