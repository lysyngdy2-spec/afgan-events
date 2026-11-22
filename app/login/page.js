'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// Public OAuth client ID (not a secret).
const GOOGLE_CLIENT_ID = '611344344517-5dmc1n81q6vfnbmdvh65solvmq2maro2.apps.googleusercontent.com';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Login() {
  const box = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(new URLSearchParams(location.search).has('e'));
  }, []);

  useEffect(() => {
    if (!ready || !box.current || !window.google?.accounts?.id) return;
    (async () => {
      const raw = crypto.randomUUID() + crypto.randomUUID();
      // Read back on /auth/google, which Google reaches with a cross-site POST.
      document.cookie = `g_nonce=${raw}; Path=/auth; Max-Age=600; Secure; SameSite=None`;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'redirect',
        login_uri: `${location.origin}/auth/google`,
        nonce: await sha256Hex(raw),
        auto_select: false,
      });
      box.current.innerHTML = '';
      window.google.accounts.id.renderButton(box.current, {
        theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'he',
        width: Math.min(360, box.current.clientWidth || 320),
      });
    })();
  }, [ready]);

  return (
    <main className="page" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 28 }}>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <img src="/icons/logo-white.png" alt="Afgan Sound & Light" width="150" height="150" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="display" style={{ fontSize: 30 }}>כל האירועים במקום אחד</h1>
        <p className="muted">מי עובד, מתי, איפה ועם איזה ציוד.</p>
      </div>
      <div ref={box} style={{ width: '100%', maxWidth: 360, minHeight: 44, display: 'flex', justifyContent: 'center' }}>
        {!ready && <span className="muted small">טוען כניסה עם גוגל…</span>}
      </div>
      {failed && <p className="small" style={{ color: '#FF6B5E' }}>הכניסה לא הצליחה. נסה שוב.</p>}
      <a href="/privacy" className="muted" style={{ fontSize: 13 }}>מדיניות פרטיות</a>
    </main>
  );
}
