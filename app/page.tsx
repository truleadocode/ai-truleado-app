import Link from 'next/link'
import MarketingChat from './MarketingChat'

export default function HomePage() {
  return (
    <div style={{ background: 'var(--white)', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 10h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.4px' }}>Truleado</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="#how" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', padding: '8px 12px' }}>How it works</a>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--white)' }}>
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 20, marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>AI-matched influencer partnerships</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 400, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 18, maxWidth: 760, marginInline: 'auto' }}>
          Where brands and creators<br/>actually match.
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 8px' }}>
          Brands get a vetted shortlist from a single brief. Creators get paid partnerships that actually fit. No spreadsheets, no spam — just the right match.
        </p>
      </section>

      {/* ─── Live chat CTA ──────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px', display: 'flex', justifyContent: 'center' }}>
        <MarketingChat />
      </section>

      {/* ─── How it works ───────────────────────────────────────── */}
      <section id="how" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', textAlign: 'center', marginBottom: 8 }}>How Truleado works</h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', textAlign: 'center', marginBottom: 44 }}>Two sides, one clean process.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Brands */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px 26px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>🎯</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>For brands &amp; agencies</span>
              </div>
              {[
                ['Tell Sarah about your campaign', 'Chat with our AI or upload an existing brief — takes a couple of minutes.'],
                ['Get a shortlist of matched creators', 'We score every verified creator and reach out to the best fits for you.'],
                ['Confirm your favorites', 'Pick the creators you want. We share contacts and you take it from there.'],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 2 ? 18 : 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{t}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Creators */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px 26px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>📸</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>For creators</span>
              </div>
              {[
                ['Chat with Sarah & share your stats', 'Upload a few screenshots — we verify your real numbers, no scraping.'],
                ['Get matched to brand campaigns', 'We surface opportunities that genuinely fit your niche and audience.'],
                ['Accept the ones you like', 'Say yes to what works. Brands reach out directly to collaborate.'],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 2 ? 18 : 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{t}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why Truleado ───────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', textAlign: 'center', marginBottom: 44 }}>Why Truleado</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            ['✅', 'Verified, not scraped', 'Creator stats come straight from their own analytics screenshots — so the numbers you see are real.'],
            ['⚡', 'One brief, full shortlist', 'No more manual searching or cold outreach. Describe what you need once and let the matching do the work.'],
            ['💸', 'Free to start', 'Your first brief is free for brands. For creators, Truleado is always free — get paid to do what you do.'],
          ].map(([icon, t, d], i) => (
            <div key={i} style={{ padding: '4px 4px' }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{icon}</div>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{t}</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, letterSpacing: '-0.6px', marginBottom: 14 }}>
            Ready to find your match?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.6 }}>
            Start a conversation with Sarah above, or log in if you already have an account.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#top" style={{ background: 'var(--gold)', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Get started free
            </a>
            <Link href="/login" style={{ background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Truleado</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>© {new Date().getFullYear()} Truleado. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
