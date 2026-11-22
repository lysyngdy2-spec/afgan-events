'use client';
import { useMemo, useState, useTransition } from 'react';
import { saveInventory } from '@/app/actions';

// One category at a time: tap "יש לי", set quantity, save.
export default function InventoryPicker({ catalog, owned }) {
  const [catId, setCatId] = useState(null);
  const [q, setQ] = useState('');
  const [counts, setCounts] = useState({});
  const [custom, setCustom] = useState('');
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState('');

  const ownedIn = (name) => owned.filter((o) => o.category === name);
  const cat = catalog.categories.find((c) => c.id === catId);
  const items = useMemo(() => {
    if (!cat) return [];
    const all = cat.groups ? cat.groups.flatMap((g) => g.items.map((i) => ({ name: i, group: g.name }))) : cat.items.map((i) => ({ name: i }));
    const extra = ownedIn(cat.name).filter((o) => !all.some((a) => a.name === o.name)).map((o) => ({ name: o.name, group: 'שלך' }));
    return [...extra, ...all];
  }, [catId]); // eslint-disable-line

  const open = (c) => {
    setCatId(c.id); setQ(''); setSaved('');
    setCounts(Object.fromEntries(ownedIn(c.name).map((o) => [o.name, o.quantity])));
  };
  const bump = (name, d) => setCounts((s) => ({ ...s, [name]: Math.max(0, (s[name] || 0) + d) }));
  const save = () => start(async () => {
    const touched = new Set([...Object.keys(counts), ...ownedIn(cat.name).map((o) => o.name)]);
    await saveInventory(cat.name, [...touched].map((name) => ({ name, quantity: counts[name] || 0 })));
    setSaved(cat.name); setCatId(null);
  });

  if (!cat) return (
    <>
      {saved && <p className="small" style={{ color: 'var(--green)' }} role="status">נשמר: {saved}</p>}
      <div className="grid2">
        {catalog.categories.map((c) => {
          const mine = ownedIn(c.name);
          const units = mine.reduce((t, o) => t + o.quantity, 0);
          const total = c.groups ? c.groups.reduce((t, g) => t + g.items.length, 0) : c.items.length;
          return (
            <button key={c.id} onClick={() => open(c)} className={mine.length ? 'glass-amber' : 'glass'}
              style={{ minHeight: 96, padding: 14, textAlign: 'start', color: 'var(--text)', font: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, borderRadius: 20 }}>
              <span style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</span>
              <span className="small" style={{ color: mine.length ? '#FFC75A' : 'var(--muted)' }}>{mine.length ? `${mine.length} סוגים · ${units} יח׳` : `${total} דגמים במאגר`}</span>
            </button>
          );
        })}
      </div>
    </>
  );

  const shown = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row"><button className="chip" onClick={() => setCatId(null)}>→ חזרה</button><h2 className="display" style={{ fontSize: 22 }}>{cat.name}</h2><span style={{ width: 60 }} /></div>
      <label>חיפוש דגם<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="למשל WING" /></label>
      <div className="glass" style={{ padding: '4px 16px', borderRadius: 20 }}>
        {shown.map((i) => (
          <div key={i.name} className="list-row">
            <div><bdi style={{ fontWeight: counts[i.name] ? 500 : 400 }}>{i.name}</bdi>{i.group && <div className="small muted">{i.group}</div>}</div>
            {counts[i.name] ? (
              <span className="stepper"><button aria-label="הוסף" onClick={() => bump(i.name, 1)}>+</button><b style={{ minWidth: 22, textAlign: 'center' }}>{counts[i.name]}</b><button aria-label="הפחת" onClick={() => bump(i.name, -1)}>−</button></span>
            ) : <button className="chip" onClick={() => bump(i.name, 1)}>יש לי</button>}
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="לא מצאת? כתוב דגם" aria-label="דגם חדש" />
        <button className="btn ghost" onClick={() => { if (custom.trim()) { bump(custom.trim(), 1); items.unshift({ name: custom.trim(), group: 'שלך' }); setCustom(''); } }}>הוסף</button>
      </div>
      <button className="btn full" disabled={saving} onClick={save}>{saving ? 'שומר…' : `שמור · ${Object.values(counts).reduce((t, n) => t + n, 0)} יח׳`}</button>
    </div>
  );
}
