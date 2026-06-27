import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/* ─── helpers ─── */
function fmt(v: number | null | undefined) {
  if (v == null || v === 0) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}
function eur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}
function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const SECTION = (label: string) => (
  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 14 }}>{label}</p>
)

const CARD = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <div style={{
    background: 'var(--white)',
    border: `1px solid ${accent ? 'var(--gold-border)' : 'var(--border)'}`,
    borderRadius: 14,
    padding: '18px 20px',
    marginBottom: 12,
  }}>{children}</div>
)

const PILL = ({ children, color = 'fg' }: { children: React.ReactNode; color?: 'gold' | 'green' | 'red' | 'muted' | 'fg' }) => {
  const styles: Record<string, React.CSSProperties> = {
    gold:  { background: 'var(--gold-bg)',  color: 'var(--gold)',   border: '1px solid var(--gold-border)' },
    green: { background: 'var(--green2)', color: 'var(--green)', border: '1px solid var(--green3)' },
    red:   { background: 'var(--red2)',  color: 'var(--red)',   border: '1px solid var(--red3)' },
    muted: { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' },
    fg:    { background: 'var(--surface)',   color: 'var(--text)',    border: '1px solid var(--border)' },
  }
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 11px', borderRadius: 20, display: 'inline-block', ...styles[color] }}>
      {children}
    </span>
  )
}

const STAT = ({ label, value }: { label: string; value: string }) => (
  <div style={{ background: 'var(--surface)', borderRadius: 9, padding: '9px 11px' }}>
    <p style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
    <p style={{ fontSize: 14, fontWeight: 800 }}>{value}</p>
  </div>
)

const FIELD = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
    <p style={{ fontSize: 13, fontWeight: 600, color: value === '—' ? 'var(--text-2)' : 'var(--text)' }}>{value}</p>
  </div>
)

