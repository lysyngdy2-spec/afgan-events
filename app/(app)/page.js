import Link from 'next/link';
import AnswerButtons from '@/components/AnswerButtons';
import { getMe } from '@/lib/session';
import { upcomingEvents, moneySummary, monthRange } from '@/lib/data';
import { hm, shekel, dayName, shortDate, daysUntil, wazeUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';

function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jerusalem' }));
  return h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}

export default async function Home() {
  const me = await getMe();
  const events = await upcomingEvents(me.supabase);
  const mine = me.canEdit ? events : events.filter((e) => e.event_staff.some((s) => s.user_id === me.user.id));
  const myStatus = (e) => e.event_staff.find((s) => s.user_id === me.user.id)?.status;
  const next = me.canEdit ? events[0] : mine.find((e) => myStatus(e) !== 'declined');
  const firstName = me.profile.name.split(' ')[0];

  let money = null;
  if (me.isAdmin) money = await moneySummary(me.supabase, ...monthRange());

  const alerts = [];
  if (me.canEdit) {
    for (const e of events.slice(0, 20)) {
      const crew = e.event_staff.filter((s) => s.status !== 'declined');
      if (!crew.length) alerts.push({ color: 'var(--red)', text: `${e.title} עדיין בלי צוות`, sub: `${shortDate(e.event_date)} · ${daysUntil(e.event_date)}`, href: `/events/${e.id}/edit`, cta: 'שבץ' });
      for (const s of e.event_staff.filter((s) => s.status === 'declined')) alerts.push({ color: 'var(--red)', text: `${s.profiles?.name} לא יכול להגיע ל${e.title}`, sub: shortDate(e.event_date), href: `/events/${e.id}/edit`, cta: 'החלף' });
      for (const s of e.event_staff.filter((s) => s.status === 'pending')) alerts.push({ color: 'var(--amber)', text: `${s.profiles?.name} עוד לא אישר את ${e.title}`, sub: shortDate(e.event_date), href: `/events/${e.id}`, cta: 'פתח' });
    }
  }
  const pendingMine = me.canEdit ? [] : mine.filter((e) => myStatus(e) === 'pending');

  return (
    <>
      <main className="page">
        <div className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p className="muted small">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })}</p>
            <h1 className="display" style={{ fontSize: 32, lineHeight: 1.15 }}>{greeting()}, {firstName}</h1>
          </div>
          <img src="/icons/logo-white.png" alt="Afgan Sound & Light" width="54" height="54" />
        </div>

        {next ? (
          <Link href={`/events/${next.id}`} className="glass-amber card pop" style={{ padding: 20, gap: 12, color: 'var(--text)' }}>
            <div className="row">
              <span className="display" style={{ fontSize: 34, color: 'var(--amber)', lineHeight: 1 }}>{daysUntil(next.event_date)}</span>
              <span className="small" style={{ color: '#E8DCC4' }}>{dayName(next.event_date)} {shortDate(next.event_date)}</span>
            </div>
            <h2 style={{ fontSize: 22 }}>{next.title}{next.location ? ` · ${next.location}` : ''}</h2>
            <div className="grid2">
              <div style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 14, padding: '10px 12px' }}>
                <div className="small" style={{ color: '#E8DCC4' }}>להגיע ב</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}><bdi>{hm(next.setup_time || next.start_time)}</bdi></div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 14, padding: '10px 12px' }}>
                <div className="small" style={{ color: '#E8DCC4' }}>אירוע</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}><bdi>{hm(next.start_time)}–{hm(next.end_time)}</bdi></div>
              </div>
            </div>
            <p className="small" style={{ color: '#EDE6D8' }}>
              צוות: {next.event_staff.filter((s) => s.status !== 'declined').map((s) => s.profiles?.name).join(', ') || 'עוד לא שובץ'}
            </p>
          </Link>
        ) : (
          <div className="glass card"><p className="muted">אין אירועים קרובים.</p>{me.canEdit && <Link className="btn" href="/events/new">קבע אירוע ראשון</Link>}</div>
        )}

        {next && !me.canEdit && next.location && (
          <a className="btn" href={wazeUrl(next.location)} target="_blank" rel="noreferrer">נווט בוויז ל{next.location}</a>
        )}

        <Link href="/me" className="glass tap row" style={{ padding: '14px 16px', borderRadius: 20, color: 'var(--text)' }}>
          <span><b style={{ fontWeight: 500 }}>האירועים ביומן הטלפון</b><br /><span className="small muted">חיבור חד פעמי לגוגל או אפל קלנדר</span></span>
          <span style={{ color: 'var(--amber)', fontWeight: 500 }}>חבר</span>
        </Link>

        {pendingMine.map((e) => (
          <div key={e.id} className="glass card">
            <p className="small" style={{ color: 'var(--amber)', fontWeight: 500 }}>שיבוץ חדש</p>
            <Link href={`/events/${e.id}`} style={{ color: 'var(--text)', fontSize: 16, fontWeight: 500 }}>
              {e.title} · {dayName(e.event_date)} {shortDate(e.event_date)} · הקמה <bdi>{hm(e.setup_time || e.start_time)}</bdi>
            </Link>
            <AnswerButtons eventId={e.id} status="pending" />
          </div>
        ))}

        {alerts.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>דורש טיפול</h2>
            {alerts.slice(0, 6).map((a, i) => (
              <div key={i} className="glass" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', borderRadius: 20 }}>
                <span className="dot" style={{ background: a.color }} />
                <div style={{ flexGrow: 1 }}><p style={{ fontSize: 15, fontWeight: 500 }}>{a.text}</p><p className="small muted">{a.sub}</p></div>
                <Link href={a.href} style={{ fontSize: 14, fontWeight: 500, padding: '12px 4px' }}>{a.cta}</Link>
              </div>
            ))}
          </section>
        )}

        {money && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row"><h2 style={{ fontSize: 17 }}>החודש במספרים</h2><Link href="/money" className="small">לכל הכספים</Link></div>
            <div className="grid3">
              {[['נכנס', money.income], ['פתוח לגבייה', money.open, true], ['רווח', money.profit]].map(([l, v, hi]) => (
                <div key={l} className="glass" style={{ padding: '14px 12px', borderRadius: 20 }}>
                  <p className="small muted">{l}</p>
                  <p className="display" style={{ fontSize: 21, color: hi ? 'var(--amber)' : undefined }}><bdi>{shekel(v)}</bdi></p>
                </div>
              ))}
            </div>
            <p className="small muted">{money.rows.length} אירועים החודש</p>
          </section>
        )}

        {mine.length > 1 && (
          <section className="glass" style={{ padding: '6px 16px', borderRadius: 20 }}>
            {mine.slice(next ? 1 : 0, 8).map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="list-row" style={{ color: 'var(--text)' }}>
                <div style={{ width: 44, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{e.event_date.slice(8)}</div>
                  <div className="small muted">{new Date(e.event_date + 'T12:00:00').toLocaleDateString('he-IL', { month: 'short' })}</div>
                </div>
                <div style={{ flexGrow: 1 }}><div style={{ fontWeight: 500 }}>{e.title}</div><div className="small muted">הקמה <bdi>{hm(e.setup_time || e.start_time)}</bdi>{e.location ? ` · ${e.location}` : ''}</div></div>
                {!me.canEdit && myStatus(e) === 'confirmed' && <span className="small" style={{ color: 'var(--green)' }}>אישרת</span>}
              </Link>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
