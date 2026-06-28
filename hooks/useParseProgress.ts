'use client'

import { useState, useEffect } from 'react'

const PARSE_STAGES = [
  { message: 'Uploading your screenshots…',  duration: 4000  },
  { message: 'Reading your screenshots…',    duration: 6000  },
  { message: 'Extracting your stats…',       duration: 8000  },
  { message: 'Building your profile…',       duration: 5000  },
  { message: 'Generating your AI summary…',  duration: 6000  },
  { message: 'Almost done…',                 duration: 99999 },
]

const TOTAL_TIME = PARSE_STAGES.slice(0, -1).reduce((s, st) => s + st.duration, 0)

export type ParseStatus = 'idle' | 'processing' | 'complete' | 'failed'

export function useParseProgress(status: ParseStatus) {
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [displayStatus, setDisplayStatus] = useState<ParseStatus>('idle')

  const isActive = status === 'processing'

  useEffect(() => {
    if (!isActive) {
      if (status === 'idle') {
        setStageIndex(0)
        setProgress(0)
        setDisplayStatus('idle')
      }
      return
    }

    setDisplayStatus('processing')
    let elapsed = 0

    const timer = setInterval(() => {
      elapsed += 200

      let cumulative = 0
      let newStage = PARSE_STAGES.length - 1
      for (let i = 0; i < PARSE_STAGES.length - 1; i++) {
        cumulative += PARSE_STAGES[i].duration
        if (elapsed < cumulative) {
          newStage = i
          break
        }
      }
      setStageIndex(newStage)
      setProgress(Math.min(95, Math.round((elapsed / TOTAL_TIME) * 100)))
    }, 200)

    return () => clearInterval(timer)
  }, [isActive, status])

  // Handle terminal states from realtime
  useEffect(() => {
    if (status === 'complete') {
      setProgress(100)
      setDisplayStatus('complete')
    } else if (status === 'failed') {
      setDisplayStatus('failed')
    }
  }, [status])

  const message =
    displayStatus === 'complete' ? '✓ Profile updated!' :
    displayStatus === 'failed'   ? 'Something went wrong — try uploading again' :
    PARSE_STAGES[stageIndex]?.message || 'Processing…'

  const barColor =
    displayStatus === 'complete' ? 'var(--green)' :
    displayStatus === 'failed'   ? 'var(--red)'   :
    'var(--gold)'

  return { message, progress, displayStatus, barColor }
}
