'use client'

import { useState, useEffect } from 'react'
import { useParseProgress, ParseStatus } from '@/hooks/useParseProgress'

interface Props {
  status: ParseStatus
  onSettled?: () => void  // called 2s after complete/failed so parent can hide card
}

export default function ParseProgressCard({ status, onSettled }: Props) {
  const { message, progress, displayStatus, barColor } = useParseProgress(status)
  const [showHint, setShowHint] = useState(false)
  const [visible, setVisible] = useState(true)

  // Show hint text after 5 seconds of processing
  useEffect(() => {
    if (status !== 'processing') { setShowHint(false); return }
    const t = setTimeout(() => setShowHint(true), 5000)
    return () => clearTimeout(t)
  }, [status])

  // 2-second settle delay after complete/failed before notifying parent
  useEffect(() => {
    if (displayStatus === 'complete' || displayStatus === 'failed') {
      const t = setTimeout(() => {
        setVisible(false)
        onSettled?.()
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [displayStatus])

  if (!visible && (displayStatus === 'complete' || displayStatus === 'failed')) return null

  return (
    <div style={{
      background: 'var(--white)',
      border: `1px solid ${
        displayStatus === 'complete' ? 'var(--green-border, #a7f3d0)' :
        displayStatus === 'failed'   ? 'var(--red-border, #fca5a5)'  :
        'var(--gold-border)'
      }`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Message row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          {message}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        background: 'var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 3,
          background: barColor,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      {/* Hint */}
      {showHint && displayStatus === 'processing' && (
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          This takes 15–30 seconds. Hang tight!
        </span>
      )}
    </div>
  )
}
