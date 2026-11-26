'use client';
import { useEffect, useRef, useState } from 'react';
import { addGear } from '@/app/actions';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { GEAR_TYPES } from '@/lib/setMap';
import GearObject from './GearObject';
import catalog from '@/lib/catalog.json';

const SIDE = 720;

// Square-crop the frame, shrink it and read its average colour (for the object's sides).
async function toSquare(source, sw, sh) {
  const s = Math.min(sw, sh);
  const c = document.createElement('canvas');
  c.width = c.height = SIDE;
  const g = c.getContext('2d');
  g.drawImage(source, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, SIDE, SIDE);
  const t = document.createElement('canvas');
  t.width = t.height = 8;
  t.getContext('2d').drawImage(c, 0, 0, 8, 8);
  const px = t.getContext('2d').getImageData(0, 0, 8, 8).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < px.length; i += 4) { r += px[i]; gg += px[i + 1]; b += px[i + 2]; }
  const n = px.length / 4;
  const tone = '#' + [r, gg, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  let blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
  return { blob, tone, preview: URL.createObjectURL(blob) };
}

// Add gear from a live photo: viewfinder -> the photo folds into an isometric object ->
// name it, say what it is, how many -> into the warehouse.
export default function AddGear({ cats, onClose, onAdded, manual = false }) {
  const video = useRef(null);
  const file = useRef(null);
  const [stream, setStream] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [camErr, setCamErr] = useState('');
  const [shot, setShot] = useState(null); // { blob, tone, preview }
  const [mode, setMode] = useState(manual ? 'manual' : 'camera');
  const [name, setName] = useState('');
  const [type, setType] = useState(() => GEAR_TYPES.find((t) => cats?.includes(t.category))?.id || 'top');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
      if (!alive.current) return s.getTracks().forEach((t) => t.stop());
      setStream(s);
    } catch { setCamErr('אין גישה למצלמה. אפשר לצלם דרך כפתור "צלם עם המצלמה".'); }
  };
  useEffect(() => { if (!shot && mode === 'camera') start(); }, [shot, mode]); // eslint-disable-line
  useEffect(() => {
    if (!stream) return;
    if (video.current) { video.current.srcObject = stream; video.current.play().catch(() => {}); }
    const wake = () => { if (document.visibilityState === 'visible' && stream.getVideoTracks().every((t) => t.readyState === 'ended')) start(); };
    document.addEventListener('visibilitychange', wake);
    return () => { document.removeEventListener('visibilitychange', wake); stream.getTracks().forEach((t) => t.stop()); };
  }, [stream]); // eslint-disable-line
  useEffect(() => () => shot?.preview && URL.revokeObjectURL(shot.preview), [shot]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);

  const snap = async () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    navigator.vibrate?.(12);
    setShot(await toSquare(v, v.videoWidth, v.videoHeight));
    setStream(null);
  };
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const bmp = await createImageBitmap(f);
    setShot(await toSquare(bmp, bmp.width, bmp.height));
    setStream(null);
  };

  const t = GEAR_TYPES.find((x) => x.id === type);
  // Suggestions from the catalog for the chosen kind, so typing a model is a tap.
  const models = (() => {
    const c = catalog.categories.find((x) => x.name === t.category);
    if (!c) return [];
    const g = c.groups?.find((x) => x.name === t.group);
    return g ? g.items : c.groups ? c.groups.flatMap((x) => x.items) : c.items || [];
  })();
  const ordered = [...GEAR_TYPES].sort((a, b) => (cats?.includes(b.category) ? 1 : 0) - (cats?.includes(a.category) ? 1 : 0));

  const save = async () => {
    if (!name.trim()) return setErr('תן לו שם, למשל "QSC K12 שחור"');
    setBusy(true); setErr('');
    try {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('צריך להתחבר מחדש');
      let photo_url = null;
      if (shot) {
        const ext = shot.blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const up = await sb.storage.from('equipment').upload(path, shot.blob, { contentType: shot.blob.type, cacheControl: '31536000' });
        if (up.error) throw new Error(up.error.message);
        photo_url = sb.storage.from('equipment').getPublicUrl(path).data.publicUrl;
      }
      const res = await addGear({ name, category: t.category, group: t.group, quantity: qty, photo_url, tone: shot?.tone });
      if (res.error) throw new Error(res.error);
      onAdded?.(res.row);
    } catch (e) { setErr(e.message || 'לא נשמר'); setBusy(false); }
  };

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label="ציוד חדש">
      {mode === 'camera' && !shot ? (
        <>
          <div className="cam-view">
            {stream ? <video ref={video} playsInline muted autoPlay /> : <div className="cam-empty">{camErr || 'פותח מצלמה…'}</div>}
            <div className="cam-frame" aria-hidden="true" />
            <p className="cam-tip">מרכזים את הציוד בריבוע, על רקע נקי</p>
          </div>
          <div className="cam-bar">
            <button type="button" className="chip" onClick={manual ? () => { setStream(null); setMode('manual'); } : onClose}>{manual ? 'חזרה' : 'ביטול'}</button>
            <button type="button" className="shutter" aria-label="צלם" onClick={snap} disabled={!stream} />
            <button type="button" className="chip" onClick={() => file.current?.click()}>צלם עם המצלמה</button>
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          </div>
        </>
      ) : (
        <form className="cam-form" onSubmit={(e) => { e.preventDefault(); if (!busy) save(); }}>
          {shot ? (
            <div className="fold" aria-hidden="true">
              <img src={shot.preview} alt="" className="fold-flat" />
              <span className="fold-obj"><GearObject photo={shot.preview} tone={shot.tone} shape={t.shape} size={180} /></span>
            </div>
          ) : (
            <div className="manual-head">
              <span className="fold-obj" key={type}><GearObject shape={t.shape} size={120} /></span>
              <div><h2 className="set-title">ציוד חדש</h2><button type="button" className="chip" onClick={() => setMode('camera')}>הוסף תמונה</button></div>
            </div>
          )}
          <label>איך קוראים לו?<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל QSC K12 שחור" maxLength={80} list="gear-models" /></label>
          <datalist id="gear-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
          <div className="small muted">מה זה? (כדי לדעת איפה הוא עומד על הבמה)</div>
          <div className="type-chips">
            {ordered.map((x) => <button key={x.id} type="button" className={`chip ${type === x.id ? 'on' : ''}`} onClick={() => setType(x.id)}>{x.label}</button>)}
          </div>
          <div className="row"><span>כמה יש במחסן?</span>
            <span className="stepper"><button type="button" aria-label="הוסף" onClick={() => setQty((q) => Math.min(999, q + 1))}>+</button><b style={{ minWidth: 24, textAlign: 'center' }}>{qty}</b><button type="button" aria-label="הפחת" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button></span>
          </div>
          {err && <p className="warn small" role="alert">{err}</p>}
          <div className="row" style={{ gap: 10 }}>
            {shot ? <button type="button" className="btn ghost" onClick={() => { setShot(null); setMode('camera'); }} disabled={busy}>צלם שוב</button>
              : <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>}
            <button type="submit" className="btn accent" style={{ flex: 1 }} disabled={busy}>{busy ? 'שומר…' : 'הוסף למחסן'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
