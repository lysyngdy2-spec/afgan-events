import Link from 'next/link';
import AnswerButtons from '@/components/AnswerButtons';
import { hm, shekel, dayName, shortDate, dayCount, initial, wazeUrl } from '@/lib/format';

const Plus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const ListIco = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>;
const CalIco = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;

// The big number: how far away the next event is. Today and tomorrow read as words.
function Countdown({ date }) {
  const n = dayCount(date);
  if (n <= 0) return <p className="big">היום</p>;
  if (n === 1) return <p className="big">מחר</p>;
  return <p className="big"><bdi>{n}</bdi><small>ימים</small></p>;
}

function Crew({ staff }) {
  const crew = staff.filter((s) => s.status !== 'declined');
  if (!crew.length) return <span className="small" style={{ color: 'var(--red-text)' }}>בלי צוות</span>;
  const shown = crew.slice(0, 3);
  return (
    <span className="stack" aria-label={`צוות: ${crew.map((s) => s.profiles?.name).join(', ')}`}>
      {shown.map((s, i) => <span key={s.user_id} className={`avatar c${i}`} aria-hidden="true">{initial(s.profiles?.name)}</span>)}
      {crew.length > 3 && <span className="avatar more" aria-hidden="true">+{crew.length - 3}</span>}
    </span>
  );
}

const statusDot = (e, me) => {
  if (me.canEdit) {
    const crew = e.event_staff.filter((s) => s.status !== 'declined');
    if (!crew.length) return 'var(--red)';
    return crew.some((s) => s.status === 'pending') ? 'var(--amber)' : 'var(--mint)';
  }
  const st = e.event_staff.find((s) => s.user_id === me.user.id)?.status;
  return st === 'confirmed' ? 'var(--mint)' : st === 'pending' ? 'var(--amber)' : '#C9CCC9';
};

