import Link from 'next/link';
import Nav from '@/components/Nav';
import { requireAdmin } from '@/lib/session';
import { moneySummary, monthRange } from '@/lib/data';
import { addExpense, setPayment } from '@/app/actions';
import { shekel, shortDate, today } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Money({ searchParams }) {
  const me = await requireAdmin();
  const month = (await searchParams).m || today().slice(0, 7);
  const [from, to] = monthRange(month + '-01');
  const s = await moneySummary(me.supabase, from, to);
  const [y, m] = month.split('-').map(Number);
  const shift = (d) => { const dt = new Date(Date.UTC(y, m - 1 + d, 1)); return dt.toISOString().slice(0, 7); };
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const payLabel = { unpaid: 'לא שולם', deposit: 'מקדמה', paid: 'שולם' };

  return (
    <>
      <main className="page">
        <div className="row">
          <Link href={`/money?m=${shift(-1)}`} className="chip" style={{ display: 'flex', alignItems: 'center' }} aria-label="חודש קודם">→</Link>
          <h1 className="display" style={{ fontSize: 26 }}>{label}</h1>
          <Link href={`/money?m=${shift(1)}`} className="chip" style={{ display: 'flex', alignItems: 'center' }} aria-label="חודש הבא">←</Link>
        </div>

        <div className="grid2">
          {[['נכנס', s.income], ['פתוח לגבייה', s.open, true], ['תשלומי צוות', s.crewTotal], ['ספקים והוצאות', s.vendorTotal + s.otherExpenses]].map(([l, v, hi]) => (
            <div key={l} className="glass" style={{ padding: 14, borderRadius: 20 }}>
              <p className="small muted">{l}</p>
              <p className="display" style={{ fontSize: 22, color: hi ? 'var(--amber)' : undefined }}><bdi>{shekel(v)}</bdi></p>
            </div>
          ))}
        </div>
        <div className="glass-amber card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>רווח החודש</span>
          <span className="display" style={{ fontSize: 28 }}><bdi>{shekel(s.profit)}</bdi></span>
        </div>

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>אירועים</h2>
          {s.rows.length === 0 && <p className="small muted">אין אירועים בחודש הזה.</p>}
          {s.rows.map((r) => (
            <div key={r.id} className="list-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flexGrow: 1 }}>
                <Link href={`/events/${r.id}`} style={{ color: 'var(--text)', fontWeight: 500 }}>{r.title}</Link>
                <div className="small muted">{shortDate(r.event_date)} · גבייה <bdi>{shekel(r.price)}</bdi> · עלויות <bdi>{shekel(r.crewCost + r.vendorCost)}</bdi></div>
                <div className="small" style={{ color: 'var(--amber)' }}>רווח <bdi>{shekel(r.profit)}</bdi></div>
              </div>
              <form style={{ display: 'flex', gap: 4 }}>
                {['unpaid', 'deposit', 'paid'].map((p) => (
                  <button key={p} formAction={setPayment.bind(null, r.id, p)} className={`chip ${r.paymentStatus === p ? 'on' : ''}`} style={{ height: 36, padding: '0 10px', fontSize: 13 }}>{payLabel[p]}</button>
                ))}
              </form>
            </div>
          ))}
        </section>

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>תשלומים לעובדים</h2>
          {Object.keys(s.perWorker).length === 0 && <p className="small muted">אין עדיין.</p>}
          {Object.entries(s.perWorker).map(([name, v]) => <div key={name} className="list-row"><span>{name}</span><b><bdi>{shekel(v)}</bdi></b></div>)}
          <p className="small muted">לפי התעריף שהוגדר לכל עובד במסך הצוות.</p>
        </section>

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>הוצאות נוספות</h2>
          {s.expenses.map((x, i) => <div key={i} className="list-row"><span>{x.description} <span className="small muted">{shortDate(x.spent_on)}</span></span><bdi>{shekel(x.amount)}</bdi></div>)}
          <form action={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="grid2">
              <label>על מה<input name="description" required placeholder="דלק, תיקון כבל" /></label>
              <label>סכום ₪<input name="amount" inputMode="numeric" required /></label>
            </div>
            <label>תאריך<input name="spent_on" type="date" defaultValue={today()} /></label>
            <button className="btn ghost">הוסף הוצאה</button>
          </form>
        </section>
      </main>
      <Nav active="money" isAdmin canEdit />
    </>
  );
}
