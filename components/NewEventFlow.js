'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import EventForm from './EventForm';
import { SETS, setById, allocate, sceneCounts, prefill } from '@/lib/eventSets';

// The figure is the heaviest part of this screen, so it loads on its own after the page.
const EventFigure = dynamic(() => import('./EventFigure'), { ssr: false, loading: () => <div className="sk" style={{ aspectRatio: '1.35', borderRadius: 24 }} /> });

// Step 1: pick a set (or start blank). Step 2: shape it (guests) and see it. Step 3: the normal form, filled in.
export default function NewEventFlow({ inventory, members, presets, isAdmin, myEmail }) {
  const [setId, setSetId] = useState(null);
  const [guests, setGuests] = useState(0);
  const [step, setStep] = useState('pick');
  const [hi, setHi] = useState(null);
  const set = setId ? setById(setId) : null;

  const slots = useMemo(() => (set ? set.slots(guests) : []), [set, guests]);
  const counts = useMemo(() => sceneCounts(slots), [slots]);
  const alloc = useMemo(() => allocate(slots, inventory), [slots, inventory]);
  const initial = useMemo(() => {
    if (!set) return null;
    const p = prefill(set, guests, inventory);
    return { ...p, crew: [], finance: null };
  }, [set, guests, inventory]);

  const choose = (s) => { setSetId(s.id); setGuests(s.guests.def); setHi(null); setStep('shape'); window.scrollTo({ top: 0 }); };
  const units = (k) => slots.filter((s) => s.key === k).reduce((t, s) => t + s.qty, 0);
  const lights = units('heads') + units('pars') + units('strobes') + units('front');
  const speakers = units('tops');
  const missing = alloc.lines.filter((l) => l.missing > 0);

  if (step === 'form') {
    return (
      <>
        {set && (
          <button type="button" className="glass tap row" onClick={() => setStep('shape')} style={{ padding: '12px 16px', borderRadius: 18, color: 'var(--text)', font: 'inherit', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textAlign: 'start' }}>
            <span><b style={{ fontWeight: 500 }}>{set.name} · {guests} אורחים</b><br /><span className="small muted">הציוד, השעות וההערות כבר מולאו. אפשר לשנות הכל.</span></span>
            <span style={{ color: 'var(--amber)' }}>לסט</span>
          </button>
        )}
        {initial?.crewHint && <p className="small muted">לאירוע כזה בדרך כלל צריך {initial.crewHint} אנשי צוות.</p>}
        <EventForm key={setId || 'blank'} initial={initial} members={members} inventory={inventory} presets={presets} isAdmin={isAdmin} myEmail={myEmail} />
      </>
    );
  }

  if (step === 'shape' && set) {
    return (
      <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setStep('pick')}>→ כל הסטים</button>
        <EventFigure
          setId={set.id} scene={set.scene} counts={counts} guests={guests} title={set.name}
          readout={`${guests} אורחים · ${speakers} רמקולים · ${lights} גופי תאורה`}
          highlight={hi} hint={hi ? 'מודגש: ' + (slots.find((s) => s.key === hi)?.label || '') : 'לחיצה על פריט מדגישה אותו'}
        />
        <label>
          <span className="row"><span>כמה אורחים?</span><b style={{ color: 'var(--text)', fontSize: 16 }}>{guests}</b></span>
          <input type="range" className="range" min={set.guests.min} max={set.guests.max} step={set.guests.step} value={guests} onChange={(e) => setGuests(Number(e.target.value))} aria-valuetext={`${guests} אורחים`} />
        </label>

        <section className="glass card" aria-label="מה הסט כולל">
          <div className="row"><h2 style={{ fontSize: 16 }}>מה נכנס לסט</h2><span className="small muted">מהמחסן שלכם</span></div>
          {alloc.lines.map((l) => (
            <button type="button" key={l.key} className={`list-row set-line${hi === l.key ? ' on' : ''}`} aria-pressed={hi === l.key} onClick={() => setHi(hi === l.key ? null : l.key)}>
              <span style={{ textAlign: 'start' }}>
                <span>{l.label}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  {l.used.length ? l.used.map((u) => `${u.name} ×${u.take}`).join(', ') : 'אין במחסן'}
                  {l.missing > 0 && <span className="warn"> · חסרים {l.missing}</span>}
                </span>
              </span>
              <span className="qty">{l.qty}</span>
            </button>
          ))}
          {missing.length > 0 && <p className="small muted">מה שחסר אפשר להשלים מספק השכרה, או לשנות בטופס.</p>}
        </section>

        <section className="glass card">
          <h2 style={{ fontSize: 16 }}>שעות ותזכורות לצוות</h2>
          <p className="small muted">הקמה <bdi>{set.times.setup}</bdi> · אירוע <bdi>{set.times.start}–{set.times.end}</bdi></p>
          <ul className="small" style={{ margin: 0, paddingInlineStart: 18, color: 'var(--muted)' }}>{set.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>

        <div style={{ height: 70 }} />
        <div className="sticky-bottom glass">
          <button type="button" className="btn full" onClick={() => { setStep('form'); window.scrollTo({ top: 0 }); }}>בנה את האירוע</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="muted">בחר סוג אירוע, והציוד, השעות וההערות ימולאו לבד מהמחסן שלכם.</p>
      <div className="grid2">
        {SETS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => choose(s)} className="glass set-card" style={{ animationDelay: `${i * 40}ms` }}>
            <SetGlyph id={s.id} />
            <span style={{ fontWeight: 500, fontSize: 16 }}>{s.name}</span>
            <span className="small muted">{s.blurb}</span>
          </button>
        ))}
        <button type="button" onClick={() => setStep('form')} className="glass set-card" style={{ animationDelay: `${SETS.length * 40}ms` }}>
          <SetGlyph id="blank" />
          <span style={{ fontWeight: 500, fontSize: 16 }}>אירוע ריק</span>
          <span className="small muted">ממלאים הכל ידנית</span>
        </button>
      </div>
      <Link href="/events?past=1" className="small" style={{ alignSelf: 'center', padding: 10 }}>או שכפל אירוע שכבר היה</Link>
    </div>
  );
}

