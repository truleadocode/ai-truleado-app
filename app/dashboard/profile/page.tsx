import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function fmt(v: number | null | undefined, suffix = '') {
  if (!v) return '—'
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M${suffix}`
  if (v >= 1000) return `${(v/1000).toFixed(1)}K${suffix}`
  return `${v}${suffix}`
}

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: inf } = await supabase
    .from('influencers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!inf) redirect('/')

  const { data: platforms } = await supabase
    .from('influencer_platforms')
    .select('*')
    .eq('influencer_id', inf.id)
    .order('created_at', { ascending: true })

  const { data: rates } = await supabase
    .from('influencer_rates')
    .select('*')
    .eq('influencer_id', inf.id)

  return (
    <div style={{ padding:'24px 28px 40px', maxWidth:680 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          {inf.avatar_url ? (
            <img src={inf.avatar_url} alt="Avatar" style={{ width:60, height:60, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--line)', flexShrink:0 }} />
          ) : (
            <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#090E1A', flexShrink:0 }}>
              {inf.first_name?.[0]}{inf.last_name?.[0]}
            </div>
          )}
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5, marginBottom:3 }}>{inf.first_name} {inf.last_name}</h2>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {inf.city && <span style={{ fontSize:12, color:'var(--muted)' }}>{inf.city}{inf.country ? `, ${inf.country}` : ''}</span>}
              {inf.primary_niche && <span style={{ fontSize:12, color:'var(--acc)', fontWeight:600, background:'var(--acc2)', padding:'2px 8px', borderRadius:20, border:'1px solid var(--acc3)' }}>{inf.primary_niche}</span>}
              <span style={{
                fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:20,
                background: inf.status === 'active' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                color: inf.status === 'active' ? 'var(--green)' : 'var(--muted)',
                border: `1px solid ${inf.status === 'active' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}>{inf.status}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/profile/view" style={{ fontSize:12, fontWeight:700, color:'var(--fg)', background:'var(--bg3)', border:'1px solid var(--line)', padding:'8px 14px', borderRadius:8, textDecoration:'none', flexShrink:0 }}>View profile</Link>
          <Link href="/profile/edit" style={{ fontSize:12, fontWeight:700, color:'#090E1A', background:'var(--acc)', padding:'8px 14px', borderRadius:8, textDecoration:'none', flexShrink:0 }}>Edit profile</Link>
        </div>
      </div>

      {/* AI Summary */}
      {inf.ai_summary && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--acc3)', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--acc)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>AI Summary</p>
          <p style={{ fontSize:13, lineHeight:1.6, color:'var(--muted)' }}>{inf.ai_summary}</p>
        </div>
      )}

      {/* About */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>About</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px' }}>
          {inf.bio && <div style={{ gridColumn:'1 / -1' }}>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>Bio</p>
            <p style={{ fontSize:13 }}>{inf.bio}</p>
          </div>}
          {inf.phone && <div>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>Phone</p>
            <p style={{ fontSize:13 }}>{inf.phone}</p>
          </div>}
          {inf.languages?.length > 0 && <div>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>Languages</p>
            <p style={{ fontSize:13 }}>{inf.languages.join(', ')}</p>
          </div>}
          {inf.content_style && <div>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>Content style</p>
            <p style={{ fontSize:13 }}>{inf.content_style}</p>
          </div>}
          {inf.formats?.length > 0 && <div>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>Formats</p>
            <p style={{ fontSize:13 }}>{inf.formats.join(', ')}</p>
          </div>}
        </div>
      </div>

      {/* Brand preferences */}
      {(inf.brand_loves?.length > 0 || inf.brand_never?.length > 0) && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Brand preferences</p>
          {inf.brand_loves?.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <p style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Love working with</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {inf.brand_loves.map((c: string) => (
                  <span key={c} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'rgba(74,222,128,0.1)', color:'var(--green)', border:'1px solid rgba(74,222,128,0.2)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {inf.brand_never?.length > 0 && (
            <div>
              <p style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Never work with</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {inf.brand_never.map((c: string) => (
                  <span key={c} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'rgba(248,113,113,0.1)', color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platforms */}
      {(platforms || []).length > 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Platforms</p>
          {platforms!.map(p => (
            <div key={p.id} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--line)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <p style={{ fontSize:14, fontWeight:700 }}>{p.platform}</p>
                <span style={{ fontSize:11, color:'var(--muted)' }}>@{p.handle}</span>
                <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 8px', borderRadius:20,
                  background: p.parse_status === 'complete' ? 'rgba(74,222,128,0.1)' : p.parse_status === 'processing' ? 'rgba(196,154,60,0.1)' : 'rgba(255,255,255,0.04)',
                  color: p.parse_status === 'complete' ? 'var(--green)' : p.parse_status === 'processing' ? 'var(--acc)' : 'var(--muted)',
                  border: `1px solid ${p.parse_status === 'complete' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>{p.parse_status}</span>
              </div>
              {p.parse_status === 'complete' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px' }}>
                  {[
                    ['Followers', fmt(p.followers)],
                    ['Engagement', p.engagement_rate ? `${p.engagement_rate}%` : '—'],
                    ['Avg likes', fmt(p.avg_likes)],
                    ['Avg views', fmt(p.avg_views)],
                    ['Audience age', p.audience_age_range || '—'],
                    ['Gender split', p.audience_gender_split || '—'],
                    ['Posting freq', p.posting_frequency || '—'],
                    ['Top markets', p.audience_top_countries?.slice(0,2).join(', ') || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 10px' }}>
                      <p style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>{label}</p>
                      <p style={{ fontSize:13, fontWeight:700 }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rates */}
      {(rates || []).length > 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Rate card</p>
          {/* Group rows by platform */}
          {Array.from(new Set(rates!.map((r: any) => r.platform))).map(platform => {
            const platformRates = rates!.filter((r: any) => r.platform === platform)
            const labelMap: Record<string,string> = { reel:'Reel', post:'Post', story:'Story', video:'Video', integration:'Integration' }
            return (
              <div key={platform} style={{ marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--line)' }}>
                <p style={{ fontSize:13, fontWeight:700, marginBottom:6, textTransform:'capitalize' }}>{platform}</p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {platformRates.map((r: any) => (
                    <span key={r.id} style={{ fontSize:12, color:'var(--muted)' }}>
                      {labelMap[r.content_type] || r.content_type} <strong style={{ color:'var(--fg)' }}>{formatEur(r.rate_eur)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            {inf?.open_to_gifting && <span style={{ fontSize:11, color:'var(--muted)', background:'var(--faint)', padding:'2px 8px', borderRadius:20 }}>Gifting OK</span>}
            {inf?.open_to_rev_share && <span style={{ fontSize:11, color:'var(--muted)', background:'var(--faint)', padding:'2px 8px', borderRadius:20 }}>Rev-share OK</span>}
            {inf?.open_to_exclusivity && <span style={{ fontSize:11, color:'var(--muted)', background:'var(--faint)', padding:'2px 8px', borderRadius:20 }}>Exclusivity OK</span>}
          </div>
        </div>
      )}
    </div>
  )
}
