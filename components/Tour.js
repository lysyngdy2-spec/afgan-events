'use client';
import { useEffect, useRef, useState } from 'react';

// First-login tour. Each slide is a small animated scene of the real screen it explains,
// so people learn by seeing the move, not by reading. Role decides which slides appear.
const SLIDES = [
  { id: 'hi', roles: 'all', title: (n) => `ברוך הבא, ${n}`, text: 'כל האירועים של אפגן במקום אחד: מתי, איפה, מי בצוות ואיזה ציוד. שתי דקות ואתה מכיר הכל.', Scene: Hello },
  { id: 'next', roles: 'all', title: () => 'האירוע הבא שלך, ראשון במסך', text: 'במסך הבית תמיד מחכה האירוע הקרוב: כמה ימים נשארו, מתי להגיע להקמה, ונסיעה בוויז בלחיצה.', Scene: NextCard },
  { id: 'answer', roles: 'all', title: () => 'שיבצו אותך? עונים בלחיצה', text: 'כשמשבצים אותך מופיע כרטיס. "מגיע" או "לא יכול", וניר רואה מיד. אפשר לשנות תשובה עד האירוע.', Scene: Answer },
  { id: 'cal', roles: 'all', title: () => 'הכל נכנס ליומן לבד', text: 'בפרופיל מחברים פעם אחת את היומן של הטלפון. מאז כל שיבוץ נכנס עם תזכורת שבוע לפני, יום לפני ו־3 שעות לפני.', Scene: Calendar },
  { id: 'build', roles: 'edit', title: () => 'בונים את הבמה', text: 'באירוע חדש בונים את הבמה: נוגעים בנקודה ומוסיפים ציוד, והציור מתעדכן. "פרק לשכבות" מראה סאונד, תאורה, מסכים וחשמל בנפרד. במה שאוהבים שומרים כסט לפעם הבאה.', Scene: Build },
  { id: 'clash', roles: 'edit', title: () => 'התנגשויות נצבעות באדום', text: 'עובד שכבר משובץ באותן שעות, או ציוד שתפוס באירוע אחר, מסומנים באדום עוד לפני השמירה.', Scene: Clash },
  { id: 'money', roles: 'admin', title: () => 'הכסף רק אצלך', text: 'מחירים, תשלומים, שכר וספקים מופיעים רק לך. ב"ניהול" יש תמונת חודש: נכנס, פתוח לגבייה ורווח.', Scene: Money },
  { id: 'go', roles: 'all', title: () => 'זהו, אפשר להתחיל', text: 'את ההדרכה הזאת אפשר לראות שוב בכל רגע מהפרופיל.', Scene: Go },
];

export default function Tour({ name, role, onDone }) {
  const slides = SLIDES.filter((s) => s.roles === 'all' || (s.roles === 'edit' && role !== 'worker') || (s.roles === 'admin' && role === 'admin'));
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const box = useRef(null);
  const startX = useRef(null);
  const first = (name || '').split(' ')[0] || 'חבר';
  const last = i === slides.length - 1;
  const go = (d) => { setDir(d); setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))); };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onDone();
      // RTL: the left arrow moves forward.
      if (e.key === 'ArrowLeft') go(1);
      if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, []); // eslint-disable-line

  const S = slides[i];
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" ref={box} tabIndex={-1}
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (startX.current == null) return;
        const dx = e.clientX - startX.current; startX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}>
      <div className="tour-sheet">
        <div className="row">
          <div className="tour-dots" aria-hidden="true">{slides.map((s, j) => <span key={s.id} className={j === i ? 'on' : j < i ? 'past' : ''} />)}</div>
          {!last && <button type="button" className="tour-skip" onClick={onDone}>דלג</button>}
        </div>
        <div key={S.id} className={`tour-body ${dir > 0 ? 'fwd' : 'back'}`}>
          <div className="tour-scene" aria-hidden="true"><S.Scene /></div>
          <h2 id="tour-title" className="display" style={{ fontSize: 26, lineHeight: 1.2 }}>{S.title(first)}</h2>
          <p className="muted" style={{ fontSize: 16, lineHeight: 1.55 }}>{S.text}</p>
        </div>
        <p className="sr-only" aria-live="polite">שלב {i + 1} מתוך {slides.length}</p>
        <div className="row" style={{ gap: 10 }}>
          {i > 0 ? <button type="button" className="btn ghost" onClick={() => go(-1)} style={{ flex: '0 0 auto' }}>הקודם</button> : <span />}
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => (last ? onDone() : go(1))}>{last ? 'יאללה, מתחילים' : 'הבא'}</button>
        </div>
      </div>
    </div>
  );
}

