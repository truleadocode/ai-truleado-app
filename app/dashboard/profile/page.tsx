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

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', pinterest: '📌',
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

  const totalReach = (platforms || []).reduce((sum, p) => sum + (p.followers || 0), 0)

  function CARD({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
    return (
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 14, boxShadow: 'var(--shadow-sm)', ...style }}>
        {children}
      </div>
    )
  }

  function HEADING({ children }: { children: React.ReactNode }) {
    return <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 14 }}>{children}</p>
  }

  function FIELD({ label, value }: { label: string, value: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', color: 'var(--text)' }}>{value || '—'}</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>My profile</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/profile/view" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'var(--white)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', boxShadow: 'var(--shadow-sm)' }}>View public profile</Link>
          <Link href="/profile/edit" style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--gold)', padding: '7px 14px', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>Edit profile</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }} className="profile-grid">

        {/* Left column */}
        <div>
          {/* Hero */}
          <CARD>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {inf.avatar_url ? (
                  <img src={inf.avatar_url} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-border)' }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
                    {inf.first_name?.[0]}{inf.last_name?.[0]}
                  </div>
                )}
                {inf.status === 'active' && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--white)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, letterSpacing: '-0.3px', marginBottom: 4, color: 'var(--text)' }}>{inf.first_name} {inf.last_name}</p>
                {(inf.city || inf.country) && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{inf.city}{inf.country ? `, ${inf.country}` : ''}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {inf.primary_niche && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>{inf.primary_niche}</span>}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: inf.status === 'active' ? 'var(--green-bg)' : 'var(--surface)', color: inf.status === 'active' ? 'var(--green)' : 'var(--text-2)', border: `1px solid ${inf.status === 'active' ? 'var(--green-border)' : 'var(--border)'}` }}>{inf.status}</span>
                  {inf.languages?.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{inf.languages.join(' · ')}</span>}
                </div>
              </div>
            </div>

            {/* AI Summary quote */}
            <div style={{ background: 'var(--gold-bg)', borderLeft: '3px solid var(--gold)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '12px 16px' }}>
              {inf.ai_summary ? (
                <p style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>
                  &ldquo;{inf.ai_summary}&rdquo;
                </p>
              ) : (
                <p style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)' }}>
                  No summary yet. Upload screenshots to generate one.
                </p>
              )}
              <span style={{ fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 6 }}>
                {inf.ai_summary ? (
                  <>AI summary · {inf.ai_parsed_at ? `Updated ${Math.round((Date.now() - new Date(inf.ai_parsed_at).getTime()) / 86400000)} days ago` : 'Generated'}</>
                ) : (
                  <Link href="/profile/edit?tab=platforms" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Upload screenshots to improve your summary →</Link>
                )}
              </span>
            </div>
          </CARD>

          {/* Platforms */}
          {(platforms || []).length > 0 && (
            <CARD>
              <HEADING>Social accounts</HEADING>
              {platforms!.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < platforms!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {PLATFORM_EMOJI[p.platform] || '📱'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}</p>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>@{p.handle} · {p.parse_status === 'complete' ? 'Parsed ✓' : 'Stats pending'}</span>
                  </div>
                  {p.parse_status === 'complete' && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>{fmt(p.followers)}</p>
                      {p.engagement_rate && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{p.engagement_rate}% eng.</span>}
                    </div>
                  )}
                </div>
              ))}
            </CARD>
          )}

          {/* Content profile */}
          {(inf.bio || inf.content_style || inf.formats?.length > 0 || inf.primary_niche) && (
            <CARD>
              <HEADING>Content profile</HEADING>
              {inf.primary_niche && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>Primary niche</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>{inf.primary_niche}</span>
                </div>
              )}
              {inf.secondary_niches?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>Secondary niches</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {inf.secondary_niches.map((n: string) => (
                      <span key={n} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {inf.content_style && <FIELD label="Content style" value={inf.content_style} />}
              {inf.formats?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>Formats</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {inf.formats.map((f: string) => (
                      <span key={f} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {inf.posting_frequency && <FIELD label="Posts per week" value={inf.posting_frequency} />}
              {inf.bio && <FIELD label="Bio" value={inf.bio} />}
            </CARD>
          )}
        </div>

        {/* Right column */}
        <div>
          {/* Rate card */}
          {(rates || []).length > 0 && (
            <CARD>
              <HEADING>Rate card</HEADING>
              {Array.from(new Set(rates!.map((r: any) => r.platform))).map(platform => {
                const platformRates = rates!.filter((r: any) => r.platform === platform)
                const labelMap: Record<string,string> = { reel: 'Reel', post: 'Feed post', story: 'Story set', video: 'Video', integration: 'Integration' }
                return (
                  <div key={platform} style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>{platform}</p>
                    {platformRates.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-2)' }}>{labelMap[r.content_type] || r.content_type}</span>
                        <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatEur(r.rate_eur)}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              {[
                { label: 'Open to gifting', value: inf.open_to_gifting },
                { label: 'Revenue share', value: inf.open_to_rev_share },
                { label: 'Exclusivity OK', value: inf.open_to_exclusivity },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{row.label}</p>
                  <div style={{ width: 34, height: 19, borderRadius: 10, background: row.value ? 'var(--green)' : 'var(--border-strong)', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', width: 13, height: 13, borderRadius: '50%', background: '#fff', top: 3, left: row.value ? 18 : 3, transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </CARD>
          )}

          {/* Brand preferences */}
          {(inf.brand_loves?.length > 0 || inf.brand_never?.length > 0) && (
            <CARD>
              <HEADING>Brand preferences</HEADING>
              {inf.brand_loves?.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>LOVES</p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                    {inf.brand_loves.map((c: string) => (
                      <span key={c} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>{c}</span>
                    ))}
                  </div>
                </>
              )}
              {inf.brand_never?.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>NEVER</p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {inf.brand_never.map((c: string) => (
                      <span key={c} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>{c}</span>
                    ))}
                  </div>
                </>
              )}
            </CARD>
          )}

          {/* At a glance */}
          <CARD>
            <HEADING>At a glance</HEADING>
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <FIELD label="Total reach" value={<strong style={{ fontWeight: 700 }}>{fmt(totalReach)}</strong>} />
            </div>
            {(inf.city || inf.country) && <FIELD label="Location" value={`${inf.city || ''}${inf.country ? `, ${inf.country}` : ''}`} />}
            {inf.languages?.length > 0 && <FIELD label="Languages" value={inf.languages.join(' · ')} />}
            <FIELD label="Member since" value={new Date(inf.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>AI summary</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: inf.ai_summary ? 'var(--green)' : 'var(--text-3)' }}>
                {inf.ai_summary ? 'Verified ✓' : 'Not generated'}
              </span>
            </div>
          </CARD>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
