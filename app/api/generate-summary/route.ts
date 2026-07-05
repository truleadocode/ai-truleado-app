import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const SUMMARY_PROMPT = `You are writing a brief internal profile summary for an influencer marketing platform.
Based on the structured data provided, write a 2-3 sentence summary in plain English.
Focus on: niche, audience characteristics, content style, platform strength.
This summary will be used to match influencers to brand campaigns.
Return only the summary text, no formatting or labels.`

export async function POST(request: NextRequest) {
  const { influencerId } = await request.json()
  if (!influencerId) return NextResponse.json({ error: 'Missing influencerId' }, { status: 400 })

  const service = createServiceClient()

  const { data: influencer } = await service
    .from('influencers')
    .select('primary_niche, bio, first_name, content_style')
    .eq('id', influencerId)
    .single()

  const { data: platforms } = await service
    .from('influencer_platforms')
    .select('platform, followers, engagement_rate, audience_age_range, audience_gender_split, audience_top_countries, avg_likes, avg_views')
    .eq('influencer_id', influencerId)
    .eq('parse_status', 'complete')

  if (!platforms?.length) {
    return NextResponse.json({ error: 'No parsed platforms found' }, { status: 400 })
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const summaryResult = await model.generateContent([
    SUMMARY_PROMPT,
    JSON.stringify({ influencer, platforms }),
  ])
  const aiSummary = summaryResult.response.text().trim()

  await service.from('influencers').update({
    ai_summary: aiSummary,
    ai_parsed_at: new Date().toISOString(),
  }).eq('id', influencerId)

  return NextResponse.json({ success: true, summary: aiSummary })
}
