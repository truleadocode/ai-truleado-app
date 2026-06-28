'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:           { label: 'Draft',            color: 'var(--text-2)', bg: 'var(--surface)',  border: 'var(--border)' },
  submitted:       { label: 'Submitted',        color: 'var(--blue)',   bg: 'var(--blue-bg)', border: 'var(--blue-border)' },
  matching:        { label: 'Finding creators', color: 'var(--gold)',   bg: 'var(--gold-bg)', border: 'var(--gold-border)' },
  shortlist_ready: { label: 'Shortlist ready',  color: 'var(--green)',  bg: 'var(--green-bg)',border: 'var(--green-border)' },
  paused:          { label: 'Paused',           color: 'var(--text-2)', bg: 'var(--surface)',  border: 'var(--border)' },
  archived:        { label: 'Archived',         color: 'var(--text-3)', bg: 'var(--surface)',  border: 'var(--border)' },
  needs_review:    { label: 'Under review',     color: 'var(--red)',    bg: 'var(--red-bg)',  border: 'var(--red-border)' },
  closed:          { label: 'Closed',           color: 'var(--text-3)', bg: 'var(--surface)',  border: 'var(--border)' },
}

export default function BriefDetailClient({ brief: initialBrief, matches: initialMatches, advertiser }: { brief: any; matches: any[]; advertiser: any }) {
  const [brief, setBrief] = useState(initialBrief)
  const [matches, setMatches] = useState(initialMatches)
  const [deciding, setDeciding] = useState<string | null>(null)
  const supabase = createClient()

  // Realtime: watch brief counters and new matches
  useEffect(() => {
    const briefChannel = supabase.channel('brief-detail')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'briefs', filter: `id=eq.${brief.id}` },
        payload => setBrief((prev: any) => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brief_matches', filter: `brief_id=eq.${brief.id}` },
        () => { window.location.reload() } // Reload to get full match with joined influencer data
      )
      .subscribe()
    return () => { supabase.removeChannel(briefChannel) }
  }, [brief.id])

  async function makeDecision(matchId: string, decision: 'confirmed' | 'passed') {
    setDeciding(matchId)
    await supabase.from('brief_matches').update({
      advertiser_decision: decision,
      advertiser_decided_at: new Date().toISOString(),
      status: decision === 'confirmed' ? 'advertiser_confirmed' : 'advertiser_passed',
    }).eq('id', matchId)

    setMatches((prev: any[]) => prev.map(m => m.id === matchId ? { ...m, advertiser_decision: decision, status: decision === 'confirmed' ? 'advertiser_confirmed' : 'advertiser_passed' } : m))

    if (decision === 'confirmed') {
      // Trigger handoff email
      await fetch('/api/advertiser/confirm-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, brief_id: brief.id }),
      })
    }
    setDeciding(null)
  }

  const st = STATUS_CONFIG[brief.status] || STATUS_CONFIG.draft
  const confirmedCount = matches.filter(m => m.status === 'advertiser_confirmed').length
  const pendingMatches = matches.filter(m => m.status === 'creator_confirmed')
  const confirmedMatches = matches.filter(m => m.status === 'advertiser_confirmed')

  return (
    <div style={{ minHeight:'100vh', background:'var(--surface)', fontFamily:'Inter, sans-serif' }}>
      {/* Topbar */}
      <div style={{ height:56, background:'var(--white)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, padding:'0 24px', position:'sticky', top:0, zIndex:50 }}>
        <Link href="/advertiser/dashboard" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-2)', textDecoration:'none', fontWeight:600 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Briefs
        </Link>
        <span style={{ width:1, height:16, background:'var(--border)' }} />
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{brief.title}</span>
        <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 24px', display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>

        {/* LEFT: shortlist */}
        <div>
          {/* Matching progress */}
          {(brief.status === 'matching' || brief.status === 'shortlist_ready') && (
            <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p style={{ fontSize:14, fontWeight:700 }}>Matching progress</p>
                {brief.status === 'matching' && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)', animation:'pulse 1.5s infinite' }} />
                    <span style={{ fontSize:12, color:'var(--gold)', fontWeight:600 }}>Finding creators…</span>
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                {[
                  ['Contacted', brief.creators_contacted || 0],
                  ['Confirmed', brief.creators_confirmed || 0],
                  ['Needed', brief.creators_needed || 5],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ background:'var(--surface)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                    <p style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px' }}>{val}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)', fontWeight:500 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortlist */}
          {pendingMatches.length === 0 && confirmedMatches.length === 0 && brief.status === 'matching' && (
            <div style={{ background:'var(--white)', border:'2px dashed var(--border)', borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Sarah is finding creators</p>
              <p style={{ fontSize:13, color:'var(--text-2)' }}>Creator cards will appear here as they confirm interest. We'll email you when your shortlist is ready.</p>
            </div>
          )}

          {confirmedMatches.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Confirmed ({confirmedMatches.length})</p>
              {confirmedMatches.map((match: any) => <MatchCard key={match.id} match={match} onDecide={makeDecision} deciding={deciding} />)}
            </div>
          )}

          {pendingMatches.length > 0 && (
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Awaiting your decision ({pendingMatches.length})</p>
              {pendingMatches.map((match: any) => <MatchCard key={match.id} match={match} onDecide={makeDecision} deciding={deciding} />)}
            </div>
          )}
        </div>

        {/* RIGHT: brief summary */}
        <div>
          <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', position:'sticky', top:72 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Brief summary</p>
            {[
              ['Brand', brief.brand_name],
              ['Product', brief.product_description],
              ['Platforms', brief.platforms?.join(', ')],
              ['Content', brief.content_types?.join(', ')],
              ['Creators', brief.creators_needed],
              ['Budget', brief.budget_flexible ? 'Flexible' : brief.budget_per_creator_eur ? `€${Math.round(brief.budget_per_creator_eur/100)}` : '—'],
              ['Audience', [brief.target_age_range, brief.target_gender !== 'all' ? brief.target_gender : null].filter(Boolean).join(', ')],
              ['Countries', brief.target_countries?.join(', ')],
              ['Go-live', brief.go_live_date ? new Date(brief.go_live_date).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : '—'],
              ['Niche', brief.niche_fit],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={String(label)} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-2)', flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:500, textAlign:'right', color:'var(--text)' }}>{String(value)}</span>
              </div>
            ))}
            {brief.tone_notes && (
              <div style={{ marginTop:12, padding:12, background:'var(--surface)', borderRadius:8 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', marginBottom:4 }}>Tone notes</p>
                <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{brief.tone_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

function MatchCard({ match, onDecide, deciding }: { match: any; onDecide: (id: string, decision: 'confirmed'|'passed') => void; deciding: string | null }) {
  const inf = match.influencer
  const platforms = inf?.platforms || []
  const isConfirmed = match.status === 'advertiser_confirmed'
  const isPassed = match.status === 'advertiser_passed'
  const isPending = match.status === 'creator_confirmed'

  return (
    <div style={{ background:'var(--white)', border:`1px solid ${isConfirmed ? '#a7f3d0' : 'var(--border)'}`, borderRadius:14, padding:'18px 20px', marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Platform stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginBottom:14 }}>
        {platforms.slice(0,2).map((p: any) => (
          <div key={p.platform} style={{ background:'var(--surface)', borderRadius:8, padding:'10px 12px' }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'capitalize', marginBottom:4 }}>{p.platform}</p>
            <p style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.3px' }}>{p.followers ? (p.followers >= 1000 ? `${(p.followers/1000).toFixed(1)}K` : p.followers) : '—'}</p>
            <p style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>{p.engagement_rate ? `${p.engagement_rate}% eng.` : ''}</p>
          </div>
        ))}
      </div>

      {/* Audience info */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {platforms[0]?.audience_age_range && <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)' }}>Age {platforms[0].audience_age_range}</span>}
        {platforms[0]?.audience_gender_split && <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{platforms[0].audience_gender_split}</span>}
        {platforms[0]?.audience_top_countries?.[0] && <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{platforms[0].audience_top_countries[0]}</span>}
        {inf?.primary_niche && <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--gold-bg)', border:'1px solid var(--gold-border)', color:'var(--gold)', fontWeight:600 }}>{inf.primary_niche}</span>}
      </div>

      {/* Why matched */}
      {match.match_reason && (
        <div style={{ background:'var(--gold-bg)', borderLeft:'3px solid var(--gold)', borderRadius:'0 8px 8px 0', padding:'10px 14px', marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--gold)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Why we matched them</p>
          <p style={{ fontSize:12, lineHeight:1.6, color:'var(--text)' }}>{match.match_reason}</p>
          <p style={{ fontSize:11, color:'var(--gold)', fontWeight:700, marginTop:6 }}>Match score: {match.score}/100</p>
        </div>
      )}

      {/* Confirmed identity reveal */}
      {isConfirmed && (
        <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--green)', marginBottom:2 }}>✓ Confirmed — contact details sent to your email</p>
          <p style={{ fontSize:12, color:'var(--text-2)' }}>The creator has been notified. Reach out directly to coordinate.</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={() => onDecide(match.id, 'confirmed')}
            disabled={deciding === match.id}
            style={{ flex:2, background:'var(--gold)', color:'#fff', border:'none', borderRadius:9, padding:'10px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: deciding === match.id ? 0.7 : 1 }}
          >
            {deciding === match.id ? 'Confirming…' : '✓ Confirm this creator'}
          </button>
          <button
            onClick={() => onDecide(match.id, 'passed')}
            disabled={deciding === match.id}
            style={{ flex:1, background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:9, padding:'10px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
          >
            ✗ Pass
          </button>
        </div>
      )}
    </div>
  )
}
