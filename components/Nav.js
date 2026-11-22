import Link from 'next/link';

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cal: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  box: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  team: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" /></>,
  money: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};
const Icon = ({ name }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>
);

export default function Nav({ active, isAdmin, canEdit }) {
  const item = (href, key, label, icon) => (
    <Link href={href} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined}>
      <Icon name={icon} />{label}
    </Link>
  );
  return (
    <nav className="nav glass" aria-label="ניווט ראשי">
      {item('/', 'home', 'בית', 'home')}
      {item('/events', 'events', 'אירועים', 'cal')}
      {canEdit && (
        <Link href="/events/new" className="plus" aria-label="אירוע חדש">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
      )}
      {isAdmin ? item('/inventory', 'inventory', 'ציוד', 'box') : item('/me', 'me', 'פרופיל', 'me')}
      {isAdmin ? item('/money', 'money', 'כספים', 'money') : null}
      {isAdmin ? item('/team', 'team', 'צוות', 'team') : null}
    </nav>
  );
}
