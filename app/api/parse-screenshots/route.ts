import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const SCREENSHOT_PARSE_PROMPT = `You are an expert at reading social media screenshots and extracting structured data.
Analyze the provided screenshots and return ONLY valid JSON, no other text, no markdown fences.

Return this exact structure:
{
  "followers": number,
  "following": number,
  "total_posts": number,
  "avg_likes": number,
  "avg_comments": number,
  "avg_views": number or null,
  "engagement_rate": number,
  "audience_top_countries": ["Country1", "Country2"],
  "audience_age_range": "18-34",
  "audience_gender_split": "72% female",
  "posting_frequency": "3-4x per week",
  "confidence": "high"
}

If a value cannot be determined from the screenshots, use null.
Be conservative — do not guess.`

const SUMMARY_PROMPT = `You are writing a brief internal profile summary for an influencer marketing platform.
Based on the structured data provided, write a 2-3 sentence summary in plain English.
Focus on: niche, audience characteristics, content style, platform strength.
This summary will be used to match influencers to brand campaigns.
Return only the summary text, no formatting or labels.`

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  const platform = formData.get('platform') as string
  const platformId = formData.get('platformId') as string
  const influencerId = formData.get('influencerId') as string

  if (!files.length || !platformId || !influencerId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = createServiceClient()

  await service.from('influencer_platforms').update({ parse_status: 'processing' }).eq('id', platformId)

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Convert files to inline data parts
    const imageParts = await Promise.all(
      files.map(async file => {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        return {
          inlineData: {
            data: base64,
            mimeType: (file.type || 'image/jpeg') as string,
          },
        }
      })
    )

    const parseResult = await model.generateContent([
      SCREENSHOT_PARSE_PROMPT,
      `These are ${platform} screenshots. Extract the structured data.`,
      ...imageParts,
    ])

    const raw = parseResult.response.text().trim()
    // Strip markdown fences if Gemini wraps the JSON
    const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean)

    await service.from('influencer_platforms').update({
      followers: parsed.followers,
      following: parsed.following,
      total_posts: parsed.total_posts,
      avg_likes: parsed.avg_likes,
      avg_comments: parsed.avg_comments,
      avg_views: parsed.avg_views,
      engagement_rate: parsed.engagement_rate,
      audience_top_countries: parsed.audience_top_countries,
      audience_age_range: parsed.audience_age_range,
      audience_gender_split: parsed.audience_gender_split,
      posting_frequency: parsed.posting_frequency,
      ai_raw_parse: parsed,
      parse_status: 'complete',
      last_parsed_at: new Date().toISOString(),
    }).eq('id', platformId)

    // Generate ai_summary
    const { data: influencer } = await service
      .from('influencers')
      .select('primary_niche, bio, first_name')
      .eq('id', influencerId)
      .single()

    const { data: allPlatforms } = await service
      .from('influencer_platforms')
      .select('platform, followers, engagement_rate, audience_age_range, audience_gender_split')
      .eq('influencer_id', influencerId)
      .eq('parse_status', 'complete')

    const summaryPayload = JSON.stringify({ influencer, platforms: allPlatforms, latestParse: parsed })

    const summaryResult = await model.generateContent([SUMMARY_PROMPT, summaryPayload])
    const aiSummary = summaryResult.response.text().trim()

    await service.from('influencers').update({
      ai_summary: aiSummary,
      ai_parsed_at: new Date().toISOString(),
    }).eq('id', influencerId)

    await service.from('notifications').insert({
      influencer_id: influencerId,
      type: 'profile_parsed',
      title: 'Profile updated',
      body: `Your ${platform} stats have been parsed and your profile has been updated.`,
    })

    return NextResponse.json({ success: true, parsed })
  } catch (err) {
    console.error('Screenshot parsing error:', err)
    await service.from('influencer_platforms').update({
      parse_status: 'failed',
      parse_error: String(err),
    }).eq('id', platformId)
    return NextResponse.json({ error: 'Parsing failed' }, { status: 500 })
  }
}
