'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Loader2, MessageCircle, FileText, Send, Lock, Pencil, AlertCircle, Check, X, Save, Sparkles, ChevronRight } from 'lucide-react'
import SubscriptionPlanPicker, { type Plan } from '@/components/SubscriptionPlanPicker'

const SESSION_KEY_LS = 'truleado_brief_session_key'

type Phase = 'choose' | 'loading' | 'chat' | 'upload' | 'review' | 'submitting'
interface Message { role: 'sarah' | 'user'; text: string }

const REVIEW_FIELDS: { label: string; format: (d: Record<string, any>) => string | null }[] = [
  { label: 'Brand',              format: d => d.brand_name || null },
  { label: 'Product',            format: d => d.product_description || null },
  { label: 'Platforms',          format: d => d.platforms?.length ? d.platforms.join(', ') : null },
  { label: 'Content',            format: d => d.content_types?.length ? d.content_types.join(', ') : null },
  { label: 'Creators needed',    format: d => d.creators_needed ? String(d.creators_needed) : null },
  { label: 'Budget per creator', format: d => d.budget_flexible ? 'Flexible' : d.budget_per_creator_eur ? `€${Math.round(d.budget_per_creator_eur / 100)}` : null },
  { label: 'Target audience',    format: d => [d.target_age_range, d.target_gender, d.target_countries?.join(', ')].filter(Boolean).join(' · ') || null },
  { label: 'Go-live date',       format: d => d.go_live_date || null },
  { label: 'Niche',              format: d => d.niche_fit || null },
  { label: 'Tone notes',         format: d => d.tone_notes || null },
]

// Minimum signal that an upload actually produced something usable — without
// this, a near-empty extraction (all nulls but a non-'low' confidence) would
// silently sail through to a blank review screen and a submittable empty brief.
function hasBriefContent(d: Record<string, any> | null) {
  return Boolean(d?.brand_name || d?.product_description || d?.platforms?.length)
}

interface PaddleConfig { plans: Plan[]; env: 'sandbox' | 'production'; clientToken: string }

