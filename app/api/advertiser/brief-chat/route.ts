import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const SARAH_SYSTEM = `You are Sarah Chen at Truleado helping a brand or agency build a creator brief.
Be warm, professional, concise. 1-3 sentences. Sound like a real person.
Return ONLY valid JSON, no markdown.`

const STEPS: Record<string, { question: string; extractPrompt: string; extractSchema: string; nextStep: string | null; nextQuestion: string | null }> = {
  brand: {
    question: `What's the brand name and what are you promoting?`,
    extractPrompt: `Extract brand_name and product_description.`,
    extractSchema: `{"brand_name":"string","product_description":"string"}`,
    nextStep: 'platforms',
    nextQuestion: 'Which platforms do you need creators on? Instagram, TikTok, YouTube, Pinterest?',
  },
  platforms: {
    question: 'Which platforms do you need creators on?',
    extractPrompt: `Extract platforms as array of lowercase strings: instagram, tiktok, youtube, pinterest. Accept natural language.`,
    extractSchema: `{"platforms":["string"]}`,
    nextStep: 'audience',
    nextQuestion: 'Who is your target audience? Age range, gender, and which countries?',
  },
  audience: {
    question: 'Who is your target audience?',
    extractPrompt: `Extract target_age_range (e.g. "18-34"), target_gender ("all"|"male"|"female"), target_countries (array of country names).`,
    extractSchema: `{"target_age_range":"string","target_gender":"string","target_countries":["string"]}`,
    nextStep: 'content',
    nextQuestion: 'What content do you need, and how many creators? E.g. "2 Reels per creator, 5 creators total"',
  },
  content: {
    question: 'What content do you need and how many creators?',
    extractPrompt: `Extract content_types (array: reel, story, post, video, integration), creators_needed (int, default 5).`,
    extractSchema: `{"content_types":["string"],"creators_needed":5}`,
    nextStep: 'budget',
    nextQuestion: `What's your budget per creator? A rough range is fine — or say "flexible" if you're not sure.`,
  },
  budget: {
    question: `What's your budget per creator?`,
    extractPrompt: `Extract budget_per_creator_eur in cents (e.g. €500 = 50000). If "flexible" or unsure, set budget_flexible: true and budget_per_creator_eur: null.`,
    extractSchema: `{"budget_per_creator_eur":"number|null","budget_flexible":"boolean"}`,
    nextStep: 'timeline',
    nextQuestion: 'When does content need to go live?',
  },
  timeline: {
    question: 'When does content need to go live?',
    extractPrompt: `Extract go_live_date as ISO date string (YYYY-MM-DD). If vague like "Q1 2026", use the last day of that period. If "ASAP" or unclear, return null.`,
    extractSchema: `{"go_live_date":"string|null"}`,
    nextStep: 'niche',
    nextQuestion: "What kind of creator are you looking for? Any niche, tone notes, dos or don'ts?",
  },
  niche: {
    question: "What kind of creator are you looking for?",
    extractPrompt: `Extract niche_fit (string describing ideal creator niche), tone_notes (string), dos (string), donts (string). All nullable.`,
    extractSchema: `{"niche_fit":"string|null","tone_notes":"string|null","dos":"string|null","donts":"string|null"}`,
    nextStep: null,
    nextQuestion: null,
  },
}

async function callGemini(system: string, user: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: system })
  const result = await model.generateContent(user)
  const raw = result.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(raw)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, session_key, advertiser_id, step, user_message, data } = body
  const service = createServiceClient()

  if (action === 'init') {
    if (session_key) {
      const { error } = await service.from('brief_sessions').insert({ session_key, advertiser_id, current_step: 'brand' })
      if (error) console.error('Brief session init error:', error)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'message') {
    if (!session_key || !step || !user_message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const stepInfo = STEPS[step]
    if (!stepInfo) return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
    const isLast = stepInfo.nextStep === null

    const prompt = `Step: ${step}\nData so far: ${JSON.stringify(data || {})}\nUser said: "${user_message}"\n\nExtract: ${stepInfo.extractPrompt}\nSchema: ${stepInfo.extractSchema}\n\nReply: 1 warm sentence acknowledging their answer.\n${isLast ? `Then say: "That's everything I need! Let me put this together for you."` : `Then ask: "${stepInfo.nextQuestion}"`}\n\nReturn ONLY JSON: {"extracted":<schema>,"reply":"string"}`

    let result: any
    try { result = await callGemini(SARAH_SYSTEM, prompt) }
    catch { return NextResponse.json({ error: 'AI error' }, { status: 500 }) }

    const extracted = result.extracted || {}
    const nextStep = isLast ? null : stepInfo.nextStep

    const updates: Record<string, any> = { current_step: nextStep || 'done', last_seen_at: new Date().toISOString() }
    if (extracted.brand_name) updates.brand_name = extracted.brand_name
    if (extracted.product_description) updates.product_description = extracted.product_description
    if (extracted.platforms) updates.platforms = extracted.platforms
    if (extracted.target_age_range) updates.target_age_range = extracted.target_age_range
    if (extracted.target_gender) updates.target_gender = extracted.target_gender
    if (extracted.target_countries) updates.target_countries = extracted.target_countries
    if (extracted.content_types) updates.content_types = extracted.content_types
    if (extracted.creators_needed) updates.creators_needed = extracted.creators_needed
    if (extracted.budget_per_creator_eur !== undefined) updates.budget_per_creator_eur = extracted.budget_per_creator_eur
    if (extracted.budget_flexible !== undefined) updates.budget_flexible = extracted.budget_flexible
    if (extracted.go_live_date) updates.go_live_date = extracted.go_live_date
    if (extracted.niche_fit) updates.niche_fit = extracted.niche_fit
    if (extracted.tone_notes) updates.tone_notes = extracted.tone_notes
    if (extracted.dos) updates.dos = extracted.dos
    if (extracted.donts) updates.donts = extracted.donts

    await service.from('brief_sessions').update(updates).eq('session_key', session_key)

    if (isLast) {
      const { data: session } = await service.from('brief_sessions').select('*').eq('session_key', session_key).single()
      return NextResponse.json({ phase: 'review', step: 'done', extracted, sarah_reply: result.reply, session_data: session })
    }

    return NextResponse.json({ phase: 'chat', step: nextStep, extracted, sarah_reply: result.reply })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
