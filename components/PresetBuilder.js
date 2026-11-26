'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { savePreset, deletePreset } from '@/app/actions';
import PresetIcon, { PRESET_ICONS } from './PresetIcon';

const key = (x) => `${x.category}|${x.name}`;

// Build a template by tapping: name it, pick an icon, add gear category by category
// with + / −, optionally set the usual hours and notes. No typing beyond the name.
export default function PresetBuilder({ catalog, inventory, preset, then }) {
  const router = useRouter();
  const [name, setName] = useState(preset?.name || '');
  const [icon, setIcon] = useState(preset?.icon || 'sound');
  const [qty, setQty] = useState(() => Object.fromEntries((preset?.items || []).map((x) => [key(x), x.quantity])));
  const [times, setTimes] = useState({ setup_time: preset?.setup_time?.slice(0, 5) || '', start_time: preset?.start_time?.slice(0, 5) || '', end_time: preset?.end_time?.slice(0, 5) || '' });
  const [notes, setNotes] = useState(preset?.notes || '');
  const [cat, setCat] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [saving, start] = useTransition();

  const owned = useMemo(() => new Map(inventory.map((i) => [key(i), i.quantity])), [inventory]);
  // Every model we know: the catalog plus anything in the warehouse that isn't in it.
  const models = useMemo(() => {
    const all = [];
    for (const c of catalog.categories) {
      const list = c.groups ? c.groups.flatMap((g) => g.items.map((n) => ({ category: c.name, name: n, group: g.name }))) : (c.items || []).map((n) => ({ category: c.name, name: n }));
      all.push(...list);
    }
    const known = new Set(all.map(key));
    for (const i of inventory) if (!known.has(key(i))) all.push({ category: i.category, name: i.name, group: 'שלך' });
    return all;
  }, [catalog, inventory]);
  const cats = catalog.categories.map((c) => c.name);
  const chosen = models.filter((m) => qty[key(m)] > 0);
  const units = chosen.reduce((t, m) => t + qty[key(m)], 0);
  const countIn = (c) => chosen.filter((m) => m.category === c).length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Typing searches every category; otherwise show the open category.
    let list = needle ? models : models.filter((m) => m.category === cat);
    if (needle) list = list.filter((m) => m.name.toLowerCase().includes(needle));
    // Warehouse first, then the rest of the catalog.
    return list.sort((a, b) => (owned.has(key(b)) - owned.has(key(a)))).slice(0, 80);
  }, [models, cat, q, owned]);

  const bump = (m, d) => setQty((s) => ({ ...s, [key(m)]: Math.max(0, Math.min(999, (s[key(m)] || 0) + d)) }));
  const save = () => start(async () => {
    setErr('');
    const res = await savePreset({ id: preset?.id, name, icon, notes, ...times, items: chosen.map((m) => ({ category: m.category, name: m.name, quantity: qty[key(m)] })) });
    if (res.error) return setErr(res.error);
    router.push(then || '/presets');
    router.refresh();
  });
  const remove = () => start(async () => {
    const res = await deletePreset(preset.id);
    if (res.error) return setErr(res.error);
    router.push('/presets');
    router.refresh();
  });

  return (
    <div className="builder">
      <label className="name-field">
        <span>שם התבנית</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: חתונה 300 איש" maxLength={60} autoFocus={!preset} />
      </label>

      <div className="icon-pick" role="radiogroup" aria-label="סמל">
        {PRESET_ICONS.map((i) => (
          <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} className={icon === i ? 'on' : ''} onClick={() => setIcon(i)}>
            <PresetIcon name={i} />
          </button>
        ))}
      </div>

      <section className="panel" aria-label="הציוד בתבנית">
        <div className="row"><h2>הציוד בתבנית</h2><span className="count">{chosen.length ? `${chosen.length} פריטים · ${units} יח׳` : 'עוד ריק'}</span></div>
        {chosen.length === 0 && <p className="muted small">בוחרים קטגוריה למטה ומוסיפים בלחיצה.</p>}
        {chosen.map((m) => (
          <div key={key(m)} className="line pop">
            <span className="t"><bdi>{m.name}</bdi><span className="small muted">{m.category}</span></span>
            <Stepper value={qty[key(m)]} onPlus={() => bump(m, 1)} onMinus={() => bump(m, -1)} />
          </div>
        ))}
      </section>

      <section className="panel" aria-label="הוספת ציוד">
        <h2>הוספת ציוד</h2>
        <div className="cat-scroll">
          {cats.map((c) => (
            <button key={c} type="button" className={`chip${cat === c ? ' on' : ''}`} onClick={() => { setCat(cat === c ? null : c); setQ(''); }}>
              {c}{countIn(c) ? ` · ${countIn(c)}` : ''}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={cat ? `חיפוש ב${cat}` : 'או חפש דגם, למשל WING'} aria-label="חיפוש דגם" />
        {shown.map((m) => {
          const n = qty[key(m)] || 0;
          const have = owned.get(key(m));
          return (
            <div key={key(m)} className="line">
              <span className="t"><bdi>{m.name}</bdi><span className="small muted">{have ? `במחסן ${have}` : m.group || m.category}</span></span>
              {n ? <Stepper value={n} onPlus={() => bump(m, 1)} onMinus={() => bump(m, -1)} /> : <button type="button" className="add" onClick={() => bump(m, 1)} aria-label={`הוסף ${m.name}`}>+</button>}
            </div>
          );
        })}
      </section>

      <section className="panel" aria-label="שעות והערות">
        <h2>שעות קבועות <span className="muted small">(לא חובה)</span></h2>
        <div className="grid3">
          <label>הקמה<input type="time" value={times.setup_time} onChange={(e) => setTimes((t) => ({ ...t, setup_time: e.target.value }))} /></label>
          <label>התחלה<input type="time" value={times.start_time} onChange={(e) => setTimes((t) => ({ ...t, start_time: e.target.value }))} /></label>
          <label>סיום<input type="time" value={times.end_time} onChange={(e) => setTimes((t) => ({ ...t, end_time: e.target.value }))} /></label>
        </div>
        <label>הערות לצוות<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="למשל: להביא כבלי XLR רזרביים" /></label>
      </section>

      {preset && <button type="button" className="btn ghost" disabled={saving} onClick={remove} style={{ color: 'var(--red-text)' }}>מחק את התבנית</button>}
      {err && <p className="warn" role="alert">{err}</p>}
      <div style={{ height: 80 }} />
      <div className="sticky-bottom glass">
        <button type="button" className="btn full accent" disabled={saving} onClick={save}>
          {saving ? 'שומר…' : chosen.length ? `שמור תבנית · ${chosen.length} פריטים` : 'שמור תבנית'}
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, onPlus, onMinus }) {
  return (
    <span className="stepper">
      <button type="button" aria-label="הוסף" onClick={onPlus}>+</button>
      <b>{value}</b>
      <button type="button" aria-label="הפחת" onClick={onMinus}>−</button>
    </span>
  );
}
