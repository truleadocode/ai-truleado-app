import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { match_id } = await request.json()
  if (!match_id) return NextResponse.json({ error: 'Missing match_id' }, { status: 400 })
  const service = createServiceClient()

  try {
    const { data: match } = await service
      .from('brief_matches')
      .select('id, status, brief:brief_id(advertiser:advertiser_id(user_id))')
      .eq('id', match_id)
      .single()
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    // Only the advertiser who owns this brief may pass on the match
    const { data: { user } } = await createClient().auth.getUser()
    const owner = (match.brief as any)?.advertiser?.user_id
    if (!user || owner !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Don't overwrite a confirmed/completed handoff
    if (match.status === 'advertiser_confirmed' || match.status === 'completed') {
      return NextResponse.json({ error: 'Match already confirmed' }, { status: 409 })
    }

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
