import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BeatBuddy',
    short_name: 'BeatBuddy',
    description: 'Tap the lights. Make a beat. AI beat maker in your browser.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0a1f',
    theme_color: '#0d0a1f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
