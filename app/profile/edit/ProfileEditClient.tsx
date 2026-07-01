'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ScreenshotGuide from '@/components/ScreenshotGuide'
import LanguageSelector from '@/components/LanguageSelector'
import ParseProgressCard from '@/components/ParseProgressCard'
import type { ParseStatus } from '@/components/ParseProgressCard'
import { cn } from '@/lib/utils'
import { Heart, Ban, Check } from 'lucide-react'

const UPLOAD_HINTS: Record<string, string[]> = {
  instagram: [
    'Your profile page (follower count visible)',
    'Audience demographics — age, gender, top countries',
    'Accounts reached overview (last 30 days)',
    'Your recent posts grid',
    'Any post or Reel insights showing likes, comments, saves',
  ],
  tiktok: [
    'Your profile page (follower count visible)',
    'Followers tab — age, gender, top territories',
    'Overview tab — total views, likes, follower growth',
    'Your recent videos list with view counts visible',
  ],
  youtube: [
    'Your channel page (subscriber count visible)',
    'Audience tab — age, gender, top countries',
    'Overview tab — views, watch time, subscribers',
    'Your top videos list',
  ],
  pinterest: [
    'Your profile page (followers visible)',
    'Analytics overview — monthly views, impressions',
    'Audience insights — age, gender, location',
  ],
}

