import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Redirect /influencer/dashboard to the existing /dashboard for now
export default async function InfluencerDashboard() {
  redirect('/dashboard')
}
