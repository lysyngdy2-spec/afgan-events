import './globals.css';
import { Rubik, Secular_One } from 'next/font/google';

const body = Rubik({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '700'], variable: '--font-body' });
const display = Secular_One({ subsets: ['hebrew', 'latin'], weight: '400', variable: '--font-display' });

export const metadata = {
  title: 'Afgan S&L',
  description: 'ניהול אירועים של Afgan Sound & Light',
  appleWebApp: { capable: true, title: 'Afgan S&L', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport = { themeColor: '#08090B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
