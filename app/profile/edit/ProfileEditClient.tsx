'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ScreenshotGuide from '@/components/ScreenshotGuide'

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState<'info'|'content'|'brands'|'rates'|'platforms'>('info')

  // Basic info state
  const [firstName, setFirstName] = useState(influencer.first_name || '')
  const [lastName, setLastName] = useState(influencer.last_name || '')
  const [phone, setPhone] = useState(influencer.phone || '')
  const [city, setCity] = useState(influencer.city || '')
  const [country, setCountry] = useState(influencer.country || '')
  const [languages, setLanguages] = useState<string[]>(influencer.languages || [])
  const [langInput, setLangInput] = useState('')

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

  // Platform tab state
  const [reparsingPlatform, setReparsingPlatform] = useState<string | null>(null)
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string>(influencer.ai_summary || '')
  const [aiParsedAt, setAiParsedAt] = useState<string | null>(influencer.ai_parsed_at || null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

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

  async function uploadAndParseScreenshots(platformId: string, platform: string, files: File[]) {
    setUploadingPlatform(platformId)
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('platform', platform)
    formData.append('platformId', platformId)
    formData.append('influencerId', influencer.id)
    await fetch('/api/parse-screenshots', { method: 'POST', body: formData })
    setUploadingPlatform(null)
    router.refresh()
  }

  async function reparseScreenshots(platformId: string, platform: string) {
    setReparsingPlatform(platformId)
    const res = await fetch('/api/reparse-screenshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId, influencerId: influencer.id, platform }),
    })
    if (res.ok) router.refresh()
    setReparsingPlatform(null)
  }

  async function regenerateSummary() {
    setGeneratingSummary(true)
    const res = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ influencerId: influencer.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setAiSummary(data.summary)
      setAiParsedAt(new Date().toISOString())
    }
    setGeneratingSummary(false)
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

  const chip = (label: string, active: boolean, onClick: () => void, color = 'var(--acc)', activeBg = 'var(--acc2)', border = 'var(--acc3)') => (
    <button key={label} onClick={onClick} style={{
      padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
      background: active ? activeBg : 'var(--bg3)',
      color: active ? color : 'var(--muted)',
      border: `1px solid ${active ? border : 'var(--line)'}`,
      transition:'all 0.15s',
    }}>{label}</button>
  )

  const inputStyle = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--line)',
    borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--fg)',
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
        <Link href="/dashboard/profile" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--muted)', textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Profile
        </Link>
        <h2 style={{ fontSize:16, fontWeight:700 }}>Edit profile</h2>
      </div>

      <div style={{ display:'flex', gap:1, borderBottom:'1px solid var(--line)', marginBottom:20, overflowX:'auto' }}>
        {sectionTabs.map(t => (
          <button key={t.key} onClick={() => setSection(t.key as any)} style={{
            padding:'8px 16px', background:'transparent', border:'none',
            borderBottom: section === t.key ? '2px solid var(--acc)' : '2px solid transparent',
            color: section === t.key ? 'var(--fg)' : 'var(--muted)',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Basic info */}
      {section === 'info' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Avatar upload */}
          <div style={{ display:'flex', alignItems:'center', gap:16, paddingBottom:14, borderBottom:'1px solid var(--line)', marginBottom:4 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--line)' }} />
              ) : (
                <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--acc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#090E1A' }}>
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
                background:'var(--bg3)', border:'1px solid var(--line)', borderRadius:8,
                padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'var(--fg)',
              }}>
                {avatarUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>JPG, PNG or WebP · max 5MB</p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>First name</label>
              <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Last name</label>
              <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Country</label>
              <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Languages</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {languages.map(l => (
                <span key={l} style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:'var(--acc2)', color:'var(--acc)', border:'1px solid var(--acc3)', display:'flex', alignItems:'center', gap:5 }}>
                  {l}
                  <button onClick={() => setLanguages(languages.filter(x => x !== l))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--acc)', fontSize:14, lineHeight:1, padding:0 }}>×</button>
                </span>
              ))}
            </div>
            <input style={{ ...inputStyle }} value={langInput} onChange={e => setLangInput(e.target.value)}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && langInput.trim()) { e.preventDefault(); setLanguages([...languages, langInput.trim()]); setLangInput('') } }}
              placeholder="Type a language and press Enter" />
          </div>
        </div>
      )}

      {/* Content profile */}
      {section === 'content' && (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:8 }}>Primary niche</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {NICHES.map(n => chip(n, primaryNiche === n, () => setPrimaryNiche(n)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:8 }}>Secondary niches</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {NICHES.filter(n => n !== primaryNiche).map(n => chip(n, secondaryNiches.includes(n), () => toggle(secondaryNiches, setSecondaryNiches, n)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:8 }}>Content style</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STYLES.map(s => chip(s, contentStyle === s, () => setContentStyle(s)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:8 }}>Formats</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {FORMATS.map(f => chip(f, formats.includes(f), () => toggle(formats, setFormats, f)))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:8 }}>How often do you post?</label>
            <select value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} style={{
              width:'100%', background:'var(--bg3)', border:'1px solid var(--line)',
              borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--fg)',
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
            <label style={{ fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>Bio</label>
            <textarea style={{ ...inputStyle, minHeight:90, resize:'vertical', lineHeight:1.5 }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell brands a bit about you and your content..." />
          </div>
        </div>
      )}

      {/* Brand prefs */}
      {section === 'brands' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Brand categories I love ❤️</p>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>Categories you enjoy working with</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {CATEGORIES.map(c => chip(c, brandLoves.includes(c), () => toggle(brandLoves, setBrandLoves, c), 'var(--green)', 'rgba(74,222,128,0.1)', 'rgba(74,222,128,0.25)'))}
            </div>
            <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical' }} value={brandLovesCustom} onChange={e => setBrandLovesCustom(e.target.value)} placeholder="Add your own (e.g. sustainable brands, indie brands...)" />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Categories I never work with 🚫</p>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>Hard stops — Sarah will never match you with these</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {CATEGORIES.map(c => chip(c, brandNever.includes(c), () => toggle(brandNever, setBrandNever, c), 'var(--red)', 'rgba(248,113,113,0.1)', 'rgba(248,113,113,0.25)'))}
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
              <div key={platform} style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
                <p style={{ fontSize:14, fontWeight:700, marginBottom:14, textTransform:'capitalize' }}>{platform}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {FIELDS.map(([label, ct]) => {
                    const key = `${platform}__${ct}`
                    return (
                      <div key={ct}>
                        <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:4 }}>{label} (€)</label>
                        <div style={{ position:'relative' }}>
                          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--muted)' }}>€</span>
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

          <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 18px', marginTop:4 }}>
            {([
              ['Gifting OK', gifting, setGifting],
              ['Rev-share OK', revShare, setRevShare],
              ['Exclusivity OK', exclusivity, setExclusivity],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--line)' }}>
                <p style={{ fontSize:13, fontWeight:500 }}>{label}</p>
                <button onClick={() => set(!val)} style={{
                  width:38, height:21, borderRadius:11, border:'none', cursor:'pointer',
                  background: val ? 'var(--green)' : 'var(--line)', position:'relative', transition:'background 0.25s',
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
          {/* AI Summary card */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--acc3)', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom: aiSummary ? 10 : 0 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--acc)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>AI Summary</p>
                {aiParsedAt && <p style={{ fontSize:11, color:'var(--muted)' }}>Updated {timeAgo(aiParsedAt)}</p>}
              </div>
              <button onClick={regenerateSummary} disabled={generatingSummary} style={{
                background:'var(--acc2)', border:'1px solid var(--acc3)', borderRadius:8,
                padding:'6px 12px', fontSize:11, fontWeight:700, cursor: generatingSummary ? 'not-allowed' : 'pointer',
                fontFamily:'inherit', color:'var(--acc)', flexShrink:0, opacity: generatingSummary ? 0.7 : 1,
              }}>
                {generatingSummary ? 'Generating…' : 'Regenerate summary'}
              </button>
            </div>
            {aiSummary ? (
              <p style={{ fontSize:13, lineHeight:1.6, color:'var(--muted)' }}>{aiSummary}</p>
            ) : (
              <p style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>No summary yet — upload and parse screenshots to generate one.</p>
            )}
          </div>

          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
            To update your social stats, upload new screenshots. Parse results only affect future matching — active gigs are not changed.
          </p>

          {platforms.length === 0 && (
            <div style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'32px 24px', textAlign:'center' }}>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No platforms yet</p>
              <p style={{ fontSize:13, color:'var(--muted)' }}>Add platforms during onboarding or contact Sarah to update.</p>
            </div>
          )}

          {platforms.map(p => {
            const platformScreenshots = screenshotsByPlatform[p.id] || []
            const isReparsing = reparsingPlatform === p.id
            const isUploading = uploadingPlatform === p.id

            return (
              <div key={p.id} style={{ background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:12, padding:'14px 18px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:700 }}>{p.platform} <span style={{ fontWeight:400, color:'var(--muted)' }}>@{p.handle}</span></p>
                    <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                      Status: <span style={{ color: p.parse_status === 'complete' ? 'var(--green)' : p.parse_status === 'processing' ? 'var(--acc)' : 'var(--muted)', fontWeight:600 }}>{p.parse_status}</span>
                      {p.last_parsed_at && ` · Last parsed ${new Date(p.last_parsed_at).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' })}`}
                    </p>
                  </div>
                  {platformScreenshots.length > 0 && (
                    <button
                      onClick={() => reparseScreenshots(p.id, p.platform)}
                      disabled={isReparsing || isUploading}
                      style={{
                        background:'var(--acc)', color:'#090E1A', border:'none', borderRadius:8,
                        padding:'7px 13px', fontSize:12, fontWeight:700,
                        cursor: (isReparsing || isUploading) ? 'not-allowed' : 'pointer',
                        fontFamily:'inherit', opacity: (isReparsing || isUploading) ? 0.6 : 1, flexShrink:0,
                      }}
                    >
                      {isReparsing ? 'Re-parsing…' : 'Re-parse with AI'}
                    </button>
                  )}
                </div>

                {/* Screenshot thumbnails */}
                {platformScreenshots.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:7 }}>
                      Uploaded screenshots ({platformScreenshots.length})
                    </p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {platformScreenshots.map((s: any) => (
                        <div key={s.id} style={{ width:70, height:70, borderRadius:8, overflow:'hidden', border:'1px solid var(--line)', flexShrink:0, background:'var(--bg3)' }}>
                          {s.signedUrl ? (
                            <img src={s.signedUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          ) : (
                            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--muted)" strokeWidth="1.2"/><circle cx="6.5" cy="7.5" r="1.5" fill="var(--muted)"/><path d="M2 12l4-4 3 3 2-2 5 5" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                <div
                  onClick={() => !isUploading && fileInputRefs.current[p.id]?.click()}
                  style={{
                    border:`2px dashed ${isUploading ? 'var(--acc3)' : 'var(--line)'}`,
                    borderRadius:10, padding:'14px', textAlign:'center',
                    cursor: isUploading ? 'default' : 'pointer',
                    background: isUploading ? 'rgba(196,154,60,0.05)' : 'transparent',
                    transition:'border-color 0.15s', marginBottom:10,
                  }}
                >
                  {isUploading ? (
                    <p style={{ fontSize:12, color:'var(--acc)', fontWeight:600 }}>Uploading & parsing…</p>
                  ) : (
                    <>
                      <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>
                        {platformScreenshots.length > 0 ? 'Upload new screenshots' : 'Upload screenshots'}
                      </p>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>Click to select · multiple files OK · JPG or PNG</p>
                    </>
                  )}
                </div>

                {UPLOAD_HINTS[p.platform.toLowerCase()] && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:12, color:'var(--muted)', marginBottom:5 }}>For the best match, upload screenshots of:</p>
                    <ul style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:3 }}>
                      {UPLOAD_HINTS[p.platform.toLowerCase()].map((hint: string, i: number) => (
                        <li key={i} style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:6 }}>
                          <span style={{ color:'var(--acc)', flexShrink:0 }}>·</span>{hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ScreenshotGuide platform={p.platform} />
              </div>
            )
          })}
        </div>
      )}

      {section !== 'platforms' && (
        <div style={{ marginTop:24 }}>
          <button onClick={saveSection} disabled={saving} style={{
            background: saved ? 'var(--green)' : 'var(--acc)', color:'#090E1A',
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