const TOGGLE = ({ label, on }: { label: string; on: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
    <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</p>
    <div style={{
      width: 36, height: 20, borderRadius: 10, background: on ? 'var(--green)' : 'var(--border)', position: 'relative', flexShrink: 0,
    }}>
      <span style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff', top: 3, left: on ? 19 : 3, transition: 'left 0.2s' }} />
    </div>
  </div>
)

const CONTENT_TYPES: Record<string, string[]> = {
  instagram: ['reel', 'story', 'post'],
  tiktok: ['video'],
  youtube: ['integration', 'video'],
  pinterest: ['post'],
}
const CT_LABEL: Record<string, string> = { reel: 'Reel', story: 'Story', post: 'Post', video: 'Video', integration: 'Integration' }

/* ─── page ─── */
export default async function ViewProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: inf } = await supabase.from('influencers').select('*').eq('user_id', user.id).single()
  if (!inf || !inf.onboarding_complete) redirect('/onboarding')

  const [
    { data: platforms },
    { data: rates },
    { data: brandPrefs },
    { data: contentFormats },
    { data: niches },
  ] = await Promise.all([
    supabase.from('influencer_platforms').select('*').eq('influencer_id', inf.id).order('created_at'),
    supabase.from('influencer_rates').select('*').eq('influencer_id', inf.id),
    supabase.from('influencer_brand_preferences').select('category, preference_type').eq('influencer_id', inf.id),
    supabase.from('influencer_content_formats').select('format').eq('influencer_id', inf.id),
    supabase.from('influencer_niches').select('niche, is_primary').eq('influencer_id', inf.id),
  ])

  const platformList = platforms || []
  const rateList = rates || []
  const formatList = (contentFormats || []).map(f => f.format)
  const nicheList = niches || []
  const primaryNiche = nicheList.find(n => n.is_primary)?.niche || inf.primary_niche || null
  const secondaryNiches = nicheList.filter(n => !n.is_primary).map(n => n.niche).filter(Boolean)
  const brandLoves = (brandPrefs || []).filter(b => b.preference_type === 'love').map(b => b.category)
  const brandNever = (brandPrefs || []).filter(b => b.preference_type === 'never').map(b => b.category)

  // fallback to influencers columns if junction tables are empty
  const allBrandLoves = brandLoves.length ? brandLoves : (inf.brand_loves || [])
  const allBrandNever = brandNever.length ? brandNever : (inf.brand_never || [])
  const allFormats = formatList.length ? formatList : (inf.formats || [])
  const allSecondary = secondaryNiches.length ? secondaryNiches : (inf.secondary_niches || [])

  const totalReach = platformList.reduce((sum, p) => sum + (p.followers || 0), 0)
  const fullName = [inf.first_name, inf.last_name].filter(Boolean).join(' ') || '—'
  const location = [inf.city, inf.country].filter(Boolean).join(', ') || null

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', marginBottom: 24 }}>
        <Link href="/dashboard/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Back to profile
        </Link>
        <Link href="/profile/edit" style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--gold)', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
          Edit profile
        </Link>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '24px 28px 28px', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', maxWidth: 1000 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {inf.avatar_url ? (
              <img src={inf.avatar_url} alt="Avatar" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', display: 'block' }} />
            ) : (
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>
                {(inf.first_name?.[0] || '') + (inf.last_name?.[0] || '')}
              </div>
            )}
            {inf.status === 'active' && (
              <span style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--white)' }} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 5 }}>{fullName}</h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none"><path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5s4.5-5.125 4.5-8.5C10 2.015 7.985 0 5.5 0zm0 6.125a1.625 1.625 0 1 1 0-3.25 1.625 1.625 0 0 1 0 3.25z" fill="currentColor"/></svg>
                    {location || <span style={{ fontStyle: 'italic' }}>Location not set</span>}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', opacity: 0.4 }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Member since {memberSince(inf.created_at)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', opacity: 0.4 }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{inf.posting_frequency || '—'}</span>
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0,
                background: inf.status === 'active' ? 'var(--green2)' : 'var(--surface)',
                color: inf.status === 'active' ? 'var(--green)' : 'var(--text-2)',
                border: `1px solid ${inf.status === 'active' ? 'var(--green3)' : 'var(--border)'}`,
              }}>{inf.status || 'unknown'}</span>
            </div>

            {/* Niche badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {primaryNiche
                ? <PILL color="gold">{primaryNiche}</PILL>
                : <PILL color="muted">No niche set</PILL>}
              {allSecondary.map((n: string) => <PILL key={n} color="muted">{n}</PILL>)}
            </div>

            {/* Languages */}
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {inf.languages?.length ? `Languages: ${inf.languages.join(', ')}` : 'Languages: —'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ padding: '0 28px', display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, maxWidth: 1060, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div>
          {/* AI Summary */}
          <CARD accent>
            {SECTION('AI Summary')}
            {inf.ai_summary ? (
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)' }}>{inf.ai_summary}</p>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)', fontStyle: 'italic' }}>
                Your AI summary will appear here after you upload and parse screenshots.
              </p>
            )}
            {inf.ai_summary_verified && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="var(--green)"/><path d="M3.5 6l2 2 3-3" stroke="var(--green)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Verified by Truleado
              </div>
            )}
          </CARD>

          {/* Bio */}
          <CARD>
            {SECTION('Bio')}
            {inf.bio ? (
              <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-2)' }}>{inf.bio}</p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>—</p>
            )}
          </CARD>

          {/* Platform cards */}
          {platformList.length === 0 ? (
            <CARD>
              {SECTION('Platforms')}
              <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No platforms added yet</p>
            </CARD>
          ) : (
            platformList.map(p => {
              const isParsed = p.parse_status === 'complete'
              return (
                <CARD key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize', flex: 1 }}>{p.platform}</p>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>@{p.handle || '—'}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                      background: isParsed ? 'var(--green2)' : 'var(--surface)',
                      color: isParsed ? 'var(--green)' : 'var(--text-2)',
                      border: `1px solid ${isParsed ? 'var(--green3)' : 'var(--border)'}`,
                    }}>{isParsed ? 'Parsed ✓' : 'Stats pending'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <STAT label="Followers" value={fmt(p.followers)} />
                    <STAT label="Engagement" value={p.engagement_rate ? `${p.engagement_rate}%` : '—'} />
                    <STAT label="Avg likes" value={fmt(p.avg_likes)} />
                    <STAT label="Avg views" value={fmt(p.avg_views)} />
                    <STAT label="Audience age" value={p.audience_age_range || '—'} />
                    <STAT label="Gender split" value={p.audience_gender_split || '—'} />
                    <STAT label="Top markets" value={p.audience_top_countries?.slice(0, 2).join(', ') || '—'} />
                    <STAT label="Avg comments" value={fmt(p.avg_comments)} />
                  </div>
                </CARD>
              )
            })
          )}

          {/* Content profile */}
          <CARD>
            {SECTION('Content profile')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 16 }}>
              <FIELD label="Primary niche" value={primaryNiche || '—'} />
              <FIELD label="Content style" value={inf.content_style || '—'} />
              <FIELD label="Posting frequency" value={inf.posting_frequency || '—'} />
              <FIELD label="Past partnerships" value={inf.past_partnerships || '—'} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>Secondary niches</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allSecondary.length
                  ? allSecondary.map((n: string) => <PILL key={n} color="fg">{n}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>Content formats</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allFormats.length
                  ? allFormats.map((f: string) => <PILL key={f} color="fg">{f}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
            </div>
          </CARD>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Rate card */}
          <CARD>
            {SECTION('Rate card')}
            {rateList.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>No rates set yet</p>
            ) : (
              <>
                {Array.from(new Set(rateList.map(r => r.platform))).map((platform, idx, arr) => {
                  const ctypes = CONTENT_TYPES[platform] || ['post']
                  const platformRates = rateList.filter(r => r.platform === platform)
                  return (
                    <div key={platform} style={{ marginBottom: idx < arr.length - 1 ? 18 : 0, paddingBottom: idx < arr.length - 1 ? 18 : 0, borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', marginBottom: 10 }}>{platform}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ctypes.map(ct => {
                          const row = platformRates.find(r => r.content_type === ct)
                          return (
                            <div key={ct} style={{ background: 'var(--surface)', borderRadius: 9, padding: '10px 14px', textAlign: 'center', minWidth: 72 }}>
                              <p style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{CT_LABEL[ct]}</p>
                              <p style={{ fontSize: 16, fontWeight: 800, color: row ? 'var(--gold)' : 'var(--text-2)' }}>{row ? eur(row.rate_eur) : '—'}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 4 }}>
                  <TOGGLE label="Open to gifting" on={!!inf.open_to_gifting} />
                  <TOGGLE label="Open to rev-share" on={!!inf.open_to_rev_share} />
                  <TOGGLE label="Open to exclusivity" on={!!inf.open_to_exclusivity} />
                </div>
              </>
            )}
          </CARD>

          {/* Brand preferences */}
          <CARD>
            {SECTION('Brand preferences')}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>Love working with</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allBrandLoves.length
                  ? allBrandLoves.map((c: string) => <PILL key={c} color="green">{c}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
              {inf.brand_loves_custom && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic' }}>{inf.brand_loves_custom}</p>
              )}
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>Never work with</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allBrandNever.length
                  ? allBrandNever.map((c: string) => <PILL key={c} color="red">{c}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
              {inf.brand_never_custom && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic' }}>{inf.brand_never_custom}</p>
              )}
            </div>
          </CARD>

          {/* At a glance */}
          <CARD>
            {SECTION('At a glance')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 4 }}>Total reach</p>
                <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: totalReach ? 'var(--text)' : 'var(--text-2)' }}>
                  {totalReach ? fmt(totalReach) : '—'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8 }}>Platforms</p>
                {platformList.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {platformList.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{p.platform}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.followers ? fmt(p.followers) + ' followers' : '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>—</p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                <FIELD label="Location" value={location || '—'} />
                <FIELD label="Languages" value={inf.languages?.length ? inf.languages.join(', ') : '—'} />
                <FIELD label="Status" value={inf.status || '—'} />
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, fontWeight: 600 }}>AI summary</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: inf.ai_summary_verified ? 'var(--green)' : 'var(--text-2)' }}>
                    {inf.ai_summary_verified ? 'Verified ✓' : inf.ai_summary ? 'Generated' : 'Not yet'}
                  </p>
                </div>
              </div>
            </div>
          </CARD>
        </div>
      </div>
    </div>
  )
}
