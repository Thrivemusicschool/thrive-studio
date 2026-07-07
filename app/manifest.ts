import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Thrive Studio',
    short_name: 'Thrive',
    description: 'Your music journey with Thrive Music School',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8F0',
    theme_color: '#263A6E',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
