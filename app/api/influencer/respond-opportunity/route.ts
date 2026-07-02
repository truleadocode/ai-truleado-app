import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Lazy init so the build's page-data collection doesn't construct Resend
// (which throws) before RESEND_API_KEY is available at request time.
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function POST(request: NextRequest) {
  const { match_id, influencer_id, response } = await request.json()
  if (!match_id || !influencer_id || !['interested', 'declined'].includes(response)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const service = createServiceClient()

  try {
    // Get the match with brief + advertiser info
    const { data: match } = await service
      .from('brief_matches')
      .select('*, brief:brief_id(*, advertiser:advertiser_id(email, first_name, company_name))')
      .eq('id', match_id)
      .single()

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.influencer_id !== influencer_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Already responded — idempotent
    if (match.status === 'creator_confirmed' || match.status === 'creator_declined') {
      return NextResponse.json({ ok: true, already: true })
    }

    const brief = match.brief as any

    // Client sends 'interested' | 'declined' (see OpportunityCards.tsx)
    if (response === 'interested') {
      await service.from('brief_matches').update({
        status: 'creator_confirmed',
        creator_response: 'yes',
        creator_responded_at: new Date().toISOString(),
      }).eq('id', match_id)

      // Increment shortlist counter
      const newConfirmed = (brief.creators_confirmed || 0) + 1
      const updates: Record<string, any> = { creators_confirmed: newConfirmed }

      // Shortlist ready when enough creators have accepted
      const wasReady = brief.status === 'shortlist_ready'
      if (newConfirmed >= (brief.creators_needed || 5) && !wasReady) {
        updates.status = 'shortlist_ready'
      }

      await service.from('briefs').update(updates).eq('id', brief.id)

      // Email advertiser that a creator confirmed (every individual confirmation)
      const advertiser = brief.advertiser as any
      if (advertiser?.email) {
        try {
          await getResend().emails.send({
            from: 'Sarah from Truleado <onboarding@resend.dev>',
            to: advertiser.email,
            subject: `A creator is interested in your brief`,
            html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
              <p style="font-size:17px;font-weight:700;margin-bottom:8px;">Good news${advertiser.first_name ? `, ${advertiser.first_name}` : ''}! 🎉</p>
              <p style="color:#6B6B6B;font-size:14px;line-height:1.6;">A creator has expressed interest in your brief <strong>${brief.title}</strong>.</p>
              <p style="color:#6B6B6B;font-size:14px;line-height:1.6;margin-top:12px;">${newConfirmed >= (brief.creators_needed || 5) ? `Your shortlist is ready — head to your dashboard to review and confirm creators.` : `${newConfirmed} of ${brief.creators_needed || 5} creators confirmed so far. We'll keep going.`}</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/advertiser/briefs/${brief.id}" style="display:inline-block;margin-top:20px;background:#C49A3C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View shortlist</a>
              <p style="font-size:13px;color:#6B6B6B;margin-top:24px;">— Sarah from Truleado</p>
            </div>`,
          })
        } catch (e) {
          console.error('Advertiser notify email error:', e)
        }
      }
    } else {
      await service.from('brief_matches').update({
        status: 'creator_declined',
        creator_response: 'no',
        creator_responded_at: new Date().toISOString(),
      }).eq('id', match_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Respond opportunity error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
