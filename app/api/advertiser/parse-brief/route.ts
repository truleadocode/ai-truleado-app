import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const BRIEF_PARSE_PROMPT = `You are reading a campaign brief document for an influencer marketing campaign.
Extract all structured data visible in the document.

Return ONLY valid JSON, no markdown:
{
  "brand_name": "string or null",
  "product_description": "string or null",
  "platforms": ["instagram","tiktok","youtube","pinterest"] or null,
  "content_types": ["reel","story","post","video","integration"] or null,
  "creators_needed": number or null,
  "budget_per_creator_eur": number in cents or null,
  "budget_flexible": boolean,
  "target_age_range": "e.g. 18-34" or null,
  "target_gender": "all" | "male" | "female" or null,
  "target_countries": ["string"] or null,
  "target_languages": ["string"] or null,
  "go_live_date": "YYYY-MM-DD" or null,
  "niche_fit": "string or null",
  "tone_notes": "string or null",
  "dos": "string or null",
  "donts": "string or null",
  "confidence": "high" | "medium" | "low"
}

Extract everything visible. Use null only for genuinely absent data.`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const advertiserId = formData.get('advertiser_id') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = file.type || 'application/pdf'

    const parseResult = await model.generateContent([
      BRIEF_PARSE_PROMPT,
      { inlineData: { data: base64, mimeType } },
    ])

    const raw = parseResult.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    const extracted = JSON.parse(raw)

    // Store the uploaded file
    const service = createServiceClient()
    const path = `briefs/${advertiserId}/${Date.now()}_${file.name}`
    await service.storage.from('brief-uploads').upload(path, buffer, { contentType: mimeType })

    return NextResponse.json({ extracted, uploaded_path: path, confidence: extracted.confidence })
  } catch (err) {
    console.error('Brief parse error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
