import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
