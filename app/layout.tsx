import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Truleado — Creator Platform',
  description: 'Brand deals that actually fit you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
