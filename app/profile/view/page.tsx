import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
  <p className="text-[11px] font-bold text-muted-foreground tracking-[0.09em] uppercase mb-3.5">{label}</p>
)

const CARD = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <div className={cn('bg-card border rounded-[14px] px-5 py-[18px] mb-3', accent ? 'border-gold-border' : 'border-border')}>{children}</div>
)

const PILL = ({ children, color = 'fg' }: { children: React.ReactNode; color?: 'gold' | 'green' | 'red' | 'muted' | 'fg' }) => {
  const styles: Record<string, string> = {
    gold:  'bg-gold-bg text-gold border-gold-border',
    green: 'bg-green-bg text-green border-green-border',
    red:   'bg-red-bg text-red border-red-border',
    muted: 'bg-muted text-muted-foreground border-border',
    fg:    'bg-muted text-foreground border-border',
  }
  return (
    <span className={cn('text-xs font-semibold px-[11px] py-[3px] rounded-[20px] inline-block border', styles[color])}>
      {children}
    </span>
  )
}

const STAT = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted rounded-[9px] px-[11px] py-[9px]">
    <p className="text-[10px] text-muted-foreground mb-1 font-semibold tracking-[0.05em] uppercase">{label}</p>
    <p className="text-sm font-extrabold">{value}</p>
  </div>
)

const FIELD = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground mb-1 font-semibold">{label}</p>
    <p className={cn('text-[13px] font-semibold', value === '—' ? 'text-muted-foreground' : 'text-foreground')}>{value}</p>
  </div>
)

