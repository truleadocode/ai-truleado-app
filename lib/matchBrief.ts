import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const MATCH_SYSTEM = `You are a creator-brand matching engine for Truleado.
Score how well a creator matches a brand brief on a scale of 0-100.
Return ONLY valid JSON, no markdown.`

function buildMatchPrompt(brief: any, influencer: any, platforms: any[]) {
  return `Score this creator against this brief.

BRIEF:
- Brand: ${brief.brand_name}
- Product: ${brief.product_description}
- Niche needed: ${brief.niche_fit || 'any'}
- Target audience: ${brief.target_age_range || 'any'} age, ${brief.target_gender || 'any'} gender, countries: ${brief.target_countries?.join(', ') || 'any'}
- Platforms needed: ${brief.platforms?.join(', ')}
- Content types: ${brief.content_types?.join(', ')}
- Budget per creator: ${brief.budget_flexible ? 'flexible' : brief.budget_per_creator_eur ? `€${Math.round(brief.budget_per_creator_eur/100)}` : 'not specified'}
- Tone: ${brief.tone_notes || 'not specified'}
- Languages: ${brief.target_languages?.join(', ') || 'any'}

CREATOR:
- Primary niche: ${influencer.primary_niche || 'unknown'}
- Bio: ${influencer.bio || 'none'}
- Languages: ${influencer.languages?.join(', ') || 'unknown'}
- Content style: ${influencer.content_style || 'unknown'}
- Platforms: ${platforms.map(p => `${p.platform} (${p.followers?.toLocaleString() || '?'} followers, ${p.engagement_rate || '?'}% engagement, top countries: ${p.audience_top_countries?.join(', ') || 'unknown'}, audience age: ${p.audience_age_range || 'unknown'}, gender: ${p.audience_gender_split || 'unknown'})`).join('; ')}

Score on these dimensions (return all):
- niche_fit: 0-20 (how well their niche matches the brand category)
- audience_match: 0-20 (age, gender, country overlap)
- platform_match: 0-15 (are they on required platforms)
- budget_fit: 0-15 (soft signal — how close are rates to budget)
- engagement_quality: 0-10 (engagement rate quality)
- content_style_fit: 0-10 (style matches tone notes)
- language_match: 0-10 (languages match target)

Also write a match_reason: 2-3 sentences specific to THIS brief and THIS creator explaining why they're a good match. Be specific — reference actual numbers and niche alignment.

Return JSON:
{
  "total_score": number,
  "breakdown": {"niche_fit":number,"audience_match":number,"platform_match":number,"budget_fit":number,"engagement_quality":number,"content_style_fit":number,"language_match":number},
  "match_reason": "string"
}`
}

