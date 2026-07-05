import { headers } from 'next/headers'
import Link from 'next/link'
import { Target, Camera } from 'lucide-react'
import LoginForm from '@/components/LoginForm'

// One shared Next app serves two surfaces (see middleware.ts): the app
// surface (app.truleado.com / localhost:3001) and the marketing surface
// (truleado.com / localhost:3000). There's no separate /login route — this
// page IS the app's login/signup screen. Middleware already redirects an
// authenticated, fully-onboarded user away from "/" before this renders.
export default function HomePage() {
  const host = headers().get('host') || ''
  const isAppSurface =
    host.startsWith('app.') ||
    host.includes('localhost:3001') ||
    host.includes('127.0.0.1:3001')

  if (isAppSurface) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-10 px-6">

      <div className="flex gap-4 w-full max-w-md">
        <Link href="/advertiser" className="flex-1 bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-gold transition-colors group">
          <Target size={30} strokeWidth={1.5} className="text-muted-foreground group-hover:text-gold transition-colors" />
          <span className="font-semibold text-sm text-center group-hover:text-gold transition-colors">Brand / Agency</span>
        </Link>
        <Link href="/influencer" className="flex-1 bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-gold transition-colors group">
          <Camera size={30} strokeWidth={1.5} className="text-muted-foreground group-hover:text-gold transition-colors" />
          <span className="font-semibold text-sm text-center group-hover:text-gold transition-colors">Creator</span>
        </Link>
      </div>

      <a href="https://truleado.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Check out our website
      </a>

    </div>
  )
}
