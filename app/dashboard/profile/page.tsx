import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Instagram, Music2, Youtube, Pin, Twitter, Linkedin, Facebook, Twitch, Ghost, Share2, Check, ChevronRight, type LucideIcon } from 'lucide-react'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

function fmt(v: number | null | undefined, suffix = '') {
  if (!v) return '—'
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M${suffix}`
  if (v >= 1000) return `${(v/1000).toFixed(1)}K${suffix}`
  return `${v}${suffix}`
}

const PLATFORM_ICON: Record<string, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, youtube: Youtube, pinterest: Pin,
  twitter: Twitter, linkedin: Linkedin, facebook: Facebook, twitch: Twitch, snapchat: Ghost,
}

function platformIcon(p: string): LucideIcon {
  return PLATFORM_ICON[p] || Share2
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
    <div className="px-7 pt-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[15px] font-semibold text-foreground">My profile</p>
        <div className="flex gap-2">
          <Link href="/profile/view" className="text-xs font-semibold text-foreground bg-card border border-border px-3.5 py-[7px] rounded-md no-underline shadow-sm">View public profile</Link>
          <Link href="/profile/edit" className="text-xs font-semibold text-white bg-gold px-3.5 py-[7px] rounded-md no-underline">Edit profile</Link>
        </div>
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
                {inf.status === 'active' && (
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green border-2 border-card" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-['DM_Serif_Display',serif] text-[22px] font-normal tracking-[-0.3px] mb-1 text-foreground">{inf.first_name} {inf.last_name}</p>
                {(inf.city || inf.country) && <p className="text-[13px] text-muted-foreground mb-2.5">{inf.city}{inf.country ? `, ${inf.country}` : ''}</p>}
                <div className="flex gap-1.5 flex-wrap">
                  {inf.primary_niche && <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-gold-bg text-gold border border-gold-border">{inf.primary_niche}</span>}
                  <span className={cn('text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] border', inf.status === 'active' ? 'bg-green-bg text-green border-green-border' : 'bg-muted text-muted-foreground border-border')}>{inf.status}</span>
                  {inf.languages?.length > 0 && <span className="text-[11px] font-semibold px-2.5 py-[3px] rounded-[20px] bg-muted text-muted-foreground border border-border">{inf.languages.join(' · ')}</span>}
                </div>
              </div>
            </div>

            {/* AI Summary quote */}
            <div className="bg-gold-bg border-l-[3px] border-gold rounded-r-md px-4 py-3">
              {inf.ai_summary ? (
                <p className="font-['DM_Serif_Display',serif] italic text-sm leading-[1.65] text-foreground">
                  &ldquo;{inf.ai_summary}&rdquo;
                </p>
              ) : (
                <p className="font-['DM_Serif_Display',serif] italic text-sm leading-[1.65] text-muted-foreground">
                  No summary yet. Upload screenshots to generate one.
                </p>
              )}
              <span className="font-['Inter',sans-serif] not-italic text-[11px] text-muted-foreground/60 block mt-1.5">
                {inf.ai_summary ? (
                  <>AI summary · {inf.ai_parsed_at ? `Updated ${Math.round((Date.now() - new Date(inf.ai_parsed_at).getTime()) / 86400000)} days ago` : 'Generated'}</>
                ) : (
                  <Link href="/profile/edit?tab=platforms" className="text-gold no-underline font-semibold inline-flex items-center gap-0.5">Upload screenshots to improve your summary <ChevronRight size={14} /></Link>
                )}
              </span>
            </div>
          </CARD>

          {/* Platforms */}
          {(platforms || []).length > 0 && (
            <CARD>
              <HEADING>Social accounts</HEADING>
              {platforms!.map((p, i) => (
                <div key={p.id} className={cn('flex items-center gap-3 py-3', i < platforms!.length - 1 ? 'border-b border-border' : '')}>
                  <div className="w-[34px] h-[34px] rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
                    {(() => { const Icon = platformIcon(p.platform); return <Icon size={16} /> })()}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}</p>
                    <span className="text-[11px] text-muted-foreground/60 inline-flex items-center gap-0.5">@{p.handle} · {p.parse_status === 'complete' ? <>Parsed <Check size={12} /></> : 'Stats pending'}</span>
                  </div>
                  {p.parse_status === 'complete' && (
                    <div className="text-right">
                      <p className="text-sm font-semibold tracking-[-0.3px] text-foreground">{fmt(p.followers)}</p>
                      {p.engagement_rate && <span className="text-[11px] text-green font-semibold">{p.engagement_rate}% eng.</span>}
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
                <div className="flex items-start justify-between py-[9px] border-b border-border gap-4">
                  <span className="text-xs text-muted-foreground shrink-0">Primary niche</span>
                  <span className="text-[11px] font-semibold px-[9px] py-[3px] rounded-[20px] bg-gold-bg text-gold border border-gold-border">{inf.primary_niche}</span>
                </div>
              )}
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
                const labelMap: Record<string,string> = { reel: 'Reel', post: 'Feed post', story: 'Story set', video: 'Video', integration: 'Integration' }
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
            <FIELD label="Member since" value={new Date(inf.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} />
            <div className="flex items-start justify-between py-[9px] gap-4">
              <span className="text-xs text-muted-foreground shrink-0">AI summary</span>
              <span className={cn('text-xs font-semibold inline-flex items-center gap-0.5', inf.ai_summary ? 'text-green' : 'text-muted-foreground/60')}>
                {inf.ai_summary ? <>Verified <Check size={13} /></> : 'Not generated'}
              </span>
            </div>
          </CARD>
        </div>
      </div>
    </div>
  )
}
