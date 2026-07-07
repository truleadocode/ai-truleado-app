import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Instagram, Music2, Youtube, Pin, Twitter, Linkedin, Facebook, Twitch, Ghost, Share2, type LucideIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function fmt(v: number | null | undefined, suffix = '') {
  if (!v) return '—'
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M${suffix}`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K${suffix}`
  return `${v}${suffix}`
}

const PLATFORM_ICON: Record<string, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, youtube: Youtube, pinterest: Pin,
  twitter: Twitter, linkedin: Linkedin, facebook: Facebook, twitch: Twitch, snapchat: Ghost,
}

function platformIcon(p: string): LucideIcon {
  return PLATFORM_ICON[p] || Share2
}

export default async function PublicInfluencerProfile({ params }: { params: { username: string } }) {
  const username = params.username.toLowerCase()
  const service = createServiceClient()

  const { data: inf } = await service
    .from('influencers')
    .select('id, first_name, last_name, avatar_url, city, country, languages, bio, ai_summary, primary_niche, content_style, formats, posting_frequency, open_to_gifting, open_to_rev_share, open_to_exclusivity, brand_loves, brand_never, onboarding_complete, username')
    .eq('username', username)
    .single()

  if (!inf || !inf.onboarding_complete) notFound()

  const { data: platforms } = await service
    .from('influencer_platforms')
    .select('*')
    .eq('influencer_id', inf.id)
    .order('created_at', { ascending: true })

  const { data: rates } = await service
    .from('influencer_rates')
    .select('*')
    .eq('influencer_id', inf.id)

  const totalReach = (platforms || []).reduce((sum, p) => sum + (p.followers || 0), 0)

  function CARD({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
      <div className={cn('bg-card border border-border rounded-2xl px-5 py-[18px] mb-3.5 shadow-sm', className)}>
        {children}
      </div>
    )
  }

  function HEADING({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-3.5">{children}</p>
  }

  function FIELD({ label, value }: { label: string, value: React.ReactNode }) {
    return (
      <div className="flex items-start justify-between py-[9px] border-b border-border gap-4">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-[13px] font-medium text-right text-foreground">{value || '—'}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted font-sans">
      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* Brand header */}
        <div className="mb-5">
          <Link href="/" className="text-sm font-semibold text-foreground no-underline inline-flex items-center gap-1.5">
            <img src="/logo-mark-t-tile.png" alt="" width={24} height={24} className="w-6 h-6 rounded-[6px] shrink-0" />
            Truleado
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5">
          {/* Left column */}
          <div>
            {/* Hero */}
            <CARD>
              <div className="flex items-start gap-[18px] mb-[18px]">
                <div className="relative shrink-0">
                  {inf.avatar_url ? (
                    <img src={inf.avatar_url} alt="Avatar" className="w-[72px] h-[72px] rounded-full object-cover border-2 border-gold-border" />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-full bg-gold-bg border-2 border-gold-border flex items-center justify-center text-[22px] font-semibold text-gold">
                      {inf.first_name?.[0]}{inf.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-['DM_Serif_Display',serif] text-[22px] font-normal tracking-[-0.3px] mb-1 text-foreground">{inf.first_name} {inf.last_name}</p>
                  {(inf.city || inf.country) && <p className="text-[13px] text-muted-foreground mb-2.5">{inf.city}{inf.country ? `, ${inf.country}` : ''}</p>}
                  <div className="flex gap-1.5 flex-wrap">
                    {inf.primary_niche && <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-gold-bg text-gold border border-gold-border">{inf.primary_niche}</span>}
                    {inf.languages?.length > 0 && <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-muted text-muted-foreground border border-border">{inf.languages.join(' · ')}</span>}
                  </div>
                </div>
              </div>

              {inf.ai_summary && (
                <div className="bg-gold-bg border-l-[3px] border-gold rounded-r-md px-4 py-3">
                  <p className="font-['DM_Serif_Display',serif] italic text-sm leading-[1.65] text-foreground">
                    &ldquo;{inf.ai_summary}&rdquo;
                  </p>
                </div>
              )}
            </CARD>

            {/* Platforms */}
            {(platforms || []).some(p => p.parse_status === 'complete') && (
              <CARD>
                <HEADING>Social accounts</HEADING>
                {platforms!.filter(p => p.parse_status === 'complete').map((p, i, arr) => (
                  <div key={p.id} className={cn('flex items-center gap-3 py-3', i < arr.length - 1 ? 'border-b border-border' : '')}>
                    <div className="w-[34px] h-[34px] rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
                      {(() => { const Icon = platformIcon(p.platform); return <Icon size={16} /> })()}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">{p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}</p>
                      <span className="text-[11px] text-muted-foreground/60">@{p.handle}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tracking-[-0.3px] text-foreground">{fmt(p.followers)}</p>
                      {p.engagement_rate && <span className="text-[11px] text-green font-semibold">{p.engagement_rate}% eng.</span>}
                    </div>
                  </div>
                ))}
              </CARD>
            )}

            {/* Content profile */}
            {(inf.bio || inf.content_style || inf.formats?.length > 0) && (
              <CARD>
                <HEADING>Content profile</HEADING>
                {inf.content_style && <FIELD label="Content style" value={inf.content_style} />}
                {inf.formats?.length > 0 && (
                  <div className="flex items-start justify-between py-[9px] border-b border-border gap-4">
                    <span className="text-xs text-muted-foreground shrink-0">Formats</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {inf.formats.map((f: string) => (
                        <span key={f} className="text-[11px] font-medium px-[9px] py-[3px] rounded-[20px] bg-muted text-muted-foreground border border-border">{f}</span>
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
                  const labelMap: Record<string, string> = { reel: 'Reel', post: 'Feed post', story: 'Story set', video: 'Video', integration: 'Integration' }
                  return (
                    <div key={platform} className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 mb-1.5">{platform}</p>
                      {platformRates.map((r: any) => (
                        <div key={r.id} className="flex justify-between py-[5px] text-[13px] border-b border-border">
                          <span className="text-muted-foreground">{labelMap[r.content_type] || r.content_type}</span>
                          <span className="font-semibold text-gold">{formatEur(r.rate_eur)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
                <div className="h-px bg-border my-3" />
                {[
                  { label: 'Open to gifting', value: inf.open_to_gifting },
                  { label: 'Revenue share', value: inf.open_to_rev_share },
                  { label: 'Exclusivity OK', value: inf.open_to_exclusivity },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-[9px] border-b border-border">
                    <p className="text-[13px] text-foreground">{row.label}</p>
                    <div className={cn('w-[34px] h-[19px] rounded-[10px] relative shrink-0', row.value ? 'bg-green' : 'bg-muted-foreground/30')}>
                      <div className="absolute w-[13px] h-[13px] rounded-full bg-white top-[3px] transition-[left] duration-200" style={{ left: row.value ? 18 : 3 }} />
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
                    <p className="text-[11px] text-muted-foreground/60 font-semibold tracking-[0.06em] mb-1.5">LOVES</p>
                    <div className="flex gap-[5px] flex-wrap mb-3.5">
                      {inf.brand_loves.map((c: string) => (
                        <span key={c} className="text-[11px] font-medium px-[9px] py-[3px] rounded-[20px] bg-green-bg text-green border border-green-border">{c}</span>
                      ))}
                    </div>
                  </>
                )}
                {inf.brand_never?.length > 0 && (
                  <>
                    <p className="text-[11px] text-muted-foreground/60 font-semibold tracking-[0.06em] mb-1.5">NEVER</p>
                    <div className="flex gap-[5px] flex-wrap">
                      {inf.brand_never.map((c: string) => (
                        <span key={c} className="text-[11px] font-medium px-[9px] py-[3px] rounded-[20px] bg-red-bg text-red border border-red-border">{c}</span>
                      ))}
                    </div>
                  </>
                )}
              </CARD>
            )}

            {/* At a glance */}
            <CARD>
              <HEADING>At a glance</HEADING>
              <div className="border-b border-border">
                <FIELD label="Total reach" value={<strong className="font-semibold">{fmt(totalReach)}</strong>} />
              </div>
              {(inf.city || inf.country) && <FIELD label="Location" value={`${inf.city || ''}${inf.country ? `, ${inf.country}` : ''}`} />}
              {inf.languages?.length > 0 && <FIELD label="Languages" value={inf.languages.join(' · ')} />}
            </CARD>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 mb-2">
          Want to work with {inf.first_name}?{' '}
          <Link href="/advertiser" className="text-gold font-semibold no-underline hover:underline">
            Sign up on Truleado
          </Link>
        </p>
      </div>
    </div>
  )
}