export default function HomeView({ me, events, money, now = new Date() }) {
  const mine = me.canEdit ? events : events.filter((e) => e.event_staff.some((s) => s.user_id === me.user.id));
  const myStatus = (e) => e.event_staff.find((s) => s.user_id === me.user.id)?.status;
  const next = me.canEdit ? events[0] : mine.find((e) => myStatus(e) !== 'declined');
  const firstName = me.profile.name.split(' ')[0];
  const dateLine = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' });

  const alerts = [];
  if (me.canEdit) {
    for (const e of events.slice(0, 20)) {
      const crew = e.event_staff.filter((s) => s.status !== 'declined');
      if (!crew.length) alerts.push({ dot: 'var(--red)', who: '!', text: `${e.title} עדיין בלי צוות`, sub: `${dayName(e.event_date)} ${shortDate(e.event_date)}`, href: `/events/${e.id}/edit`, cta: 'שבץ' });
      for (const s of e.event_staff.filter((s) => s.status === 'declined')) alerts.push({ dot: 'var(--red)', who: initial(s.profiles?.name), text: `${s.profiles?.name} לא יכול להגיע`, sub: `${e.title} · ${shortDate(e.event_date)}`, href: `/events/${e.id}/edit`, cta: 'החלף' });
      for (const s of e.event_staff.filter((s) => s.status === 'pending')) alerts.push({ dot: 'var(--amber)', who: initial(s.profiles?.name), text: `${s.profiles?.name} עוד לא אישר`, sub: `${e.title} · ${shortDate(e.event_date)}`, href: `/events/${e.id}`, cta: 'פתח' });
    }
  }
  const pendingMine = me.canEdit ? [] : mine.filter((e) => myStatus(e) === 'pending');
  const rest = mine.filter((e) => e !== next).slice(0, 8);

  return (
    <main className="page home">
      <section className="hero" aria-label="האירוע הבא">
        <div className="hero-top">
          <span className="avatar me" aria-hidden="true">{initial(firstName)}</span>
          <img src="/icons/logo-white.png" alt="Afgan Sound & Light" width="44" height="44" />
        </div>
        <span className="stripe" aria-hidden="true"><span /><span /><span /></span>

        <div className="hero-copy">
          <p className="hero-label">שלום {firstName} · {dateLine}</p>
          {next ? (
            <>
              <p className="hero-label" style={{ marginTop: 10 }}>האירוע הבא</p>
              <Countdown date={next.event_date} />
              <h1 className="hero-sub">{next.title}{next.location ? ` · ${next.location}` : ''}</h1>
            </>
          ) : (
            <h1 className="big" style={{ fontSize: 44 }}>אין אירועים קרובים</h1>
          )}
        </div>

        <div className="pills">
          {me.canEdit && <Link className="btn" href="/events/new"><span className="ico"><Plus /></span>אירוע חדש</Link>}
          {next && !me.canEdit && next.location && <a className="btn" href={wazeUrl(next.location)} target="_blank" rel="noreferrer">נווט בוויז</a>}
          {next && <Link className="btn ghost" href={`/events/${next.id}`}>פרטים</Link>}
        </div>

        {next && (
          <Link href={`/events/${next.id}`} className="summary" aria-label={`${next.title}: להגיע ב-${hm(next.setup_time || next.start_time)}`}>
            <span style={{ display: 'flex', gap: 22 }}>
              <span><span className="k">להגיע ב</span><br /><b className="v"><bdi>{hm(next.setup_time || next.start_time)}</bdi></b></span>
              <span><span className="k">{dayName(next.event_date)}</span><br /><b className="v r"><bdi>{hm(next.start_time)}–{hm(next.end_time)}</bdi></b></span>
            </span>
            <Crew staff={next.event_staff} />
          </Link>
        )}

        {pendingMine.map((e) => (
          <div key={e.id} className="glass-amber card">
            <p className="small" style={{ color: 'var(--amber)', fontWeight: 500 }}>שובצת לאירוע חדש</p>
            <Link href={`/events/${e.id}`} style={{ color: 'var(--text)', fontSize: 17, fontWeight: 500 }}>
              {e.title} · {dayName(e.event_date)} {shortDate(e.event_date)} · הקמה <bdi>{hm(e.setup_time || e.start_time)}</bdi>
            </Link>
            <AnswerButtons eventId={e.id} status="pending" />
          </div>
        ))}
      </section>

      <section className="sheet" aria-label="הלו״ז">
        <div className="handle" aria-hidden="true" />
        <div className="sheet-head">
          <Link href="/events" className="icon-btn" aria-label="כל האירועים"><ListIco /></Link>
          <h2>הלו״ז</h2>
          <Link href="/me" className="icon-btn" aria-label="חיבור ליומן בטלפון"><CalIco /></Link>
        </div>

        {money && (
          <>
            <h3>החודש</h3>
            <Link href="/money" className="stats" aria-label="לכל הכספים">
              <div><p>נכנס</p><b><bdi>{shekel(money.income)}</bdi></b></div>
              <div><p>פתוח לגבייה</p><b><bdi>{shekel(money.open)}</bdi></b></div>
              <div><p>רווח</p><b style={{ color: money.profit >= 0 ? 'var(--ink-pos)' : 'var(--ink-neg)' }}><bdi>{shekel(money.profit)}</bdi></b></div>
            </Link>
          </>
        )}

        {alerts.length > 0 && (
          <>
            <h3>דורש טיפול</h3>
            {alerts.slice(0, 6).map((a, i) => (
              <div key={i} className="srow">
                <span className="avatar" aria-hidden="true">{a.who}<span className="st" style={{ background: a.dot }} /></span>
                <span className="t"><b>{a.text}</b><span>{a.sub}</span></span>
                <Link href={a.href} className="cta">{a.cta}</Link>
              </div>
            ))}
          </>
        )}

        <h3>בהמשך</h3>
        {rest.length === 0 && <p className="empty">אין עוד אירועים בלו״ז.</p>}
        {rest.map((e) => {
          const st = myStatus(e);
          return (
            <Link key={e.id} href={`/events/${e.id}`} className="srow">
              <span className="avatar" aria-hidden="true">{Number(e.event_date.slice(8))}<span className="st" style={{ background: statusDot(e, me) }} /></span>
              <span className="t"><b>{e.title}</b><span>{dayName(e.event_date)} {shortDate(e.event_date)}{e.location ? ` · ${e.location}` : ''}</span></span>
              <span className="end" style={{ color: !me.canEdit && st === 'confirmed' ? 'var(--ink-pos)' : undefined }}>
                {!me.canEdit && st === 'confirmed' ? 'אישרת' : <bdi>{hm(e.setup_time || e.start_time)}</bdi>}
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