// Small isometric glyphs for the set cards: one solid each, same light as the big figure.
function SetGlyph({ id }) {
  const g = {
    wedding: <><path d="M10 34 L24 26 L38 34 L24 42Z" className="g-t" /><path d="M14 33v-14M34 33v-14M24 27v-14M24 39v-14" className="g-l" /><path d="M12 19 L24 12 L36 19 L24 26Z" className="g-a" /></>,
    barmitzvah: <><path d="M12 30 L24 23 L36 30 L24 37Z" className="g-t" /><path d="M12 30v6l12 7v-6Z" className="g-y" /><path d="M36 30v6l-12 7v-6Z" className="g-x" /><path d="M24 23v-10M20 15l4-4 4 4" className="g-l" /><circle cx="24" cy="10" r="2.4" className="g-a" /></>,
    conference: <><path d="M16 20 L24 15 L32 20 L24 25Z" className="g-t" /><path d="M16 20v14l8 5V25Z" className="g-y" /><path d="M32 20v14l-8 5V25Z" className="g-x" /><path d="M24 15v-6" className="g-l" /><circle cx="24" cy="8" r="2" className="g-a" /></>,
    party: <><path d="M10 30 L24 22 L38 30 L24 38Z" className="g-t" /><path d="M24 6 L16 30M24 6 L32 30" className="g-l" /><path d="M16 30 L24 25 L32 30 L24 35Z" className="g-a" /></>,
    show: <><path d="M8 30 L24 21 L40 30 L24 39Z" className="g-t" /><path d="M8 30v4l16 9v-4Z" className="g-y" /><path d="M40 30v4l-16 9v-4Z" className="g-x" /><path d="M10 29V10h28v19M10 10h28" className="g-l" /><circle cx="18" cy="13" r="1.8" className="g-a" /><circle cx="24" cy="13" r="1.8" className="g-a" /><circle cx="30" cy="13" r="1.8" className="g-a" /></>,
    blank: <><path d="M12 28 L24 21 L36 28 L24 35Z" className="g-t" style={{ fill: 'none', strokeDasharray: '2 2' }} /><path d="M24 24v8M20 28h8" className="g-l" /></>,
  }[id];
  return <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="glyph">{g}</svg>;
}
