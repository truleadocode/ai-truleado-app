import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  CheckCircle,
  PartyPopper,
  BarChart3,
  Hand,
  MessageSquare,
  Bell,
  type LucideIcon,
} from 'lucide-react'

const notifIconMap: Record<string, LucideIcon> = {
  new_offer:      Briefcase,
  gig_confirmed:  CheckCircle,
  gig_complete:   PartyPopper,
  profile_parsed: BarChart3,
  welcome:        Hand,
  message:        MessageSquare,
}

function notifIcon(type: string): LucideIcon {
  return notifIconMap[type] ?? Bell
}

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
  if (!influencer) redirect('/')

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, type, title, body, read, created_at, action_url')
    .eq('influencer_id', influencer.id)
    .order('created_at', { ascending: false })

  // Mark all as read
  const service = createServiceClient()
  await service.from('notifications')
    .update({ read: true })
    .eq('influencer_id', influencer.id)
    .eq('read', false)

  return (
    <div className="px-7 pt-6 pb-10 max-w-[600px]">
      <h2 className="text-base font-semibold mb-5">Notifications</h2>

      {(!notifs || notifs.length === 0) && (
        <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
          <Bell size={30} className="mx-auto mb-2.5 text-muted-foreground" />
          <p className="text-sm font-semibold mb-1.5">No notifications yet</p>
          <p className="text-[13px] text-muted-foreground">You'll be notified when Sarah sends you an offer or update.</p>
        </div>
      )}

      {(notifs || []).map((n) => (
        <div
          key={n.id}
          className={cn(
            'flex gap-3 px-[18px] py-3.5 bg-card border rounded-xl mb-2',
            n.read ? 'border-border opacity-75' : 'border-gold-border opacity-100'
          )}
        >
          <div className="w-[38px] h-[38px] rounded-[10px] bg-muted border border-border flex items-center justify-center flex-shrink-0">
            {(() => { const Icon = notifIcon(n.type); return <Icon size={18} className="text-muted-foreground" /> })()}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-[3px]">
              <p className="text-[13px] font-semibold">{n.title}</p>
              <div className="flex gap-1.5 items-center flex-shrink-0">
                {!n.read && <div className="w-[7px] h-[7px] rounded-full bg-gold" />}
                <p className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-normal">{n.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
