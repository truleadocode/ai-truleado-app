'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardShell from '@/components/DashboardShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Loader2, MessageCircle, FileText, Send, Lock, Pencil, AlertCircle, Check, X, Save } from 'lucide-react'

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

export default function BriefCreationClient({ advertiser, needsSubscription }: { advertiser: any; needsSubscription: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('choose')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState('brand')
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [isThinking, setIsThinking] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editNote, setEditNote] = useState<string | null>(null)

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
      <DashboardShell role="advertiser">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-14 h-14 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center mx-auto mb-5">
            <Lock size={22} className="text-gold" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mb-2">Unlock unlimited briefs</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-7">
            You've used your free brief. Subscribe to submit unlimited briefs and keep finding the right creators.
          </p>
          <Card className="mb-6">
            <CardContent className="pt-6 pb-6">
              <p className="text-3xl font-extrabold tracking-tight">$99 <span className="text-sm font-medium text-muted-foreground">/month</span></p>
              <p className="text-xs text-muted-foreground mt-1">Unlimited briefs · Unlimited creator matches</p>
            </CardContent>
          </Card>
          <Button
            className="w-full bg-gold hover:bg-gold/90 text-white font-bold mb-3"
            onClick={() => alert('Paddle checkout coming soon. For now, contact hello@truleado.com to subscribe.')}
          >
            Subscribe — $99/month
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => router.push('/advertiser/dashboard')}>
            Go back to dashboard
          </Button>
        </div>
      </DashboardShell>
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

  // ── Inline correction on the review screen ────────────────────────
  // Replaces the old "Edit with Sarah" button, which reset all the way back
  // to the brand-name question and lost everything already extracted.
  async function applyEdit() {
    if (!editText.trim() || !reviewData) return
    setEditLoading(true)
    setEditNote(null)
    try {
      const key = ensureSessionKey()
      const res = await fetch('/api/advertiser/brief-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', session_key: key, user_message: editText, data: reviewData }),
      })
      const data = await res.json()
      if (data.error) { setEditNote("Couldn't apply that change — try rephrasing."); return }
      const updated = data.extracted || reviewData
      setReviewData(updated)
      setSessionData(updated)
      setEditNote(data.sarah_reply || 'Updated.')
      setEditText(''); setEditing(false)
    } catch { setEditNote("Couldn't apply that change — try again.") }
    finally { setEditLoading(false) }
  }

  // ── Save as draft ───────────────────────────────────
  // A lower-commitment alternative to Submit: persists the brief with
  // status='draft' so it shows up on the dashboard, but doesn't trigger
  // matching or count against the free-brief allowance — the briefs table
  // already defaults to status='draft' and page.tsx already excludes drafts
  // from the subscription gate, this just exposes that path in the UI.
  async function saveDraft() {
    if (!reviewData) return
    setSavingDraft(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/advertiser/submit-brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiser_id: advertiser.id, status: 'draft', ...reviewData }),
      })
      const result = await res.json()
      if (!res.ok || !result.brief_id) {
        setSubmitError(result.error || 'Could not save your draft. Please try again.')
        return
      }
      router.push('/advertiser/dashboard')
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
        body: JSON.stringify({ advertiser_id: advertiser.id, ...data }),
      })
      const result = await res.json()
      if (!res.ok || !result.brief_id) {
        setSubmitError(result.error || 'Something went wrong submitting your brief. Please try again.')
        setPhase('review')
        return
      }
      router.push(`/advertiser/briefs/${result.brief_id}`)
    } catch {
      setSubmitError('Something went wrong submitting your brief. Please try again.')
      setPhase('review')
    }
  }

  return (
    <DashboardShell role="advertiser">
      {phase === 'choose' && (
        <div className="max-w-lg mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center mx-auto mb-4 text-xl">✨</div>
            <h1 className="text-xl font-extrabold tracking-tight mb-1">Create a brief</h1>
            <p className="text-sm text-muted-foreground">How would you like to get started?</p>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={startChat}
              className="bg-card border-2 border-border rounded-2xl p-6 text-left hover:border-gold transition-colors cursor-pointer"
            >
              <MessageCircle size={24} className="text-gold mb-3" />
              <p className="text-sm font-bold mb-1.5">Build with Sarah</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Answer a few questions and Sarah will put together your brief.</p>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-card border-2 border-border rounded-2xl p-6 text-left hover:border-gold transition-colors cursor-pointer"
            >
              <FileText size={24} className="text-gold mb-3" />
              <p className="text-sm font-bold mb-1.5">Upload your brief</p>
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
          <h2 className="text-lg font-extrabold tracking-tight mb-1">Does this look right?</h2>
          <p className="text-sm text-muted-foreground mb-5">Review your brief, save it for later, or submit when you're ready.</p>

          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle size={14} />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

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

          {editNote && <p className="text-xs text-muted-foreground mb-3 px-1">✨ {editNote}</p>}

          {editing ? (
            <div className="flex gap-2 mb-4">
              <input
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyEdit() }}
                placeholder='e.g. "the budget should be flexible"'
                disabled={editLoading}
                className="flex-1 h-10 px-4 rounded-full border border-border bg-muted text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <Button size="sm" className="bg-gold hover:bg-gold/90 text-white" onClick={applyEdit} disabled={editLoading || !editText.trim()}>
                {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText('') }} disabled={editLoading}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Edit with Sarah
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={saveDraft} disabled={savingDraft}>
                {savingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {savingDraft ? 'Saving…' : 'Save brief'}
              </Button>
              <Button className="flex-1 min-w-[140px] bg-gold hover:bg-gold/90 text-white font-bold" onClick={() => submitBrief(reviewData)}>
                Submit brief →
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
            <div className="w-8 h-8 rounded-full bg-accent border-2 border-gold-border flex items-center justify-center text-sm">✨</div>
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
    </DashboardShell>
  )
}
