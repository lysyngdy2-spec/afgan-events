'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import EventForm from './EventForm';
import PresetCard from './PresetCard';

// Step 1: pick one of your own templates (or start blank). Step 2: the normal form, filled in.
export default function NewEventFlow({ inventory, members, presets, isAdmin, myEmail }) {
  const [picked, setPicked] = useState(undefined); // undefined = still choosing, null = blank
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

  const choose = (p) => { setPicked(p); window.scrollTo({ top: 0 }); };

  if (picked !== undefined) {
    return (
      <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" className="from-preset" onClick={() => setPicked(undefined)}>
          <span><b>{picked ? `מתבנית: ${picked.name}` : 'אירוע ריק'}</b><span className="small muted">{picked ? 'הציוד, השעות וההערות כבר מולאו. אפשר לשנות הכל.' : 'ממלאים הכל ידנית.'}</span></span>
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
          <p className="muted">בחר תבנית, והציוד, השעות וההערות ימולאו לבד.</p>
          <div className="preset-grid">
            {presets.map((p) => <PresetCard key={p.id} p={p} onClick={() => choose(p)} />)}
          </div>
        </>
      ) : (
        <div className="empty-presets">
          <b>עוד אין לך תבניות</b>
          <p className="muted">תבנית היא אירוע מוכן מראש, למשל "חתונה 300 איש": הציוד, השעות וההערות. בונים פעם אחת בלחיצות, ומאז כל אירוע כזה נפתח מוכן.</p>
        </div>
      )}
      <Link href="/presets/new?then=event" className="btn ghost full">+ בנה תבנית חדשה</Link>
      <button type="button" className="btn ghost full" onClick={() => choose(null)}>התחל אירוע ריק</button>
      <Link href="/events?past=1" className="small" style={{ alignSelf: 'center', padding: 10 }}>או שכפל אירוע שכבר היה</Link>
    </div>
  );
}
