import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function statusLabel(status: string) {
  switch (status) {
    case 'offered':    return { label: 'New offer',   color: 'var(--acc)',   bg: 'var(--acc2)',   border: 'var(--acc3)' }
    case 'interested': return { label: 'Interested',  color: 'var(--blue)',  bg: 'var(--blue2)',  border: 'var(--blue3)' }
    case 'confirmed':
    case 'in_progress':return { label: 'In progress', color: 'var(--green)', bg: 'var(--green2)', border: 'var(--green3)' }
    default:           return { label: status,         color: 'var(--muted)', bg: 'var(--faint)',  border: 'var(--line)' }
  }
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

  // Stats
  const { data: allGigs } = await supabase.from('gigs').select('id, status, budget_eur').eq('influencer_id', influencer.id)
  const totalGigs = allGigs?.length || 0
  const activeGigs = allGigs?.filter(g => ['offered','interested','confirmed','in_progress'].includes(g.status)).length || 0
  const earned = allGigs?.filter(g => g.status === 'complete').reduce((sum, g) => sum + (g.budget_eur || 0), 0) || 0

  // Active gigs for display
  const { data: activeGigRows } = await supabase
    .from('gigs')
    .select('id, brand_category, brand_name, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, status')
    .eq('influencer_id', influencer.id)
    .in('status', ['offered', 'interested', 'confirmed', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(3)

  // Recent messages
  const { data: recentMessages } = await supabase
    .from('gig_messages')
    .select('id, content, created_at, read_by_influencer, gig_id')
    .eq('sender_type', 'sarah')
    .in('gig_id', (activeGigRows || []).map(g => g.id))
    .order('created_at', { ascending: false })
    .limit(3)

  // Profile completion score
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

  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference - (completionPct / 100) * circumference

  return (
    <div style={{ padding:'24px 28px 40px' }}>

      {/* Completion banner */}
      {completionPct < 100 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--acc3)', borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{ width:52, height:52, flexShrink:0, position:'relative' }}>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" strokeWidth="4"/>
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--acc)" strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'var(--acc)' }}>{completionPct}%</div>
          </div>
          <div style={{ flex:1 }}>
            <h4 style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>Profile is {completionPct}% complete</h4>
            <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
              {!inf?.bio ? 'Add a bio. ' : ''}{!platforms?.length ? 'Add social accounts. ' : ''}{!platforms?.some(p => p.parse_status === 'complete') ? 'Upload screenshots so AI can parse your stats.' : ''}
            </p>
          </div>
          <Link href="/profile/edit" style={{ fontSize:12, fontWeight:700, color:'#090E1A', background:'var(--acc)', border:'none', borderRadius:7, padding:'8px 14px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, textDecoration:'none' }}>Complete profile</Link>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px' }}>
          <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:6 }}>Total gigs</p>
          <p style={{ fontSize:26, fontWeight:800, letterSpacing:-1, lineHeight:1, marginBottom:4 }}>{totalGigs}</p>
          <p style={{ fontSize:12, color:'var(--muted)' }}>Since joining</p>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px' }}>
          <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:6 }}>Active now</p>
          <p style={{ fontSize:26, fontWeight:800, letterSpacing:-1, lineHeight:1, marginBottom:4, color:'var(--green)' }}>{activeGigs}</p>
          <p style={{ fontSize:12, color:'var(--muted)' }}>In progress</p>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px' }}>
          <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:6 }}>Earned</p>
          <p style={{ fontSize:26, fontWeight:800, letterSpacing:-1, lineHeight:1, marginBottom:4 }}>{formatEur(earned)}</p>
          <p style={{ fontSize:12, color:'var(--muted)' }}>All time</p>
        </div>
      </div>

      {/* Active gigs */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ fontSize:14, fontWeight:700, letterSpacing:-0.2 }}>Active gigs</p>
        <Link href="/dashboard/gigs" style={{ fontSize:12, fontWeight:600, color:'var(--acc)', textDecoration:'none' }}>See all →</Link>
      </div>

      {(activeGigRows || []).length === 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'32px 20px', textAlign:'center', marginBottom:20 }}>
          <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No active gigs yet</p>
          <p style={{ fontSize:13, color:'var(--muted)' }}>Sarah will reach out when a campaign matches your profile.</p>
        </div>
      )}

      {(activeGigRows || []).map(gig => {
        const st = statusLabel(gig.status)
        return (
          <Link key={gig.id} href={`/gigs/${gig.id}`} style={{ display:'block', background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px', marginBottom:10, cursor:'pointer', textDecoration:'none', color:'var(--fg)', transition:'border-color 0.2s' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'var(--bg3)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {gig.brand_revealed ? '🌿' : '🔒'}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
                <p style={{ fontSize:12, color:'var(--muted)' }}>{gig.platform} · {gig.deliverables_summary}</p>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, flexShrink:0 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', animation:'pulse 1.4s infinite' }} />
                {st.label}
              </div>
            </div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {gig.respond_by && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--muted)' }}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ width:13, height:13 }}><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2"/></svg>
                  Respond by <strong style={{ color:'var(--fg)' }}>{new Date(gig.respond_by).toLocaleDateString('en-GB', { weekday:'short', month:'short', day:'numeric' })}</strong>
                </div>
              )}
              {gig.content_due_at && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--muted)' }}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ width:13, height:13 }}><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2"/></svg>
                  Content due <strong style={{ color:'var(--fg)' }}>{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</strong>
                </div>
              )}
              {gig.budget_eur && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--muted)' }}>
                  Budget <strong style={{ color:'var(--fg)' }}>{formatEur(gig.budget_eur)}</strong>
                </div>
              )}
            </div>
            {gig.status === 'offered' && (
              <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid var(--line)' }}>
                <div style={{ flex:1, borderRadius:8, padding:9, background:'var(--acc)', color:'#090E1A', fontSize:13, fontWeight:700, textAlign:'center' }}>View offer</div>
                <div style={{ flex:1, borderRadius:8, padding:9, background:'var(--red2)', color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)', fontSize:13, fontWeight:700, textAlign:'center' }}>Not interested</div>
              </div>
            )}
          </Link>
        )
      })}

      {/* Recent messages */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8, marginBottom:12 }}>
        <p style={{ fontSize:14, fontWeight:700, letterSpacing:-0.2 }}>Messages</p>
        <Link href="/dashboard/messages" style={{ fontSize:12, fontWeight:600, color:'var(--acc)', textDecoration:'none' }}>See all →</Link>
      </div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'0 20px' }}>
        {(recentMessages || []).length === 0 ? (
          <p style={{ padding:'20px 0', fontSize:13, color:'var(--muted)', textAlign:'center' }}>No messages yet</p>
        ) : (recentMessages || []).map((msg, i) => (
          <Link key={msg.id} href="/dashboard/messages" style={{
            display:'flex', gap:12, padding:'14px 0', textDecoration:'none', color:'var(--fg)',
            borderBottom: i < (recentMessages?.length || 0) - 1 ? '1px solid var(--line)' : 'none',
          }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--acc)', color:'#090E1A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>SC</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                <p style={{ fontSize:13, fontWeight:700 }}>Sarah Chen</p>
                <p style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto', flexShrink:0 }}>
                  {new Date(msg.created_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}
                </p>
              </div>
              <p style={{ fontSize:13, color: msg.read_by_influencer ? 'var(--muted)' : 'var(--fg)', fontWeight: msg.read_by_influencer ? 400 : 500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{msg.content}</p>
            </div>
            {!msg.read_by_influencer && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--acc)', flexShrink:0, marginTop:4 }} />}
          </Link>
        ))}
      </div>
    </div>
  )
}
