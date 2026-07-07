import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'
import { PLATFORM_PROMPTS, FALLBACK_PARSE_PROMPT, sanitizeParsedPlatformData } from '@/lib/platformPrompts'

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
    const parsed = sanitizeParsedPlatformData(JSON.parse(clean))

    const { error: updateErr } = await service.from('influencer_platforms').update({
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
    if (updateErr) throw updateErr

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
