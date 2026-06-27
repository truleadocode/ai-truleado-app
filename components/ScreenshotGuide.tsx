'use client'

import { useState } from 'react'

const GUIDES: Record<string, { note?: string, steps: string[] }> = {
  instagram: {
    note: 'Requires a Business or Creator account. Personal accounts don\'t show analytics.',
    steps: [
      'Go to your profile → tap the burger menu (☰) top right → Professional Dashboard',
      'Tap "Total Followers" → screenshot age range, gender, and top countries',
      'Tap "Accounts Reached" → set to Last 30 days → screenshot the overview',
      'Screenshot your main profile page showing your follower count',
    ],
  },
  tiktok: {
    note: 'Requires a Pro or Creator account. Personal accounts don\'t show analytics.',
    steps: [
      'Go to your profile → tap the menu bars (☰) → TikTok Studio → Analytics',
      'Tap the "Followers" tab → screenshot gender, age, and top territories',
      'Tap the "Overview" tab → screenshot follower count, likes, and total views',
      'Screenshot your main profile page',
    ],
  },
  youtube: {
    steps: [
      'Go to studio.youtube.com → left menu → Analytics',
      'Click the "Audience" tab → screenshot age, gender, and geography charts',
      'Click the "Overview" tab → screenshot subscribers, views, and watch time',
      'Screenshot your channel page showing subscriber count',
    ],
  },
  pinterest: {
    note: 'Requires a Business account. Personal accounts don\'t show analytics.',
    steps: [
      'Go to pinterest.com/analytics → Overview',
      'Screenshot impressions, saves, and audience demographics',
      'Screenshot your profile page showing follower count',
    ],
  },
}

export default function ScreenshotGuide({ platform }: { platform: string }) {
  const [open, setOpen] = useState(false)
  const guide = GUIDES[platform.toLowerCase()]
  if (!guide) return null

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 700, color: 'var(--acc)', fontFamily: 'inherit',
        }}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3" stroke="var(--acc)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {open ? 'Hide guide' : 'What to screenshot →'}
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          background: 'var(--bg3)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '14px 16px',
        }}>
          {guide.note && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'var(--acc2)', border: '1px solid var(--acc3)',
              borderRadius: 7, padding: '9px 11px', marginBottom: 12,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7" cy="7" r="6" stroke="var(--acc)" strokeWidth="1.3"/>
                <path d="M7 6v3.5M7 4.5v.5" stroke="var(--acc)" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize: 12, color: 'var(--acc)', lineHeight: 1.5 }}>{guide.note}</p>
            </div>
          )}
          <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {guide.steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--acc2)', border: '1px solid var(--acc3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: 'var(--acc)', marginTop: 1,
                }}>{i + 1}</span>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
