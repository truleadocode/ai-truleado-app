import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from './SignOutButton'
import SidebarNav, { type NavItem } from './SidebarNav'
import { FileText, Briefcase, MessageSquare, Bell, User as UserIcon, LayoutDashboard, Settings, LifeBuoy } from 'lucide-react'

function TruleadoLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <img src="/logo-mark-t-tile.png" alt="" width={28} height={28} className="w-7 h-7 rounded-[6px] shrink-0" />
      <span className="text-base font-semibold tracking-tight text-foreground">Truleado</span>
    </Link>
  )
}

interface Props {
  children: React.ReactNode
  /** Used by pages that call DashboardShell directly with no influencer record (advertiser side). */
  role?: 'advertiser' | 'influencer'
  /** Used by app/dashboard/layout.tsx, which already has the influencer row and unread counts. */
  influencer?: { id: string; first_name?: string | null; last_name?: string | null; avatar_url?: string | null } | null
  unreadMessages?: number
  unreadNotifs?: number
  activeGigs?: number
}

export default async function DashboardShell({
  children, role, influencer, unreadMessages = 0, unreadNotifs = 0, activeGigs = 0,
}: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // influencer being passed at all (even without an explicit role) means
  // this call came from the influencer-side layout, not an advertiser page.
  const effectiveRole: 'advertiser' | 'influencer' = influencer ? 'influencer' : (role || 'advertiser')

  const navItems: NavItem[] = effectiveRole === 'advertiser'
    ? [
        { href: '/advertiser/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, iconSm: <LayoutDashboard size={13} /> },
        { href: '/advertiser/briefs',    label: 'Briefs',    icon: <FileText size={16} />,        iconSm: <FileText size={13} /> },
        { href: '/advertiser/messages',  label: 'Messages',  icon: <MessageSquare size={16} />,   iconSm: <MessageSquare size={13} /> },
        { href: '/advertiser/settings',  label: 'Settings',  icon: <Settings size={16} />,        iconSm: <Settings size={13} /> },
      ]
    : [
        { href: '/dashboard/gigs',          label: 'Gigs',          icon: <Briefcase size={16} />,    iconSm: <Briefcase size={13} />,    badge: activeGigs },
        { href: '/dashboard/messages',      label: 'Messages',      icon: <MessageSquare size={16} />, iconSm: <MessageSquare size={13} />, badge: unreadMessages },
        { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell size={16} />,         iconSm: <Bell size={13} />,         badge: unreadNotifs },
        { href: '/dashboard/profile',       label: 'Profile',       icon: <UserIcon size={16} />,     iconSm: <UserIcon size={13} /> },
      ]

  const displayName = influencer?.first_name
    ? `${influencer.first_name}${influencer.last_name ? ' ' + influencer.last_name : ''}`
    : (user.email || 'Account')

  const initial = (influencer?.first_name?.[0] || user.email?.[0] || '?').toUpperCase()

  return (
    <div className="min-h-screen bg-muted font-sans flex">
      {/* ── Sidebar (desktop) ───────────────────────────── */}
      <aside className="hidden sm:flex w-60 shrink-0 flex-col bg-card border-r border-border h-screen sticky top-0">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <TruleadoLogo />
        </div>

        <SidebarNav items={navItems} />

        <div className="px-4 pb-1">
          <a href="mailto:support@truleado.com" className="flex items-center gap-1.5 text-[11px] text-muted-foreground no-underline hover:text-gold transition-colors py-2">
            <LifeBuoy size={12} className="shrink-0" />
            <span className="truncate">Need help? support@truleado.com</span>
          </a>
        </div>

        <div className="px-3 py-3 border-t border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent border border-gold-border flex items-center justify-center text-xs font-semibold text-gold shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <SignOutButton compact />
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar — sidebar hidden below sm, replaced by a horizontal
            scrollable nav row so the same sections stay reachable. */}
        <header className="sm:hidden sticky top-0 z-40 bg-card border-b border-border">
          <div className="h-14 flex items-center justify-between px-4">
            <TruleadoLogo />
            <SignOutButton />
          </div>
          <SidebarNav items={navItems} variant="horizontal" />
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
