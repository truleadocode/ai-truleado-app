import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Lazy init so the build's page-data collection doesn't construct Resend
// (which throws) before RESEND_API_KEY is available at request time.
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function POST(request: NextRequest) {
  const { match_id, brief_id } = await request.json()
  if (!match_id) return NextResponse.json({ error: 'Missing match_id' }, { status: 400 })
  const service = createServiceClient()

  try {
    const { data: match } = await service.from('brief_matches').select('*, influencer:influencer_id(id, first_name, last_name, email), brief:brief_id(*, advertiser:advertiser_id(*))').eq('id', match_id).single()
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const creator = match.influencer as any
    const brief = match.brief as any
    const advertiser = brief?.advertiser as any

    // Only the advertiser who owns this brief may confirm the match
    const { data: { user } } = await createClient().auth.getUser()
    if (!user || advertiser?.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Idempotency: never re-send handoff emails for an already-confirmed match
    if (match.status === 'advertiser_confirmed' || match.status === 'completed') {
      return NextResponse.json({ ok: true })
    }

    // Record the confirmation BEFORE attempting emails so an email failure
    // can't lose the advertiser's decision.
    await service.from('brief_matches').update({ status: 'advertiser_confirmed' }).eq('id', match_id)

    const creatorName = [creator?.first_name, creator?.last_name].filter(Boolean).join(' ') || 'Creator'
    const advertiserName = [advertiser?.first_name, advertiser?.last_name].filter(Boolean).join(' ') || 'the brand'

    // Emails are best-effort: a Resend failure must not undo or block the
    // confirmation recorded above.
    try {
    // Email to creator
    if (creator?.email) {
      await getResend().emails.send({
        from: 'Sarah from Truleado <onboarding@resend.dev>',
        to: creator.email,
        subject: `You've been matched with ${brief.brand_name}! 🎉`,
        html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <p style="font-size:18px;font-weight:700;margin-bottom:8px;">Great news, ${creator.first_name || 'there'}! 🎉</p>
          <p style="color:#6B6B6B;font-size:14px;line-height:1.6;">${brief.brand_name} has confirmed they'd like to work with you on their campaign.</p>
          <div style="background:#F7F7F5;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="font-size:13px;font-weight:600;margin-bottom:12px;">Brand contact details</p>
            <p style="font-size:13px;color:#6B6B6B;">Name: ${advertiserName}</p>
            <p style="font-size:13px;color:#6B6B6B;">Company: ${advertiser?.company_name || '—'}</p>
            <p style="font-size:13px;color:#6B6B6B;">Email: ${advertiser?.email}</p>
          </div>
          <div style="background:#FDF8EE;border-left:3px solid #C49A3C;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="font-size:12px;font-weight:600;color:#C49A3C;margin-bottom:6px;">Campaign brief</p>
            <p style="font-size:13px;color:#111;">Brand: ${brief.brand_name}</p>
            <p style="font-size:13px;color:#111;">Product: ${brief.product_description}</p>
            <p style="font-size:13px;color:#111;">Content: ${brief.content_types?.join(', ')}</p>
            ${brief.go_live_date ? `<p style="font-size:13px;color:#111;">Go-live: ${new Date(brief.go_live_date).toLocaleDateString('en-GB', { month:'long', day:'numeric', year:'numeric' })}</p>` : ''}
          </div>
          <p style="font-size:13px;color:#6B6B6B;">They'll be in touch shortly. If you have any issues, reply to this email.</p>
          <p style="font-size:13px;color:#6B6B6B;margin-top:20px;">— Sarah from Truleado</p>
        </div>`,
      })
    }

    // Email to advertiser
    if (advertiser?.email) {
      const { data: platforms } = await service.from('influencer_platforms').select('platform, followers, handle').eq('influencer_id', creator.id).eq('parse_status', 'complete')
      await getResend().emails.send({
        from: 'Sarah from Truleado <onboarding@resend.dev>',
        to: advertiser.email,
        subject: `Creator confirmed — contact details inside`,
        html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <p style="font-size:18px;font-weight:700;margin-bottom:8px;">A creator has been confirmed! 🎉</p>
          <p style="color:#6B6B6B;font-size:14px;line-height:1.6;">Here are their contact details for your brief: <strong>${brief.title}</strong></p>
          <div style="background:#F7F7F5;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="font-size:13px;font-weight:600;margin-bottom:12px;">Creator details</p>
            <p style="font-size:13px;color:#6B6B6B;">Name: ${creatorName}</p>
            ${(platforms || []).map((p: any) => `<p style="font-size:13px;color:#6B6B6B;">${p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}: @${p.handle} (${p.followers?.toLocaleString() || '?'} followers)</p>`).join('')}
            <p style="font-size:13px;color:#6B6B6B;">Email: ${creator.email}</p>
          </div>
          <p style="font-size:13px;color:#6B6B6B;">Reach out directly to coordinate content, timelines, and payment.</p>
          <p style="font-size:13px;color:#6B6B6B;margin-top:20px;">— Sarah from Truleado</p>
        </div>`,
      })
    }

    await service.from('brief_matches').update({ handoff_sent_at: new Date().toISOString(), status: 'completed' }).eq('id', match_id)
    } catch (emailErr) {
      console.error('Confirm creator email error:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Confirm creator error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
