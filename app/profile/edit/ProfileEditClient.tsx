'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ScreenshotGuide from '@/components/ScreenshotGuide'
import LanguageSelector from '@/components/LanguageSelector'
import ParseProgressCard from '@/components/ParseProgressCard'
import type { ParseStatus } from '@/hooks/useParseProgress'

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

  const chip = (label: string, active: boolean, onClick: () => void, color = 'var(--gold)', activeBg = 'var(--gold-bg)', border = 'var(--gold-border)') => (
    <button key={label} onClick={onClick} style={{
      padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
      background: active ? activeBg : 'var(--surface)',
      color: active ? color : 'var(--text-2)',
      border: `1px solid ${active ? border : 'var(--border)'}`,
      transition:'all 0.15s',
    }}>{label}</button>
  )

  const inputStyle = {
    width:'100%', background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--text)',
    fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const,
  }

  const sectionTabs = [
    { key:'info', label:'Basic info' },
    { key:'content', label:'Content profile' },
    { key:'brands', label:'Brand prefs' },
    { key:'rates', label:'Rate card' },
    { key:'platforms', label:'Platforms' },
  ]

  return (
    <div style={{ padding:'24px 28px 40px', maxWidth:660 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
        <Link href="/dashboard/profile" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--text-2)', textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Profile
        </Link>
        <h2 style={{ fontSize:16, fontWeight:700 }}>Edit profile</h2>
      </div>

      {/* AI Summary — always visible */}
      <div style={{ background:'var(--white)', border:'1px solid var(--gold-border)', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--gold)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:aiSummary ? 8 : 4 }}>AI Summary</p>
        {isAnyProcessing ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, border:'2px solid var(--gold)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
            <p style={{ fontSize:13, color:'var(--text-2)' }}>Updating your profile summary…</p>
          </div>
        ) : aiSummary ? (
          <>
            {aiParsedAt && <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>Updated {timeAgo(aiParsedAt)}</p>}
            <p style={{ fontSize:13, lineHeight:1.6, color:'var(--text-2)' }}>{aiSummary}</p>
          </>
        ) : (
          <p style={{ fontSize:12, color:'var(--text-2)', fontStyle:'italic' }}>Upload screenshots below to generate your AI summary automatically.</p>
        )}
      </div>

      <div style={{ display:'flex', gap:1, borderBottom:'1px solid var(--border)', marginBottom:20, overflowX:'auto' }}>
        {sectionTabs.map(t => (
          <button key={t.key} onClick={() => setSection(t.key as any)} style={{
            padding:'8px 16px', background:'transparent', border:'none',
            borderBottom: section === t.key ? '2px solid var(--gold)' : '2px solid transparent',
            color: section === t.key ? 'var(--text)' : 'var(--text-2)',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Basic info */}
      {section === 'info' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Avatar upload */}
          <div style={{ display:'flex', alignItems:'center', gap:16, paddingBottom:14, borderBottom:'1px solid var(--border)', marginBottom:4 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border)' }} />
              ) : (
                <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff' }}>
                  {firstName?.[0]}{lastName?.[0]}
                </div>
              )}
              {avatarUploading && (
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:20, height:20, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                </div>
              )}
            </div>
            <div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
              <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{
                background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
                padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'var(--text)',
              }}>
                {avatarUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p style={{ fontSize:11, color:'var(--text-2)', marginTop:5 }}>JPG, PNG or WebP · max 5MB</p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>First name</label>
              <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>Last name</label>
              <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>Country</label>
              <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>Languages</label>
            <LanguageSelector value={languages} onChange={setLanguages} />
          </div>
        </div>
      )}

      {/* Content profile */}
      {section === 'content' && (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:8 }}>Primary niche</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {NICHES.map(n => chip(n, primaryNiche === n, () => setPrimaryNiche(n)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:8 }}>Secondary niches</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {NICHES.filter(n => n !== primaryNiche).map(n => chip(n, secondaryNiches.includes(n), () => toggle(secondaryNiches, setSecondaryNiches, n)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:8 }}>Content style</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STYLES.map(s => chip(s, contentStyle === s, () => setContentStyle(s)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:8 }}>Formats</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {FORMATS.map(f => chip(f, formats.includes(f), () => toggle(formats, setFormats, f)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:8 }}>How often do you post?</label>
            <select value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} style={{
              width:'100%', background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--text)',
              fontFamily:'inherit', outline:'none', cursor:'pointer', appearance:'none',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M1 1l5 4.5L11 1' stroke='%23E8E3DA' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round' opacity='.35'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center',
              paddingRight:36,
            }}>
              <option value="">Select posting frequency…</option>
              <option>Daily</option>
              <option>4–6x per week</option>
              <option>2–3x per week</option>
              <option>Once a week</option>
              <option>Less than once a week</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:5 }}>Bio</label>
            <textarea style={{ ...inputStyle, minHeight:90, resize:'vertical', lineHeight:1.5 }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell brands a bit about you and your content..." />
          </div>
        </div>
      )}

      {/* Brand prefs */}
      {section === 'brands' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Brand categories I love ❤️</p>
            <p style={{ fontSize:12, color:'var(--text-2)', marginBottom:10 }}>Categories you enjoy working with</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {CATEGORIES.map(c => chip(c, brandLoves.includes(c), () => toggle(brandLoves, setBrandLoves, c), 'var(--green)', 'var(--green-bg)', 'var(--green-border)'))}
            </div>
            <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical' }} value={brandLovesCustom} onChange={e => setBrandLovesCustom(e.target.value)} placeholder="Add your own (e.g. sustainable brands, indie brands...)" />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Categories I never work with 🚫</p>
            <p style={{ fontSize:12, color:'var(--text-2)', marginBottom:10 }}>Hard stops — Sarah will never match you with these</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {CATEGORIES.map(c => chip(c, brandNever.includes(c), () => toggle(brandNever, setBrandNever, c), 'var(--red)', 'var(--red-bg)', 'var(--red-border)'))}
            </div>
            <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical' }} value={brandNeverCustom} onChange={e => setBrandNeverCustom(e.target.value)} placeholder="Add your own (e.g. tobacco, gambling, fast fashion...)" />
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
              <div key={platform} style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
                <p style={{ fontSize:14, fontWeight:700, marginBottom:14, textTransform:'capitalize' }}>{platform}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {FIELDS.map(([label, ct]) => {
                    const key = `${platform}__${ct}`
                    return (
                      <div key={ct}>
                        <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:4 }}>{label} (€)</label>
                        <div style={{ position:'relative' }}>
                          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-2)' }}>€</span>
                          <input style={{ ...inputStyle, paddingLeft:22 }}
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

          <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', marginTop:4 }}>
            {([
              ['Gifting OK', gifting, setGifting],
              ['Rev-share OK', revShare, setRevShare],
              ['Exclusivity OK', exclusivity, setExclusivity],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <p style={{ fontSize:13, fontWeight:500 }}>{label}</p>
                <button onClick={() => set(!val)} style={{
                  width:38, height:21, borderRadius:11, border:'none', cursor:'pointer',
                  background: val ? 'var(--green)' : 'var(--border)', position:'relative', transition:'background 0.25s',
                }}>
                  <span style={{ position:'absolute', width:15, height:15, borderRadius:'50%', background:'#fff', top:3, left:3, transform: val ? 'translateX(17px)' : 'none', transition:'transform 0.25s' }} />
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
          <div style={{ background:'var(--gold-bg)', borderLeft:'3px solid var(--gold)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:8 }}>How this works</p>
            <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, marginBottom:8 }}>
              Upload screenshots of your analytics from each platform. Our AI reads them and builds your profile automatically — the more screenshots you upload, the more accurate your matches will be.
            </p>
            <ul style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:4 }}>
              {[
                'Upload from multiple screens for best results',
                'Upload new screenshots anytime to refresh stats',
                'Changes only affect future matches, not active gigs',
              ].map((t, i) => (
                <li key={i} style={{ fontSize:12, color:'var(--text-2)', display:'flex', gap:6 }}>
                  <span style={{ color:'var(--gold)', flexShrink:0 }}>·</span>{t}
                </li>
              ))}
            </ul>
          </div>

          {/* Notification banner — kept for non-platform-card level feedback */}

          {platforms.length === 0 && (
            <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'32px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No platforms yet</p>
              <p style={{ fontSize:13, color:'var(--text-2)' }}>Add platforms during onboarding or contact Sarah to update.</p>
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
              ? `Parsed ✓ · Last updated ${p.last_parsed_at ? new Date(p.last_parsed_at).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : ''}`
              : 'No screenshots uploaded yet'
            const parsedBadge = liveStatus === 'complete'
              ? { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' }
              : { bg: 'var(--surface)', color: 'var(--text-2)', border: 'var(--border)' }

            return (
              <div key={p.id} style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <p style={{ fontSize:14, fontWeight:700, textTransform:'capitalize', flex:1 }}>{p.platform}</p>
                  {!showProgress && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:parsedBadge.bg, color:parsedBadge.color, border:`1px solid ${parsedBadge.border}` }}>
                      {parsedLabel}
                    </span>
                  )}
                </div>

                {/* Handle edit row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', flexShrink:0 }}>Handle</label>
                  <input
                    value={handleEdits[p.id] ?? ''}
                    onChange={e => setHandleEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="@yourhandle"
                    style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none' }}
                  />
                  <button
                    onClick={() => updateHandle(p.id)}
                    disabled={savingHandle === p.id}
                    style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'var(--text)', flexShrink:0, whiteSpace:'nowrap' }}
                  >
                    {savingHandle === p.id ? 'Saving…' : savedHandle === p.id ? 'Saved ✓' : 'Update'}
                  </button>
                </div>

                {/* Screenshot thumbnails */}
                {platformScreenshots.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', marginBottom:7 }}>
                      Uploaded screenshots ({platformScreenshots.length})
                    </p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {platformScreenshots.map((s: any) => (
                        <div key={s.id} style={{ width:70, height:70, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0, background:'var(--surface)' }}>
                          {s.signedUrl ? (
                            <img src={s.signedUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          ) : (
                            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--text-2)" strokeWidth="1.2"/><circle cx="6.5" cy="7.5" r="1.5" fill="var(--text-2)"/><path d="M2 12l4-4 3 3 2-2 5 5" stroke="var(--text-2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                  type="file" multiple accept="image/*" style={{ display:'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) uploadAndParseScreenshots(p.id, p.platform, files)
                  }}
                />

                {showProgress ? (
                  <div style={{ marginBottom: 10 }}>
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
                    style={{
                      border:'2px dashed var(--border)',
                      borderRadius:10, padding:'14px', textAlign:'center',
                      cursor: 'pointer',
                      transition:'border-color 0.15s', marginBottom:10,
                    }}
                  >
                    <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>
                      {platformScreenshots.length > 0 ? 'Upload new screenshots' : 'Upload screenshots'}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text-2)' }}>Click to select · multiple files OK · JPG or PNG</p>
                  </div>
                )}

                {UPLOAD_HINTS[p.platform.toLowerCase()] && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:12, color:'var(--text-2)', marginBottom:5 }}>For the best match, upload screenshots of:</p>
                    <ul style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:3 }}>
                      {UPLOAD_HINTS[p.platform.toLowerCase()].map((hint: string, i: number) => (
                        <li key={i} style={{ fontSize:12, color:'var(--text-2)', display:'flex', gap:6 }}>
                          <span style={{ color:'var(--gold)', flexShrink:0 }}>·</span>{hint}
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
            <div style={{ border:'2px dashed var(--border)', borderRadius:12, padding:'16px 18px' }}>
              <p style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--text)' }}>Add another platform</p>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <select
                  value={newPlatform}
                  onChange={e => setNewPlatform(e.target.value)}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'7px 10px', fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}
                >
                  {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <input
                  value={newHandle}
                  onChange={e => setNewHandle(e.target.value)}
                  placeholder="@yourhandle"
                  style={{ flex:1, minWidth:140, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'7px 10px', fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none' }}
                />
                <button
                  onClick={addPlatform}
                  disabled={addingPlatform || !newPlatform}
                  style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:6, padding:'7px 14px', fontSize:12, fontWeight:600, cursor: addingPlatform ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: addingPlatform ? 0.7 : 1, flexShrink:0 }}
                >
                  {addingPlatform ? 'Adding…' : 'Add platform'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {section !== 'platforms' && (
        <div style={{ marginTop:24 }}>
          <button onClick={saveSection} disabled={saving} style={{
            background: saved ? 'var(--green)' : 'var(--gold)', color:'#fff',
            border:'none', borderRadius:9, padding:'12px 28px', fontSize:14, fontWeight:700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'background 0.3s',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
