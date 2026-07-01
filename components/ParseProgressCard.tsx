'use client'
import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export type ParseStatus = 'idle' | 'processing' | 'complete' | 'failed'

interface Props {
  status: ParseStatus
  onSettled?: () => void
}

export default function ParseProgressCard({ status, onSettled }: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (status !== 'processing') { return }
    const start = Date.now()
    const iv = setInterval(() => {
      const secs = (Date.now() - start) / 1000
      setProgress(Math.min(90, secs * 12))
    }, 200)
    return () => clearInterval(iv)
  }, [status])

  useEffect(() => {
    if (status === 'complete') {
      setProgress(100)
      const t = setTimeout(() => onSettled?.(), 2000)
      return () => clearTimeout(t)
    }
    if (status === 'failed') {
      const t = setTimeout(() => onSettled?.(), 3000)
      return () => clearTimeout(t)
    }
  }, [status, onSettled])

  if (status === 'processing') {
    return (
      <div className="space-y-2.5 py-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin text-primary" />
          Reading your screenshots…
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    )
  }
  if (status === 'complete') {
    return (
      <div className="flex items-center gap-2 py-1">
        <CheckCircle size={14} className="text-green" />
        <span className="text-xs text-green font-semibold">Screenshots analysed</span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 py-1">
        <XCircle size={14} className="text-destructive" />
        <span className="text-xs text-destructive">Couldn't read that — try uploading another screenshot.</span>
      </div>
    )
  }
  return null
}
