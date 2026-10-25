import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/onest'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'BeatBuddy — make a beat tonight',
  description:
    'Describe a vibe, get a beat that already slaps, then light up the pads to make it yours. Export WAV. Free, in your browser.',
  keywords: ['beat maker', 'AI music', 'drum machine', 'sequencer', 'music for beginners'],
  applicationName: 'BeatBuddy',
}

export const viewport: Viewport = {
  themeColor: '#0d0a1f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  )
}
