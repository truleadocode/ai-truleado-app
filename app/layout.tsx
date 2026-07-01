import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Truleado type system (docs/brand-guidelines.html):
// Inter = all app UI (weights 400/500/600 only), Fraunces = marketing display,
// JetBrains Mono = data/IDs/handles. Self-hosted via next/font — no FOUT.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' })
const fraunces = Fraunces({ subsets: ['latin'], weight: ['300', '400', '600'], variable: '--font-serif', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Truleado — Creator Platform',
  description: 'Brand deals that actually fit you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
