'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Registers the service worker, and when it showed a saved copy of the page
// because the server was slow, swaps in the fresh data as soon as it lands.
export default function AppRuntime() {
  const router = useRouter();
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    const onMsg = (e) => { if (e.data?.type === 'fresh') router.refresh(); };
    navigator.serviceWorker.addEventListener('message', onMsg);
    const reg = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [router]);
  return null;
}
