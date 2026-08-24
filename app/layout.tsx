import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })

export const metadata: Metadata = {
  title: 'Moxie — AI Commerce Operating Layer',
  description: 'AI-native commerce infrastructure — your AI buyer that searches the web, negotiates deals, and shops for you.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: '#0a0a0f' }}>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`} style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', background: '#0a0a0f', color: '#f1f1f5' }}>
        {children}
      </body>
    </html>
  )
}
