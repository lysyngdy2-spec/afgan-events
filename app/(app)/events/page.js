import Link from 'next/link';
import { getMe } from '@/lib/session';
import { hm, shortDate, dayName, today } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Events({ searchParams }) {
  const me = await getMe();
  const past = (await searchParams).past === '1';
  let q = me.supabase.from('events').select('id, title, event_date, setup_time, start_time, end_time, location, status, event_staff(user_id, status)');
  q = past ? q.lt('event_date', today()).order('event_date', { ascending: false }) : q.gte('event_date', today()).order('event_date');
  const { data: events } = await q.limit(200);

  const byMonth = {};
  for (const e of events || []) {
    const k = new Date(e.event_date + 'T12:00:00').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    (byMonth[k] ||= []).push(e);
  }
  return (
    <>
      <main className="page">
        <div className="row">
          <h1 className="display" style={{ fontSize: 30 }}>אירועים</h1>
          <span style={{ display: 'flex', gap: 8 }}>
            <Link href={past ? '/events' : '/events?past=1'} className="btn ghost" style={{ height: 40, padding: '0 14px', fontSize: 14 }}>{past ? 'קרובים' : 'שעברו'}</Link>
            
          </span>
        </div>
        {me.canEdit && <Link href="/events/new" className="btn cta-big" data-cta="primary"><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>אירוע חדש</Link>}
        {Object.keys(byMonth).length === 0 && <p className="muted">אין אירועים להצגה.</p>}
        {Object.entries(byMonth).map(([month, list]) => (
          <section key={month} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 16 }} className="muted">{month}</h2>
            <div className="glass" style={{ padding: '4px 16px', borderRadius: 20 }}>
              {list.map((e) => {
                const crew = e.event_staff.filter((s) => s.status !== 'declined').length;
                const mine = e.event_staff.find((s) => s.user_id === me.user.id);
                return (
                  <Link key={e.id} href={`/events/${e.id}`} className="list-row" style={{ color: 'var(--text)', opacity: e.status === 'cancelled' ? 0.5 : 1 }}>
                    <div style={{ width: 44, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{e.event_date.slice(8)}</div>
                      <div className="small muted">{dayName(e.event_date).replace('יום ', '')}</div>
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 500 }}>{e.title}{e.status === 'cancelled' ? ' (בוטל)' : ''}</div>
                      <div className="small muted"><bdi>{hm(e.start_time)}–{hm(e.end_time)}</bdi>{e.location ? ` · ${e.location}` : ''}</div>
                    </div>
                    {me.canEdit ? <span className="badge" style={{ color: crew ? undefined : 'var(--red-text)' }}>{crew ? `${crew} בצוות` : 'בלי צוות'}</span>
                      : mine?.status === 'pending' ? <span className="badge" style={{ color: 'var(--amber)' }}>ממתין לך</span> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
