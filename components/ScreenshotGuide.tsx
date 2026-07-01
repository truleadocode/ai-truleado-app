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
    <div className="mb-2.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex cursor-pointer items-center gap-[5px] border-none bg-none p-0 font-inherit text-xs font-semibold text-gold"
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {open ? 'Hide guide' : 'What to screenshot →'}
      </button>

      {open && (
        <div className="mt-2 rounded-[10px] border border-border bg-muted px-4 py-3.5">
          {guide.note && (
            <div className="mb-3 flex items-start gap-2 rounded-[7px] border border-gold-border bg-gold-bg px-[11px] py-[9px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-px shrink-0 text-gold">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7 6v3.5M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p className="text-xs leading-normal text-gold">{guide.note}</p>
            </div>
          )}
          <ol className="flex list-none flex-col gap-2 pl-0">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-border bg-gold-bg text-[10px] font-semibold text-gold">{i + 1}</span>
                <p className="text-[13px] leading-normal text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
