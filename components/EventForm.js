'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveEvent, clashes, savePreset, deletePreset, deleteEvent, calendarPayload, setGoogleEventId } from '@/app/actions';
import { cachedToken, goAuthorize, syncEvent } from '@/lib/gcal';
import SetBuilder from './SetBuilder';

const VENDOR_TYPES = ['התקנת מסך לד', 'הקמת במה', 'טראסים ותלייה', 'השכרת ציוד הגברה', 'השכרת ציוד תאורה', 'גנרטור וחשמלאי', 'צלם / וידאו', 'DJ חיצוני', 'טכנאי נוסף', 'סבלים', 'הובלה / משאית', 'פירוטכניקה', 'אחר'];

export default function EventForm({ initial, members, inventory: initialInventory, presets: initialPresets = [], isAdmin, myEmail }) {
  const [inventory, setInventory] = useState(initialInventory);
  const router = useRouter();
  const [f, setF] = useState(() => ({
    id: initial?.id, title: initial?.title || '', event_date: initial?.event_date || '', setup_time: initial?.setup_time?.slice(0, 5) || '',
    start_time: initial?.start_time?.slice(0, 5) || '', end_time: initial?.end_time?.slice(0, 5) || '', location: initial?.location || '',
    notes: initial?.notes || '', contact_name: initial?.contact_name || '', contact_phone: initial?.contact_phone || '',
    price: initial?.finance?.price ?? '', payment_status: initial?.finance?.payment_status || 'unpaid',
    client_name: initial?.finance?.client_name || '', client_phone: initial?.finance?.client_phone || '',
  }));
  const [crew, setCrew] = useState(() => new Set(initial?.crew || []));
  const [qty, setQty] = useState(() => Object.fromEntries((initial?.equipment || []).map((x) => [x.equipment_id, x.quantity])));
  const [vendors, setVendors] = useState(() => initial?.vendors || []);
  const [presets, setPresets] = useState(initialPresets);
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  const keepPreset = async () => {
    const by = new Map(inventory.map((i) => [i.id, i]));
    const items = Object.entries(qty).filter(([id, n]) => n > 0 && by.has(id)).map(([id, quantity]) => ({ category: by.get(id).category, name: by.get(id).name, quantity }));
    const res = await savePreset({ name: presetName, items, setup_time: f.setup_time, start_time: f.start_time, end_time: f.end_time, notes: f.notes });
    if (res.error) return setPresetMsg(res.error);
    setPresets((ps) => [...ps.filter((p) => p.id !== res.preset.id), res.preset].sort((a, b) => a.name.localeCompare(b.name, 'he')));
    setPresetName(''); setPresetMsg(`נשמר: ${res.preset.name}`);
  };
  const [clash, setClash] = useState({ staff: [], booked: [] });
  const [error, setError] = useState('');
  const [saving, start] = useTransition();
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const t = setTimeout(() => clashes(f).then(setClash).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [f.event_date, f.setup_time, f.start_time, f.end_time]); // eslint-disable-line

  const clashBy = useMemo(() => Object.fromEntries(clash.staff.map((c) => [c.user_id, c.event_title])), [clash]);
  const bookedBy = useMemo(() => Object.fromEntries(clash.booked.map((b) => [b.equipment_id, Number(b.booked)])), [clash]);
  const chosen = inventory.filter((i) => qty[i.id] > 0);
  const short = chosen.filter((i) => qty[i.id] + (bookedBy[i.id] || 0) > i.quantity);

  const toggle = (id) => setCrew((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bump = (id, d, max) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max ?? 999, (q[id] || 0) + d)) }));
  const vset = (i, k, v) => setVendors((vs) => vs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  // Save first, always. Then the calendar: straight away if Google access is still
  // fresh, otherwise a quick trip to Google that lands back on the event.
  const afterSave = async (id, fallback) => {
    const token = cachedToken();
    if (!token) return goAuthorize(myEmail, id);
    const synced = await syncEvent(token, id, { calendarPayload, setGoogleEventId });
    router.push(fallback || `/events/${id}?cal=${synced ? 1 : 0}`);
    router.refresh();
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    start(async () => {
      const res = await saveEvent({
        ...f, crew: [...crew],
        equipment: Object.entries(qty).map(([id, quantity]) => ({ id, quantity })),
        vendors,
      });
      if (res?.error && !res.id) return setError(res.error);
      await afterSave(res.id);
    });
  };

  const cancelEvent = () => {
    if (!f.id) return;
    start(async () => {
      const res = await deleteEvent(f.id);
      if (res?.error) return setError(res.error);
      await afterSave(f.id, '/events');
    });
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>שם האירוע<input required value={f.title} onChange={set('title')} placeholder="חתונה כהן" style={{ fontSize: 17 }} /></label>

      <SetBuilder inventory={inventory} qty={qty} setQty={setQty} bookedBy={bookedBy} canAdd
        onAdded={(row) => setInventory((inv) => [...inv, row])} />
      {short.length > 0 && <p className="small warn">חלק מהציוד תפוס באירוע אחר באותן שעות. אפשר להשלים מספק השכרה.</p>}
      {chosen.length > 0 && (
        <div className="row" style={{ gap: 8 }}>
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="שמור את הסט, למשל חתונה 300 איש" aria-label="שם לסט" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); keepPreset(); } }} />
          <button type="button" className="btn ghost" style={{ flexShrink: 0 }} onClick={keepPreset}>שמור סט</button>
        </div>
      )}
      {presetMsg && <p className="small" style={{ color: 'var(--green)' }} role="status">{presetMsg}</p>}


      <section className="glass card">
        <h2 style={{ fontSize: 16 }}>מתי ואיפה</h2>
        <label>תאריך<input type="date" required value={f.event_date} onChange={set('event_date')} /></label>
        <div className="grid3">
          <label>הקמה<input type="time" value={f.setup_time} onChange={set('setup_time')} /></label>
          <label>התחלה<input type="time" required value={f.start_time} onChange={set('start_time')} /></label>
          <label>סיום<input type="time" required value={f.end_time} onChange={set('end_time')} /></label>
        </div>
        <label>מיקום<input value={f.location} onChange={set('location')} placeholder="אולם, עיר" /></label>
        <div className="grid2">
          <label>איש קשר במקום<input value={f.contact_name} onChange={set('contact_name')} /></label>
          <label>טלפון<input type="tel" dir="ltr" value={f.contact_phone} onChange={set('contact_phone')} /></label>
        </div>
      </section>

      <section className="glass card">
        <h2 style={{ fontSize: 16 }}>צוות</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {members.map((m) => (
            <button type="button" key={m.id} aria-pressed={crew.has(m.id)} onClick={() => toggle(m.id)}
              className={`chip ${crew.has(m.id) ? 'on' : clashBy[m.id] ? 'clash' : ''}`}>
              {m.name}{crew.has(m.id) ? ' ✓' : ''}
            </button>
          ))}
        </div>
        {[...crew].filter((id) => clashBy[id]).map((id) => (
          <p key={id} className="small warn">{members.find((m) => m.id === id)?.name} כבר משובץ באותן שעות ל{clashBy[id]}</p>
        ))}
        {members.filter((m) => !crew.has(m.id) && clashBy[m.id]).length > 0 && <p className="small muted">באדום: תפוסים באותן שעות.</p>}
      </section>

      {isAdmin && (
        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>ספקים חיצוניים</h2>
          {vendors.map((v, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
              <div className="grid2">
                <label>סוג<select value={v.type} onChange={(e) => vset(i, 'type', e.target.value)}>{VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
                <label>שם<input value={v.name} onChange={(e) => vset(i, 'name', e.target.value)} /></label>
              </div>
              <div className="grid3">
                <label>מגיע ב<input type="time" value={v.arrival_time || ''} onChange={(e) => vset(i, 'arrival_time', e.target.value)} /></label>
                <label>עלות ₪<input inputMode="numeric" value={v.cost} onChange={(e) => vset(i, 'cost', e.target.value)} /></label>
                <label>מי משלם<select value={v.paid_by} onChange={(e) => vset(i, 'paid_by', e.target.value)}><option value="us">אנחנו</option><option value="client">הלקוח</option></select></label>
              </div>
              <div className="row">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input type="checkbox" style={{ width: 22, height: 22 }} checked={v.status === 'confirmed'} onChange={(e) => vset(i, 'status', e.target.checked ? 'confirmed' : 'pending')} />אישר הגעה</label>
                <button type="button" className="chip" onClick={() => setVendors((vs) => vs.filter((_, j) => j !== i))}>הסר</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => setVendors((vs) => [...vs, { type: VENDOR_TYPES[0], name: '', arrival_time: '', cost: '', paid_by: 'us', status: 'pending' }])}>+ הוסף ספק</button>
        </section>
      )}

      <label>הערות לצוות<textarea value={f.notes} onChange={set('notes')} placeholder="כניסה מהחניה האחורית" /></label>

      {isAdmin && (
        <section className="glass card">
          <div className="row"><h2 style={{ fontSize: 16 }}>כסף</h2><span className="small muted">רק אתה רואה</span></div>
          <div className="grid2">
            <label>סכום לגבייה ₪<input inputMode="numeric" value={f.price} onChange={set('price')} /></label>
            <label>מצב תשלום<select value={f.payment_status} onChange={set('payment_status')}><option value="unpaid">לא שולם</option><option value="deposit">מקדמה</option><option value="paid">שולם</option></select></label>
          </div>
          <div className="grid2">
            <label>שם הלקוח<input value={f.client_name} onChange={set('client_name')} /></label>
            <label>טלפון לקוח<input type="tel" dir="ltr" value={f.client_phone} onChange={set('client_phone')} /></label>
          </div>
        </section>
      )}

      {error && <p className="warn" role="alert">{error}</p>}
      {f.id && <button type="button" className="btn ghost" disabled={saving} onClick={cancelEvent} style={{ width: '100%', color: 'var(--red-text)' }}>בטל את האירוע</button>}
      <div style={{ height: 70 }} />
      <div className="sticky-bottom glass">
        <button className="btn full" disabled={saving}>{saving ? 'שומר…' : f.id ? 'שמור שינויים' : 'שמור ושלח לצוות'}</button>
      </div>
    </form>
  );
}
