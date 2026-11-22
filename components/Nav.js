'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cal: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

export default function Nav({ isAdmin, canEdit }) {
  const path = usePathname();
  // Full-screen forms have their own bottom bar.
  if (path === '/events/new' || path.endsWith('/edit')) return null;
  const key = path === '/' ? 'home' : path.startsWith('/events') ? 'events' : path.startsWith('/me') ? 'me' : 'manage';
  const item = (href, k, label) => (
    <Link href={href} className={key === k ? 'on' : ''} aria-current={key === k ? 'page' : undefined}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[k === 'events' ? 'cal' : k === 'manage' ? 'grid' : k]}</svg>
      {label}
    </Link>
  );
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      <div className="side">{item('/', 'home', 'בית')}{item('/events', 'events', 'אירועים')}</div>
      {canEdit && (
        <Link href="/events/new" className="plus" aria-label="אירוע חדש">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
      )}
      <div className="side">{isAdmin && item('/manage', 'manage', 'ניהול')}{item('/me', 'me', 'פרופיל')}</div>
    </nav>
  );
}
