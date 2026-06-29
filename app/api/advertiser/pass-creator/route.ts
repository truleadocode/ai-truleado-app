import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { match_id } = await request.json()
  const service = createServiceClient()

  try {
    const { error } = await service
      .from('brief_matches')
      .update({ status: 'advertiser_passed' })
      .eq('id', match_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Pass creator error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
