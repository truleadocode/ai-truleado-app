import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function statusChip(status: string) {
  switch (status) {
    case 'offered':     return { label: 'New offer',   cls: 'chip-gold' }
    case 'interested':  return { label: 'Interested',  cls: 'chip-blue' }
    case 'confirmed':
    case 'in_progress': return { label: 'In progress', cls: 'chip-green' }
    default:            return { label: status,         cls: 'chip-muted' }
  }
}

const CHIP_STYLES: Record<string, React.CSSProperties> = {
  'chip-gold':  { background: 'var(--gold-bg)',  color: 'var(--gold)',  border: '1px solid var(--gold-border)' },
  'chip-blue':  { background: 'var(--blue-bg)',  color: 'var(--blue)',  border: '1px solid var(--blue-border)' },
  'chip-green': { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' },
  'chip-muted': { background: 'var(--surface)',  color: 'var(--text-2)',border: '1px solid var(--border)' },
}

export default async function DashboardHome() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: influencer } = await supabase
    .from('influencers')
    .select('id, first_name, onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (!influencer) redirect('/')

  const { data: allGigs } = await supabase.from('gigs').select('id, status, budget_eur').eq('influencer_id', influencer.id)
  const totalGigs = allGigs?.length || 0
  const activeGigsCount = allGigs?.filter(g => ['offered','interested','confirmed','in_progress'].includes(g.status)).length || 0
  const earned = allGigs?.filter(g => g.status === 'complete').reduce((sum, g) => sum + (g.budget_eur || 0), 0) || 0

  const { data: activeGigRows } = await supabase
    .from('gigs')
    .select('id, brand_category, brand_name, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, status')
    .eq('influencer_id', influencer.id)
    .in('status', ['offered', 'interested', 'confirmed', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: recentMessages } = await supabase
    .from('gig_messages')
    .select('id, content, created_at, read_by_influencer, gig_id')
    .eq('sender_type', 'sarah')
    .in('gig_id', (activeGigRows || []).map(g => g.id))
    .order('created_at', { ascending: false })
    .limit(2)

  const { data: platforms } = await supabase.from('influencer_platforms').select('id, parse_status').eq('influencer_id', influencer.id)
  const { data: rates } = await supabase.from('influencer_rates').select('id').eq('influencer_id', influencer.id)
  const { data: inf } = await supabase.from('influencers').select('bio, primary_niche, avatar_url, ai_summary').eq('id', influencer.id).single()

  let score = 0
  if (inf?.bio) score += 20
  if (inf?.primary_niche) score += 20
  if (platforms?.length) score += 20
  if (platforms?.some(p => p.parse_status === 'complete')) score += 20
  if (rates?.length) score += 20
  const completionPct = score

  const r = 20
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (completionPct / 100) * circumference

  return (
    <div style={{ padding: '24px 28px 48px' }}>

      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, letterSpacing: '-0.3px', marginBottom: 3, color: 'var(--text)' }}>
          Good morning, {influencer.first_name}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {activeGigsCount > 0 ? `You have ${activeGigsCount} active gig${activeGigsCount > 1 ? 's' : ''}.` : 'No active gigs right now.'}
        </p>
      </div>

      {/* Completion card */}
      {completionPct < 100 && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 48, height: 48, flexShrink: 0, position: 'relative' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4"/>
              <circle cx="24" cy="24" r={r} fill="none" stroke="var(--gold)" strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{completionPct}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: 'var(--text)' }}>Profile is {completionPct}% complete</h4>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {!inf?.bio ? 'Add a bio. ' : ''}{!platforms?.length ? 'Add social accounts. ' : ''}{!platforms?.some(p => p.parse_status === 'complete') ? 'Upload screenshots to parse your stats.' : ''}
            </p>
          </div>
          <Link href="/profile/edit" style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--gold)', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Complete profile
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total gigs', value: totalGigs, sub: 'Since joining', valueColor: 'var(--text)' },
          { label: 'Active now', value: activeGigsCount, sub: 'In progress', valueColor: 'var(--green)' },
          { label: 'Earned', value: formatEur(earned), sub: 'All time', valueColor: 'var(--gold)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1, color: s.valueColor }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active gigs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px', color: 'var(--text)' }}>Active gigs</p>
        <Link href="/dashboard/gigs" style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all →</Link>
      </div>

      {(activeGigRows || []).length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 20px', textAlign: 'center', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>No active gigs yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Sarah will reach out when a campaign matches your profile.</p>
        </div>
      ) : (activeGigRows || []).map(gig => {
        const chip = statusChip(gig.status)
        const chipStyle = CHIP_STYLES[chip.cls]
        return (
          <Link key={gig.id} href={`/gigs/${gig.id}`} style={{ display: 'block', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 10, textDecoration: 'none', color: 'var(--text)', boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {gig.brand_revealed ? '🌿' : '🔒'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, letterSpacing: '-0.1px' }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{gig.platform} · {gig.deliverables_summary}</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0, ...chipStyle }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: 'blink 1.4s infinite' }} />
                {chip.label}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {gig.respond_by && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ width: 13, height: 13 }}><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l1.5 1.5"/></svg>
                  Respond by <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{new Date(gig.respond_by).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                </div>
              )}
              {gig.budget_eur && (
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Budget <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{formatEur(gig.budget_eur)}</strong>
                </div>
              )}
            </div>
            {gig.status === 'offered' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <button style={{ flex: 1, padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--gold)', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View offer</button>
                <button style={{ flex: 1, padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Not interested</button>
              </div>
            )}
          </Link>
        )
      })}

      {/* Messages preview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px', color: 'var(--text)' }}>Messages</p>
        <Link href="/dashboard/messages" style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>See all →</Link>
      </div>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0 18px', boxShadow: 'var(--shadow-sm)' }}>
        {(recentMessages || []).length === 0 ? (
          <p style={{ padding: '20px 0', fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>No messages yet</p>
        ) : (recentMessages || []).map((msg, i) => (
          <Link key={msg.id} href="/dashboard/messages" style={{
            display: 'flex', gap: 12, padding: '14px 0', textDecoration: 'none', color: 'var(--text)',
            borderBottom: i < (recentMessages?.length || 0) - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-bg)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>SC</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sarah Chen</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{new Date(msg.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</p>
              </div>
              <p style={{ fontSize: 12, color: msg.read_by_influencer ? 'var(--text-2)' : 'var(--text)', fontWeight: msg.read_by_influencer ? 400 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content}</p>
            </div>
            {!msg.read_by_influencer && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 3 }} />}
          </Link>
        ))}
      </div>
    </div>
  )
}
