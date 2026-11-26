import './globals.css';
import AppRuntime from '@/components/AppRuntime';
import { Rubik } from 'next/font/google';

// One family across the app: Rubik. Headings use its heavier weights instead of a second display face.
const rubik = Rubik({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-body' });

export const metadata = {
  title: 'Afgan S&L',
  description: 'ניהול אירועים של Afgan Sound & Light',
  appleWebApp: { capable: true, title: 'Afgan S&L', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport = { themeColor: '#08090B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>{children}<AppRuntime /></body>
    </html>
  );
}
