import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Handles are always rendered with a leading "@" prepended by the caller —
// strip any the user typed themselves so it doesn't double up ("@@handle").
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}
