import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdvertiserMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) redirect('/advertiser')

  return (
    <DashboardShell role="advertiser">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Conversations with your confirmed creators.</p>
      </div>

      {/* Empty state — in-app messaging for advertisers isn't live yet. */}
      <Card>
        <CardContent className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-5">
            <MessageSquare size={20} className="text-gold" />
          </div>
          <h3 className="font-semibold mb-1.5">No messages yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-2">
            When you confirm a creator from a shortlist, we send you their contact
            details by email so you can coordinate directly.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-7 inline-flex items-center gap-1.5">
            <Mail size={12} /> In-app messaging is coming soon.
          </p>
          <div>
            <Button variant="outline" className="font-semibold" asChild>
              <Link href="/advertiser/briefs">Review your shortlists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
