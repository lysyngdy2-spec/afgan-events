'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildScene, proj, pathOf } from './iso/scene';
import { LAYERS, LAYER_OF_KIND, ZONES, ZONE_OF_CAT, kindOf, sceneFrom } from '@/lib/setMap';
import dynamic from 'next/dynamic';
import GearObject from './GearObject';

const AddGear = dynamic(() => import('./AddGear'), { ssr: false });
const LAYER_IX = Object.fromEntries(LAYERS.map((l, i) => [l.id, i]));
const K = 0.45; // exploded view scales down to make room for the gaps

// The event's set: an isometric stage that fills up as you add gear.
// Tap a glowing spot to add to that part of the stage; "פרק לשכבות" lifts the
// set apart into sound, light, screens and power, like an exploded drawing.
export default function SetBuilder({ inventory, qty, setQty, bookedBy = {}, canAdd, onAdded, title = 'הסט של האירוע', readOnly = false }) {
  const [exploded, setExploded] = useState(false);
  const [zone, setZone] = useState(null);
  const [focus, setFocus] = useState(null); // kind to light up
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => inventory.map((i) => ({ ...i, qty: qty[i.id] || 0, kind: kindOf(i) })), [inventory, qty]);
  const chosen = rows.filter((r) => r.qty > 0);
  const units = chosen.reduce((t, r) => t + r.qty, 0);
  const { counts, scene } = useMemo(() => sceneFrom(chosen), [chosen.map((r) => r.id + ':' + r.qty).join()]); // eslint-disable-line
  const built = useMemo(() => buildScene({ scene, counts, fixed: true, compact: true }), [scene, counts]);
  const [bx, by, bw, bh] = built.box;
  const G = bh * 0.26;

  // Layer -> parts in painter's order; same-kind neighbours share one <g>.
  const layers = useMemo(() => {
    const ls = LAYERS.map(() => []);
    const occ = {};
    for (const p of built.parts) {
      const li = LAYER_IX[LAYER_OF_KIND[p.k] || 'base'];
      const g = ls[li], last = g[g.length - 1];
      if (last && last.k === p.k) last.html += p.d;
      else { occ[p.k] = (occ[p.k] || 0) + 1; g.push({ k: p.k, key: `${p.k}:${occ[p.k]}:${counts[p.k] || 0}`, html: p.d }); }
    }
    return ls;
  }, [built, counts]);

  // Screen position (in %) of a scene point, in either view.
  const at = ([x, y], li = 0) => {
    if (exploded) {
      const ox = bx + bw / 2, oy = by + bh;
      x = ox + K * (x - ox); y = oy + K * (y - li * G - oy);
    }
    return { left: `${((x - bx) / bw) * 100}%`, top: `${((y - by) / bh) * 100}%` };
  };

  // Exploded callouts: one column at the side, each at its layer's height, never overlapping.
  const tags = (() => {
    if (!exploded) return [];
    const t = LAYERS.map((l, li) => { const p = at(built.anchors[l.zone], li); return { l, li, top: parseFloat(p.top), ax: parseFloat(p.left), ay: parseFloat(p.top) }; }).sort((a, b) => a.top - b.top);
    for (let i = 1; i < t.length; i++) t[i].top = Math.max(t[i].top, t[i - 1].top + 11);
    const over = t[t.length - 1].top - 92;
    if (over > 0) t.forEach((x) => (x.top -= over));
    return t;
  })();

  const used = new Set(chosen.map((r) => ZONE_OF_CAT[r.category]));
  const layerUnits = (id) => chosen.filter((r) => (LAYER_OF_KIND[r.kind] || 'base') === id).reduce((t, r) => t + r.qty, 0);
  const bump = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(999, (q[id] || 0) + d)) }));

  const open = (z) => { setZone(z); setFocus(null); };
  const zoneRows = zone ? rows.filter((r) => ZONES[zone].cats.includes(r.category)) : [];

  return (
    <section className="set">
      <div className="set-head">
        <div><h2 className="set-title">{title}</h2><p className="small muted">{units ? `${units} יחידות · ${chosen.length} דגמים` : readOnly ? 'עוד לא נבחר ציוד' : 'נגיעה בנקודה מוסיפה ציוד לאותו מקום'}</p></div>
        <button type="button" className={`chip ${exploded ? 'on' : ''}`} aria-pressed={exploded} onClick={() => { setExploded((e) => !e); setFocus(null); }}>
          {exploded ? 'הרכב חזרה' : 'פרק לשכבות'}
        </button>
      </div>

      <div className={`iso-card set-stage${exploded ? ' exploded' : ''}${focus ? ' has-hi' : ''}`} style={{ '--g': `${G}px`, '--k': K }}>
        <svg viewBox={built.viewBox} role="img" aria-label={`${title}: ${units} יחידות ציוד`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cylg" x1="0" x2="1"><stop offset="0" stopColor="var(--iso-cyl-a)" /><stop offset=".55" stopColor="var(--iso-cyl-b)" /><stop offset="1" stopColor="var(--iso-cyl-c)" /></linearGradient>
            <linearGradient id="beamg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFF3A0" stopOpacity=".55" /><stop offset="1" stopColor="#FEE844" stopOpacity="0" /></linearGradient>
          </defs>
          <g className="world" style={{ transformOrigin: `${bx + bw / 2}px ${by + bh}px` }}>
            {layers.map((parts, li) => (
              <g key={LAYERS[li].id} className="layer" style={{ '--li': li }} data-layer={LAYERS[li].id}>
                {parts.map((g) => <g key={g.key} data-k={g.k} className={`${focus === g.k ? 'on' : ''}${g.k === 'venue' ? '' : ' drop'}`} dangerouslySetInnerHTML={{ __html: g.html }} />)}
              </g>
            ))}
            {!exploded && <Beams lights={built.lights} floor={built.floor} />}
          </g>
        </svg>

        {!exploded && !readOnly && Object.entries(built.anchors).map(([z, p]) => (
          <button key={z} type="button" className={`pin${used.has(z) ? ' used' : ''}`} style={at(p)} onClick={() => open(z)} aria-label={`הוסף: ${ZONES[z].name}`}>
            <span className="pin-dot">+</span><span className="pin-label">{ZONES[z].name}</span>
          </button>
        ))}
        {exploded && tags.map(({ l, li, top, ax, ay }) => (
          <button key={l.id} type="button" className="layer-tag" style={{ top: `${top}%`, animationDelay: `${(LAYERS.length - li) * 50}ms`, '--ax': `${ax}%`, '--ay': `${ay - top}%` }} onClick={() => (readOnly ? setFocus(null) : open(l.zone))}>
            <b>{l.name}</b><span>{layerUnits(l.id) || '+'}</span>
          </button>
        ))}
      </div>

      {!readOnly && chosen.length > 0 && (
        <div className="set-list">
          {chosen.map((r) => {
            const over = r.qty + (bookedBy[r.id] || 0) > r.quantity;
            return (
              <div key={r.id} className="list-row" onPointerEnter={() => setFocus(r.kind)} onPointerLeave={() => setFocus(null)} style={over ? { color: 'var(--red-text)' } : undefined}>
                <button type="button" className="set-item" onClick={() => setFocus(focus === r.kind ? null : r.kind)}>
                  <bdi>{r.name}</bdi><span className="small muted">{r.category}{over ? ` · חסרים ${r.qty + (bookedBy[r.id] || 0) - r.quantity}` : ''}</span>
                </button>
                <span className="stepper">
                  <button type="button" aria-label="הוסף" onClick={() => bump(r.id, 1)}>+</button>
                  <b style={{ minWidth: 20, textAlign: 'center' }}>{r.qty}</b>
                  <button type="button" aria-label="הפחת" onClick={() => bump(r.id, -1)}>−</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {zone && createPortal(
        <div className="drawer-back" onClick={(e) => { if (e.target === e.currentTarget) setZone(null); }}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label={ZONES[zone].name}>
            <div className="drawer-grip" />
            <div className="row"><div><h3 className="set-title">{ZONES[zone].name}</h3><p className="small muted">{ZONES[zone].hint}</p></div>
              <button type="button" className="chip" onClick={() => setZone(null)}>סיום</button></div>
            <div className="drawer-list">
              {zoneRows.length === 0 && <p className="muted small" style={{ padding: '14px 0' }}>עוד אין במחסן ציוד מהסוג הזה. מצלמים או מוסיפים ידנית פעם אחת, ומאז הוא כאן.</p>}
              {zoneRows.map((r) => (
                <div key={r.id} className="list-row">
                  <span className="gear-name">
                    <GearObject row={r} size={44} />
                    <span><bdi>{r.name}</bdi><span className="small muted"> במחסן {r.quantity}{bookedBy[r.id] ? `, תפוס ${bookedBy[r.id]}` : ''}</span></span>
                  </span>
                  {r.qty ? (
                    <span className="stepper"><button type="button" aria-label="הוסף" onClick={() => bump(r.id, 1)}>+</button><b style={{ minWidth: 20, textAlign: 'center' }}>{r.qty}</b><button type="button" aria-label="הפחת" onClick={() => bump(r.id, -1)}>−</button></span>
                  ) : <button type="button" className="chip" onClick={() => bump(r.id, 1)}>הוסף</button>}
                </div>
              ))}
            </div>
            {canAdd && (
              <div className="drawer-add">
                <button type="button" className="btn accent" onClick={() => setAdding('camera')}>צלם ציוד</button>
                <button type="button" className="btn ghost" onClick={() => setAdding('manual')}>הוסף ידנית</button>
              </div>
            )}
          </div>
        </div>, document.body)}
      {adding && createPortal(<AddGear manual={adding === 'manual'} cats={ZONES[zone]?.cats} onClose={() => setAdding(false)} onAdded={(row) => { setAdding(false); onAdded?.(row); bump(row.id, 1); }} />, document.body)}
    </section>
  );
}

// Moving-head beams sweeping the dance floor; drawn on refs, never by re-rendering.
function Beams({ lights, floor }) {
  const beams = useRef([]), spots = useRef([]), root = useRef(null);
  const ls = lights.slice(0, 8);
  useEffect(() => {
    if (!ls.length) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, visible = true;
    const t0 = performance.now();
    const cx = (floor.x0 + floor.x1) / 2, cy = (floor.y0 + floor.y1) / 2;
    const ax = (floor.x1 - floor.x0) / 2 - 3, ay = (floor.y1 - floor.y0) / 2 - 2;
    const draw = (now) => {
      const t = (now - t0) / 1000;
      ls.forEach((L, i) => {
        const ph = i * 1.7;
        const x = cx + ax * Math.sin(t * 0.35 + ph), y = cy + ay * Math.cos(t * 0.27 + ph * 0.8);
        const H = proj(L.x, L.y, L.z);
        const ring = Array.from({ length: 14 }, (_, j) => { const a = (j / 14) * Math.PI * 2; return proj(x + 2.4 * Math.cos(a), y + 2.4 * Math.sin(a), 0.1); });
        const C = proj(x, y, 0.1), vx = C[0] - H[0], vy = C[1] - H[1];
        let lo = ring[0], hi = ring[0], lc = Infinity, hc = -Infinity;
        for (const p of ring) { const cr = (p[0] - H[0]) * vy - (p[1] - H[1]) * vx; if (cr < lc) { lc = cr; lo = p; } if (cr > hc) { hc = cr; hi = p; } }
        beams.current[i]?.setAttribute('d', pathOf([H, lo, hi]));
        spots.current[i]?.setAttribute('d', pathOf(ring));
      });
      if (visible && !still) raf = requestAnimationFrame(draw);
    };
    draw(t0 + 4000);
    const el = root.current?.ownerSVGElement;
    const io = el && new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible && !still) raf = requestAnimationFrame(draw); });
    io?.observe(el);
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [ls.length, floor]); // eslint-disable-line
  return (
    <g className="beams" aria-hidden="true" ref={root}>
      {ls.map((L, i) => <g key={i}><path ref={(n) => (spots.current[i] = n)} className="spot" /><path ref={(n) => (beams.current[i] = n)} className="beam" /></g>)}
    </g>
  );
}
