import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

function notifIcon(type: string) {
  switch (type) {
    case 'new_offer':       return '💼'
    case 'gig_confirmed':   return '✅'
    case 'gig_complete':    return '🎉'
    case 'profile_parsed':  return '📊'
    case 'welcome':         return '👋'
    case 'message':         return '💬'
    default:                return '🔔'
  }
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
    <div style={{ padding:'24px 28px 40px', maxWidth:600 }}>
      <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Notifications</h2>

      {(!notifs || notifs.length === 0) && (
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:'48px 24px', textAlign:'center' }}>
          <p style={{ fontSize:20, marginBottom:10 }}>🔔</p>
          <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No notifications yet</p>
          <p style={{ fontSize:13, color:'var(--text-2)' }}>You'll be notified when Sarah sends you an offer or update.</p>
        </div>
      )}

      {(notifs || []).map((n, i) => (
        <div key={n.id} style={{
          display:'flex', gap:12, padding:'14px 18px',
          background:'var(--white)', border:`1px solid ${n.read ? 'var(--border)' : 'var(--gold-border)'}`,
          borderRadius:12, marginBottom:8,
          opacity: n.read ? 0.75 : 1,
        }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {notifIcon(n.type)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:3 }}>
              <p style={{ fontSize:13, fontWeight:700 }}>{n.title}</p>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--gold)' }} />}
                <p style={{ fontSize:11, color:'var(--text-2)' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { month:'short', day:'numeric' })}</p>
              </div>
            </div>
            <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.5 }}>{n.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
