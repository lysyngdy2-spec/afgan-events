'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePreset, deletePreset } from '@/app/actions';
import PresetIcon, { PRESET_ICONS } from './PresetIcon';
import SetBuilder from './SetBuilder';

const key = (x) => `${x.category}|${x.name}`;

// A saved set: the same live stage as an event, kept under a name to start the next event from.
export default function PresetBuilder({ inventory: initialInventory, preset, then }) {
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [name, setName] = useState(preset?.name || '');
  const [icon, setIcon] = useState(preset?.icon || 'sound');
  const byKey = useMemo(() => new Map(initialInventory.map((i) => [key(i), i.id])), [initialInventory]);
  const [qty, setQty] = useState(() => Object.fromEntries((preset?.items || []).filter((x) => byKey.has(key(x))).map((x) => [byKey.get(key(x)), x.quantity])));
  // Gear from older sets that is no longer in the warehouse: kept as is.
  const extra = (preset?.items || []).filter((x) => !byKey.has(key(x)));
  const [times, setTimes] = useState({ setup_time: preset?.setup_time?.slice(0, 5) || '', start_time: preset?.start_time?.slice(0, 5) || '', end_time: preset?.end_time?.slice(0, 5) || '' });
  const [notes, setNotes] = useState(preset?.notes || '');
  const [err, setErr] = useState('');
  const [saving, start] = useTransition();

  const chosen = inventory.filter((i) => qty[i.id] > 0);
  const mine = chosen.map((i) => ({ category: i.category, name: i.name, quantity: qty[i.id] }));
  const have = new Set(mine.map(key));
  const items = [...mine, ...extra.filter((x) => !have.has(key(x)))];
  const save = () => start(async () => {
    setErr('');
    const res = await savePreset({ id: preset?.id, name, icon, notes, ...times, items });
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
        <span>שם הסט</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: חתונה 300 איש" maxLength={60} autoFocus={!preset} />
      </label>

      <div className="icon-pick" role="radiogroup" aria-label="סמל">
        {PRESET_ICONS.map((i) => (
          <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i} className={icon === i ? 'on' : ''} onClick={() => setIcon(i)}>
            <PresetIcon name={i} />
          </button>
        ))}
      </div>

      <SetBuilder inventory={inventory} qty={qty} setQty={setQty} canAdd title="הציוד בסט"
        onAdded={(row) => setInventory((inv) => [...inv, row])} />
      {extra.length > 0 && <p className="small warn">לא במחסן: {extra.map((m) => `${m.name} ×${m.quantity}`).join(', ')}. נשארים בסט.</p>}

      <section className="panel" aria-label="שעות והערות">
        <h2>שעות קבועות <span className="muted small">(לא חובה)</span></h2>
        <div className="grid3">
          <label>הקמה<input type="time" value={times.setup_time} onChange={(e) => setTimes((t) => ({ ...t, setup_time: e.target.value }))} /></label>
          <label>התחלה<input type="time" value={times.start_time} onChange={(e) => setTimes((t) => ({ ...t, start_time: e.target.value }))} /></label>
          <label>סיום<input type="time" value={times.end_time} onChange={(e) => setTimes((t) => ({ ...t, end_time: e.target.value }))} /></label>
        </div>
        <label>הערות לצוות<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="למשל: להביא כבלי XLR רזרביים" /></label>
      </section>

      {preset && <button type="button" className="btn ghost" disabled={saving} onClick={remove} style={{ color: 'var(--red-text)' }}>מחק את הסט</button>}
      {err && <p className="warn" role="alert">{err}</p>}
      <div style={{ height: 80 }} />
      <div className="sticky-bottom glass">
        <button type="button" className="btn full accent" disabled={saving} onClick={save}>
          {saving ? 'שומר…' : chosen.length ? `שמור סט · ${items.length} פריטים` : 'שמור סט'}
        </button>
      </div>
    </div>
  );
}

