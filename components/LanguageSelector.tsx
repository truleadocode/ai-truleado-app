'use client'

import { useState, useRef, useEffect } from 'react'

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
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={atMax ? `Max ${max} languages selected` : placeholder}
        disabled={atMax}
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 13,
          color: 'var(--text)',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
          opacity: atMax ? 0.6 : 1,
          cursor: atMax ? 'not-allowed' : 'text',
        }}
      />

      {open && !atMax && (filtered.length > 0 || showAddCustom) && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow)',
          maxHeight: 200,
          overflowY: 'auto',
          zIndex: 50,
        }}>
          {filtered.map(lang => (
            <div
              key={lang}
              onMouseDown={e => { e.preventDefault(); add(lang) }}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {lang}
            </div>
          ))}
          {showAddCustom && (
            <div
              onMouseDown={e => { e.preventDefault(); add(query.trim()) }}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--gold)',
                fontWeight: 600,
                cursor: 'pointer',
                borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Add &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {value.map(lang => (
            <span key={lang} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, padding: '4px 10px', borderRadius: 20,
              background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)',
            }}>
              {lang}
              <button
                onClick={() => remove(lang)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 14, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {atMax && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Maximum {max} languages reached</p>
      )}
    </div>
  )
}
