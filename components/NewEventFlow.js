'use client';
import { useMemo, useState } from 'react';
import { go } from '@/lib/vt';
import Link from 'next/link';
import EventForm from './EventForm';
import PresetCard from './PresetCard';

// Step 1: pick one of your own templates (or start blank). Step 2: the normal form, filled in.
export default function NewEventFlow({ inventory, members, presets, isAdmin, myEmail }) {
  // undefined = still choosing, null = blank. No saved sets yet: straight to the stage.
  const [picked, setPicked] = useState(presets.length ? undefined : null);
  const byModel = useMemo(() => new Map(inventory.map((i) => [`${i.category}|${i.name}`, i])), [inventory]);

  const initial = useMemo(() => {
    if (!picked) return null;
    const equipment = [];
    const missing = [];
    for (const x of picked.items) {
      const row = byModel.get(`${x.category}|${x.name}`);
      if (row) equipment.push({ equipment_id: row.id, quantity: x.quantity }); else missing.push(x);
    }
    return {
      equipment, missing, crew: [], finance: null, notes: picked.notes || '',
      setup_time: picked.setup_time || '', start_time: picked.start_time || '', end_time: picked.end_time || '',
    };
  }, [picked, byModel]);

  const choose = (p) => go(() => { setPicked(p); window.scrollTo({ top: 0 }); });

  if (picked !== undefined) {
    return (
      <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" className="from-preset" onClick={() => go(() => setPicked(undefined))}>
          <span><b>{picked ? `מסט: ${picked.name}` : 'אירוע ריק'}</b><span className="small muted">{picked ? 'הציוד, השעות וההערות כבר מולאו. אפשר לשנות הכל.' : 'ממלאים הכל ידנית.'}</span></span>
          <span className="swap">החלף</span>
        </button>
        {initial?.missing?.length > 0 && (
          <p className="small warn">לא במחסן: {initial.missing.map((m) => `${m.name} ×${m.quantity}`).join(', ')}. אפשר להשלים מספק השכרה.</p>
        )}
        <EventForm key={picked?.id || 'blank'} initial={initial} members={members} inventory={inventory} presets={presets} isAdmin={isAdmin} myEmail={myEmail} />
      </div>
    );
  }

  return (
    <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {presets.length > 0 ? (
        <>
          <p className="muted">מתחילים מסט שמור, והבמה, השעות וההערות מוכנים. או בונים במה חדשה.</p>
          <div className="preset-grid">
            {presets.map((p) => <PresetCard key={p.id} p={p} onClick={() => choose(p)} />)}
          </div>
        </>
      ) : (
        <div className="empty-presets">
          <b>עוד אין סטים שמורים</b>
          <p className="muted">בונים במה לאירוע, ובסוף אפשר לשמור אותה כסט, למשל "חתונה 300 איש". מאז כל אירוע כזה נפתח מוכן.</p>
        </div>
      )}
      <button type="button" className="btn accent full" onClick={() => choose(null)}>בנה במה חדשה</button>
      <Link href="/events?past=1" className="small" style={{ alignSelf: 'center', padding: 10 }}>או שכפל אירוע שכבר היה</Link>
    </div>
  );
}