const NICHES = ['Fashion','Beauty','Lifestyle','Fitness','Food','Travel','Tech','Gaming','Finance','Parenting','Home','Wellness','Music','Art','Comedy','Sustainability']
const STYLES = ['Educational','Entertaining','Inspirational','Authentic/Raw','Aesthetic','Documentary','Storytelling']
const FORMATS = ['Short video/Reels','Long video','Photos','Stories/Ephemeral','Live streams','Carousels','Blogs']
const CATEGORIES = ['Fashion','Beauty','Skincare','Haircare','Fitness','Nutrition','Travel','Tech','Gaming','Finance','Food & Beverage','Home & Garden','Pets','Kids','Cars','Sustainability','Art','Music']

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default function ProfileEditClient({ influencer, platforms, rates, screenshotsByPlatform }: {
  influencer: any
  platforms: any[]
  rates: any[]
  screenshotsByPlatform: Record<string, any[]>
}) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState<'info'|'content'|'brands'|'rates'|'platforms'>(() => {
    const tab = searchParams.get('tab')
    if (tab === 'platforms' || tab === 'content' || tab === 'brands' || tab === 'rates') return tab
    return 'info'
  })

  // Basic info state
  const [firstName, setFirstName] = useState(influencer.first_name || '')
  const [lastName, setLastName] = useState(influencer.last_name || '')
  const [phone, setPhone] = useState(influencer.phone || '')
  const [city, setCity] = useState(influencer.city || '')
  const [country, setCountry] = useState(influencer.country || '')
  const [languages, setLanguages] = useState<string[]>(influencer.languages || [])

  // Avatar state
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(influencer.avatar_url || null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Content profile state
  const [primaryNiche, setPrimaryNiche] = useState(influencer.primary_niche || '')
  const [secondaryNiches, setSecondaryNiches] = useState<string[]>(influencer.secondary_niches || [])
  const [contentStyle, setContentStyle] = useState(influencer.content_style || '')
  const [formats, setFormats] = useState<string[]>(influencer.formats || [])
  const [postingFrequency, setPostingFrequency] = useState(influencer.posting_frequency || '')
  const [bio, setBio] = useState(influencer.bio || '')

  // Brand prefs state
  const [brandLoves, setBrandLoves] = useState<string[]>(influencer.brand_loves || [])
  const [brandNever, setBrandNever] = useState<string[]>(influencer.brand_never || [])
  const [brandLovesCustom, setBrandLovesCustom] = useState(influencer.brand_loves_custom || '')
  const [brandNeverCustom, setBrandNeverCustom] = useState(influencer.brand_never_custom || '')

  // Rate state
  const [rateState, setRateState] = useState<Record<string, string>>(
    Object.fromEntries((rates || []).map((r: any) => [`${r.platform}__${r.content_type}`, String(Math.round((r.rate_eur || 0) / 100))]))
  )
  const [gifting, setGifting] = useState(influencer.open_to_gifting || false)
  const [revShare, setRevShare] = useState(influencer.open_to_rev_share || false)
  const [exclusivity, setExclusivity] = useState(influencer.open_to_exclusivity || false)

  // Platform tab state — treat any stuck 'processing' on mount as 'failed'
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, string>>(
    Object.fromEntries(platforms.map(p => [
      p.id,
      p.parse_status === 'processing' ? 'failed' : (p.parse_status || 'pending'),
    ]))
  )
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string>(influencer.ai_summary || '')
  const [aiParsedAt, setAiParsedAt] = useState<string | null>(influencer.ai_parsed_at || null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Notification banner state
  const [banner, setBanner] = useState<'processing' | 'complete' | null>(null)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Handle editing state per platform
  const [handleEdits, setHandleEdits] = useState<Record<string, string>>(
    Object.fromEntries(platforms.map(p => [p.id, p.handle || '']))
  )
  const [savingHandle, setSavingHandle] = useState<string | null>(null)
  const [savedHandle, setSavedHandle] = useState<string | null>(null)

  // Add new platform state
  const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'pinterest']
  const connectedPlatforms = platforms.map(p => p.platform.toLowerCase())
  const availablePlatforms = ALL_PLATFORMS.filter(p => !connectedPlatforms.includes(p))
  const [newPlatform, setNewPlatform] = useState(availablePlatforms[0] || '')
  const [newHandle, setNewHandle] = useState('')
  const [addingPlatform, setAddingPlatform] = useState(false)

  const isAnyProcessing = Object.values(platformStatuses).some(s => s === 'processing')

  // Realtime subscription
  useEffect(() => {
    if (section !== 'platforms') return

    const channel = supabase
      .channel('platform-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'influencer_platforms', filter: `influencer_id=eq.${influencer.id}` },
        (payload) => {
          const updated = payload.new as any
          const id = updated.id
          const status = updated.parse_status

          // Clear the 30s safety timeout — we got a real update
          if (processingTimeouts.current[id]) {
            clearTimeout(processingTimeouts.current[id])
            delete processingTimeouts.current[id]
          }

          setPlatformStatuses(prev => ({ ...prev, [id]: status }))

          if (status === 'processing') {
            setBanner('processing')
            if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
          }

          if (status === 'complete' || status === 'failed') {
            if (status === 'complete') {
              setBanner('complete')
              if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
              bannerTimerRef.current = setTimeout(() => setBanner(null), 4000)
              setTimeout(() => router.refresh(), 1000)
            } else {
              setBanner(null)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
      Object.values(processingTimeouts.current).forEach(clearTimeout)
    }
  }, [section, influencer.id])

  async function updateHandle(platformId: string) {
    setSavingHandle(platformId)
    await supabase.from('influencer_platforms').update({ handle: handleEdits[platformId] }).eq('id', platformId)
    setSavingHandle(null)
    setSavedHandle(platformId)
    setTimeout(() => setSavedHandle(null), 2000)
  }

  async function addPlatform() {
    if (!newPlatform) return
    setAddingPlatform(true)
    await supabase.from('influencer_platforms').insert({
      influencer_id: influencer.id,
      platform: newPlatform,
      handle: newHandle.trim() || null,
      parse_status: 'pending',
    })
    setNewHandle('')
    setAddingPlatform(false)
    router.refresh()
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${influencer.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('influencer-avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('influencer-avatars').getPublicUrl(path)
      await supabase.from('influencers').update({ avatar_url: publicUrl }).eq('id', influencer.id)
      setAvatarUrl(publicUrl)
    }
    setAvatarUploading(false)
  }

  function startProcessingTimeout(platformId: string) {
    if (processingTimeouts.current[platformId]) clearTimeout(processingTimeouts.current[platformId])
    processingTimeouts.current[platformId] = setTimeout(() => {
      setPlatformStatuses(prev => {
        if (prev[platformId] === 'processing') return { ...prev, [platformId]: 'failed' }
        return prev
      })
      setBanner(null)
      delete processingTimeouts.current[platformId]
    }, 30000)
  }

  function uploadAndParseScreenshots(platformId: string, platform: string, files: File[]) {
    setUploadingPlatform(platformId)
    setPlatformStatuses(prev => ({ ...prev, [platformId]: 'processing' }))
    setBanner('processing')
    startProcessingTimeout(platformId)
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('platform', platform)
    formData.append('platformId', platformId)
    formData.append('influencerId', influencer.id)
    fetch('/api/parse-screenshots', { method: 'POST', body: formData })
      .finally(() => setUploadingPlatform(null))
  }

  async function saveSection() {
    setSaving(true)
    const updates: any = {}

    if (section === 'info') {
      Object.assign(updates, { first_name: firstName, last_name: lastName, phone, city, country, languages })
    } else if (section === 'content') {
      Object.assign(updates, { primary_niche: primaryNiche, secondary_niches: secondaryNiches, content_style: contentStyle, formats, posting_frequency: postingFrequency, bio })
    } else if (section === 'brands') {
      Object.assign(updates, { brand_loves: brandLoves, brand_never: brandNever, brand_loves_custom: brandLovesCustom, brand_never_custom: brandNeverCustom })
    } else if (section === 'rates') {
      const upsertRows = Object.entries(rateState)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([key, val]) => {
          const [platform, content_type] = key.split('__')
          return { influencer_id: influencer.id, platform, content_type, rate_eur: Math.round(parseFloat(val) * 100), currency: 'EUR' }
        })
      if (upsertRows.length) {
        await supabase.from('influencer_rates').upsert(upsertRows, { onConflict: 'influencer_id,platform,content_type' })
      }
      await supabase.from('influencers').update({
        open_to_gifting: gifting,
        open_to_rev_share: revShare,
        open_to_exclusivity: exclusivity,
      }).eq('id', influencer.id)
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('influencers').update(updates).eq('id', influencer.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const CHIP_VARIANTS: Record<'gold'|'green'|'red', { text: string; bg: string; border: string }> = {
    gold:  { text: 'text-gold',  bg: 'bg-gold-bg',  border: 'border-gold-border' },
    green: { text: 'text-green', bg: 'bg-green-bg', border: 'border-green-border' },
    red:   { text: 'text-red',   bg: 'bg-red-bg',   border: 'border-red-border' },
  }

  const chip = (label: string, active: boolean, onClick: () => void, variant: 'gold'|'green'|'red' = 'gold') => {
    const v = CHIP_VARIANTS[variant]
    return (
      <button
        key={label}
        onClick={onClick}
        className={cn(
          'px-3 py-[5px] rounded-[20px] text-xs font-semibold cursor-pointer border transition-all',
          active ? cn(v.bg, v.text, v.border) : 'bg-muted text-muted-foreground border-border',
        )}
      >
        {label}
      </button>
    )
  }

  const inputClass = 'w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none box-border'

  const labelClass = 'text-[11px] font-semibold text-muted-foreground block mb-[5px]'

  const sectionTabs = [
    { key:'info', label:'Basic info' },
    { key:'content', label:'Content profile' },
    { key:'brands', label:'Brand prefs' },
    { key:'rates', label:'Rate card' },
    { key:'platforms', label:'Platforms' },
  ]

  return (
    <div className="px-7 pt-6 pb-10 max-w-[660px]">
      <div className="flex items-center gap-4 mb-5">
        <Link href="/dashboard/profile" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground no-underline">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Profile
        </Link>
        <h2 className="text-base font-semibold">Edit profile</h2>
      </div>

      {/* AI Summary — always visible */}
      <div className="bg-card border border-gold-border rounded-xl px-[18px] py-3.5 mb-5">
        <p className={cn('text-[11px] font-semibold text-gold tracking-[0.08em] uppercase', aiSummary ? 'mb-2' : 'mb-1')}>AI Summary</p>
        {isAnyProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full flex-shrink-0 animate-spin" />
            <p className="text-[13px] text-muted-foreground">Updating your profile summary…</p>
          </div>
        ) : aiSummary ? (
          <>
            {aiParsedAt && <p className="text-[11px] text-muted-foreground/60 mb-1.5">Updated {timeAgo(aiParsedAt)}</p>}
            <p className="text-[13px] leading-[1.6] text-muted-foreground">{aiSummary}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">Upload screenshots below to generate your AI summary automatically.</p>
        )}
      </div>

      <div className="flex gap-px border-b border-border mb-5 overflow-x-auto">
        {sectionTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSection(t.key as any)}
            className={cn(
              'px-4 py-2 bg-transparent border-none text-[13px] font-semibold cursor-pointer whitespace-nowrap',
              section === t.key ? 'border-b-2 border-gold text-foreground' : 'border-b-2 border-transparent text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Basic info */}
      {section === 'info' && (
        <div className="flex flex-col gap-3.5">
          {/* Avatar upload */}
          <div className="flex items-center gap-4 pb-3.5 border-b border-border mb-1">
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-[72px] h-[72px] rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-[72px] h-[72px] rounded-full bg-gold flex items-center justify-center text-2xl font-semibold text-white">
                  {firstName?.[0]}{lastName?.[0]}
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
              <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="bg-muted border border-border rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer text-foreground">
                {avatarUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p className="text-[11px] text-muted-foreground mt-[5px]">JPG, PNG or WebP · max 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input className={inputClass} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input className={inputClass} value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Languages</label>
            <LanguageSelector value={languages} onChange={setLanguages} />
          </div>
        </div>
      )}

      {/* Content profile */}
      {section === 'content' && (
        <div className="flex flex-col gap-[18px]">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-2">Primary niche</label>
            <div className="flex gap-1.5 flex-wrap">
              {NICHES.map(n => chip(n, primaryNiche === n, () => setPrimaryNiche(n)))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-2">Secondary niches</label>
            <div className="flex gap-1.5 flex-wrap">
              {NICHES.filter(n => n !== primaryNiche).map(n => chip(n, secondaryNiches.includes(n), () => toggle(secondaryNiches, setSecondaryNiches, n)))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-2">Content style</label>
            <div className="flex gap-1.5 flex-wrap">
              {STYLES.map(s => chip(s, contentStyle === s, () => setContentStyle(s)))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-2">Formats</label>
            <div className="flex gap-1.5 flex-wrap">
              {FORMATS.map(f => chip(f, formats.includes(f), () => toggle(formats, setFormats, f)))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-2">How often do you post?</label>
            <select
              value={postingFrequency}
              onChange={e => setPostingFrequency(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none cursor-pointer appearance-none bg-no-repeat pr-9"
              style={{
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M1 1l5 4.5L11 1' stroke='%23E8E3DA' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round' opacity='.35'/%3E%3C/svg%3E")`,
                backgroundPosition:'right 12px center',
              }}
            >
              <option value="">Select posting frequency…</option>
              <option>Daily</option>
              <option>4–6x per week</option>
              <option>2–3x per week</option>
              <option>Once a week</option>
              <option>Less than once a week</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Bio</label>
            <textarea className={cn(inputClass, 'min-h-[90px] resize-y leading-[1.5]')} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell brands a bit about you and your content..." />
          </div>
        </div>
      )}

      {/* Brand prefs */}
      {section === 'brands' && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[13px] font-semibold mb-1 inline-flex items-center gap-1.5">Brand categories I love <Heart size={13} className="text-green" /></p>
            <p className="text-xs text-muted-foreground mb-2.5">Categories you enjoy working with</p>
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {CATEGORIES.filter(c => !brandNever.includes(c)).map(c => chip(c, brandLoves.includes(c), () => { toggle(brandLoves, setBrandLoves, c); setBrandNever(prev => prev.filter(x => x !== c)) }, 'green'))}
            </div>
            <p className="text-[11px] text-muted-foreground/60 mb-2.5">Selected categories won't appear in the never list.</p>
            <textarea className={cn(inputClass, 'min-h-[60px] resize-y')} value={brandLovesCustom} onChange={e => setBrandLovesCustom(e.target.value)} placeholder="Add your own (e.g. sustainable brands, indie brands...)" />
          </div>
          <div>
            <p className="text-[13px] font-semibold mb-1 inline-flex items-center gap-1.5">Categories I never work with <Ban size={13} className="text-red" /></p>
            <p className="text-xs text-muted-foreground mb-2.5">Hard stops — Sarah will never match you with these</p>
            <div className="flex gap-1.5 flex-wrap mb-2.5">
              {CATEGORIES.filter(c => !brandLoves.includes(c)).map(c => chip(c, brandNever.includes(c), () => { toggle(brandNever, setBrandNever, c); setBrandLoves(prev => prev.filter(x => x !== c)) }, 'red'))}
            </div>
            <textarea className={cn(inputClass, 'min-h-[60px] resize-y')} value={brandNeverCustom} onChange={e => setBrandNeverCustom(e.target.value)} placeholder="Add your own (e.g. tobacco, gambling, fast fashion...)" />
          </div>
        </div>
      )}

      {/* Rate card */}
      {section === 'rates' && (
        <div>
          {Array.from(new Set([...rates.map((r: any) => r.platform), ...(platforms.map((p: any) => p.platform))])).map(platform => {
            const FIELDS: [string, string][] = platform === 'instagram'
              ? [['Reel','reel'],['Story','story'],['Feed post','post']]
              : platform === 'tiktok'
              ? [['Video','video']]
              : platform === 'youtube'
              ? [['Integration','integration'],['Video','video']]
              : [['Post','post']]

            return (
              <div key={platform} className="bg-card border border-border rounded-xl px-[18px] py-4 mb-3">
                <p className="text-sm font-semibold mb-3.5 capitalize">{platform}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {FIELDS.map(([label, ct]) => {
                    const key = `${platform}__${ct}`
                    return (
                      <div key={ct}>
                        <label className="text-[11px] text-muted-foreground block mb-1">{label} (€)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">€</span>
                          <input className={cn(inputClass, 'pl-[22px]')}
                            value={rateState[key] || ''}
                            onChange={e => setRateState(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0" type="number" min="0" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="bg-card border border-border rounded-xl px-[18px] py-4 mt-1">
            {([
              ['Gifting OK', gifting, setGifting],
              ['Rev-share OK', revShare, setRevShare],
              ['Exclusivity OK', exclusivity, setExclusivity],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border">
                <p className="text-[13px] font-medium">{label}</p>
                <button
                  onClick={() => set(!val)}
                  className={cn('w-[38px] h-[21px] rounded-[11px] border-none cursor-pointer relative transition-colors duration-[250ms]', val ? 'bg-green' : 'bg-border')}
                >
                  <span className="absolute w-[15px] h-[15px] rounded-full bg-white top-[3px] left-[3px] transition-transform duration-[250ms]" style={{ transform: val ? 'translateX(17px)' : 'none' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platforms */}
      {section === 'platforms' && (
        <div>
          {/* How it works info box */}
          <div className="bg-gold-bg border-l-[3px] border-gold rounded-[10px] px-4 py-3.5 mb-4">
            <p className="text-[13px] font-semibold text-foreground mb-2">How this works</p>
            <p className="text-[13px] text-muted-foreground leading-[1.6] mb-2">
              Upload screenshots of your analytics from each platform. Our AI reads them and builds your profile automatically — the more screenshots you upload, the more accurate your matches will be.
            </p>
            <ul className="list-none p-0 flex flex-col gap-1">
              {[
                'Upload from multiple screens for best results',
                'Upload new screenshots anytime to refresh stats',
                'Changes only affect future matches, not active gigs',
              ].map((t, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-gold flex-shrink-0">·</span>{t}
                </li>
              ))}
            </ul>
          </div>

          {/* Notification banner — kept for non-platform-card level feedback */}

          {platforms.length === 0 && (
            <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
              <p className="text-sm font-semibold mb-1.5">No platforms yet</p>
              <p className="text-[13px] text-muted-foreground">Add platforms during onboarding or contact Sarah to update.</p>
            </div>
          )}

          {platforms.map(p => {
            const platformScreenshots = screenshotsByPlatform[p.id] || []
            const isUploading = uploadingPlatform === p.id
            const liveStatus = platformStatuses[p.id] || 'pending'

            const parseStatus: ParseStatus =
              liveStatus === 'processing' ? 'processing' :
              liveStatus === 'complete'   ? 'complete'   :
              liveStatus === 'failed'     ? 'failed'     : 'idle'

            const showProgress = parseStatus === 'processing' || parseStatus === 'complete' || parseStatus === 'failed'

            const parsedLabel = liveStatus === 'complete'
              ? `Parsed · Last updated ${p.last_parsed_at ? new Date(p.last_parsed_at).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : ''}`
              : 'No screenshots uploaded yet'
            const parsedBadgeClass = liveStatus === 'complete'
              ? 'bg-green-bg text-green border-green-border'
              : 'bg-muted text-muted-foreground border-border'

            return (
              <div key={p.id} className="bg-card border border-border rounded-xl px-[18px] py-3.5 mb-2.5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <p className="text-sm font-semibold capitalize flex-1">{p.platform}</p>
                  {!showProgress && (
                    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[20px] border', parsedBadgeClass)}>
                      {liveStatus === 'complete' && <Check size={12} className="flex-shrink-0" />}
                      {parsedLabel}
                    </span>
                  )}
                </div>

                {/* Handle edit row */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <label className="text-[11px] font-semibold text-muted-foreground flex-shrink-0">Handle</label>
                  <input
                    value={handleEdits[p.id] ?? ''}
                    onChange={e => setHandleEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="@yourhandle"
                    className="flex-1 bg-muted border border-border rounded-md px-2.5 py-1.5 text-[13px] text-foreground outline-none"
                  />
                  <button
                    onClick={() => updateHandle(p.id)}
                    disabled={savingHandle === p.id}
                    className="bg-muted border border-border rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer text-foreground flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1"
                  >
                    {savingHandle === p.id ? 'Saving…' : savedHandle === p.id ? <><Check size={12} className="flex-shrink-0" />Saved</> : 'Update'}
                  </button>
                </div>

                {/* Screenshot thumbnails */}
                {platformScreenshots.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-[7px]">
                      Uploaded screenshots ({platformScreenshots.length})
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {platformScreenshots.map((s: any) => (
                        <div key={s.id} className="w-[70px] h-[70px] rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
                          {s.signedUrl ? (
                            <img src={s.signedUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.2"/><circle cx="6.5" cy="7.5" r="1.5" fill="currentColor" className="text-muted-foreground"/><path d="M2 12l4-4 3 3 2-2 5 5" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload zone */}
                <input
                  ref={el => { fileInputRefs.current[p.id] = el }}
                  type="file" multiple accept="image/*" className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) uploadAndParseScreenshots(p.id, p.platform, files)
                  }}
                />

                {showProgress ? (
                  <div className="mb-2.5">
                    <ParseProgressCard
                      status={parseStatus}
                      onSettled={() => {
                        setPlatformStatuses(prev => ({
                          ...prev,
                          [p.id]: parseStatus === 'complete' ? 'complete' : 'pending',
                        }))
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploading && fileInputRefs.current[p.id]?.click()}
                    className="border-2 border-dashed border-border rounded-[10px] p-3.5 text-center cursor-pointer transition-colors mb-2.5"
                  >
                    <p className="text-[13px] font-semibold mb-0.5">
                      {platformScreenshots.length > 0 ? 'Upload new screenshots' : 'Upload screenshots'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Click to select · multiple files OK · JPG or PNG</p>
                  </div>
                )}

                {UPLOAD_HINTS[p.platform.toLowerCase()] && (
                  <div className="mb-2.5">
                    <p className="text-xs text-muted-foreground mb-[5px]">For the best match, upload screenshots of:</p>
                    <ul className="list-none p-0 flex flex-col gap-[3px]">
                      {UPLOAD_HINTS[p.platform.toLowerCase()].map((hint: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-gold flex-shrink-0">·</span>{hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ScreenshotGuide platform={p.platform} />
              </div>
            )
          })}

          {/* Add another platform */}
          {availablePlatforms.length > 0 && (
            <div className="border-2 border-dashed border-border rounded-xl px-[18px] py-4">
              <p className="text-[13px] font-semibold mb-3 text-foreground">Add another platform</p>
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={newPlatform}
                  onChange={e => setNewPlatform(e.target.value)}
                  className="bg-muted border border-border rounded-md px-2.5 py-[7px] text-[13px] text-foreground outline-none cursor-pointer"
                >
                  {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <input
                  value={newHandle}
                  onChange={e => setNewHandle(e.target.value)}
                  placeholder="@yourhandle"
                  className="flex-1 min-w-[140px] bg-muted border border-border rounded-md px-2.5 py-[7px] text-[13px] text-foreground outline-none"
                />
                <button
                  onClick={addPlatform}
                  disabled={addingPlatform || !newPlatform}
                  className={cn('bg-gold text-white border-none rounded-md px-3.5 py-[7px] text-xs font-semibold flex-shrink-0', addingPlatform ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100')}
                >
                  {addingPlatform ? 'Adding…' : 'Add platform'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {section !== 'platforms' && (
        <div className="mt-6">
          <button
            onClick={saveSection}
            disabled={saving}
            className={cn('text-white border-none rounded-[9px] px-7 py-3 text-sm font-semibold transition-colors inline-flex items-center gap-1.5', saved ? 'bg-green' : 'bg-gold', saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100')}
          >
            {saving ? 'Saving…' : saved ? <><Check size={14} className="flex-shrink-0" />Saved</> : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
