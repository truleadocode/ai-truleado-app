'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ScreenshotGuide from '@/components/ScreenshotGuide'

const LABELS = [
  'Create your account',
  'Basic information',
  'Social accounts',
  'Content profile',
  'Brand preferences',
  'Your rates',
]

const BTN_LABELS = ['Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Finish setup']

const NICHES = ['Fashion','Fitness','Food','Travel','Beauty','Lifestyle','Tech','Finance','Parenting','Gaming','Home','Sustainability']
const FORMATS = ['Reels','Static posts','Stories','Long-form video','YouTube Shorts','Carousels','Podcasts','Blogs']
const LANGS = ['English','German','French','Spanish','Italian','Dutch','Portuguese','Swedish','Other']
const LOVE_CATS = ['Activewear','Skincare','Food & drink','Tech gadgets','Travel brands','Wellness apps','Home goods','Fashion','Supplements','Finance apps','Baby & kids','Sustainability']
const NEVER_CATS = ['Alcohol','Tobacco','Gambling','Fast food','Crypto','Adult content','Weight loss','Political']
const PLATFORMS_LIST = [
  { key: 'instagram', label: 'Instagram', sub: 'Posts, Reels', icon: '📸' },
  { key: 'tiktok',    label: 'TikTok',    sub: 'Videos',       icon: '🎵' },
  { key: 'youtube',   label: 'YouTube',   sub: 'Videos, Shorts', icon: '▶️' },
  { key: 'pinterest', label: 'Pinterest', sub: 'Pins',          icon: '📌' },
]

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

