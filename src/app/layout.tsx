import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Manrope } from 'next/font/google';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';
import { ThemeProvider, themeInitScript } from '@/components/theme/ThemeProvider';

const display = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Luna — Period & Cycle Tracker',
  description: 'Track your cycle, log symptoms, and share with your partner.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Luna',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#C84A30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh text-ink-900 font-sans antialiased">
        <ThemeProvider>
          {children}
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
