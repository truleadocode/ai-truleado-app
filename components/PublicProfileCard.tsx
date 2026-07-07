'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check, Share2, Copy } from 'lucide-react'

interface Props {
  influencerId: string
  initialUsername: string | null
}

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/

export default function PublicProfileCard({ influencerId, initialUsername }: Props) {
  const supabase = createClient()
  const [username, setUsername] = useState(initialUsername || '')
  const [savedUsername, setSavedUsername] = useState(initialUsername)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const publicUrl = savedUsername && typeof window !== 'undefined'
    ? `${window.location.origin}/influencers/${savedUsername}`
    : null

  async function save() {
    const normalized = username.trim().toLowerCase()
    if (!normalized) { setError('Enter a username.'); return }
    if (!USERNAME_RE.test(normalized)) {
      setError('Use 3–30 lowercase letters, numbers, or hyphens — no leading/trailing hyphen.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('influencers').update({ username: normalized }).eq('id', influencerId)
    if (err) {
      // 23505 = unique_violation — Postgres' own error text is not user-friendly here.
      setError(err.code === '23505' ? 'That username is already taken.' : "Couldn't save. Please try again.")
    } else {
      setUsername(normalized)
      setSavedUsername(normalized)
    }
    setSaving(false)
  }

  async function share() {
    if (!publicUrl) return
    if (navigator.share) {
      try { await navigator.share({ title: 'My Truleado profile', url: publicUrl }); return } catch { /* user cancelled */ }
    }
    await copy()
  }

  async function copy() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-[18px] mb-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">Your public profile</p>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex items-center flex-1 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          <span className="text-[13px] text-muted-foreground pl-3 pr-1 whitespace-nowrap select-none">truleado.com/influencers/</span>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="yourname"
            className="border-0 shadow-none focus-visible:ring-0 px-1"
          />
        </div>
        <Button onClick={save} disabled={saving || !username.trim()} className="bg-gold hover:bg-gold/90 text-white font-semibold gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </Button>
      </div>

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      {publicUrl && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-gold font-medium no-underline hover:underline truncate">
            {publicUrl.replace(/^https?:\/\//, '')}
          </a>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={copy} className="text-xs gap-1.5">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={share} className="text-xs gap-1.5">
              <Share2 size={13} /> Share
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
