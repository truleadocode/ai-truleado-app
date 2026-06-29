import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MarketingChat from './MarketingChat'

function Logo({ small }: { small?: boolean }) {
  const sz = small ? 'w-6 h-6 rounded-[5px] text-[10px]' : 'w-8 h-8 rounded-[7px] text-xs'
  return (
    <div className="flex items-center gap-2">
      <div className={`${sz} bg-gold flex items-center justify-center shrink-0`}>
        <svg width={small ? 11 : 14} height={small ? 11 : 14} viewBox="0 0 16 16" fill="none">
          <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10h6"         stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </div>
      <span className={`${small ? 'text-sm' : 'text-base'} font-extrabold tracking-tight`}>Truleado</span>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen font-sans">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1">
            <a href="#how" className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-2 transition-colors">
              How it works
            </a>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent border border-gold-border rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          <span className="text-xs font-bold text-gold">AI-matched influencer partnerships</span>
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-normal tracking-tight leading-[1.1] mb-5 max-w-2xl mx-auto">
          Where brands and creators<br />actually match.
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Brands get a vetted shortlist from a single brief. Creators get partnerships that actually fit. No spreadsheets, no spam.
        </p>
      </section>

      {/* ── Live chat CTA ──────────────────────────────── */}
      <section id="top" className="max-w-6xl mx-auto px-6 pb-24 flex justify-center">
        <MarketingChat />
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section id="how" className="bg-muted border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-3">How Truleado works</h2>
          <p className="text-muted-foreground text-center mb-12">Two sides, one clean process.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: '🎯', label: 'For brands & agencies',
                steps: [
                  ['Tell Sarah about your campaign', 'Chat with our AI or upload an existing brief — takes a couple of minutes.'],
                  ['Get a shortlist of matched creators', 'We score every verified creator and reach out to the best fits for you.'],
                  ['Confirm your favorites', 'Pick the creators you want. We share contacts and you take it from there.'],
                ],
              },
              {
                icon: '📸', label: 'For creators',
                steps: [
                  ['Chat with Sarah & share your stats', 'Upload a few screenshots — we verify your real numbers, no scraping.'],
                  ['Get matched to brand campaigns', 'We surface opportunities that genuinely fit your niche and audience.'],
                  ['Accept the ones you like', 'Say yes to what works. Brands reach out directly to collaborate.'],
                ],
              },
            ].map(({ icon, label, steps }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-7">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xl">{icon}</span>
                  <span className="font-extrabold text-sm">{label}</span>
                </div>
                {steps.map(([t, d], i) => (
                  <div key={i} className={i < 2 ? 'flex gap-4 mb-5' : 'flex gap-4'}>
                    <div className="w-6 h-6 rounded-full bg-accent border border-gold-border text-gold text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1">{t}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Truleado ───────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-14">Why Truleado</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            ['✅', 'Verified, not scraped', 'Creator stats come straight from their own analytics screenshots — the numbers you see are real.'],
            ['⚡', 'One brief, full shortlist', 'No more manual searching. Describe what you need once and let the matching do the work.'],
            ['💸', 'Free to start', 'Your first brief is free for brands. For creators, Truleado is always free.'],
          ].map(([icon, t, d]) => (
            <div key={String(t)}>
              <div className="text-3xl mb-4">{icon}</div>
              <p className="font-bold mb-2">{t}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section className="bg-muted border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-4xl font-normal tracking-tight mb-4">Ready to find your match?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">Start a conversation with Sarah above, or log in if you already have an account.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button className="bg-gold hover:bg-gold/90 text-white font-bold" asChild>
              <a href="#top">Get started free</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <Logo small />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Truleado. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
