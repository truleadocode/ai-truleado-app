'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span style={{ width:size, height:size, borderRadius:6, background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 12 12" fill="none">
        <path d="M2 10L6 2L10 10" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 7h5" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round"/>
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
    label: 'My Gigs',
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
    label: 'My Profile',
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
    if (pathname.startsWith('/dashboard/gigs')) return 'My Gigs'
    if (pathname.startsWith('/dashboard/messages')) return 'Messages'
    if (pathname.startsWith('/dashboard/profile')) return 'My Profile'
    return 'Dashboard'
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>

      {/* SIDEBAR */}
      <aside style={{
        width:220, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--line)',
        display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, bottom:0, zIndex:100, padding:'0 0 24px',
      }} className="sidebar-desktop">
        <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 20px 18px', fontSize:17, fontWeight:800, color:'var(--fg)', textDecoration:'none', borderBottom:'1px solid var(--line)', marginBottom:8 }}>
          <LogoMark size={24} /> Truleado
        </Link>

        <div style={{ padding:'8px 12px 4px' }}>
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(232,227,218,0.2)', padding:'0 8px', marginBottom:4 }}>Menu</p>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const badge = item.badgeKey ? badges[item.badgeKey] : 0
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:8,
                fontSize:13, fontWeight:600,
                color: active ? 'var(--fg)' : 'var(--muted)',
                background: active ? 'var(--acc2)' : 'transparent',
                textDecoration:'none', position:'relative', marginBottom:1,
                transition:'background 0.2s, color 0.2s',
              }}>
                <span style={{ width:16, height:16, flexShrink:0, opacity: active ? 1 : 0.7, color: active ? 'var(--acc)' : 'currentColor' }}>{item.icon}</span>
                {item.label}
                {badge > 0 && (
                  <span style={{
                    marginLeft:'auto', background: item.badgeRed ? 'var(--red)' : 'var(--acc)',
                    color:'#090E1A', fontSize:10, fontWeight:700,
                    padding:'2px 6px', borderRadius:10, minWidth:18, textAlign:'center',
                  }}>{badge}</span>
                )}
              </Link>
            )
          })}
        </div>

        <div style={{ marginTop:'auto', padding:12, borderTop:'1px solid var(--line)' }}>
          <div onClick={toggleStatus} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 10px', borderRadius:8, cursor:'pointer' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#090E1A', flexShrink:0 }}>{ini}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:600, lineHeight:1.2 }}>{influencer.first_name} {influencer.last_name}</p>
              <span style={{ fontSize:11, color:'var(--muted)' }}>{status === 'active' ? 'Active' : 'Paused'}</span>
            </div>
            <div style={{
              width:8, height:8, borderRadius:'50%',
              background: status === 'active' ? 'var(--green)' : 'var(--muted)',
              flexShrink:0,
              boxShadow: status === 'active' ? '0 0 0 2px rgba(74,222,128,0.2)' : 'none',
            }} />
          </div>
          <button onClick={signOut} style={{ width:'100%', marginTop:4, background:'transparent', border:'none', color:'var(--muted)', fontSize:12, fontWeight:600, cursor:'pointer', padding:'8px 10px', borderRadius:8, textAlign:'left', fontFamily:'inherit' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft:220, flex:1, minHeight:'100vh', display:'flex', flexDirection:'column' }} className="main-desktop">

        {/* MOBILE TOPBAR */}
        <div style={{ display:'none', height:52, alignItems:'center', justifyContent:'space-between', padding:'0 16px', background:'var(--bg)', borderBottom:'1px solid var(--line)', position:'sticky', top:0, zIndex:100 }} className="mobile-topbar">
          <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:7, fontSize:16, fontWeight:800, color:'var(--fg)', textDecoration:'none' }}>
            <LogoMark size={22} /> Truleado
          </Link>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <Link href="/dashboard/messages" style={{ width:34, height:34, borderRadius:8, background:'var(--faint)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', textDecoration:'none', color:'var(--fg)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z"/></svg>
              {unreadMessages > 0 && <span style={{ position:'absolute', top:6, right:6, width:6, height:6, borderRadius:'50%', background:'var(--red)' }} />}
            </Link>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#090E1A' }}>{ini}</div>
          </div>
        </div>

        {/* DESKTOP TOPBAR */}
        <div style={{ height:56, borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', background:'var(--bg)', position:'sticky', top:0, zIndex:50 }} className="desktop-topbar">
          <p style={{ fontSize:15, fontWeight:700, letterSpacing:-0.2 }}>{pageTitle()}</p>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={toggleStatus} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--faint)', border:'1px solid var(--line)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--fg)', fontFamily:'inherit', transition:'all 0.2s' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: status === 'active' ? 'var(--green)' : 'var(--muted)' }} />
              {status === 'active' ? 'Active' : 'Paused'}
            </button>
            <Link href="/dashboard/notifications" style={{ width:34, height:34, borderRadius:8, background:'var(--faint)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', textDecoration:'none', color:'var(--fg)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10.5a1 1 0 0 1-1 1H5l-3 2.5V3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v7.5z"/></svg>
              {(unreadMessages + unreadNotifs) > 0 && <span style={{ position:'absolute', top:6, right:6, width:6, height:6, borderRadius:'50%', background:'var(--red)' }} />}
            </Link>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#090E1A', cursor:'pointer' }}>{ini}</div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex:1 }}>{children}</div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, background:'var(--bg2)', borderTop:'1px solid var(--line)', padding:'8px 0 12px', zIndex:200 }} className="mobile-nav">
        <div style={{ display:'flex', justifyContent:'space-around' }}>
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
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                cursor:'pointer', padding:'4px 16px',
                fontSize:10, fontWeight:600,
                color: active ? 'var(--acc)' : 'var(--muted)',
                textDecoration:'none', transition:'color 0.2s', position:'relative',
              }}>
                {badge > 0 && (
                  <span style={{ position:'absolute', top:-2, right:10, width:7, height:7, borderRadius:'50%', background: item.badgeRed ? 'var(--red)' : 'var(--acc)' }} />
                )}
                <span style={{ width:22, height:22 }}>{mobileIcons[idx]}</span>
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
