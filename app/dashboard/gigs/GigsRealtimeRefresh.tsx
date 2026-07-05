'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// This page is a server component (simplest way to render the list), so
// "realtime" here means: watch for any gig change for this influencer and
// silently re-fetch the server-rendered list — no manual refresh needed,
// and no client-side re-implementation of the list rendering.
export default function GigsRealtimeRefresh({ influencerId }: { influencerId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`gigs-list-${influencerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gigs', filter: `influencer_id=eq.${influencerId}` },
        () => router.refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [influencerId, router])

  return null
}
