import type { MetadataRoute } from 'next';

/** Installable app (KAIN_BUILD_PROMPT §9): opens like an app, from the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Kain',
    short_name: 'Kain',
    description: 'More nutrition from every peso. Meal plans for your budget and menu costing for carinderias.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFC83A',
    theme_color: '#FFFFFF',
    lang: 'en-PH',
    categories: ['food', 'lifestyle', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
