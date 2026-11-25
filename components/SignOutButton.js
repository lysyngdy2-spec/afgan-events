'use client';

// Clears the pages saved on this phone before signing out.
export default function SignOutButton() {
  const clear = () => {
    try { navigator.serviceWorker?.controller?.postMessage('clear'); } catch {}
    try { caches?.delete('pages-v1'); } catch {}
  };
  return (
    <form action="/auth/signout" method="post" onSubmit={clear}>
      <button className="btn ghost" style={{ width: '100%' }}>התנתקות</button>
    </form>
  );
}
