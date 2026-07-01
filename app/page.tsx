import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-10 px-6">

      <div className="flex gap-4 w-full max-w-md">
        <Link href="/advertiser" className="flex-1 bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-gold transition-colors group">
          <span className="text-3xl">🎯</span>
          <span className="font-semibold text-sm text-center group-hover:text-gold transition-colors">Brand / Agency</span>
        </Link>
        <Link href="/influencer" className="flex-1 bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-gold transition-colors group">
          <span className="text-3xl">📸</span>
          <span className="font-semibold text-sm text-center group-hover:text-gold transition-colors">Creator</span>
        </Link>
      </div>

      <a href="https://truleado.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Check out our website
      </a>

    </div>
  )
}
