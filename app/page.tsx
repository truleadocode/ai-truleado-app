'use client'

import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
          <span style={{
            width: 28, height: 28, borderRadius: 7, background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L6 2L10 10" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 7h5" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Truleado</span>
        </div>

        <div style={{
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8 }}>
            Creator sign in
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.6 }}>
            Sign in with Google to access your Truleado creator account.
          </p>

          <button onClick={signInWithGoogle} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#fff', color: '#1a1a1a',
            fontFamily: 'Inter, sans-serif',
            fontSize: 15, fontWeight: 600,
            border: 'none', borderRadius: 10, padding: '14px',
            cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 3-4.33 3-7.31z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.07v2.6A9.99 9.99 0 0 0 10 20z" fill="#34A853"/>
              <path d="M4.41 11.89A6 6 0 0 1 4.1 10c0-.65.11-1.28.31-1.89V5.51H1.07A10 10 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.34-2.6z" fill="#FBBC05"/>
              <path d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86C14.96.99 12.69 0 10 0A9.99 9.99 0 0 0 1.07 5.51l3.34 2.6C5.2 5.71 7.4 3.96 10 3.96z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
            Always free for creators. No commission. No catch.
          </p>
        </div>
      </div>
    </div>
  )
}
