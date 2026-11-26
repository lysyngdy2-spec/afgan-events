'use client';
import { useEffect, useMemo, useRef } from 'react';
import { buildScene, proj, pathOf } from './iso/scene';

// The hall, set up for the night. Static parts are SVG strings built from numbers only
// (no user text goes in), moving-head beams are updated on refs, never by re-rendering.
export default function EventFigure({ setId, scene, counts, guests, title, readout, highlight, fig = 1, hint }) {
  const { parts, lights, viewBox, floor } = useMemo(() => buildScene({ setId, scene, counts, guests }), [setId, scene, counts, guests]);
  const groups = useMemo(() => {
    // Keep painter's order, but group consecutive parts of the same kind into one <g>.
    const gs = [];
    for (const p of parts) {
      const last = gs[gs.length - 1];
      if (last && last.k === p.k) last.html += p.d; else gs.push({ k: p.k, html: p.d });
    }
    return gs;
  }, [parts]);

  const root = useRef(null);
  const beams = useRef([]);
  const spots = useRef([]);
  const beamLights = lights.slice(0, 8);

  useEffect(() => {
    const el = root.current;
    if (!el || !beamLights.length) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, visible = true, t0 = performance.now();
    const cx = (floor.x0 + floor.x1) / 2, cy = (floor.y0 + floor.y1) / 2;
    const ax = (floor.x1 - floor.x0) / 2 - 3, ay = (floor.y1 - floor.y0) / 2 - 2;
    const draw = (now) => {
      const t = (now - t0) / 1000;
      beamLights.forEach((L, i) => {
        // Each head traces its own slow Lissajous over the dance floor.
        const ph = i * 1.7;
        const x = cx + ax * Math.sin(t * 0.35 + ph), y = cy + ay * Math.cos(t * 0.27 + ph * 0.8);
        const H = proj(L.x, L.y, L.z);
        const ring = Array.from({ length: 14 }, (_, j) => { const a = (j / 14) * Math.PI * 2; return proj(x + 2.4 * Math.cos(a), y + 2.4 * Math.sin(a), 0.1); });
        // Beam: from the lens to the two outermost points of the pool as seen on screen.
        const C = proj(x, y, 0.1), vx = C[0] - H[0], vy = C[1] - H[1];
        let lo = ring[0], hi = ring[0], lc = Infinity, hc = -Infinity;
        for (const p of ring) {
          const cr = (p[0] - H[0]) * vy - (p[1] - H[1]) * vx;
          if (cr < lc) { lc = cr; lo = p; }
          if (cr > hc) { hc = cr; hi = p; }
        }
        beams.current[i]?.setAttribute('d', pathOf([H, lo, hi]));
        spots.current[i]?.setAttribute('d', pathOf(ring));
      });
      if (visible && !still) raf = requestAnimationFrame(draw);
    };
    draw(t0 + 4000);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(draw);
    });
    io.observe(el);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [beamLights.length, floor]); // eslint-disable-line

  return (
    <figure className={`iso-card${highlight ? ' has-hi' : ''}`} ref={root} aria-label={`המחשה: ${title}`}>
      <div className="iso-head"><span className="iso-fig">איור {fig}</span><span className="iso-title">{title}</span></div>
      <svg viewBox={viewBox} role="img" aria-label={readout} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cylg" x1="0" x2="1">
            <stop offset="0" stopColor="var(--iso-cyl-a)" /><stop offset=".55" stopColor="var(--iso-cyl-b)" /><stop offset="1" stopColor="var(--iso-cyl-c)" />
          </linearGradient>
          <linearGradient id="beamg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FFD27A" stopOpacity=".55" /><stop offset="1" stopColor="#FFB020" stopOpacity="0" />
          </linearGradient>
        </defs>
        {groups.map((g, i) => <g key={i} data-k={g.k} className={highlight === g.k ? 'on' : undefined} dangerouslySetInnerHTML={{ __html: g.html }} />)}
        <g className="beams" aria-hidden="true">
          {beamLights.map((L, i) => (
            <g key={i}>
              <path ref={(n) => (spots.current[i] = n)} className="spot" />
              <path ref={(n) => (beams.current[i] = n)} className="beam" />
            </g>
          ))}
        </g>
      </svg>
      <div className="iso-foot"><span className="iso-hint">{hint}</span><span className="iso-read">{readout}</span></div>
    </figure>
  );
}
