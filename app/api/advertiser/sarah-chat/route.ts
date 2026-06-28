import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/lib/supabase/server'

const SARAH_SYSTEM = `You are Sarah Chen, Creator Partnerships at Truleado.
You are onboarding a brand or agency. Be warm, professional, and brief.
1-3 sentences max. Sound like a real person.
Return ONLY valid JSON, no markdown.`

const STEPS: Record<string, { question: string; extractPrompt: string; extractSchema: string; nextStep: string | null; nextQuestion: string | null }> = {
  greeting: {
    question: `What's your name?`,
    extractPrompt: `Extract first_name and last_name. If one word, use as first_name.`,
    extractSchema: `{"first_name":"string","last_name":"string|null"}`,
    nextStep: 'company',
    nextQuestion: 'What company or agency do you work for?',
  },
  company: {
    question: 'What company or agency do you work for?',
    extractPrompt: `Extract company_name.`,
    extractSchema: `{"company_name":"string"}`,
    nextStep: 'type',
    nextQuestion: 'Are you a brand looking to work with creators directly, or an agency managing campaigns on behalf of clients?',
  },
  type: {
    question: 'Are you a brand or an agency?',
    extractPrompt: `Determine if they are a brand or agency. Return advertiser_type as either "brand" or "agency".`,
    extractSchema: `{"advertiser_type":"brand|agency"}`,
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
  const { action, session_key, user_id, advertiser_id } = body
  const service = createServiceClient()

  if (action === 'init') {
    try {
      if (user_id && advertiser_id) {
        return NextResponse.json({ phase: 'done' })
      }

      if (session_key) {
        const { data: session } = await service.from('advertiser_onboarding_sessions').select('*').eq('session_key', session_key).single()
        if (session && !session.completed) {
          const step = session.current_step || 'greeting'
          const name = session.first_name ? `, ${session.first_name}` : ''
          return NextResponse.json({
            phase: 'resume', session_key, step, data: session,
            sarah_reply: `Welcome back${name}! 👋 We got as far as ${step.replace(/_/g, ' ')} — want to continue where we left off?`,
          })
        }
      }

      const newKey = `tradv_${crypto.randomUUID()}`
      await service.from('advertiser_onboarding_sessions').insert({ session_key: newKey, current_step: 'greeting' })
      return NextResponse.json({
        phase: 'chat', session_key: newKey, step: 'greeting', data: {},
        sarah_reply: `Hey! 👋 I'm Sarah from Truleado. I help brands and agencies find the right creators — fast, no fluff.\n\nLet's get you set up. What's your name?`,
      })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'resume_continue') {
    const stepInfo = STEPS[body.step]
    if (!stepInfo) return NextResponse.json({ sarah_reply: `Let's start fresh! What's your name?`, step: 'greeting' })
    return NextResponse.json({ sarah_reply: `Great, let's keep going! ${stepInfo.question}`, step: body.step })
  }

  if (action === 'message') {
    const { step, data, user_message } = body
    if (!session_key || !step || !user_message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const stepInfo = STEPS[step]
    if (!stepInfo) return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
    const isLast = stepInfo.nextStep === null

    const prompt = `Step: ${step}\nData so far: ${JSON.stringify(data || {})}\nUser said: "${user_message}"\n\nTask 1 — Extract: ${stepInfo.extractPrompt}\nSchema: ${stepInfo.extractSchema}\n\nTask 2 — Reply: Warm 1-sentence acknowledgment.\n${isLast ? `Then say: "Perfect! Sign in with Google to access your dashboard and start finding creators for your campaigns."` : `Then ask: "${stepInfo.nextQuestion}"`}\n\nReturn ONLY JSON: {"extracted": <schema>, "reply": "string"}`

    let result: any
    try { result = await callGemini(SARAH_SYSTEM, prompt) }
    catch { return NextResponse.json({ error: 'AI error' }, { status: 500 }) }

    const extracted = result.extracted || {}
    const updates: Record<string, any> = {
      current_step: isLast ? 'done' : (stepInfo.nextStep || step),
      last_seen_at: new Date().toISOString(),
    }
    if (step === 'greeting') { if (extracted.first_name) updates.first_name = extracted.first_name; if (extracted.last_name) updates.last_name = extracted.last_name }
    if (step === 'company') { if (extracted.company_name) updates.company_name = extracted.company_name }
    if (step === 'type') { if (extracted.advertiser_type) updates.advertiser_type = extracted.advertiser_type }

    await service.from('advertiser_onboarding_sessions').update(updates).eq('session_key', session_key)

    return NextResponse.json({ phase: isLast ? 'auth' : 'chat', step: updates.current_step, extracted, sarah_reply: result.reply })
  }

  if (action === 'merge') {
    const { user_id: uid } = body
    if (!session_key || !uid) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const { data: session } = await service.from('advertiser_onboarding_sessions').select('*').eq('session_key', session_key).single()
    if (!session) return NextResponse.json({ phase: 'done' })

    const { data: existing } = await service.from('advertisers').select('id').eq('user_id', uid).single()
    if (existing) {
      await service.from('advertiser_onboarding_sessions').update({ user_id: uid, advertiser_id: existing.id, completed: true }).eq('session_key', session_key)
      return NextResponse.json({ phase: 'done', advertiser_id: existing.id })
    }

    const { data: { user } } = await service.auth.admin.getUserById(uid)
    const { data: newAdv } = await service.from('advertisers').insert({
      user_id: uid,
      email: user?.email || '',
      first_name: session.first_name,
      last_name: session.last_name,
      company_name: session.company_name,
      advertiser_type: session.advertiser_type,
      onboarding_complete: true,
    }).select('id').single()

    await service.from('advertiser_onboarding_sessions').update({ user_id: uid, advertiser_id: newAdv?.id, completed: true }).eq('session_key', session_key)
    return NextResponse.json({ phase: 'done', advertiser_id: newAdv?.id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
