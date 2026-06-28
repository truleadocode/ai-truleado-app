import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const SARAH_SYSTEM = `You are Sarah Chen, Creator Partnerships at Truleado.
You onboard creators through friendly chat. Be warm, encouraging, brief.
1-3 sentences max. Occasional emojis (not every message). Sound like a real person.
You MUST respond with valid JSON only — no markdown, no extra text.`

type StepInfo = {
  extractPrompt: string
  extractSchema: string
  nextStep: string | null
  nextQuestion: string | null
}

const STEPS: Record<string, StepInfo> = {
  greeting: {
    extractPrompt: `Extract their name. Split into first_name and last_name. If only one name given, use it for first_name and null for last_name.`,
    extractSchema: `{"first_name": "string", "last_name": "string | null"}`,
    nextStep: 'location',
    nextQuestion: 'Where are you based?',
  },
  location: {
    extractPrompt: `Extract city and country from their response. Either can be null.`,
    extractSchema: `{"city": "string | null", "country": "string | null"}`,
    nextStep: 'platforms',
    nextQuestion: 'Which platforms are you active on? Instagram, TikTok, YouTube, Pinterest?',
  },
  platforms: {
    extractPrompt: `Extract platform names. Map to lowercase: instagram, tiktok, youtube, pinterest. Return array of objects. "All of them" means all four. Accept any natural language like "insta and tiktok" or "just instagram".`,
    extractSchema: `{"platforms": [{"platform": "instagram|tiktok|youtube|pinterest", "handle": null}]}`,
    nextStep: 'handles',
    nextQuestion: 'What are your handles on those platforms?',
  },
  handles: {
    extractPrompt: `Match handles to platforms. The collected data has a platforms array. Try to match each @handle or username to a platform. Return the updated platforms array with handles filled in. If only one platform, assign the handle to it. If multiple, match by context clues in the message.`,
    extractSchema: `{"platforms": [{"platform": "string", "handle": "string | null"}]}`,
    nextStep: 'niche',
    nextQuestion: 'What kind of content do you make?',
  },
  niche: {
    extractPrompt: `Extract primary_niche (capitalize, e.g. "Fitness") and any secondary_niches mentioned as an array of strings.`,
    extractSchema: `{"primary_niche": "string", "secondary_niches": ["string"]}`,
    nextStep: 'content_style',
    nextQuestion: 'How would you describe your content style?',
  },
  content_style: {
    extractPrompt: `Extract their content style as a short descriptive phrase.`,
    extractSchema: `{"content_style": "string"}`,
    nextStep: 'languages',
    nextQuestion: 'What languages do you create content in?',
  },
  languages: {
    extractPrompt: `Extract languages as an array. Accept any natural phrasing like "english and a bit of hindi" or "mainly dutch". Common: English, German, French, Spanish, Italian, Dutch, Portuguese, Hindi, etc.`,
    extractSchema: `{"languages": ["string"]}`,
    nextStep: 'posting_frequency',
    nextQuestion: 'How often do you post?',
  },
  posting_frequency: {
    extractPrompt: `Extract posting frequency from natural language. Normalize to one of: Daily, 4-6x per week, 2-3x per week, Once a week, Less than once a week. Accept anything like "couple times a week" or "every day" or "a few times a month".`,
    extractSchema: `{"posting_frequency": "string"}`,
    nextStep: 'bio',
    nextQuestion: 'Almost there! Give me 2-3 sentences about you and your content — this is what brands read first.',
  },
  bio: {
    extractPrompt: `Use their message as the bio. Keep their voice, fix obvious typos. Return as bio field.`,
    extractSchema: `{"bio": "string"}`,
    nextStep: 'brand_prefs',
    nextQuestion: `Two quick ones — which brand categories do you love working with, and any you'd never do?`,
  },
  brand_prefs: {
    extractPrompt: `Extract brand_loves (categories they enjoy) and brand_never (hard nos) as string arrays. Capitalize each. Accept natural language like "I love fitness brands, hate alcohol and gambling".`,
    extractSchema: `{"brand_loves": ["string"], "brand_never": ["string"]}`,
    nextStep: 'rates',
    nextQuestion: `Last question — what do you charge for sponsored content? A rough idea is fine.`,
  },
  rates: {
    extractPrompt: `Return their rates description verbatim as rates_raw.`,
    extractSchema: `{"rates_raw": "string"}`,
    nextStep: null,
    nextQuestion: null,
  },
}

const STEP_ORDER = ['greeting', 'location', 'platforms', 'handles', 'niche', 'content_style', 'languages', 'posting_frequency', 'bio', 'brand_prefs', 'rates']

