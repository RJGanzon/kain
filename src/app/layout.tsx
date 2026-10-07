import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { SerwistProvider } from '@serwist/turbopack/react';
import { NavProvider } from '@/lib/nav/NavProvider';
import './globals.css';
import './motion.css';
import '../lib/nav/nav.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Kain', template: '%s · Kain' },
  description: 'More nutrition from every peso. Meal plans for your budget and menu costing for carinderias.',
  applicationName: 'Kain',
  appleWebApp: { capable: true, title: 'Kain', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  formatDetection: { telephone: false },
  // Lets tests tell whether this build talks to a backend.
  other: process.env.NEXT_PUBLIC_SUPABASE_URL ? { 'kain-backend': '1' } : {},
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
          <div id="app" className="app">
            <NavProvider>{children}</NavProvider>
          </div>
        </SerwistProvider>
      </body>
    </html>
  );
}
