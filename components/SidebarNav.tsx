'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface NavItem { href: string; label: string; icon: LucideIcon; badge?: number }

interface Props {
  items: NavItem[]
  variant?: 'vertical' | 'horizontal'
}

export default function SidebarNav({ items, variant = 'vertical' }: Props) {
  const pathname = usePathname()

  if (variant === 'horizontal') {
    return (
      <nav className="flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap no-underline shrink-0 transition-colors',
                active ? 'bg-accent text-gold' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon size={13} /> {label}
              {!!badge && (
                <span className="ml-0.5 text-[9px] font-bold bg-gold text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors no-underline',
              active
                ? 'bg-accent text-gold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {!!badge && (
              <span className="text-[10px] font-bold bg-gold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
