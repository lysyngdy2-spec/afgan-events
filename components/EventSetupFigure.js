'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { setById } from '@/lib/eventSets';

const EventFigure = dynamic(() => import('./EventFigure'), { ssr: false, loading: () => <div className="sk" style={{ aspectRatio: '1.35', borderRadius: 24 }} /> });

// The event's real equipment, drawn as the hall. Opens on tap so the page itself stays light.
export default function EventSetupFigure({ setId, counts, title }) {
  const [open, setOpen] = useState(false);
  const set = setById(setId);
  const total = Object.values(counts).reduce((t, n) => t + n, 0);
  if (!total) return null;
  return open ? (
    <EventFigure setId={setId} scene={set.scene} counts={counts} guests={set.guests.def} title={title} fig={1}
      readout={`${total} פריטי ציוד`} hint="ההמחשה מהמפרט של האירוע" />
  ) : (
    <button type="button" className="glass tap row" onClick={() => setOpen(true)}
      style={{ padding: '14px 16px', borderRadius: 20, color: 'var(--text)', font: 'inherit', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
      <span style={{ textAlign: 'start' }}><b style={{ fontWeight: 500 }}>איך זה ייראה באולם</b><br /><span className="small muted">המחשה של ההקמה לפי המפרט</span></span>
      <span style={{ color: 'var(--amber)' }}>הצג</span>
    </button>
  );
}
