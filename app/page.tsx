import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users get redirected by middleware
  // This page only shows for unauthenticated visitors
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--white)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: 24,
    }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Truleado</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 12, lineHeight: 1.2 }}>
          The right creators,<br/>matched to your brand.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 40, lineHeight: 1.6 }}>
          Authentic, verified creators matched to campaign briefs. No spray and pray.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          <Link href="/influencer" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 16, padding: '28px 20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
              onMouseEnter={(e: any) => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={(e: any) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>📸</div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>I'm a creator</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>Join free and get matched with brands that fit your content.</p>
            </div>
          </Link>

          <Link href="/advertiser" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 16, padding: '28px 20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
              onMouseEnter={(e: any) => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={(e: any) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>🎯</div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>I'm a brand or agency</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>Submit a brief and receive a shortlist of matched creators.</p>
            </div>
          </Link>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>First brief is free · No credit card required</p>
      </div>
    </div>
  )
}
