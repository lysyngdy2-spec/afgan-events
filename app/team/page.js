import Nav from '@/components/Nav';
import { requireAdmin } from '@/lib/session';
import { saveMember, setMemberActive } from '@/app/actions';
import { shekel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Team() {
  const me = await requireAdmin();
  const [{ data: members }, { data: rates }, { data: profiles }] = await Promise.all([
    me.supabase.from('members').select('*').order('active', { ascending: false }).order('name'),
    me.supabase.from('rates').select('*'),
    me.supabase.from('profiles').select('email'),
  ]);
  const rateBy = Object.fromEntries((rates || []).map((r) => [r.email, r]));
  const joined = new Set((profiles || []).map((p) => p.email));
  return (
    <>
      <main className="page">
        <h1 className="display" style={{ fontSize: 30 }}>הצוות</h1>
        <section className="glass" style={{ padding: '4px 16px', borderRadius: 20 }}>
          {(members || []).map((m) => {
            const r = rateBy[m.email];
            return (
              <details key={m.email} className="list-row" style={{ display: 'block', opacity: m.active ? 1 : 0.5 }}>
                <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', listStyle: 'none', minHeight: 44 }}>
                  <span><b style={{ fontWeight: 500 }}>{m.name}</b> <span className="small muted">{m.role === 'admin' ? 'מנהל' : m.can_edit_events ? 'עובד + עורך אירועים' : 'עובד'}</span></span>
                  <span className="small muted">{r ? `${shekel(r.amount)} ל${r.rate_type === 'hour' ? 'שעה' : 'יום'}` : ''} {joined.has(m.email) ? '' : '· עוד לא נכנס'}</span>
                </summary>
                <MemberForm m={m} r={r} />
                {m.email !== me.profile.email && (
                  <form action={setMemberActive.bind(null, m.email, !m.active)} style={{ marginTop: 8 }}>
                    <button className="btn ghost" style={{ width: '100%', height: 44 }}>{m.active ? 'השבת גישה' : 'החזר גישה'}</button>
                  </form>
                )}
              </details>
            );
          })}
        </section>
        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>הוספת איש צוות</h2>
          <p className="small muted">אחרי השמירה, שלח לו את הקישור לאפליקציה. הוא נכנס עם הג׳ימייל שרשמת כאן.</p>
          <MemberForm />
        </section>
      </main>
      <Nav active="team" isAdmin canEdit />
    </>
  );
}

function MemberForm({ m, r }) {
  return (
    <form action={saveMember} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
      <div className="grid2">
        <label>שם<input name="name" required defaultValue={m?.name} /></label>
        <label>ג׳ימייל<input name="email" type="email" dir="ltr" required defaultValue={m?.email} readOnly={!!m} /></label>
      </div>
      <div className="grid3">
        <label>תפקיד<select name="role" defaultValue={m?.role || 'worker'}><option value="worker">עובד</option><option value="admin">מנהל</option></select></label>
        <label>תעריף<select name="rate_type" defaultValue={r?.rate_type || 'day'}><option value="day">יומי</option><option value="hour">שעתי</option></select></label>
        <label>סכום ₪<input name="rate" inputMode="numeric" defaultValue={r?.amount ?? ''} /></label>
      </div>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
        <input type="checkbox" name="can_edit" defaultChecked={m?.can_edit_events} style={{ width: 22, height: 22 }} />יכול ליצור ולערוך אירועים (בלי לראות כסף)
      </label>
      <button className="btn">{m ? 'שמור' : 'הוסף לצוות'}</button>
    </form>
  );
}