function stepIndex(step: string) {
  return STEP_ORDER.indexOf(step) + 1
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<any> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: systemPrompt })
  const result = await model.generateContent(userPrompt)
  const raw = result.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(raw)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, session_key, user_id, influencer_id, user_message } = body
  const service = createServiceClient()

  // ── INIT ──────────────────────────────────────────────────────────
  if (action === 'init') {
    try {
      if (user_id && influencer_id) {
        const { data: session } = await service
          .from('onboarding_sessions')
          .select('*')
          .eq('session_key', session_key || '')
          .single()

        if (session?.influencer_id) {
          const { data: platforms } = await service
            .from('influencer_platforms')
            .select('id, platform, handle')
            .eq('influencer_id', session.influencer_id)
          return NextResponse.json({ phase: 'screenshots', influencer_id: session.influencer_id, platforms, data: session })
        }

        if (session) {
          return NextResponse.json({ phase: 'merge_needed', session_key, data: session })
        }

        const { data: platforms } = await service
          .from('influencer_platforms')
          .select('id, platform, handle')
          .eq('influencer_id', influencer_id)
        return NextResponse.json({ phase: 'screenshots', influencer_id, platforms: platforms || [], data: {} })
      }

      if (session_key) {
        const { data: session } = await service
          .from('onboarding_sessions')
          .select('*')
          .eq('session_key', session_key)
          .single()

        if (session && !session.completed) {
          const step = session.current_step || 'greeting'
          const name = session.first_name ? `, ${session.first_name}` : ''
          const stepLabel = step === 'greeting' ? 'your name' : step.replace(/_/g, ' ')
          return NextResponse.json({
            phase: 'resume',
            session_key,
            step,
            data: session,
            sarah_reply: `Welcome back${name}! 👋 We got as far as ${stepLabel} — want to continue where we left off?`,
          })
        }
      }

      const newKey = `tr_${crypto.randomUUID()}`
      await service.from('onboarding_sessions').insert({
        session_key: newKey,
        current_step: 'greeting',
        last_seen_at: new Date().toISOString(),
      })

      return NextResponse.json({
        phase: 'chat',
        session_key: newKey,
        step: 'greeting',
        data: {},
        sarah_reply: `Hey! 👋 I'm Sarah from Truleado. I match creators like you with brands that actually fit your content — no cold emails, no chasing briefs.\n\nThis takes about 3 minutes. Let's start simple — what's your name?`,
      })
    } catch (err) {
      console.error('Init error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // ── RESUME CONTINUE ───────────────────────────────────────────────
  if (action === 'resume_continue') {
    const { step: currentStep } = body
    const stepInfo = STEPS[currentStep]
    if (!stepInfo) {
      return NextResponse.json({
        sarah_reply: "Let's start fresh! What's your name?",
        step: 'greeting',
      })
    }
    const question = stepInfo.nextQuestion || 'Can you tell me more?'
    return NextResponse.json({
      sarah_reply: `Great, let's keep going! ${question}`,
      step: currentStep,
    })
  }

  // ── MESSAGE ───────────────────────────────────────────────────────
  if (action === 'message') {
    const { step, data } = body

    if (!session_key || !step || !user_message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const stepInfo = STEPS[step]
    if (!stepInfo) {
      return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
    }

    const isLastStep = stepInfo.nextStep === null

    const prompt = `Current step: ${step}
Collected data so far: ${JSON.stringify(data || {})}
User just said: "${user_message}"

Task 1 — Extract: ${stepInfo.extractPrompt}
Schema: ${stepInfo.extractSchema}
${step === 'handles' ? `Existing platforms: ${JSON.stringify((data?.platforms || []))}` : ''}

Task 2 — Reply: Write a warm, brief acknowledgment of what they shared (1 sentence, specific to their answer).
${isLastStep
  ? `Then add: "You're all set! 🎉 Before I show you what I've put together, let me save everything — takes two seconds, just sign in with Google."`
  : `Then ask: "${stepInfo.nextQuestion}"`
}

Return ONLY valid JSON with no markdown fences:
{
  "extracted": <extracted data matching schema>,
  "reply": "your message"
}`

    let geminiResult: any
    try {
      geminiResult = await callGemini(SARAH_SYSTEM, prompt)
    } catch (err) {
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'AI error' }, { status: 500 })
    }

    const extracted = geminiResult.extracted || {}
    const reply = geminiResult.reply || ''

    const updates: Record<string, any> = {
      current_step: isLastStep ? 'rates_done' : (stepInfo.nextStep || step),
      last_seen_at: new Date().toISOString(),
    }

    if (step === 'greeting') {
      if (extracted.first_name) updates.first_name = extracted.first_name
      if (extracted.last_name) updates.last_name = extracted.last_name
    } else if (step === 'location') {
      if (extracted.city) updates.city = extracted.city
      if (extracted.country) updates.country = extracted.country
    } else if (step === 'platforms') {
      updates.platforms = extracted.platforms || []
    } else if (step === 'handles') {
      const existingPlatforms: any[] = data?.platforms || []
      updates.platforms = extracted.platforms || existingPlatforms
    } else if (step === 'niche') {
      if (extracted.primary_niche) updates.primary_niche = extracted.primary_niche
      if (extracted.secondary_niches) updates.secondary_niches = extracted.secondary_niches
    } else if (step === 'content_style') {
      if (extracted.content_style) updates.content_style = extracted.content_style
    } else if (step === 'languages') {
      if (extracted.languages) updates.languages = extracted.languages
    } else if (step === 'posting_frequency') {
      if (extracted.posting_frequency) updates.posting_frequency = extracted.posting_frequency
    } else if (step === 'bio') {
      if (extracted.bio) updates.bio = extracted.bio
    } else if (step === 'brand_prefs') {
      if (extracted.brand_loves) updates.brand_loves = extracted.brand_loves
      if (extracted.brand_never) updates.brand_never = extracted.brand_never
    } else if (step === 'rates') {
      if (extracted.rates_raw) updates.rates_raw = extracted.rates_raw
    }

    await service.from('onboarding_sessions')
      .update(updates)
      .eq('session_key', session_key)

    return NextResponse.json({
      phase: isLastStep ? 'auth' : 'chat',
      step: updates.current_step,
      extracted,
      sarah_reply: reply,
      step_number: stepIndex(step),
    })
  }

  // ── MERGE (post-OAuth) ────────────────────────────────────────────
  if (action === 'merge') {
    if (!session_key || !user_id || !influencer_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: session } = await service
      .from('onboarding_sessions')
      .select('*')
      .eq('session_key', session_key)
      .single()

    if (!session) {
      const { data: platforms } = await service
        .from('influencer_platforms')
        .select('id, platform, handle')
        .eq('influencer_id', influencer_id)
      return NextResponse.json({ phase: 'screenshots', influencer_id, platforms: platforms || [] })
    }

    const influencerUpdates: Record<string, any> = {}
    if (session.first_name) influencerUpdates.first_name = session.first_name
    if (session.last_name) influencerUpdates.last_name = session.last_name
    if (session.city) influencerUpdates.city = session.city
    if (session.country) influencerUpdates.country = session.country
    if (session.languages?.length) influencerUpdates.languages = session.languages
    if (session.primary_niche) influencerUpdates.primary_niche = session.primary_niche
    if (session.secondary_niches?.length) influencerUpdates.secondary_niches = session.secondary_niches
    if (session.content_style) influencerUpdates.content_style = session.content_style
    if (session.posting_frequency) influencerUpdates.posting_frequency = session.posting_frequency
    if (session.bio) influencerUpdates.bio = session.bio
    if (session.brand_loves?.length) influencerUpdates.brand_loves = session.brand_loves
    if (session.brand_never?.length) influencerUpdates.brand_never = session.brand_never

    if (Object.keys(influencerUpdates).length > 0) {
      await service.from('influencers').update(influencerUpdates).eq('id', influencer_id)
    }

    const platforms: any[] = session.platforms || []
    const createdPlatforms: any[] = []

    for (const p of platforms) {
      const { data: existing } = await service
        .from('influencer_platforms')
        .select('id, platform, handle')
        .eq('influencer_id', influencer_id)
        .eq('platform', p.platform)
        .single()

      if (existing) {
        createdPlatforms.push(existing)
      } else {
        const { data: created } = await service
          .from('influencer_platforms')
          .insert({
            influencer_id,
            platform: p.platform,
            handle: p.handle || null,
            parse_status: 'pending',
          })
          .select('id, platform, handle')
          .single()
        if (created) createdPlatforms.push(created)
      }
    }

    if (session.rates_raw) {
      try {
        const ratesPrompt = `Extract rate information from this creator's text and return ONLY valid JSON.
Platforms: ${platforms.map((p: any) => p.platform).join(', ')}.
Text: "${session.rates_raw}"

Return:
{
  "rates": [{"platform": "string", "content_type": "reel|story|post|video|integration", "rate_eur_cents": number}],
  "open_to_gifting": boolean,
  "open_to_rev_share": boolean,
  "open_to_exclusivity": boolean
}
Convert amounts to euro cents (500 = 50000). Omit rates not mentioned. Default booleans to false.`

        const ratesResult = await callGemini('You extract structured rate data from text. Return only valid JSON.', ratesPrompt)

        if (ratesResult.rates?.length) {
          await service.from('influencer_rates').upsert(
            ratesResult.rates.map((r: any) => ({
              influencer_id,
              platform: r.platform,
              content_type: r.content_type,
              rate_eur: r.rate_eur_cents,
              currency: 'EUR',
            })),
            { onConflict: 'influencer_id,platform,content_type' }
          )
        }

        await service.from('influencers').update({
          open_to_gifting: ratesResult.open_to_gifting || false,
          open_to_rev_share: ratesResult.open_to_rev_share || false,
          open_to_exclusivity: ratesResult.open_to_exclusivity || false,
        }).eq('id', influencer_id)
      } catch (err) {
        console.error('Rates parse error:', err)
      }
    }

    await service.from('onboarding_sessions').update({
      user_id,
      influencer_id,
      last_seen_at: new Date().toISOString(),
    }).eq('session_key', session_key)

    return NextResponse.json({
      phase: 'screenshots',
      influencer_id,
      platforms: createdPlatforms,
      first_name: session.first_name,
    })
  }

  // ── COMPLETE ──────────────────────────────────────────────────────
  if (action === 'complete') {
    const { influencer_id: infId } = body
    if (infId) {
      await service.from('influencers').update({ onboarding_complete: true }).eq('id', infId)
    }
    if (session_key) {
      await service.from('onboarding_sessions').update({ completed: true, screenshots_done: true }).eq('session_key', session_key)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
