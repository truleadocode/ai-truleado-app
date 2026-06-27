import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(v: number | null | undefined, suffix = '') {
  if (!v) return '—'
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M${suffix}`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K${suffix}`
  return `${v}${suffix}`
}

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

export default async function ViewProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: inf } = await supabase.from('influencers').select('*').eq('user_id', user.id).single()
  if (!inf || !inf.onboarding_complete) redirect('/onboarding')

  const [{ data: platforms }, { data: rates }] = await Promise.all([
    supabase.from('influencer_platforms').select('*').eq('influencer_id', inf.id).order('created_at'),
    supabase.from('influencer_rates').select('*').eq('influencer_id', inf.id),
  ])

  const labelMap: Record<string, string> = { reel: 'Reel', post: 'Post', story: 'Story', video: 'Video', integration: 'Integration' }

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 700 }}>
      {/* Back link */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Back to profile
        </Link>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 24px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            {inf.avatar_url ? (
              <img src={inf.avatar_url} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--line)' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#090E1A' }}>
                {inf.first_name?.[0]}{inf.last_name?.[0]}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>{inf.first_name} {inf.last_name}</h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {inf.city && (
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1C3.567 1 2 2.567 2 4.5c0 2.694 3.5 6 3.5 6s3.5-3.306 3.5-6C9 2.567 7.433 1 5.5 1zm0 4.75A1.25 1.25 0 1 1 5.5 3a1.25 1.25 0 0 1 0 2.75z" fill="currentColor"/></svg>
                  {inf.city}{inf.country ? `, ${inf.country}` : ''}
                </span>
              )}
              {inf.primary_niche && (
                <span style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 700, background: 'var(--acc2)', padding: '2px 10px', borderRadius: 20, border: '1px solid var(--acc3)' }}>{inf.primary_niche}</span>
              )}
              {(inf.secondary_niches || []).map((n: string) => (
                <span key={n} style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg3)', padding: '2px 10px', borderRadius: 20, border: '1px solid var(--line)' }}>{n}</span>
              ))}
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: inf.status === 'active' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                color: inf.status === 'active' ? 'var(--green)' : 'var(--muted)',
                border: `1px solid ${inf.status === 'active' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}>{inf.status}</span>
            </div>
            {inf.bio && <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{inf.bio}</p>}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {inf.ai_summary && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--acc3)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>AI Summary</p>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>{inf.ai_summary}</p>
        </div>
      )}

      {/* About */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>About</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          {inf.content_style && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Content style</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{inf.content_style}</p>
            </div>
          )}
          {inf.posting_frequency && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Posting frequency</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{inf.posting_frequency}</p>
            </div>
          )}
          {inf.formats?.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Formats</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {inf.formats.map((f: string) => (
                  <span key={f} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--fg)', border: '1px solid var(--line)' }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {inf.languages?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Languages</p>
              <p style={{ fontSize: 13 }}>{inf.languages.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Platforms */}
      {(platforms || []).length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Platforms</p>
          {platforms!.map((p, idx) => (
            <div key={p.id} style={{ marginBottom: idx < platforms!.length - 1 ? 20 : 0, paddingBottom: idx < platforms!.length - 1 ? 20 : 0, borderBottom: idx < platforms!.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>{p.platform}</p>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>@{p.handle}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 20,
                  background: p.parse_status === 'complete' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                  color: p.parse_status === 'complete' ? 'var(--green)' : 'var(--muted)',
                  border: `1px solid ${p.parse_status === 'complete' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>{p.parse_status}</span>
              </div>
              {p.parse_status === 'complete' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    ['Followers', fmt(p.followers)],
                    ['Engagement', p.engagement_rate ? `${p.engagement_rate}%` : '—'],
                    ['Avg likes', fmt(p.avg_likes)],
                    ['Avg views', fmt(p.avg_views)],
                    ['Audience age', p.audience_age_range || '—'],
                    ['Gender split', p.audience_gender_split || '—'],
                    ['Top markets', p.audience_top_countries?.slice(0, 2).join(', ') || '—'],
                    ['Avg comments', fmt(p.avg_comments)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rate card */}
      {(rates || []).length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Rate card</p>
          {Array.from(new Set(rates!.map((r: any) => r.platform))).map((platform, idx, arr) => {
            const platformRates = rates!.filter((r: any) => r.platform === platform)
            return (
              <div key={platform} style={{ marginBottom: idx < arr.length - 1 ? 14 : 0, paddingBottom: idx < arr.length - 1 ? 14 : 0, borderBottom: idx < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>{platform}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {platformRates.map((r: any) => (
                    <div key={r.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{labelMap[r.content_type] || r.content_type}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--acc)' }}>{formatEur(r.rate_eur)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {(inf.open_to_gifting || inf.open_to_rev_share || inf.open_to_exclusivity) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {inf.open_to_gifting && <span style={{ fontSize: 12, color: 'var(--green)', background: 'rgba(74,222,128,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(74,222,128,0.2)' }}>Gifting OK</span>}
              {inf.open_to_rev_share && <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--line)' }}>Rev-share OK</span>}
              {inf.open_to_exclusivity && <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--line)' }}>Exclusivity OK</span>}
            </div>
          )}
        </div>
      )}

      {/* Brand prefs */}
      {(inf.brand_loves?.length > 0 || inf.brand_never?.length > 0) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Brand preferences</p>
          {inf.brand_loves?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Love working with</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {inf.brand_loves.map((c: string) => (
                  <span key={c} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', color: 'var(--green)', border: '1px solid rgba(74,222,128,0.2)' }}>{c}</span>
                ))}
              </div>
              {inf.brand_loves_custom && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>{inf.brand_loves_custom}</p>}
            </div>
          )}
          {inf.brand_never?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Never work with</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {inf.brand_never.map((c: string) => (
                  <span key={c} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(248,113,113,0.1)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' }}>{c}</span>
                ))}
              </div>
              {inf.brand_never_custom && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>{inf.brand_never_custom}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
