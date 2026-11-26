'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { markFresh } from '@/lib/fresh';

// Registers the service worker, and when it showed a saved copy of the page
// because the server was slow, swaps in the fresh data as soon as it lands.
export default function AppRuntime() {
  const router = useRouter();
  const path = usePathname();
  // Landing on the sign-in or no-access screen means no one is signed in here any more:
  // drop the saved pages too (covers an expired session or the other sign-out button).
  useEffect(() => {
    if (path !== '/login' && path !== '/no-access') return;
    try { caches.delete('pages-v1'); } catch {}
  }, [path]);
  // iOS Safari only paints :active (the press-down feedback on every button) when the
  // page listens for touches. One passive listener turns it on everywhere.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    return () => document.removeEventListener('touchstart', noop);
  }, []);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    const onMsg = (e) => { if (e.data?.type === 'fresh') { router.refresh(); markFresh(); } };
    navigator.serviceWorker.addEventListener('message', onMsg);
    // The fresh copy's message can be missed (it landed before this listener); don't stay stale.
    const fallback = window.__afganStale ? setTimeout(() => { router.refresh(); markFresh(); }, 8000) : null;
    const reg = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });
    return () => { clearTimeout(fallback); navigator.serviceWorker.removeEventListener('message', onMsg); };
  }, [router]);
  return null;
}
