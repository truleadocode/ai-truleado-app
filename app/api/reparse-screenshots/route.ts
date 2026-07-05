import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'
import { PLATFORM_PROMPTS, FALLBACK_PARSE_PROMPT } from '@/lib/platformPrompts'

const SUMMARY_PROMPT = `You are writing a brief internal profile summary for an influencer marketing platform.
Based on the structured data provided, write a 2-3 sentence summary in plain English.
Focus on: niche, audience characteristics, content style, platform strength.
This summary will be used to match influencers to brand campaigns.
Return only the summary text, no formatting or labels.`

export async function POST(request: NextRequest) {
  const { platformId, influencerId, platform } = await request.json()
  if (!platformId || !influencerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const service = createServiceClient()

  const { data: screenshots } = await service
    .from('influencer_screenshots')
    .select('storage_path, mime_type')
    .eq('platform_id', platformId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!screenshots?.length) {
    return NextResponse.json({ error: 'No screenshots found for this platform' }, { status: 400 })
  }

  await service.from('influencer_platforms')
    .update({ parse_status: 'processing', parse_error: null })
    .eq('id', platformId)

  try {
    const imageParts = await Promise.all(
      screenshots.map(async (s) => {
        const { data, error } = await service.storage.from('influencer-screenshots').download(s.storage_path)
        if (error || !data) return null
        const buffer = await data.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        return { inlineData: { data: base64, mimeType: s.mime_type || 'image/jpeg' } }
      })
    )

    const validParts = imageParts.filter(Boolean) as any[]
    if (!validParts.length) throw new Error('Could not download any screenshots')

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const platformPrompt = PLATFORM_PROMPTS[platform?.toLowerCase()] || FALLBACK_PARSE_PROMPT
    const parseResult = await model.generateContent([
      platformPrompt,
      `These are ${platform} screenshots. Extract the structured data.`,
      ...validParts,
    ])

    const raw = parseResult.response.text().trim()
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
      audience_top_cities: parsed.audience_top_cities,
      audience_age_range: parsed.audience_age_range,
      audience_gender_split: parsed.audience_gender_split,
      ai_raw_parse: parsed,
      parse_status: 'complete',
      prompt_version: 2,
      parse_error: null,
      last_parsed_at: new Date().toISOString(),
    }).eq('id', platformId)

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

    const summaryResult = await model.generateContent([
      SUMMARY_PROMPT,
      JSON.stringify({ influencer, platforms: allPlatforms, latestParse: parsed }),
    ])
    const aiSummary = summaryResult.response.text().trim()

    await service.from('influencers').update({
      ai_summary: aiSummary,
      ai_parsed_at: new Date().toISOString(),
    }).eq('id', influencerId)

    return NextResponse.json({ success: true, parsed })
  } catch (err) {
    console.error('Reparse error:', err)
    await service.from('influencer_platforms')
      .update({ parse_status: 'failed', parse_error: String(err) })
      .eq('id', platformId)
    return NextResponse.json({ error: 'Parsing failed' }, { status: 500 })
  }
}
