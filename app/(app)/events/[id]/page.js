import Link from 'next/link';
import { notFound } from 'next/navigation';
import AnswerButtons from '@/components/AnswerButtons';
import { getMe } from '@/lib/session';
import { hm, shekel, dayName, shortDate, daysUntil, wazeUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params, searchParams }) {
  const { id } = await params;
  const cal = (await searchParams).cal;
  const me = await getMe();
  const { data: e } = await me.supabase.from('events')
    .select('*, event_staff(user_id, status, profiles(name, phone)), event_equipment(quantity, equipment(name, category))')
    .eq('id', id).maybeSingle();
  if (!e) notFound();
  const { data: vendors } = await me.supabase.rpc('event_vendor_info', { eid: id });
  const fin = me.isAdmin ? (await me.supabase.from('event_finance').select('*').eq('event_id', id).maybeSingle()).data : null;
  const mine = e.event_staff.find((s) => s.user_id === me.user.id);
  const byCat = {};
  for (const x of e.event_equipment) (byCat[x.equipment.category] ||= []).push(x);
  const statusLabel = { confirmed: ['אישר', 'var(--green)'], pending: ['ממתין', 'var(--amber)'], declined: ['לא יכול', 'var(--red-text)'] };

  return (
    <>
      <main className="page">
        {cal === '1' && <p className="glass pop" role="status" style={{ padding: '12px 16px', borderRadius: 16, color: 'var(--green)' }}>✓ נשמר ונשלח ליומן גוגל של הצוות</p>}
        {cal === '0' && <p className="glass pop" role="status" style={{ padding: '12px 16px', borderRadius: 16, color: 'var(--amber)' }}>נשמר. ליומן גוגל זה לא נשלח כי לא אושרה הגישה ליומן. בשמירה הבאה אפשר לאשר.</p>}
        <div className="row">
          <Link href="/events" className="small">→ כל האירועים</Link>
          {me.canEdit && <Link href={`/events/${id}/edit`} className="btn ghost" style={{ height: 44 }}>עריכה</Link>}
        </div>

        <div className="glass-amber card" style={{ padding: 20, gap: 12 }}>
          <div className="row">
            <span className="display" style={{ fontSize: 30, color: 'var(--amber)', lineHeight: 1 }}>{daysUntil(e.event_date)}</span>
            <span className="small" style={{ color: '#E8DCC4' }}>{dayName(e.event_date)} {shortDate(e.event_date)}</span>
          </div>
          <h1 style={{ fontSize: 24 }}>{e.title}{e.status === 'cancelled' ? ' (בוטל)' : ''}</h1>
          <div className="grid3">
            {[['הקמה', e.setup_time], ['התחלה', e.start_time], ['סיום', e.end_time]].map(([l, t]) => (
              <div key={l} style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 14, padding: '10px 12px' }}>
                <div className="small" style={{ color: '#E8DCC4' }}>{l}</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}><bdi>{hm(t) || '—'}</bdi></div>
              </div>
            ))}
          </div>
          {e.location && <a className="btn" href={wazeUrl(e.location)} target="_blank" rel="noreferrer">נווט בוויז · {e.location}</a>}
        </div>

        {mine && <AnswerButtons eventId={id} status={mine.status} />}

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>צוות</h2>
          {e.event_staff.length === 0 && <p className="muted small">עוד לא שובץ אף אחד.</p>}
          {e.event_staff.map((s) => (
            <div key={s.user_id} className="list-row">
              <span>{s.profiles?.name}{s.user_id === me.user.id ? ' (אתה)' : ''}</span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="small" style={{ color: statusLabel[s.status][1] }}>{statusLabel[s.status][0]}</span>
                {s.profiles?.phone && <a href={`tel:${s.profiles.phone}`} aria-label={`התקשר ל${s.profiles.name}`} style={{ padding: 8 }}>חייג</a>}
              </span>
            </div>
          ))}
        </section>

        {vendors?.length > 0 && (
          <section className="glass card">
            <h2 style={{ fontSize: 16 }}>ספקים חיצוניים</h2>
            {vendors.map((v, i) => (
              <div key={i} className="list-row"><span>{v.type} · {v.name}</span><span className="small muted">{v.arrival_time ? <>מגיע <bdi>{hm(v.arrival_time)}</bdi></> : ''}</span></div>
            ))}
          </section>
        )}

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>מפרט ציוד</h2>
          {e.event_equipment.length === 0 && <p className="muted small">לא הוגדר מפרט.</p>}
          {Object.entries(byCat).map(([cat, items]) => (
            <div key={cat}>
              <p className="small muted" style={{ fontWeight: 500, marginTop: 6 }}>{cat}</p>
              {items.map((x) => <div key={x.equipment.name} className="list-row"><bdi>{x.equipment.name}</bdi><span className="qty">{x.quantity}</span></div>)}
            </div>
          ))}
        </section>

        {(e.notes || e.contact_name) && (
          <section className="glass card">
            <h2 style={{ fontSize: 16 }}>הערות</h2>
            {e.notes && <p style={{ whiteSpace: 'pre-line' }}>{e.notes}</p>}
            {e.contact_name && <p className="small">איש קשר במקום: {e.contact_name} {e.contact_phone && <a href={`tel:${e.contact_phone}`}><bdi>{e.contact_phone}</bdi></a>}</p>}
          </section>
        )}

        {fin && (
          <section className="glass card">
            <div className="row"><h2 style={{ fontSize: 16 }}>כסף</h2><span className="small muted">רק אתה רואה</span></div>
            <div className="list-row"><span>סכום לגבייה</span><b><bdi>{shekel(fin.price)}</bdi></b></div>
            <div className="list-row"><span>מצב תשלום</span><span>{{ unpaid: 'לא שולם', deposit: 'מקדמה', paid: 'שולם' }[fin.payment_status]}</span></div>
            {fin.client_name && <div className="list-row"><span>לקוח</span><span>{fin.client_name} {fin.client_phone && <a href={`tel:${fin.client_phone}`}><bdi>{fin.client_phone}</bdi></a>}</span></div>}
          </section>
        )}
      </main>
    </>
  );
}