const TOGGLE = ({ label, on }: { label: string; on: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border">
    <p className="text-[13px] text-muted-foreground font-medium">{label}</p>
    <div className={cn('w-9 h-5 rounded-[10px] relative flex-shrink-0', on ? 'bg-green' : 'bg-border')}>
      <span className={cn('absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] transition-[left] duration-200', on ? 'left-[19px]' : 'left-[3px]')} />
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
    <div className="pb-[60px]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-7 pt-5 mb-6">
        <Link href="/dashboard/profile" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground no-underline">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Back to profile
        </Link>
        <Link href="/profile/edit" className="text-xs font-bold text-white bg-gold px-4 py-2 rounded-lg no-underline">
          Edit profile
        </Link>
      </div>

      {/* Hero */}
      <div className="bg-card border-b border-border px-7 pt-6 pb-7 mb-7">
        <div className="flex gap-5 items-start max-w-[1000px]">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {inf.avatar_url ? (
              <img src={inf.avatar_url} alt="Avatar" className="w-[88px] h-[88px] rounded-full object-cover border-2 border-border block" />
            ) : (
              <div className="w-[88px] h-[88px] rounded-full bg-gold flex items-center justify-center text-[28px] font-extrabold text-white">
                {(inf.first_name?.[0] || '') + (inf.last_name?.[0] || '')}
              </div>
            )}
            {inf.status === 'active' && (
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green border-2 border-card" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-extrabold tracking-[-0.5px] mb-[5px]">{fullName}</h1>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none"><path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5s4.5-5.125 4.5-8.5C10 2.015 7.985 0 5.5 0zm0 6.125a1.625 1.625 0 1 1 0-3.25 1.625 1.625 0 0 1 0 3.25z" fill="currentColor"/></svg>
                    {location || <span className="italic">Location not set</span>}
                  </span>
                  <span className="text-xs text-muted-foreground opacity-40">·</span>
                  <span className="text-xs text-muted-foreground">Member since {memberSince(inf.created_at)}</span>
                  <span className="text-xs text-muted-foreground opacity-40">·</span>
                  <span className="text-xs text-muted-foreground">{inf.posting_frequency || '—'}</span>
                </div>
              </div>
              <span className={cn(
                'text-xs font-bold px-3 py-1 rounded-[20px] flex-shrink-0 border',
                inf.status === 'active' ? 'bg-green-bg text-green border-green-border' : 'bg-muted text-muted-foreground border-border',
              )}>{inf.status || 'unknown'}</span>
            </div>

            {/* Niche badges */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {primaryNiche
                ? <PILL color="gold">{primaryNiche}</PILL>
                : <PILL color="muted">No niche set</PILL>}
              {allSecondary.map((n: string) => <PILL key={n} color="muted">{n}</PILL>)}
            </div>

            {/* Languages */}
            <p className="text-xs text-muted-foreground">
              {inf.languages?.length ? `Languages: ${inf.languages.join(', ')}` : 'Languages: —'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="px-7 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 max-w-[1060px] items-start">

        {/* ── LEFT COLUMN ── */}
        <div>
          {/* AI Summary */}
          <CARD accent>
            {SECTION('AI Summary')}
            {inf.ai_summary ? (
              <p className="text-[13px] leading-[1.7] text-muted-foreground">{inf.ai_summary}</p>
            ) : (
              <p className="text-[13px] leading-[1.7] text-muted-foreground italic">
                Your AI summary will appear here after you upload and parse screenshots.
              </p>
            )}
            {inf.ai_summary_verified && (
              <div className="inline-flex items-center gap-[5px] mt-2.5 text-[11px] text-green font-semibold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="currentColor"/><path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Verified by Truleado
              </div>
            )}
          </CARD>

          {/* Bio */}
          <CARD>
            {SECTION('Bio')}
            {inf.bio ? (
              <p className="text-[13px] leading-[1.75] text-muted-foreground">{inf.bio}</p>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">—</p>
            )}
          </CARD>

          {/* Platform cards */}
          {platformList.length === 0 ? (
            <CARD>
              {SECTION('Platforms')}
              <p className="text-[13px] text-muted-foreground italic text-center py-4">No platforms added yet</p>
            </CARD>
          ) : (
            platformList.map(p => {
              const isParsed = p.parse_status === 'complete'
              return (
                <CARD key={p.id}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <p className="text-[15px] font-extrabold capitalize flex-1">{p.platform}</p>
                    <span className="text-xs text-muted-foreground">@{p.handle || '—'}</span>
                    <span className={cn(
                      'text-[11px] font-semibold px-[9px] py-0.5 rounded-[20px] border',
                      isParsed ? 'bg-green-bg text-green border-green-border' : 'bg-muted text-muted-foreground border-border',
                    )}>{isParsed ? 'Parsed ✓' : 'Stats pending'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
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
            <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 mb-4">
              <FIELD label="Primary niche" value={primaryNiche || '—'} />
              <FIELD label="Content style" value={inf.content_style || '—'} />
              <FIELD label="Posting frequency" value={inf.posting_frequency || '—'} />
              <FIELD label="Past partnerships" value={inf.past_partnerships || '—'} />
            </div>

            <div className="mb-3">
              <p className="text-[11px] text-muted-foreground font-semibold mb-2">Secondary niches</p>
              <div className="flex flex-wrap gap-1.5">
                {allSecondary.length
                  ? allSecondary.map((n: string) => <PILL key={n} color="fg">{n}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
            </div>

            <div>
              <p className="text-[11px] text-muted-foreground font-semibold mb-2">Content formats</p>
              <div className="flex flex-wrap gap-1.5">
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
              <p className="text-[13px] text-muted-foreground italic">No rates set yet</p>
            ) : (
              <>
                {Array.from(new Set(rateList.map(r => r.platform))).map((platform, idx, arr) => {
                  const ctypes = CONTENT_TYPES[platform] || ['post']
                  const platformRates = rateList.filter(r => r.platform === platform)
                  const notLast = idx < arr.length - 1
                  return (
                    <div key={platform} className={cn(notLast && 'mb-[18px] pb-[18px] border-b border-border')}>
                      <p className="text-[13px] font-bold capitalize mb-2.5">{platform}</p>
                      <div className="flex flex-wrap gap-2">
                        {ctypes.map(ct => {
                          const row = platformRates.find(r => r.content_type === ct)
                          return (
                            <div key={ct} className="bg-muted rounded-[9px] px-3.5 py-2.5 text-center min-w-[72px]">
                              <p className="text-[10px] text-muted-foreground mb-[5px] font-semibold uppercase tracking-[0.05em]">{CT_LABEL[ct]}</p>
                              <p className={cn('text-base font-extrabold', row ? 'text-gold' : 'text-muted-foreground')}>{row ? eur(row.rate_eur) : '—'}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <div className="border-t border-border mt-3.5 pt-1">
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
            <div className="mb-4">
              <p className="text-[11px] text-muted-foreground font-semibold mb-2">Love working with</p>
              <div className="flex flex-wrap gap-1.5">
                {allBrandLoves.length
                  ? allBrandLoves.map((c: string) => <PILL key={c} color="green">{c}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
              {inf.brand_loves_custom && (
                <p className="text-xs text-muted-foreground mt-2 italic">{inf.brand_loves_custom}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold mb-2">Never work with</p>
              <div className="flex flex-wrap gap-1.5">
                {allBrandNever.length
                  ? allBrandNever.map((c: string) => <PILL key={c} color="red">{c}</PILL>)
                  : <PILL color="muted">Not set</PILL>}
              </div>
              {inf.brand_never_custom && (
                <p className="text-xs text-muted-foreground mt-2 italic">{inf.brand_never_custom}</p>
              )}
            </div>
          </CARD>

          {/* At a glance */}
          <CARD>
            {SECTION('At a glance')}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold mb-1">Total reach</p>
                <p className={cn('text-[22px] font-extrabold tracking-[-0.5px]', totalReach ? 'text-foreground' : 'text-muted-foreground')}>
                  {totalReach ? fmt(totalReach) : '—'}
                </p>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground font-semibold mb-2">Platforms</p>
                {platformList.length ? (
                  <div className="flex flex-col gap-1.5">
                    {platformList.map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold capitalize">{p.platform}</span>
                        <span className="text-[13px] text-muted-foreground">{p.followers ? fmt(p.followers) + ' followers' : '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground italic">—</p>
                )}
              </div>

              <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                <FIELD label="Location" value={location || '—'} />
                <FIELD label="Languages" value={inf.languages?.length ? inf.languages.join(', ') : '—'} />
                <FIELD label="Status" value={inf.status || '—'} />
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 font-semibold">AI summary</p>
                  <p className={cn('text-[13px] font-semibold', inf.ai_summary_verified ? 'text-green' : 'text-muted-foreground')}>
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
