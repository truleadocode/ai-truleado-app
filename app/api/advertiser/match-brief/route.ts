import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runMatchBrief } from '@/lib/matchBrief'

export async function POST(request: NextRequest) {
  // Internal-only endpoint: called server-to-server from submit-brief,
  // finalize-auth, the advertiser OAuth callback, and the process-briefs
  // cron sweep. The service-role key doubles as the shared secret — it
  // never leaves the server.
  if (request.headers.get('x-internal-key') !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let brief_id: string
  try { ({ brief_id } = await request.json()) } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await runMatchBrief(createServiceClient(), brief_id)
  return NextResponse.json(result, { status: result.ok ? 200 : (result.error === 'Brief not found' ? 404 : 500) })
}
