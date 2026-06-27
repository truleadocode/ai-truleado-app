'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 7, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 13 13" fill="none">
        <path d="M2 11L6.5 2L11 11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.8 8h5.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </span>
  )
}

function initials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase()
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5L8 2l6 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5z"/>
        <path d="M6 15V9h4v6"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/gigs',
    label: 'My gigs',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2"/>
        <path d="M5 8h6M5 5.5h3M5 10.5h4"/>
      </svg>
    ),
    badgeKey: 'gigs',
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 10a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z"/>
      </svg>
    ),
    badgeKey: 'messages',
    badgeRed: true,
  },
  {
    href: '/dashboard/profile',
    label: 'My profile',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3"/>
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
      </svg>
    ),
  },
]

export default function DashboardShell({
  children,
  influencer,
  unreadMessages,
  unreadNotifs,
  activeGigs,
}: {
  children: React.ReactNode
  influencer: { id: string, first_name: string, last_name: string, avatar_url: string | null, status: string }
  unreadMessages: number
  unreadNotifs: number
  activeGigs: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(influencer.status)

  async function toggleStatus() {
    const newStatus = status === 'active' ? 'paused' : 'active'
    setStatus(newStatus)
    await supabase.from('influencers').update({ status: newStatus }).eq('id', influencer.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const badges: Record<string, number> = {
    gigs: activeGigs,
    messages: unreadMessages,
  }

  const ini = initials(influencer.first_name, influencer.last_name)

  const pageTitle = () => {
    if (pathname === '/dashboard') return 'Home'
    if (pathname.startsWith('/dashboard/gigs')) return 'My gigs'
    if (pathname.startsWith('/dashboard/messages')) return 'Messages'
    if (pathname.startsWith('/dashboard/profile')) return 'My profile'
    return 'Dashboard'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 100, padding: '0 0 20px',
      }} className="sidebar-desktop">

        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '20px 20px 18px', borderBottom: '1px solid var(--border)', marginBottom: 6, textDecoration: 'none' }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text)' }}>Truleado</span>
        </Link>

        <div style={{ padding: '6px 12px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const badge = item.badgeKey ? badges[item.badgeKey] : 0
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 500,
                color: active ? 'var(--gold)' : 'var(--text-2)',
                background: active ? 'var(--gold-bg)' : 'transparent',
                textDecoration: 'none', marginBottom: 1,
                transition: 'background 0.15s, color 0.15s',
              }}>
                <span style={{ width: 16, height: 16, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
                {badge > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    minWidth: 18, height: 18, borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, padding: '0 5px',
                    background: item.badgeRed ? 'var(--red)' : 'var(--gold)',
                    color: '#fff',
                  }}>{badge}</span>
                )}
              </Link>
            )
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '14px 12px 0', borderTop: '1px solid var(--border)' }}>
          <div onClick={toggleStatus} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.15s' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--gold-bg)', border: '2px solid var(--gold-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--gold)', flexShrink: 0,
            }}>{ini}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)' }}>{influencer.first_name} {influencer.last_name}</p>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>@{influencer.first_name?.toLowerCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--green)', marginLeft: 'auto' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'active' ? 'var(--green)' : 'var(--text-3)' }} />
              {status === 'active' ? 'Active' : 'Paused'}
            </div>
          </div>
          <button onClick={signOut} style={{ width: '100%', marginTop: 4, background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontFamily: 'inherit', transition: 'color 0.15s' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }} className="main-desktop">

        {/* MOBILE TOPBAR */}
        <div style={{ display: 'none', height: 52, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--white)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }} className="mobile-topbar">
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <LogoMark size={22} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text)' }}>Truleado</span>
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/dashboard/messages" style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', textDecoration: 'none', color: 'var(--text-2)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z"/></svg>
              {unreadMessages > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--white)' }} />}
            </Link>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{ini}</div>
          </div>
        </div>

        {/* DESKTOP TOPBAR */}
        <div style={{ height: 54, background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }} className="desktop-topbar">
          <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px', color: 'var(--text)' }}>{pageTitle()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggleStatus} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '1px solid var(--green-border)', background: 'var(--green-bg)', fontSize: 12, fontWeight: 600, color: 'var(--green)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'active' ? 'var(--green)' : 'var(--text-3)' }} />
              {status === 'active' ? 'Active' : 'Paused'}
            </button>
            <Link href="/dashboard/messages" style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', textDecoration: 'none', color: 'var(--text-2)', transition: 'background 0.15s, border-color 0.15s' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z"/></svg>
              {unreadMessages > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--white)' }} />}
            </Link>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)', cursor: 'pointer' }}>{ini}</div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1 }}>{children}</div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '8px 0 12px' }} className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {NAV_ITEMS.map((item, idx) => {
            const active = isActive(item.href)
            const badge = item.badgeKey ? badges[item.badgeKey] : 0
            const mobileIcons = [
              <svg key="home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 22V12h6v10"/></svg>,
              <svg key="gigs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 12h10M7 8h5M7 16h7"/></svg>,
              <svg key="msgs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>,
              <svg key="profile" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-8 8-8s8 4 8 8"/></svg>,
            ]
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 600,
                color: active ? 'var(--gold)' : 'var(--text-3)',
                cursor: 'pointer', padding: '4px 16px',
                textDecoration: 'none', transition: 'color 0.15s', position: 'relative',
              }}>
                {badge > 0 && (
                  <span style={{ position: 'absolute', top: -1, right: 10, width: 7, height: 7, borderRadius: '50%', background: item.badgeRed ? 'var(--red)' : 'var(--gold)', border: '1.5px solid var(--white)' }} />
                )}
                <span style={{ width: 22, height: 22 }}>{mobileIcons[idx]}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .main-desktop { margin-left: 0 !important; }
          .desktop-topbar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-nav { display: block !important; }
        }
      `}</style>
    </div>
  )
}
