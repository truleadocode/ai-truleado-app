import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const sessionKey = searchParams.get('sk')

  if (!code) return NextResponse.redirect(`${origin}/advertiser`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/advertiser`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/advertiser`)

  // Merge the pre-auth session
  if (sessionKey) {
    await fetch(`${origin}/api/advertiser/sarah-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', session_key: sessionKey, user_id: user.id }),
    })
  } else {
    // Direct sign-in — ensure advertiser row exists
    const service = createServiceClient()
    const { data: existing } = await service.from('advertisers').select('id').eq('user_id', user.id).single()
    if (!existing) {
      const fullName = user.user_metadata?.full_name || ''
      const parts = fullName.trim().split(' ')
      await service.from('advertisers').insert({
        user_id: user.id, email: user.email!,
        first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '',
        onboarding_complete: true,
      })
    }
  }

  return NextResponse.redirect(`${origin}/advertiser/dashboard`)
}
