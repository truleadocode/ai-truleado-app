import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

const STATUS_TABS = [
  { key: 'active',   label: 'Active',    statuses: ['offered','interested','confirmed','in_progress'] },
  { key: 'complete', label: 'Completed', statuses: ['complete'] },
  { key: 'passed',   label: 'Passed',    statuses: ['passed','rejected'] },
]

function statusBadge(status: string) {
  switch (status) {
    case 'offered':     return { label: 'New offer',      style: { background: 'var(--gold-bg)',  color: 'var(--gold)',  border: '1px solid var(--gold-border)'  } }
    case 'interested':  return { label: 'Interested',     style: { background: 'var(--blue-bg)',  color: 'var(--blue)',  border: '1px solid var(--blue-border)'  } }
    case 'confirmed':
    case 'in_progress': return { label: 'In progress',    style: { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' } }
    case 'complete':    return { label: 'Complete',        style: { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' } }
    case 'passed':      return { label: 'Passed',          style: { background: 'var(--surface)',  color: 'var(--text-2)',border: '1px solid var(--border)'       } }
    case 'rejected':    return { label: 'Not interested',  style: { background: 'var(--red-bg)',   color: 'var(--red)',   border: '1px solid var(--red-border)'   } }
    default:            return { label: status,            style: { background: 'var(--surface)',  color: 'var(--text-2)',border: '1px solid var(--border)'       } }
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
    <div style={{ padding: '24px 28px 48px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {STATUS_TABS.map(t => (
          <Link key={t.key} href={`/dashboard/gigs?tab=${t.key}`} style={{
            padding: '10px 16px', fontSize: 13,
            fontWeight: activeTab === t.key ? 600 : 500,
            color: activeTab === t.key ? 'var(--gold)' : 'var(--text-2)',
            borderBottom: activeTab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
            marginBottom: -1, textDecoration: 'none', transition: 'color 0.15s',
          }}>{t.label}</Link>
        ))}
      </div>

      {(!gigs || gigs.length === 0) && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>No {tab.label.toLowerCase()} gigs</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {activeTab === 'active' ? 'Sarah will reach out when a campaign matches your profile.' :
             activeTab === 'complete' ? 'Completed gigs will appear here.' :
             'Gigs you passed on will appear here.'}
          </p>
        </div>
      )}

      {(gigs || []).map(gig => {
        const badge = statusBadge(gig.status)
        const isComplete = gig.status === 'complete' || gig.status === 'passed' || gig.status === 'rejected'
        return (
          <Link key={gig.id} href={`/gigs/${gig.id}`} style={{
            display: 'block', background: 'var(--white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 10,
            textDecoration: 'none', color: 'var(--text)', boxShadow: 'var(--shadow-sm)',
            opacity: isComplete ? 0.65 : 1,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {gig.brand_revealed ? '🌿' : '🔒'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px' }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0, ...badge.style }}>
                    {['offered','interested','confirmed','in_progress'].includes(gig.status) && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: 'blink 1.4s infinite', display: 'inline-block' }} />
                    )}
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>{gig.platform} · {gig.deliverables_summary}</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {gig.budget_eur && (
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Budget <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{formatEur(gig.budget_eur)}</strong></span>
                  )}
                  {gig.respond_by && activeTab === 'active' && (
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Respond by <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{new Date(gig.respond_by).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</strong></span>
                  )}
                  {gig.content_due_at && (
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Content due <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</strong></span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{new Date(gig.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
