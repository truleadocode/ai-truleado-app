'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (compact) {
    return (
      <Button
        variant="ghost" size="icon"
        onClick={signOut}
        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        title="Sign out"
      >
        <LogOut size={14} />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
      <LogOut size={13} />
      <span>Sign out</span>
    </Button>
  )
}
