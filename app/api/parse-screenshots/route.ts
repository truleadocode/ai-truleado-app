import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `You are reading Instagram screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Total following count
- Total posts count
- Average likes per post (look at recent post metrics)
- Average comments per post
- Average views per reel or video
- Engagement rate (if shown, or calculate: (likes + comments) / followers * 100)
- Audience age breakdown — report the DOMINANT age range (e.g. "25-34")
- Audience gender split — report both percentages (e.g. "68.5% male, 31.5% female")
- Top countries where followers are from — extract country names as an array
- Top cities where followers are from — extract city names as an array

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear in the screenshots.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 68.5% male, 31.5% female" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  tiktok: `You are reading TikTok screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Total following count
- Total videos/posts count
- Average video views
- Average likes per video
- Average comments per video
- Engagement rate (if shown, or calculate from available data)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages (e.g. "55% female, 45% male")
- Top countries or territories where followers are from — extract as an array
- TikTok rarely shows cities — set audience_top_cities to null unless clearly visible

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 18-24" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  youtube: `You are reading YouTube Studio screenshots from a creator's channel. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Subscriber count (= followers)
- Total videos count (= total_posts)
- Average video views
- Average likes per video
- Average comments per video
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages
- Top countries where viewers are from — extract as an array
- YouTube rarely shows cities — set audience_top_cities to null unless clearly visible
- following = null (YouTube does not show this)

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  pinterest: `You are reading Pinterest analytics screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Follower count (= followers)
- Total pins or posts count (= total_posts)
- Monthly impressions or views (= avg_views)
- Saves, clicks, or engagement metrics (= avg_likes proxy)
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages (Pinterest skews heavily female)
- Top countries where audience is from — extract as an array
- Top cities where audience is from — extract as an array if visible
- following = null if not visible

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 78% female, 22% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,
}

const FALLBACK_PARSE_PROMPT = `You are reading social media screenshots from a creator's account. Extract every piece of analytics data visible.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

Only use null if the data is genuinely not visible. Extract everything you can see.`

const SUMMARY_PROMPT = `You are writing a brief internal profile summary for an influencer marketing platform.
Based on the structured data provided, write a 2-3 sentence summary in plain English.
Focus on: niche, audience characteristics, content style, platform strength.
This summary will be used to match influencers to brand campaigns.
Return only the summary text, no formatting or labels.`

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Accept both naming conventions from different clients
  // OnboardingClient sends: screenshots, platform_id, influencer_id
  // ProfileEditClient sends: files, platformId, influencerId
  const files = (
    formData.getAll('screenshots').length
      ? formData.getAll('screenshots')
      : formData.getAll('files')
  ) as File[]

  const platformId = (
    formData.get('platform_id') || formData.get('platformId')
  ) as string

  const influencerId = (
    formData.get('influencer_id') || formData.get('influencerId')
  ) as string

  // Platform can come from form data or we look it up from the platform row
  let platform = (formData.get('platform') || '') as string

  if (!files.length || !platformId || !influencerId) {
    console.error('Missing fields:', { files: files.length, platformId, influencerId })
    return NextResponse.json(
      { error: 'Missing required fields', details: { files: files.length, platformId, influencerId } },
      { status: 400 }
    )
  }

  const service = createServiceClient()

  // If platform not provided, look it up from the platform row
  if (!platform) {
    const { data: platformRow } = await service
      .from('influencer_platforms')
      .select('platform')
      .eq('id', platformId)
      .single()
    platform = platformRow?.platform || 'instagram'
  }

  await service.from('influencer_platforms')
    .update({ parse_status: 'processing', parse_error: null })
    .eq('id', platformId)

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Save screenshots to storage
    const savedScreenshots: string[] = []
    await Promise.all(
      files.map(async (file, idx) => {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${influencerId}/${platformId}/${Date.now()}_${idx}.${ext}`
        const buffer = await file.arrayBuffer()
        const { error: uploadErr } = await service.storage
          .from('influencer-screenshots')
          .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: false })
        if (!uploadErr) {
          savedScreenshots.push(path)
          await service.from('influencer_screenshots').insert({
            influencer_id: influencerId,
            platform_id: platformId,
            storage_path: path,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type || 'image/jpeg',
            processed: false,
          })
        }
      })
    )

    // Convert files to base64 for Gemini
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

    const platformPrompt = PLATFORM_PROMPTS[platform.toLowerCase()] || FALLBACK_PARSE_PROMPT
    const parseResult = await model.generateContent([
      platformPrompt,
      `These are ${platform} screenshots. Extract the structured data.`,
      ...imageParts,
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

    // Generate AI summary
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

    // Mark screenshots as processed
    if (savedScreenshots.length) {
      await service.from('influencer_screenshots')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('platform_id', platformId)
        .in('storage_path', savedScreenshots)
    }

    await service.from('notifications').insert({
      influencer_id: influencerId,
      type: 'profile_parsed',
      title: 'Profile updated',
      body: `Your ${platform} stats have been read and your profile has been updated.`,
    })

    return NextResponse.json({ success: true, parsed })
  } catch (err) {
    console.error('Screenshot parsing error:', err)
    await service.from('influencer_platforms')
      .update({ parse_status: 'failed', parse_error: String(err) })
      .eq('id', platformId)
    return NextResponse.json({ error: 'Parsing failed' }, { status: 500 })
  }
}
