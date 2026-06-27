import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

const STATUS_TABS = [
  { key: 'active',    label: 'Active',    statuses: ['offered','interested','confirmed','in_progress'] },
  { key: 'complete',  label: 'Completed', statuses: ['complete'] },
  { key: 'passed',    label: 'Passed',    statuses: ['passed','rejected'] },
]

function statusBadge(status: string) {
  switch (status) {
    case 'offered':     return { label: 'New offer',   color:'var(--acc)',   bg:'rgba(196,154,60,0.12)',   border:'rgba(196,154,60,0.3)' }
    case 'interested':  return { label: 'Interested',  color:'var(--blue)',  bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.3)' }
    case 'confirmed':   return { label: 'Confirmed',   color:'var(--green)', bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.3)' }
    case 'in_progress': return { label: 'In progress', color:'var(--green)', bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.3)' }
    case 'complete':    return { label: 'Complete',    color:'var(--green)', bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.3)' }
    case 'passed':      return { label: 'Passed',      color:'var(--muted)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)' }
    case 'rejected':    return { label: 'Not interested', color:'var(--red)', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.2)' }
    default:            return { label: status, color:'var(--muted)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)' }
  }
}

export default async function GigsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
  if (!influencer) redirect('/')

  const activeTab = searchParams.tab || 'active'
  const tab = STATUS_TABS.find(t => t.key === activeTab) || STATUS_TABS[0]

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, brand_category, brand_name, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, status, created_at')
    .eq('influencer_id', influencer.id)
    .in('status', tab.statuses)
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding:'24px 28px 40px' }}>
      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--bg2)', borderRadius:10, padding:4, width:'fit-content', marginBottom:20 }}>
        {STATUS_TABS.map(t => (
          <Link key={t.key} href={`/dashboard/gigs?tab=${t.key}`} style={{
            padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600,
            color: activeTab === t.key ? 'var(--fg)' : 'var(--muted)',
            background: activeTab === t.key ? 'var(--bg3)' : 'transparent',
            textDecoration:'none', transition:'all 0.2s',
          }}>{t.label}</Link>
        ))}
      </div>

      {/* Gig list */}
      {(!gigs || gigs.length === 0) && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'48px 24px', textAlign:'center' }}>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No {tab.label.toLowerCase()} gigs</p>
          <p style={{ fontSize:13, color:'var(--muted)' }}>
            {activeTab === 'active' ? "Sarah will reach out when a campaign matches your profile." :
             activeTab === 'complete' ? "Completed gigs will appear here." :
             "Gigs you passed on will appear here."}
          </p>
        </div>
      )}

      {(gigs || []).map(gig => {
        const badge = statusBadge(gig.status)
        return (
          <Link key={gig.id} href={`/gigs/${gig.id}`} style={{ display:'block', background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px', marginBottom:10, textDecoration:'none', color:'var(--fg)', transition:'border-color 0.15s' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'var(--bg3)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {gig.brand_revealed ? '🌿' : '🔒'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                  <p style={{ fontSize:14, fontWeight:700 }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, flexShrink:0 }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>{gig.platform} · {gig.deliverables_summary}</p>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  {gig.budget_eur && (
                    <span style={{ fontSize:12, color:'var(--muted)' }}>Budget <strong style={{ color:'var(--fg)' }}>{formatEur(gig.budget_eur)}</strong></span>
                  )}
                  {gig.respond_by && activeTab === 'active' && (
                    <span style={{ fontSize:12, color:'var(--muted)' }}>Respond by <strong style={{ color:'var(--fg)' }}>{new Date(gig.respond_by).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</strong></span>
                  )}
                  {gig.content_due_at && (
                    <span style={{ fontSize:12, color:'var(--muted)' }}>Content due <strong style={{ color:'var(--fg)' }}>{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</strong></span>
                  )}
                  <span style={{ fontSize:12, color:'var(--muted)', marginLeft:'auto' }}>{new Date(gig.created_at).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' })}</span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
