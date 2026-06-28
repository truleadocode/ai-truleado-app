import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdvertiserDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/advertiser')

  const { data: advertiser } = await supabase.from('advertisers').select('*').eq('user_id', user.id).single()
  if (!advertiser) redirect('/advertiser')

  const { data: briefs } = await supabase.from('briefs').select('*').eq('advertiser_id', advertiser.id).order('created_at', { ascending: false })

  const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft:            { label: 'Draft',             color: 'var(--text-2)',  bg: 'var(--surface)',    border: 'var(--border)' },
    submitted:        { label: 'Submitted',         color: 'var(--blue)',    bg: 'var(--blue-bg)',    border: 'var(--blue-border)' },
    matching:         { label: 'Finding creators',  color: 'var(--gold)',    bg: 'var(--gold-bg)',    border: 'var(--gold-border)' },
    shortlist_ready:  { label: 'Shortlist ready',   color: 'var(--green)',   bg: 'var(--green-bg)',   border: 'var(--green-border)' },
    paused:           { label: 'Paused',            color: 'var(--text-2)',  bg: 'var(--surface)',    border: 'var(--border)' },
    archived:         { label: 'Archived',          color: 'var(--text-3)',  bg: 'var(--surface)',    border: 'var(--border)' },
    needs_review:     { label: 'Needs review',      color: 'var(--red)',     bg: 'var(--red-bg)',     border: 'var(--red-border)' },
    closed:           { label: 'Closed',            color: 'var(--text-3)',  bg: 'var(--surface)',    border: 'var(--border)' },
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--surface)', fontFamily:'Inter, sans-serif' }}>
      {/* Topbar */}
      <div style={{ height:56, background:'var(--white)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.4px' }}>Truleado</span>
          <span style={{ width:1, height:16, background:'var(--border)', margin:'0 4px' }} />
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:500 }}>Brand portal</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--text-2)' }}>{advertiser.company_name || advertiser.email}</span>
          <Link href="/advertiser/settings" style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', textDecoration:'none', padding:'6px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--white)' }}>Settings</Link>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>Your briefs</h1>
            <p style={{ fontSize:13, color:'var(--text-2)' }}>
              {briefs?.length ? `${briefs.length} brief${briefs.length !== 1 ? 's' : ''} total` : 'No briefs yet'}
            </p>
          </div>
          <Link href="/advertiser/briefs/new" style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:10, padding:'11px 20px', fontSize:13, fontWeight:700, textDecoration:'none', display:'inline-block' }}>
            + New brief
          </Link>
        </div>

        {/* Empty state */}
        {(!briefs || briefs.length === 0) && (
          <div style={{ background:'var(--white)', border:'2px dashed var(--border)', borderRadius:16, padding:'56px 32px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📋</div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Create your first brief</h3>
            <p style={{ fontSize:14, color:'var(--text-2)', marginBottom:24, maxWidth:380, margin:'0 auto 24px' }}>
              Tell Sarah what you're looking for and she'll find the right creators. Your first brief is completely free.
            </p>
            <Link href="/advertiser/briefs/new" style={{ background:'var(--gold)', color:'#fff', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:700, textDecoration:'none', display:'inline-block' }}>
              Create brief with Sarah →
            </Link>
          </div>
        )}

        {/* Brief list */}
        {briefs && briefs.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {briefs.map((brief: any) => {
              const st = STATUS_LABELS[brief.status] || STATUS_LABELS.draft
              return (
                <Link key={brief.id} href={`/advertiser/briefs/${brief.id}`} style={{ textDecoration:'none' }}>
                  <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)' }}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                      <div>
                        <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{brief.title || brief.brand_name || 'Untitled brief'}</p>
                        <p style={{ fontSize:12, color:'var(--text-2)' }}>{brief.brand_name}{brief.product_description ? ` · ${brief.product_description.slice(0,60)}${brief.product_description.length > 60 ? '…' : ''}` : ''}</p>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                      {brief.platforms?.length > 0 && <span style={{ fontSize:12, color:'var(--text-2)' }}>📱 {brief.platforms.join(' · ')}</span>}
                      {brief.creators_needed && <span style={{ fontSize:12, color:'var(--text-2)' }}>👥 {brief.creators_confirmed || 0}/{brief.creators_needed} creators</span>}
                      {brief.budget_per_creator_eur && <span style={{ fontSize:12, color:'var(--text-2)' }}>💶 €{Math.round(brief.budget_per_creator_eur/100)} per creator</span>}
                      <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:'auto' }}>{new Date(brief.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                    </div>
                    {brief.status === 'matching' && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)', animation:'pulse 1.5s infinite' }} />
                        <span style={{ fontSize:12, color:'var(--text-2)' }}>{brief.creators_contacted || 0} creators contacted · {brief.creators_confirmed || 0} confirmed so far</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
