import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Building2, Lock } from 'lucide-react'

function formatEur(cents: number) {
  return `€${(cents / 100).toLocaleString('en-EU')}`
}

const STATUS_TABS = [
  { key: 'active',   label: 'Active',    statuses: ['offered','interested','confirmed','in_progress'] },
  { key: 'complete', label: 'Completed', statuses: ['complete'] },
  { key: 'passed',   label: 'Passed',    statuses: ['passed','rejected'] },
]

function statusBadge(status: string) {
  switch (status) {
    case 'offered':     return { label: 'New offer',      className: 'bg-gold-bg text-gold border border-gold-border' }
    case 'interested':  return { label: 'Interested',     className: 'bg-blue-bg text-blue border border-blue-border' }
    case 'confirmed':
    case 'in_progress': return { label: 'In progress',    className: 'bg-green-bg text-green border border-green-border' }
    case 'complete':    return { label: 'Complete',        className: 'bg-green-bg text-green border border-green-border' }
    case 'passed':      return { label: 'Passed',          className: 'bg-muted text-muted-foreground border border-border' }
    case 'rejected':    return { label: 'Not interested',  className: 'bg-red-bg text-red border border-red-border' }
    default:            return { label: status,            className: 'bg-muted text-muted-foreground border border-border' }
  }
}

export default async function GigsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
  if (!influencer) redirect('/')

  const activeTab = searchParams.tab || 'active'
  const tab = STATUS_TABS.find(t => t.key === activeTab) || STATUS_TABS[0]

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, brand_category, brand_name, brand_revealed, platform, deliverables_summary, budget_eur, respond_by, content_due_at, status, created_at')
    .eq('influencer_id', influencer.id)
    .in('status', tab.statuses)
    .order('created_at', { ascending: false })

  return (
    <div className="px-7 pt-6 pb-12">

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-5">
        {STATUS_TABS.map(t => (
          <Link key={t.key} href={`/dashboard/gigs?tab=${t.key}`} className={cn(
            'px-4 py-2.5 text-[13px] -mb-px no-underline transition-colors',
            activeTab === t.key
              ? 'font-semibold text-gold border-b-2 border-gold'
              : 'font-medium text-muted-foreground border-b-2 border-transparent',
          )}>{t.label}</Link>
        ))}
      </div>

      {(!gigs || gigs.length === 0) && (
        <div className="bg-card border border-border rounded-2xl px-6 py-12 text-center shadow-sm">
          <p className="text-[15px] font-semibold mb-1.5 text-foreground">No {tab.label.toLowerCase()} gigs</p>
          <p className="text-[13px] text-muted-foreground">
            {activeTab === 'active' ? 'Sarah will reach out when a campaign matches your profile.' :
             activeTab === 'complete' ? 'Completed gigs will appear here.' :
             'Gigs you passed on will appear here.'}
          </p>
        </div>
      )}

      {(gigs || []).map(gig => {
        const badge = statusBadge(gig.status)
        const isComplete = gig.status === 'complete' || gig.status === 'passed' || gig.status === 'rejected'
        return (
          <Link key={gig.id} href={`/gigs/${gig.id}`} className={cn(
            'block bg-card border border-border rounded-2xl px-[18px] py-4 mb-2.5 no-underline text-foreground shadow-sm transition-[border-color,box-shadow]',
            isComplete ? 'opacity-65' : 'opacity-100',
          )}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-muted border border-border flex items-center justify-center shrink-0">
                {gig.brand_revealed ? <Building2 size={20} className="text-muted-foreground" /> : <Lock size={20} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-[3px]">
                  <p className="text-sm font-semibold tracking-[-0.1px]">{gig.brand_revealed ? gig.brand_name : gig.brand_category}</p>
                  <span className={cn('inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-1 rounded-[20px] shrink-0', badge.className)}>
                    {['offered','interested','confirmed','in_progress'].includes(gig.status) && (
                      <span className="w-[5px] h-[5px] rounded-full bg-current inline-block animate-pulse" />
                    )}
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2.5">{gig.platform} · {gig.deliverables_summary}</p>
                <div className="flex gap-4 flex-wrap">
                  {gig.budget_eur && (
                    <span className="text-xs text-muted-foreground">Budget <strong className="text-foreground font-semibold">{formatEur(gig.budget_eur)}</strong></span>
                  )}
                  {gig.respond_by && activeTab === 'active' && (
                    <span className="text-xs text-muted-foreground">Respond by <strong className="text-foreground font-semibold">{new Date(gig.respond_by).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</strong></span>
                  )}
                  {gig.content_due_at && (
                    <span className="text-xs text-muted-foreground">Content due <strong className="text-foreground font-semibold">{new Date(gig.content_due_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</strong></span>
                  )}
                  <span className="text-xs text-muted-foreground/60 ml-auto">{new Date(gig.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
