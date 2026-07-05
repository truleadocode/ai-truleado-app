import { redirect } from 'next/navigation'

// Opportunities/Sarah-outreach flow removed — matched briefs now show up
// directly as gig offers under /dashboard/gigs (New tab).
export default function InfluencerDashboardPage() {
  redirect('/dashboard/gigs')
}
