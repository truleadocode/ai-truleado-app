'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

const ALL_LANGUAGES = [
  'English','German','French','Spanish','Italian','Dutch','Portuguese','Polish',
  'Swedish','Danish','Norwegian','Finnish','Greek','Czech','Romanian','Hungarian',
  'Slovak','Bulgarian','Croatian','Serbian','Slovenian','Estonian','Latvian',
  'Lithuanian','Turkish','Arabic','Hindi','Urdu','Bengali','Punjabi','Marathi',
  'Tamil','Telugu','Kannada','Malayalam','Gujarati','Russian','Ukrainian',
  'Chinese (Simplified)','Chinese (Traditional)','Japanese','Korean',
  'Indonesian','Malay','Vietnamese','Thai','Tagalog','Swahili','Afrikaans',
  'Hebrew','Persian',
]

interface Props {
  value: string[]
  onChange: (languages: string[]) => void
  placeholder?: string
  max?: number
}

export default function LanguageSelector({ value, onChange, placeholder = 'Search languages…', max = 10 }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = ALL_LANGUAGES.filter(l =>
    !value.includes(l) && l.toLowerCase().includes(query.toLowerCase())
  )

  const showAddCustom = query.trim().length > 0 &&
    !ALL_LANGUAGES.some(l => l.toLowerCase() === query.trim().toLowerCase()) &&
    !value.includes(query.trim())

  function add(lang: string) {
    if (value.length >= max) return
    onChange([...value, lang])
    setQuery('')
    inputRef.current?.focus()
  }

  function remove(lang: string) {
    onChange(value.filter(l => l !== lang))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) { add(filtered[0]); return }
      if (showAddCustom) { add(query.trim()); return }
    }
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const atMax = value.length >= max

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={atMax ? `Max ${max} languages selected` : placeholder}
        disabled={atMax}
        className={cn(
          'w-full box-border rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground font-[inherit] outline-none',
          atMax ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
        )}
      />

      {open && !atMax && (filtered.length > 0 || showAddCustom) && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-[200px] overflow-y-auto rounded-lg border border-border bg-card shadow-md z-50">
          {filtered.map(lang => (
            <div
              key={lang}
              onMouseDown={e => { e.preventDefault(); add(lang) }}
              className="px-3 py-2 text-[13px] text-foreground cursor-pointer hover:bg-muted"
            >
              {lang}
            </div>
          ))}
          {showAddCustom && (
            <div
              onMouseDown={e => { e.preventDefault(); add(query.trim()) }}
              className={cn(
                'px-3 py-2 text-[13px] text-gold font-semibold cursor-pointer hover:bg-gold-bg',
                filtered.length > 0 && 'border-t border-border'
              )}
            >
              Add &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map(lang => (
            <span key={lang} className="inline-flex items-center gap-[5px] text-xs px-2.5 py-1 rounded-full bg-gold-bg text-gold border border-gold-border">
              {lang}
              <button
                onClick={() => remove(lang)}
                className="flex items-center bg-none border-none cursor-pointer text-gold text-sm leading-none p-0"
              >×</button>
            </span>
          ))}
        </div>
      )}

      {atMax && (
        <p className="text-[11px] text-muted-foreground/60 mt-1.5">Maximum {max} languages reached</p>
      )}
    </div>
  )
}
