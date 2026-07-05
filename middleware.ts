import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Which surface are we on? truleado.com / :3000 = marketing, app.truleado.com / :3001 = app
  const host = request.headers.get('host') || ''
  const isAppSurface =
    host.startsWith('app.') ||
    host.includes('localhost:3001') ||
    host.includes('127.0.0.1:3001')

  // Always public
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/influencer') ||
    pathname.startsWith('/advertiser')

  // Logged-in user hits root ON THE APP SURFACE — send to correct dashboard.
  // On the marketing surface (:3000 / truleado.com) we always render the marketing page.
  if (pathname === '/' && user && isAppSurface) {
    const service = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
    const { data: advertiser } = await service.from('advertisers').select('id, onboarding_complete').eq('user_id', user.id).single()
    if (advertiser?.onboarding_complete) {
      return NextResponse.redirect(new URL('/advertiser/dashboard', request.url))
    }
    const { data: influencer } = await service.from('influencers').select('id, onboarding_complete').eq('user_id', user.id).single()
    if (influencer?.onboarding_complete) {
      return NextResponse.redirect(new URL('/influencer/dashboard', request.url))
    }
  }

  // Protect dashboard routes
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