export default function BriefCreationClient({ advertiser, needsSubscription, draftBrief, paddle }: { advertiser: any; needsSubscription: boolean; draftBrief?: any; paddle: PaddleConfig }) {
  const router = useRouter()
  // A resumed draft skips straight to the review screen with its saved fields.
  const [phase, setPhase] = useState<Phase>(draftBrief ? 'review' : 'choose')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('brand')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(draftBrief || null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  const [editing, setEditing] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isThinking])

  // Generate (or restore) a session key as soon as the component mounts, so
  // it's always ready — whether the user starts with chat, jumps straight to
  // an upload, or edits a reviewed brief without ever having chatted.
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY_LS) : null
    const key = stored || `trbrf_${crypto.randomUUID()}`
    if (typeof window !== 'undefined') localStorage.setItem(SESSION_KEY_LS, key)
    setSessionKey(key)
  }, [])

  function ensureSessionKey() {
    if (sessionKey) return sessionKey
    const key = `trbrf_${crypto.randomUUID()}`
    if (typeof window !== 'undefined') localStorage.setItem(SESSION_KEY_LS, key)
    setSessionKey(key)
    return key
  }

  // ── Paddle subscription gate ───────────────────────────────
  if (needsSubscription) {
    return (
      <>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-14 h-14 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center mx-auto mb-5">
            <Lock size={22} className="text-gold" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Unlock unlimited briefs</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-7">
            You've used your free brief. Subscribe to submit unlimited briefs and keep finding the right creators.
          </p>
          <Card className="mb-6">
            <CardContent className="pt-6 pb-6 text-left">
              <SubscriptionPlanPicker
                advertiserId={advertiser.id}
                email={advertiser.email}
                paddleEnv={paddle.env}
                clientToken={paddle.clientToken}
                plans={paddle.plans}
                buttonClassName="w-full bg-gold hover:bg-gold/90 text-white font-semibold"
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">Unlimited briefs · Unlimited creator matches</p>
            </CardContent>
          </Card>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => router.push('/advertiser/dashboard')}>
            Go back to dashboard
          </Button>
        </div>
      </>
    )
  }

  // ── Chat (from-scratch build) ───────────────────────────────
  async function startChat() {
    setPhase('loading')
    const key = ensureSessionKey()
    await fetch('/api/advertiser/brief-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', session_key: key, advertiser_id: advertiser.id }),
    })
    setPhase('chat')
    addSarah(`Let's build your brief! First — what's the brand name and what are you promoting?`)
    setStep('brand')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function addSarah(text: string) { setMessages(prev => [...prev, { role: 'sarah', text }]) }
  function addUser(text: string)  { setMessages(prev => [...prev, { role: 'user', text }]) }

  async function sendMessage(text: string) {
    if (!text.trim() || isThinking) return
    addUser(text); setInput('')
    setIsThinking(true)
    try {
      const res = await fetch('/api/advertiser/brief-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', session_key: sessionKey, step, user_message: text, data: sessionData, advertiser_id: advertiser.id }),
      })
      const data = await res.json()
      if (data.extracted) setSessionData((prev: any) => ({ ...prev, ...data.extracted }))
      if (data.step) setStep(data.step)
      addSarah(data.sarah_reply || 'Got it!')
      if (data.phase === 'review') { setReviewData(data.session_data); setPhase('review') }
    } catch { addSarah("Sorry, I had a hiccup — can you say that again? 😅") }
    finally { setIsThinking(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  // ── Upload ──────────────────────────────────────────
  async function handleFileUpload(file: File) {
    ensureSessionKey()
    setUploadedFile(file)
    setPhase('upload')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('advertiser_id', advertiser.id)
    try {
      const res = await fetch('/api/advertiser/parse-brief', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.notice === 'legacy_doc_unsupported') {
        setPhase('chat')
        addSarah("Older .doc files are tricky for me to read reliably — could you re-export it as a PDF or .docx next time? For now, let's build it together. What's the brand name and what are you promoting?")
        setStep('brand')
        return
      }

      const usable = data.extracted && data.extracted.confidence !== 'low' && hasBriefContent(data.extracted)

      if (usable) {
        setReviewData(data.extracted)
        setSessionData(data.extracted)
        setPhase('review')
      } else {
        setPhase('chat')
        addSarah("I had trouble reading that brief properly — could be the format or scan quality. Let's build it together instead. What's the brand name and what are you promoting?")
        setStep('brand')
      }
    } catch {
      setPhase('chat')
      addSarah("Something went wrong reading that file. What's the brand name and what are you promoting?")
      setStep('brand')
    }
  }

  // ── Inline edit on the review screen ──────────────────────────────
  // Direct field editing (replaces the old AI-mediated "Edit with Sarah").
  function applyFieldEdits(updated: Record<string, any>) {
    const merged = { ...reviewData, ...updated }
    setReviewData(merged)
    setSessionData(merged)
    setEditing(false)
  }

  // ── Save as draft ───────────────────────────────────
  async function saveDraft() {
    if (!reviewData) return
    setSavingDraft(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/advertiser/submit-brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiser_id: advertiser.id, draft_id: draftBrief?.id, ...reviewData, status: 'draft' }),
      })
      const result = await res.json()
      if (!res.ok || !result.brief_id) {
        setSubmitError(result.error || 'Could not save your draft. Please try again.')
        return
      }
      // This brief's session is done — clear the stored key so the next
      // brief doesn't reuse (and merge into) the old brief_sessions row.
      localStorage.removeItem(SESSION_KEY_LS)
      // Invalidate Next's client router cache before navigating, so the
      // briefs list re-fetches instead of serving a stale cached payload
      // from before this draft existed.
      router.refresh()
      router.push('/advertiser/briefs')
    } catch {
      setSubmitError('Could not save your draft. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────
  async function submitBrief(data: Record<string, any>) {
    setPhase('submitting')
    setSubmitError(null)
    try {
      const res = await fetch('/api/advertiser/submit-brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // status pinned last: a resumed draft row carries status:'draft' in its
        // fields, which must not downgrade this real submission back to a draft.
        body: JSON.stringify({ advertiser_id: advertiser.id, draft_id: draftBrief?.id, ...data, status: 'submitted' }),
      })
      const result = await res.json()
      if (!res.ok || !result.brief_id) {
        setSubmitError(result.error || 'Something went wrong submitting your brief. Please try again.')
        setPhase('review')
        return
      }
      // Same session-key + cache-invalidation reasoning as saveDraft.
      localStorage.removeItem(SESSION_KEY_LS)
      router.refresh()
      router.push(`/advertiser/briefs/${result.brief_id}`)
    } catch {
      setSubmitError('Something went wrong submitting your brief. Please try again.')
      setPhase('review')
    }
  }

  return (
    <>
      {phase === 'choose' && (
        <div className="max-w-lg mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center mx-auto mb-4"><Sparkles size={22} className="text-gold" /></div>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Create a brief</h1>
            <p className="text-sm text-muted-foreground">How would you like to get started?</p>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={startChat}
              className="bg-card border-2 border-border rounded-2xl p-6 text-left hover:border-gold transition-colors cursor-pointer"
            >
              <MessageCircle size={24} className="text-gold mb-3" />
              <p className="text-sm font-semibold mb-1.5">Build with Sarah</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Answer a few questions and Sarah will put together your brief.</p>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-card border-2 border-border rounded-2xl p-6 text-left hover:border-gold transition-colors cursor-pointer"
            >
              <FileText size={24} className="text-gold mb-3" />
              <p className="text-sm font-semibold mb-1.5">Upload your brief</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Already have a brief? Upload it and Sarah will extract everything.</p>
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {phase === 'upload' && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 size={28} className="animate-spin text-gold mb-4" />
          <p className="text-sm font-medium">Reading your brief…</p>
          {uploadedFile && <p className="text-xs text-muted-foreground mt-1.5">{uploadedFile.name}</p>}
        </div>
      )}

      {phase === 'review' && reviewData && (
        <div className="max-w-xl mx-auto py-6">
          <h2 className="text-lg font-semibold tracking-tight mb-1">Does this look right?</h2>
          <p className="text-sm text-muted-foreground mb-5">Review your brief, save it for later, or submit when you're ready.</p>

          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle size={14} />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {!editing && (
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {REVIEW_FIELDS.map(({ label, format }) => {
                    const value = format(reviewData)
                    if (!value) return null
                    return (
                      <div key={label} className="flex justify-between gap-4 px-5 py-3">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
                        <span className="text-sm font-medium text-right">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {editing ? (
            <ReviewEditForm
              initial={reviewData}
              onCancel={() => setEditing(false)}
              onSave={applyFieldEdits}
            />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Edit
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={saveDraft} disabled={savingDraft}>
                {savingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {savingDraft ? 'Saving…' : 'Save brief'}
              </Button>
              <Button className="flex-1 min-w-[140px] bg-gold hover:bg-gold/90 text-white font-semibold gap-1" onClick={() => submitBrief(reviewData)}>
                Submit brief <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 size={28} className="animate-spin text-gold mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Submitting your brief…</p>
        </div>
      )}

      {phase === 'chat' && (
        <div className="max-w-xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="flex items-center gap-2.5 px-1 pb-4 border-b border-border mb-4">
            <div className="w-8 h-8 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center"><Sparkles size={15} className="text-gold" /></div>
            <div>
              <p className="text-sm font-semibold">Sarah Chen</p>
              <p className="text-[11px] text-muted-foreground">Building your brief</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pb-4 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'sarah'
                    ? 'bg-card border border-border shadow-sm rounded-[4px_18px_18px_18px]'
                    : 'bg-gold text-white rounded-[18px_4px_18px_18px]'
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex">
                <div className="bg-card border border-border shadow-sm rounded-[4px_18px_18px_18px] px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
                      style={{ animation: `dot-bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Type your answer…"
              disabled={isThinking}
              autoFocus
              className="flex-1 h-10 px-4 rounded-full border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                input.trim() && !isThinking ? 'bg-gold text-white' : 'bg-border text-muted-foreground'
              )}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Inline review editor ─────────────────────────────────────────────
// Local draft state; nothing touches reviewData until "Save changes".
const PLATFORM_OPTIONS = ['instagram', 'tiktok', 'youtube', 'pinterest']
const CONTENT_OPTIONS = ['reel', 'story', 'video', 'post', 'carousel', 'ugc']

function ReviewEditForm({ initial, onCancel, onSave }: {
  initial: Record<string, any>
  onCancel: () => void
  onSave: (updated: Record<string, any>) => void
}) {
  const [brand, setBrand] = useState(initial.brand_name || '')
  const [product, setProduct] = useState(initial.product_description || '')
  const [platforms, setPlatforms] = useState<string[]>(initial.platforms || [])
  const [contentTypes, setContentTypes] = useState<string[]>(initial.content_types || [])
  const [creators, setCreators] = useState(initial.creators_needed ? String(initial.creators_needed) : '5')
  const [budgetFlexible, setBudgetFlexible] = useState(Boolean(initial.budget_flexible))
  // Stored in cents; edited in whole EUR.
  const [budgetEur, setBudgetEur] = useState(
    initial.budget_per_creator_eur ? String(Math.round(initial.budget_per_creator_eur / 100)) : ''
  )
  const [ageRange, setAgeRange] = useState(initial.target_age_range || '')
  const [gender, setGender] = useState(initial.target_gender || 'all')
  const [countries, setCountries] = useState((initial.target_countries || []).join(', '))
  const [goLive, setGoLive] = useState(initial.go_live_date || '')
  const [niche, setNiche] = useState(initial.niche_fit || '')
  const [tone, setTone] = useState(initial.tone_notes || '')

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  }

  const valid = brand.trim().length > 0 && product.trim().length > 0 && platforms.length > 0

  function save() {
    if (!valid) return
    onSave({
      brand_name: brand.trim(),
      product_description: product.trim(),
      platforms,
      content_types: contentTypes,
      creators_needed: Math.max(1, parseInt(creators, 10) || 5),
      budget_flexible: budgetFlexible,
      budget_per_creator_eur: budgetFlexible
        ? null
        : budgetEur.trim() ? Math.round(parseFloat(budgetEur) * 100) : null,
      target_age_range: ageRange.trim() || null,
      target_gender: gender || 'all',
      target_countries: countries.split(',').map((c: string) => c.trim()).filter(Boolean),
      go_live_date: goLive || null,
      niche_fit: niche.trim() || null,
      tone_notes: tone.trim() || null,
    })
  }

  const chip = (selected: boolean) => cn(
    'px-3 py-1.5 rounded-full border text-xs font-semibold capitalize transition-colors',
    selected ? 'border-gold bg-gold-bg text-gold' : 'border-border bg-card text-muted-foreground hover:border-gold/50'
  )

  const textareaClass = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y'

  return (
    <Card className="mb-4">
      <CardContent className="pt-6 pb-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="e-brand">Brand</Label>
          <Input id="e-brand" value={brand} onChange={e => setBrand(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-product">Product</Label>
          <textarea id="e-product" value={product} onChange={e => setProduct(e.target.value)} className={textareaClass} />
        </div>

        <div className="space-y-1.5">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map(p => (
              <button key={p} type="button" onClick={() => toggle(platforms, setPlatforms, p)} className={chip(platforms.includes(p))}>{p}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Content types</Label>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...CONTENT_OPTIONS, ...contentTypes])).map(c => (
              <button key={c} type="button" onClick={() => toggle(contentTypes, setContentTypes, c)} className={chip(contentTypes.includes(c))}>{c.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-creators">Creators needed</Label>
            <Input id="e-creators" type="number" min={1} value={creators} onChange={e => setCreators(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-budget">Budget per creator (€)</Label>
            <Input id="e-budget" type="number" min={0} value={budgetEur} onChange={e => setBudgetEur(e.target.value)} disabled={budgetFlexible} placeholder={budgetFlexible ? 'Flexible' : 'e.g. 500'} />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={budgetFlexible} onChange={e => setBudgetFlexible(e.target.checked)} className="accent-[#2A2760] w-4 h-4" />
          Budget is flexible
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-age">Target age range</Label>
            <Input id="e-age" value={ageRange} onChange={e => setAgeRange(e.target.value)} placeholder="e.g. 22-38" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-gender">Target gender</Label>
            <select
              id="e-gender"
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-countries">Target countries</Label>
          <Input id="e-countries" value={countries} onChange={e => setCountries(e.target.value)} placeholder="e.g. US, UK, Canada" />
          <p className="text-[11px] text-muted-foreground">Separate with commas.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-golive">Go-live date</Label>
            <Input id="e-golive" type="date" value={goLive} onChange={e => setGoLive(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-niche">Niche</Label>
            <Input id="e-niche" value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. skincare, beauty" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-tone">Tone notes</Label>
          <textarea id="e-tone" value={tone} onChange={e => setTone(e.target.value)} className={textareaClass} />
        </div>

        <div className="flex gap-2.5 pt-1">
          <Button variant="ghost" onClick={onCancel} className="gap-1.5">
            <X size={13} /> Cancel
          </Button>
          <Button onClick={save} disabled={!valid} className="flex-1 bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5">
            <Check size={14} /> Save changes
          </Button>
        </div>
        {!valid && (
          <p className="text-[11px] text-muted-foreground">Brand, product, and at least one platform are required.</p>
        )}
      </CardContent>
    </Card>
  )
}
