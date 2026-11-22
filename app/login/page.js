'use client';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Login() {
  const signIn = () =>
    supabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  return (
    <main className="page" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 28 }}>
      <img src="/icons/logo-white.png" alt="Afgan Sound & Light" width="150" height="150" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="display" style={{ fontSize: 30 }}>כל האירועים במקום אחד</h1>
        <p className="muted">מי עובד, מתי, איפה ועם איזה ציוד.</p>
      </div>
      <button className="btn full" onClick={signIn} style={{ maxWidth: 360 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zm-5.6-8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9z"/></svg>
        כניסה עם גוגל
      </button>
      <a href="/privacy" className="muted" style={{ fontSize: 13 }}>מדיניות פרטיות</a>
    </main>
  );
}
