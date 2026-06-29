import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import SignOutButton from './SignOutButton'

function TruleadoLogo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <div className={cn('bg-gold flex items-center justify-center shrink-0', small ? 'w-6 h-6 rounded-[5px]' : 'w-7 h-7 rounded-[6px]')}>
        <svg width={small ? 11 : 13} height={small ? 11 : 13} viewBox="0 0 16 16" fill="none">
          <path d="M3 13L8 3L13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10h6"         stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </div>
      <span className={cn('font-extrabold tracking-tight text-foreground', small ? 'text-sm' : 'text-base')}>
        Truleado
      </span>
    </Link>
  )
}

interface Props {
  children: React.ReactNode
  role: 'advertiser' | 'influencer'
}

export default async function DashboardShell({ children, role }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const navItems = role === 'advertiser'
    ? [
        { href: '/advertiser/dashboard',    label: 'Briefs' },
        { href: '/advertiser/briefs/new',   label: 'New brief' },
      ]
    : [
        { href: '/dashboard', label: 'Opportunities' },
      ]

  return (
    <div className="min-h-screen bg-muted font-sans">
      {/* ── Top nav ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-6">
          <TruleadoLogo />

          <nav className="flex items-center gap-1 ml-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors no-underline"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  )
}