// brief_matches is now just a scoring/audit record — the actual offer,
// accept, and pass lifecycle lives entirely on `gigs`. A creator is
// eligible for a new gig offer as long as they don't already have one for
// this brief (in any status).
export async function runMatchBrief(service: ReturnType<typeof createServiceClient>, brief_id: string) {
  const { data: brief } = await service.from('briefs').select('*').eq('id', brief_id).single()
  if (!brief) return { ok: false, error: 'Brief not found' }

  try {
    await service.from('briefs').update({ status: 'matching', last_matched_at: new Date().toISOString() }).eq('id', brief_id)

    // Get all creators who completed onboarding (NOT status='active' — creators stay 'pending')
    const { data: influencers } = await service
      .from('influencers')
      .select('id, primary_niche, bio, languages, content_style, brand_loves, brand_never, open_to_exclusivity')
      .eq('onboarding_complete', true)

    if (!influencers?.length) {
      await service.from('briefs').update({ status: 'needs_review', match_exhausted: true }).eq('id', brief_id)
      return { ok: true, message: 'No creators available' }
    }

    // Skip creators already scored for this brief on a prior run — only
    // ever score/consider someone once (this is what makes re-running this
    // periodically for the same brief cheap and correct: it only looks at
    // NEW creators who onboarded since the last run).
    const { data: existingMatches } = await service.from('brief_matches').select('influencer_id').eq('brief_id', brief_id)
    const alreadyScored = new Set((existingMatches || []).map(m => m.influencer_id))
    const newInfluencers = influencers.filter(inf => !alreadyScored.has(inf.id))

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: MATCH_SYSTEM })

    const newScores: { influencer_id: string; score: number; breakdown: any; match_reason: string }[] = []

    for (const influencer of newInfluencers) {
      try {
        const { data: platforms } = await service
          .from('influencer_platforms')
          .select('platform, followers, engagement_rate, audience_top_countries, audience_age_range, audience_gender_split')
          .eq('influencer_id', influencer.id)
          .eq('parse_status', 'complete')

        if (!platforms?.length) continue

        const prompt = buildMatchPrompt(brief, influencer, platforms)
        const result = await model.generateContent(prompt)
        const raw = result.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
        const scored = JSON.parse(raw)

        newScores.push({
          influencer_id: influencer.id,
          score: scored.total_score,
          breakdown: scored.breakdown,
          match_reason: scored.match_reason,
        })
      } catch (err) {
        console.error(`Scoring error for influencer ${influencer.id}:`, err)
      }
    }

    if (newScores.length > 0) {
      await service.from('brief_matches').upsert(
        newScores.map(s => ({
          brief_id,
          influencer_id: s.influencer_id,
          score: s.score,
          score_breakdown: s.breakdown,
          match_reason: s.match_reason,
          status: 'scored',
        })),
        { onConflict: 'brief_id,influencer_id', ignoreDuplicates: true }
      )
    }

    // Re-fetch the full, current picture of every scored match on this
    // brief, and every gig already created for it, to decide who's actually
    // still eligible for a fresh offer below.
    const [{ data: allMatches }, { data: existingGigs }] = await Promise.all([
      service.from('brief_matches').select('influencer_id, status, score, match_reason').eq('brief_id', brief_id),
      service.from('gigs').select('influencer_id, status').eq('brief_id', brief_id),
    ])
    const matches = allMatches || []
    const gigs = existingGigs || []

    if (matches.length === 0) {
      await service.from('briefs').update({ status: 'needs_review', match_exhausted: true }).eq('id', brief_id)
      return { ok: true, message: 'No creators could be scored' }
    }

    const confirmedCount = gigs.filter(g => ['confirmed', 'in_progress', 'complete'].includes(g.status)).length
    const stillNeeded = Math.max(0, (brief.creators_needed || 5) - confirmedCount)

    const hasGig = new Set(gigs.map(g => g.influencer_id))
    const eligible = matches
      .filter(m => !hasGig.has(m.influencer_id))
      .sort((a, b) => (b.score || 0) - (a.score || 0))

    const toOffer = stillNeeded > 0 ? eligible.slice(0, Math.min(15, stillNeeded * 3)) : []

    let offered = 0
    for (const match of toOffer) {
      try {
        const { data: influencer } = await service.from('influencers').select('open_to_exclusivity').eq('id', match.influencer_id).single()
        if (influencer?.open_to_exclusivity) {
          const { count: activeElsewhere } = await service.from('gigs')
            .select('id', { count: 'exact', head: true })
            .eq('influencer_id', match.influencer_id)
            .in('status', ['confirmed', 'in_progress', 'complete'])
          if ((activeElsewhere || 0) > 0) continue
        }

        const { data: platforms } = await service
          .from('influencer_platforms').select('platform')
          .eq('influencer_id', match.influencer_id).eq('parse_status', 'complete')
        const matchedPlatform = (platforms || []).find((p: any) => brief.platforms?.includes(p.platform))?.platform
          || platforms?.[0]?.platform || brief.platforms?.[0] || null

        const { data: gig } = await service.from('gigs').insert({
          influencer_id: match.influencer_id,
          brief_id,
          status: 'offered',
          brand_category: brief.niche_fit || null,
          brand_name: brief.brand_name || null,
          brand_revealed: false,
          platform: matchedPlatform,
          deliverables_summary: brief.content_types?.length ? brief.content_types.join(', ') : 'Content collaboration',
          budget_eur: brief.budget_per_creator_eur ?? null,
          goes_live_at: brief.go_live_date || null,
          ai_match_score: match.score ?? null,
          ai_match_reasoning: match.match_reason || null,
        }).select('id').single()

        if (gig) {
          await service.from('notifications').insert({
            influencer_id: match.influencer_id,
            type: 'new_offer',
            title: 'New gig offer',
            body: `You have a new ${brief.niche_fit || 'brand'} campaign offer waiting in your Gigs.`,
            gig_id: gig.id,
          })
        }

        offered++
      } catch (err) {
        console.error('Gig offer error:', err)
      }
    }

    if (offered > 0) {
      const { count: totalOffered } = await service.from('gigs').select('id', { count: 'exact', head: true }).eq('brief_id', brief_id)
      await service.from('briefs').update({ creators_contacted: totalOffered || offered }).eq('id', brief_id)
    }

    // Nothing left to offer and nobody new to score next time — stop
    // re-processing this brief on future cron sweeps.
    const remainingEligible = eligible.length - toOffer.length
    if (stillNeeded > 0 && remainingEligible <= 0 && newInfluencers.length === 0) {
      await service.from('briefs').update({ match_exhausted: true }).eq('id', brief_id)
    }

    return { ok: true, newlyScored: newScores.length, offered }
  } catch (err) {
    console.error('Match brief error:', err)
    await service.from('briefs').update({ status: 'needs_review' }).eq('id', brief_id)
    return { ok: false, error: String(err) }
  }
}