function LogoMark() {
  return (
    <span style={{width:22,height:22,borderRadius:6,background:'var(--acc)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 10L6 2L10 10" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 7h5" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </span>
  )
}

function TagPill({ label, selected, onToggle, danger }: { label: string, selected: boolean, onToggle: () => void, danger?: boolean }) {
  const baseStyle: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:5,
    borderRadius:20, padding:'7px 14px',
    fontSize:13, fontWeight:500, cursor:'pointer',
    userSelect:'none', transition:'all 0.2s',
    border: '1px solid',
  }
  if (danger) {
    return (
      <div onClick={onToggle} style={{
        ...baseStyle,
        background: selected ? 'var(--red2)' : 'var(--bg2)',
        borderColor: selected ? 'var(--red3)' : 'rgba(248,113,113,0.2)',
        color: selected ? 'var(--red)' : 'var(--muted)',
      }}>🚫 {label}</div>
    )
  }
  return (
    <div onClick={onToggle} style={{
      ...baseStyle,
      background: selected ? 'var(--acc2)' : 'var(--bg2)',
      borderColor: selected ? 'var(--acc3)' : 'var(--line)',
      color: selected ? 'var(--fg)' : 'var(--muted)',
    }}>{label}</div>
  )
}

export default function OnboardingClient({
  influencer,
  userId,
}: {
  influencer: { id: string, first_name: string, last_name: string, email: string, onboarding_step: number }
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(influencer.onboarding_step || 1)
  const [saving, setSaving] = useState(false)

  // Step 2 — basic info
  const [firstName, setFirstName] = useState(influencer.first_name || '')
  const [lastName, setLastName]   = useState(influencer.last_name || '')
  const [phone, setPhone]         = useState('')
  const [city, setCity]           = useState('')
  const [country, setCountry]     = useState('')
  const [langs, setLangs]         = useState<string[]>(['English'])

  // Step 3 — social accounts
  const [platforms, setPlatforms]     = useState<string[]>(['instagram'])
  const [handles, setHandles]         = useState<Record<string,string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [parsing, setParsing]         = useState<Record<string,boolean>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Step 4 — content profile
  const [primaryNiche, setPrimaryNiche]   = useState('')
  const [secondaryNiches, setSecondaryNiches] = useState<string[]>([])
  const [contentStyle, setContentStyle]   = useState('')
  const [contentFormats, setContentFormats] = useState<string[]>(['Reels'])
  const [postingFrequency, setPostingFrequency] = useState('')
  const [bio, setBio]                     = useState('')

  // Step 5 — brand prefs
  const [loveCats, setLoveCats]   = useState<string[]>([])
  const [neverCats, setNeverCats] = useState<string[]>([])
  const [loveCustom, setLoveCustom] = useState('')
  const [neverCustom, setNeverCustom] = useState('')
  const [pastPartners, setPastPartners] = useState('')

  // Step 6 — rates (in EUR, stored in cents)
  const [rates, setRates] = useState({
    instagram_reel: '',
    instagram_post: '',
    instagram_story: '',
    tiktok_video: '',
    youtube_integration: '',
  })
  const [openGifting, setOpenGifting]     = useState(false)
  const [openRevShare, setOpenRevShare]   = useState(false)
  const [openExclusivity, setOpenExclusivity] = useState(true)

  function toggleArr(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  async function handleFileUpload(platform: string, files: File[]) {
    if (!files.length) return
    const newFiles = { ...uploadedFiles, [platform]: [...(uploadedFiles[platform] || []), ...files] }
    setUploadedFiles(newFiles)
    setParsing(p => ({ ...p, [platform]: true }))

    // Upload to storage
    for (const file of files) {
      const path = `${userId}/${platform}/${Date.now()}_${file.name}`
      await supabase.storage.from('influencer-screenshots').upload(path, file)
    }
  }

  async function saveStep(targetStep: number) {
    setSaving(true)
    try {
      if (step === 2) {
        await supabase.from('influencers').update({
          first_name: firstName, last_name: lastName,
          phone, city, country, languages: langs,
          onboarding_step: 3,
        }).eq('user_id', userId)
      } else if (step === 3) {
        // Upsert platform rows
        for (const platform of platforms) {
          const { data: existing } = await supabase
            .from('influencer_platforms')
            .select('id')
            .eq('influencer_id', influencer.id)
            .eq('platform', platform)
            .single()

          if (!existing) {
            const { data: platRow } = await supabase.from('influencer_platforms').insert({
              influencer_id: influencer.id,
              platform,
              handle: handles[platform] || null,
              parse_status: uploadedFiles[platform]?.length ? 'processing' : 'pending',
            }).select('id').single()

            // If files uploaded, trigger AI parsing
            if (uploadedFiles[platform]?.length && platRow) {
              triggerParsing(platRow.id, platform, uploadedFiles[platform])
            }
          }
        }
        await supabase.from('influencers').update({ onboarding_step: 4 }).eq('user_id', userId)
      } else if (step === 4) {
        await supabase.from('influencers').update({
          primary_niche: primaryNiche,
          secondary_niches: secondaryNiches,
          content_style: contentStyle,
          formats: contentFormats,
          posting_frequency: postingFrequency,
          bio,
          onboarding_step: 5,
        }).eq('user_id', userId)
      } else if (step === 5) {
        await supabase.from('influencers').update({
          brand_loves: loveCats,
          brand_never: neverCats,
          brand_loves_custom: loveCustom.trim() || null,
          brand_never_custom: neverCustom.trim() || null,
          past_partnerships: pastPartners,
          onboarding_step: 6,
        }).eq('user_id', userId)
      } else if (step === 6) {
        // Save rates
        const rateRows = [
          { platform: 'instagram', content_type: 'reel',        rate_eur: Math.round(parseFloat(rates.instagram_reel || '0') * 100) },
          { platform: 'instagram', content_type: 'post',        rate_eur: Math.round(parseFloat(rates.instagram_post || '0') * 100) },
          { platform: 'instagram', content_type: 'story',       rate_eur: Math.round(parseFloat(rates.instagram_story || '0') * 100) },
          { platform: 'tiktok',    content_type: 'video',       rate_eur: Math.round(parseFloat(rates.tiktok_video || '0') * 100) },
          { platform: 'youtube',   content_type: 'integration', rate_eur: Math.round(parseFloat(rates.youtube_integration || '0') * 100) },
        ].filter(r => r.rate_eur > 0).map(r => ({ ...r, influencer_id: influencer.id, currency: 'EUR' }))

        if (rateRows.length) {
          await supabase.from('influencer_rates').upsert(rateRows, { onConflict: 'influencer_id,platform,content_type' })
        }

        await supabase.from('influencers').update({
          open_to_gifting: openGifting,
          open_to_rev_share: openRevShare,
          open_to_exclusivity: openExclusivity,
          onboarding_complete: true,
          onboarding_step: 7,
          status: 'active',
        }).eq('user_id', userId)

        await supabase.from('notifications').insert({
          influencer_id: influencer.id,
          type: 'system',
          title: 'Welcome to Truleado! 🎉',
          body: 'Your profile is live. Sarah will reach out when a campaign matches your profile.',
        })

        router.push('/dashboard')
        return
      }

      setStep(targetStep)
    } finally {
      setSaving(false)
    }
  }

  async function triggerParsing(platformId: string, platform: string, files: File[]) {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('platform', platform)
    formData.append('platformId', platformId)
    formData.append('influencerId', influencer.id)

    fetch('/api/parse-screenshots', { method: 'POST', body: formData })
      .then(() => setParsing(p => ({ ...p, [platform]: false })))
      .catch(() => setParsing(p => ({ ...p, [platform]: false })))
  }

  const progress = step > 6 ? 6 : step

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', height:56,
        borderBottom:'1px solid var(--line)',
        background:'var(--bg)',
        position:'sticky', top:0, zIndex:100,
      }}>
        <a href="#" style={{ display:'flex', alignItems:'center', gap:7, fontSize:16, fontWeight:800, color:'var(--fg)', textDecoration:'none' }}>
          <LogoMark /> Truleado
        </a>
        <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)' }}>
          Step <span style={{ color:'var(--fg)', fontWeight:700 }}>{Math.min(step, 6)}</span> of 6
        </p>
      </nav>

      {/* PROGRESS */}
      <div style={{ background:'var(--bg)', padding:'16px 24px 0', position:'sticky', top:56, zIndex:99 }}>
        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              flex:1, height:3, borderRadius:2,
              background: i < progress ? 'var(--acc)' : i === progress ? 'rgba(196,154,60,0.5)' : 'var(--line)',
              transition:'background 0.4s',
            }} />
          ))}
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--muted)', letterSpacing:'0.05em', paddingBottom:12, borderBottom:'1px solid var(--line)' }}>
          Step {Math.min(step, 6)} — <span style={{ color:'var(--acc)' }}>{LABELS[Math.min(step,6)-1]}</span>
        </p>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth:520, margin:'0 auto', padding:'32px 24px 100px' }}>

        {/* STEP 1 — Account (already signed in via Google, just confirm) */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>You&apos;re signed in!</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:28, lineHeight:1.6 }}>
              Your Google account is connected. Let&apos;s set up your creator profile — takes about 5 minutes.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { n:1, title:'Fill in your creator profile', sub:'Takes about 5 minutes' },
                { n:2, title:'Upload social screenshots', sub:'Our AI builds your profile automatically' },
                { n:3, title:'Get matched to brand campaigns', sub:'You only hear from us when it\'s relevant' },
              ].map(item => (
                <div key={item.n} style={{ display:'flex', alignItems:'flex-start', gap:12, background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--acc2)', border:'1px solid var(--acc3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--acc)', flexShrink:0, marginTop:1 }}>{item.n}</div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{item.title}</p>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Basic info */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>Tell us about yourself.</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:28, lineHeight:1.6 }}>Basic info so brands know who they&apos;re working with.</p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <Field label="First name"><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inputStyle} /></Field>
              <Field label="Last name"><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inputStyle} /></Field>
            </div>
            <Field label="Phone number" hint="Only used by Truleado. Never shared with brands.">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle} />
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <Field label="City"><input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Amsterdam" style={inputStyle} /></Field>
              <Field label="Country">
                <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
                  <option value="">Select…</option>
                  {['United Kingdom','Germany','France','Netherlands','Spain','Italy','Sweden','Denmark','Belgium','Switzerland','Portugal','Austria','Poland','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Languages you create in">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {LANGS.map(l => (
                  <TagPill key={l} label={l} selected={langs.includes(l)} onToggle={() => toggleArr(langs, l, setLangs)} />
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* STEP 3 — Social accounts */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>Your social accounts.</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20, lineHeight:1.6 }}>Select the platforms you&apos;re active on, then upload screenshots. Our AI reads them automatically.</p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              {PLATFORMS_LIST.map(p => {
                const sel = platforms.includes(p.key)
                return (
                  <div key={p.key} onClick={() => toggleArr(platforms, p.key, setPlatforms)} style={{
                    display:'flex', alignItems:'center', gap:10,
                    background: sel ? 'var(--acc2)' : 'var(--bg2)',
                    border: `1px solid ${sel ? 'var(--acc3)' : 'var(--line)'}`,
                    borderRadius:10, padding:'13px 14px', cursor:'pointer',
                    transition:'all 0.2s', userSelect:'none',
                  }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:600 }}>{p.label}</p>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{p.sub}</span>
                    </div>
                    <div style={{
                      width:18, height:18, borderRadius:'50%', marginLeft:'auto', flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: sel ? 'var(--acc)' : 'transparent',
                      border: `1.5px solid ${sel ? 'var(--acc)' : 'var(--line)'}`,
                      transition:'all 0.2s',
                    }}>
                      {sel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#090E1A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background:'var(--acc2)', border:'1px solid var(--acc3)', borderRadius:10, padding:'12px 14px', fontSize:13, color:'var(--fg)', lineHeight:1.6, marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:2 }}><circle cx="8" cy="8" r="7" stroke="#C49A3C" strokeWidth="1.4"/><path d="M8 7v4M8 5v.5" stroke="#C49A3C" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Upload screenshots of your profile stats, recent posts, and audience insights page. We&apos;ll extract the numbers automatically.
            </div>

            {platforms.map(platform => {
              const platInfo = PLATFORMS_LIST.find(p => p.key === platform)!
              const files = uploadedFiles[platform] || []
              return (
                <div key={platform} style={{ marginBottom:20 }}>
                  <h4 style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>
                    {platInfo.label} screenshots{' '}
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--acc)', background:'var(--acc2)', border:'1px solid var(--acc3)', padding:'2px 8px', borderRadius:20 }}>{platInfo.label}</span>
                  </h4>
                  <div style={{ marginBottom:10 }}>
                    <Field label="Handle (optional)">
                      <input type="text" value={handles[platform] || ''} onChange={e => setHandles(h => ({ ...h, [platform]: e.target.value }))} placeholder={`@your${platform}handle`} style={inputStyle} />
                    </Field>
                  </div>
                  <ScreenshotGuide platform={platform} />
                  <div style={{
                    border: `1.5px dashed ${files.length ? 'var(--acc3)' : 'var(--line)'}`,
                    background: files.length ? 'var(--acc2)' : 'transparent',
                    borderRadius:12, overflow:'hidden', transition:'all 0.2s',
                  }}>
                    <input
                      type="file" multiple accept="image/*" style={{ display:'none' }}
                      ref={el => { fileRefs.current[platform] = el }}
                      onChange={e => { if (e.target.files) handleFileUpload(platform, Array.from(e.target.files)) }}
                    />
                    {UPLOAD_HINTS[platform] && (
                      <div style={{ padding:'12px 14px 10px', borderBottom:`1px dashed ${files.length ? 'var(--acc3)' : 'var(--line)'}` }}>
                        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>For the best match, upload screenshots of:</p>
                        <ul style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:3 }}>
                          {UPLOAD_HINTS[platform].map((hint, i) => (
                            <li key={i} style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:6 }}>
                              <span style={{ color:'var(--acc)', flexShrink:0 }}>·</span>{hint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div onClick={() => fileRefs.current[platform]?.click()} style={{ padding:'18px 16px', textAlign:'center', cursor:'pointer' }}>
                      <div style={{ fontSize:22, marginBottom:6 }}>📂</div>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:2 }}>Tap to upload screenshots</p>
                      <span style={{ fontSize:12, color:'var(--muted)' }}>PNG, JPG — multiple files OK</span>
                    </div>
                  </div>
                  {files.length > 0 && (
                    <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                      {files.map((f, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg3)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 12px' }}>
                          <span style={{ fontSize:12, fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                          <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      ))}
                      {parsing[platform] && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:500, color:'var(--acc)', marginTop:4 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--acc)', animation:'pulse 1.4s infinite' }} />
                          AI is reading your screenshots…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* STEP 4 — Content profile */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>Your content style.</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:28, lineHeight:1.6 }}>Help us understand what you create so we match you to the right campaigns.</p>

            <Field label="Primary niche">
              <select value={primaryNiche} onChange={e => setPrimaryNiche(e.target.value)} style={selectStyle}>
                <option value="">Select your main niche…</option>
                {['Fashion & Style','Fitness & Health','Food & Cooking','Travel & Adventure','Beauty & Skincare','Lifestyle','Technology','Finance & Business','Parenting & Family','Gaming','Home & Interior','Sustainability','Music & Arts','Sports','Education','Other'].map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Secondary niches (pick all that apply)">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {NICHES.map(n => <TagPill key={n} label={n} selected={secondaryNiches.includes(n)} onToggle={() => toggleArr(secondaryNiches, n, setSecondaryNiches)} />)}
              </div>
            </Field>
            <Field label="Content style">
              <select value={contentStyle} onChange={e => setContentStyle(e.target.value)} style={selectStyle}>
                <option value="">How would you describe your content?</option>
                {['Educational — I teach and explain','Inspirational — I motivate and uplift','Entertainment — I entertain and amuse','Review-based — I test and recommend','Lifestyle — I share my daily life','Comedy — I make people laugh','Mixed — a bit of everything'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Content formats you make">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {FORMATS.map(f => <TagPill key={f} label={f} selected={contentFormats.includes(f)} onToggle={() => toggleArr(contentFormats, f, setContentFormats)} />)}
              </div>
            </Field>
            <Field label="How often do you post?">
              <select value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} style={selectStyle}>
                <option value="">Select posting frequency…</option>
                <option>Daily</option>
                <option>4–6x per week</option>
                <option>2–3x per week</option>
                <option>Once a week</option>
                <option>Less than once a week</option>
              </select>
            </Field>
            <Field label="Short bio (shown to brands)" hint="Max 220 characters. Keep it natural — this is the first thing brands read about you.">
              <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} maxLength={220} placeholder="Briefly describe yourself and your audience in your own words…" style={{ ...inputStyle, resize:'none', lineHeight:1.6 }} />
              <p style={{ fontSize:12, color:'var(--muted)', marginTop:5, textAlign:'right' }}>{bio.length} / 220</p>
            </Field>
          </div>
        )}

        {/* STEP 5 — Brand preferences */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>Brand preferences.</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:28, lineHeight:1.6 }}>Tell us what you love and what you&apos;ll never promote. We take this seriously.</p>

            <Field label="Brands & categories you love working with">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                {LOVE_CATS.map(c => <TagPill key={c} label={c} selected={loveCats.includes(c)} onToggle={() => toggleArr(loveCats, c, setLoveCats)} />)}
              </div>
              <input type="text" value={loveCustom} onChange={e => setLoveCustom(e.target.value)} placeholder="Add your own (e.g. Scandinavian design brands)" style={inputStyle} />
            </Field>

            <div style={{ height:1, background:'var(--line)', margin:'16px 0' }} />

            <Field label="Brands & categories you will never promote">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                {NEVER_CATS.map(c => <TagPill key={c} label={c} selected={neverCats.includes(c)} onToggle={() => toggleArr(neverCats, c, setNeverCats)} danger />)}
              </div>
              <input type="text" value={neverCustom} onChange={e => setNeverCustom(e.target.value)} placeholder="Add your own exclusions…" style={inputStyle} />
            </Field>

            <div style={{ height:1, background:'var(--line)', margin:'16px 0' }} />

            <Field label="Notable brand partnerships (optional)" hint="Helps brands understand your experience level.">
              <input type="text" value={pastPartners} onChange={e => setPastPartners(e.target.value)} placeholder="e.g. Nike, Glossier, Oatly…" style={inputStyle} />
            </Field>
          </div>
        )}

        {/* STEP 6 — Rates */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, marginBottom:6 }}>Your rates.</h2>
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20, lineHeight:1.6 }}>We only match you to campaigns that fit your rate card. Set your minimum — you can always negotiate up.</p>

            <div style={{ background:'var(--acc2)', border:'1px solid var(--acc3)', borderRadius:10, padding:'12px 14px', fontSize:13, color:'var(--fg)', lineHeight:1.6, marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:2 }}><circle cx="8" cy="8" r="7" stroke="#C49A3C" strokeWidth="1.4"/><path d="M8 7v4M8 5v.5" stroke="#C49A3C" strokeWidth="1.4" strokeLinecap="round"/></svg>
              These are your minimums. Brands see a range, not your exact number. You can negotiate on every deal.
            </div>

            {[
              { key:'instagram_reel',       label:'Instagram Reel',      sub:'Per video',        placeholder:'800' },
              { key:'instagram_post',       label:'Instagram Post',      sub:'Static image',     placeholder:'500' },
              { key:'instagram_story',      label:'Instagram Story',     sub:'Per frame set',    placeholder:'200' },
              { key:'tiktok_video',         label:'TikTok Video',        sub:'Per video',        placeholder:'600' },
              { key:'youtube_integration',  label:'YouTube Integration', sub:'Per video mention', placeholder:'1200' },
            ].map(r => (
              <div key={r.key} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 16px', marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:500 }}>{r.label}</p>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>{r.sub}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, background:'var(--bg3)', borderRadius:7, padding:'6px 10px', minWidth:100 }}>
                  <span style={{ fontSize:13, color:'var(--muted)' }}>€</span>
                  <input
                    type="number" placeholder={r.placeholder} min="0"
                    value={(rates as any)[r.key]}
                    onChange={e => setRates(prev => ({ ...prev, [r.key]: e.target.value }))}
                    style={{ background:'transparent', border:'none', outline:'none', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--fg)', width:70, textAlign:'right', padding:0 }}
                  />
                </div>
              </div>
            ))}

            <div style={{ height:1, background:'var(--line)', margin:'16px 0' }} />

            {[
              { key:'gifting', label:'Open to gifting-only deals', sub:'Receive products with no cash fee', val:openGifting, set:setOpenGifting },
              { key:'revshare', label:'Open to revenue share deals', sub:'Earn a % of sales you drive', val:openRevShare, set:setOpenRevShare },
              { key:'exclusivity', label:'Open to exclusivity clauses', sub:'Agree not to work with competitors', val:openExclusivity, set:setOpenExclusivity },
            ].map(t => (
              <div key={t.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--line)' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500 }}>{t.label}</p>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{t.sub}</span>
                </div>
                <button onClick={() => t.set(!t.val)} style={{
                  width:40, height:22, borderRadius:11, flexShrink:0,
                  background: t.val ? 'var(--acc)' : 'var(--line)',
                  border:'none', cursor:'pointer', position:'relative', transition:'background 0.25s',
                }}>
                  <span style={{
                    position:'absolute', width:16, height:16, borderRadius:'50%',
                    background:'#fff', top:3, left:3,
                    transform: t.val ? 'translateX(18px)' : 'none',
                    transition:'transform 0.25s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* STEP 7 — Success */}
        {step === 7 && (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--green2)', border:'1px solid var(--green3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7 13-13" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:-0.8, marginBottom:10 }}>You&apos;re in. 🎉</h2>
            <p style={{ fontSize:15, color:'var(--muted)', lineHeight:1.7, marginBottom:32 }}>
              Your profile is live and our AI is already building your match profile. Sarah will reach out when a campaign fits.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, textAlign:'left' }}>
              {[
                { n:1, title:'AI is parsing your screenshots', sub:'Usually done within a few minutes' },
                { n:2, title:'Your profile is now active', sub:'You\'re in the matching pool from today' },
                { n:3, title:'Sarah will message you when there\'s a match', sub:'Check your Truleado inbox — no email needed' },
              ].map(item => (
                <div key={item.n} style={{ display:'flex', alignItems:'flex-start', gap:12, background:'var(--bg2)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--acc2)', border:'1px solid var(--acc3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--acc)', flexShrink:0, marginTop:1 }}>{item.n}</div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{item.title}</p>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      {step <= 6 && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:'var(--bg)', borderTop:'1px solid var(--line)',
          padding:'16px 24px', display:'flex', gap:12, zIndex:100,
        }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flexShrink:0, background:'var(--faint)', border:'1px solid var(--line)',
              borderRadius:10, padding:'14px 20px',
              fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--muted)',
              cursor:'pointer',
            }}>← Back</button>
          )}
          <button onClick={() => saveStep(step + 1)} disabled={saving} style={{
            flex:1, background:'var(--acc)', border:'none',
            borderRadius:10, padding:14,
            fontFamily:'inherit', fontSize:15, fontWeight:700, color:'#090E1A',
            cursor:'pointer', opacity: saving ? 0.7 : 1,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {saving ? 'Saving…' : BTN_LABELS[step - 1]}
            {!saving && <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="#090E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, hint }: { label: string, children: React.ReactNode, hint?: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, letterSpacing:'0.05em', color:'var(--muted)', textTransform:'uppercase', marginBottom:7 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize:12, color:'var(--muted)', marginTop:5 }}>{hint}</p>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%', background:'var(--bg2)', border:'1px solid var(--line)',
  borderRadius:10, padding:'13px 16px',
  fontFamily:'Plus Jakarta Sans, sans-serif', fontSize:15, fontWeight:400, color:'var(--fg)',
  outline:'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor:'pointer',
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M1 1l5 4.5L11 1' stroke='%23E8E3DA' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round' opacity='.35'/%3E%3C/svg%3E")`,
  backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center',
  paddingRight:40, appearance:'none',
}