function Hello() {
  return (
    <div className="sc-hello">
      <img src="/icons/logo-white.png" alt="" width="96" height="96" />
      <div className="eq">{Array.from({ length: 9 }, (_, j) => <span key={j} style={{ animationDelay: `${(j * 97) % 600 - 600}ms` }} />)}</div>
    </div>
  );
}

function NextCard() {
  return (
    <div className="sc-next">
      <div className="mock glass-amber">
        <div className="row"><b className="display" style={{ color: 'var(--amber)', fontSize: 22 }}>עוד 3 ימים</b><span className="small" style={{ color: '#E8DCC4' }}>חמישי 28.11</span></div>
        <b style={{ fontSize: 16 }}>חתונה כהן · אולמי הגן</b>
        <div className="grid2"><span className="pill">להגיע ב <bdi>15:00</bdi></span><span className="pill">אירוע <bdi>19:30</bdi></span></div>
      </div>
      <div className="mock-btn">נווט בוויז</div>
      <span className="finger f-waze" />
    </div>
  );
}

function Answer() {
  return (
    <div className="sc-answer">
      <div className="mock glass">
        <span className="small" style={{ color: 'var(--amber)' }}>שיבוץ חדש</span>
        <b>בר מצווה לוי · שישי</b>
        <div className="grid2"><span className="ans yes">מגיע</span><span className="ans">לא יכול</span></div>
      </div>
      <span className="finger f-yes" />
      <span className="toast">✓ ניר קיבל את התשובה</span>
    </div>
  );
}

function Calendar() {
  return (
    <div className="sc-cal">
      <div className="cal glass">
        {Array.from({ length: 21 }, (_, j) => <span key={j} className={j === 11 ? 'day hit' : 'day'}>{j + 8}</span>)}
        <span className="chip-drop">חתונה כהן</span>
      </div>
      <div className="bells"><span>שבוע לפני</span><span>יום לפני</span><span>3 שעות לפני</span></div>
    </div>
  );
}

function Build() {
  return (
    <div className="sc-build">
      <span className="plus-btn">+</span>
      <div className="fan">{['חתונה', 'כנס', 'מסיבה'].map((t, j) => <span key={t} style={{ '--j': j }}>{t}</span>)}</div>
      <svg viewBox="0 0 120 70" className="mini-iso">
        <path className="b1" d="M20 45 L60 25 L100 45 L60 65Z" />
        <path className="b2" d="M34 40 L60 27 L86 40 L60 53Z" />
        <path className="b3" d="M28 30v-14l6-3v14ZM92 30v-14l-6-3v14Z" />
        <path className="b4" d="M30 14 L60 0 L90 14" />
      </svg>
      <div className="slider"><span /></div>
    </div>
  );
}

function Clash() {
  return (
    <div className="sc-clash">
      {['לידור', 'עידן', 'באש', 'נדב', 'אלדד'].map((n, j) => <span key={n} className={`c ${j === 2 ? 'red' : j === 0 || j === 3 ? 'on' : ''}`} style={{ '--j': j }}>{n}</span>)}
      <p className="warn small note">באש כבר משובץ באותן שעות</p>
    </div>
  );
}

function Money() {
  return (
    <div className="sc-money">
      {[['נכנס', 'a'], ['פתוח', 'b'], ['רווח', 'c']].map(([l, k]) => (
        <div key={l} className="glass m"><span className="small muted">{l}</span><b className={`count ${k}`} /></div>
      ))}
    </div>
  );
}

function Go() {
  return <div className="sc-go"><span className="ring" /><span className="ring r2" /><span className="check">✓</span></div>;
}
