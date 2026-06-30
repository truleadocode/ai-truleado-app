import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'

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

function cleanJson(raw: string) {
  return raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const advertiserId = formData.get('advertiser_id') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const mimeType = file.type || ''

    // Gemini's inlineData only reliably reads PDFs (plus images/audio/video).
    // Word documents need their text pulled out first — Gemini can't parse
    // .doc/.docx binary directly, which previously caused silent empty extractions.
    let parseResult

    if (ext === 'docx') {
      const { value: text } = await mammoth.extractRawText({ buffer })
      if (!text.trim()) {
        return NextResponse.json({ extracted: { confidence: 'low' } })
      }
      parseResult = await model.generateContent([BRIEF_PARSE_PROMPT, text])
    } else if (ext === 'doc') {
      // Legacy binary .doc format isn't reliably extractable server-side.
      // Ask the user to re-export as PDF/.docx rather than silently failing.
      return NextResponse.json({
        extracted: { confidence: 'low' },
        notice: 'legacy_doc_unsupported',
      })
    } else if (ext === 'txt') {
      const text = buffer.toString('utf-8')
      parseResult = await model.generateContent([BRIEF_PARSE_PROMPT, text])
    } else {
      // PDF (default/fallback) — Gemini reads this natively as inline binary data
      const base64 = buffer.toString('base64')
      parseResult = await model.generateContent([
        BRIEF_PARSE_PROMPT,
        { inlineData: { data: base64, mimeType: 'application/pdf' } },
      ])
    }

    const extracted = JSON.parse(cleanJson(parseResult.response.text()))

    // Store the uploaded file
    const service = createServiceClient()
    const path = `briefs/${advertiserId}/${Date.now()}_${file.name}`
    await service.storage.from('brief-uploads').upload(path, buffer, { contentType: mimeType || 'application/octet-stream' })

    return NextResponse.json({ extracted, uploaded_path: path, confidence: extracted.confidence })
  } catch (err) {
    console.error('Brief parse error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
