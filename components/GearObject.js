'use client';
import { useId } from 'react';
import { shapeOf } from '@/lib/setMap';

const C = Math.cos(Math.PI / 6), S = 0.5;
const P = (x, y, z) => [(x - y) * C, (x + y) * S - z * 1.3];
const pts = (a) => a.map((p) => p.map((n) => n.toFixed(2)).join(',')).join(' ');
const shade = (hex, f) => {
  const n = parseInt((hex || '#3A3D44').slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * f)));
  return `rgb(${c.join(',')})`;
};

// A photographed piece of gear as a small isometric object: the photo is its front face,
// the top and side are shaded from the photo's own colour. Same four-tone logic as the stage.
export default function GearObject({ row, size = 64, photo, tone, shape: forced }) {
  const id = useId().replace(/:/g, '');
  const [w, d, h] = forced || shapeOf(row || {});
  const url = photo ?? row?.photo_url;
  const t = tone ?? row?.tone ?? '#3A3D44';
  const top = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)];
  const side = [P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)];
  const front = [P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)];
  const all = [...top, ...side, ...front];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const pad = 0.12, vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2];
  // Map the unit square of the photo onto the front face: u along +x, v down the face.
  const o = P(0, d, h), ux = P(w, d, h), vy = P(0, d, 0);
  const m = [ux[0] - o[0], ux[1] - o[1], vy[0] - o[0], vy[1] - o[1], o[0], o[1]].map((n) => n.toFixed(3)).join(' ');
  return (
    <svg className="gear-obj" viewBox={vb.join(' ')} width={size} height={size} aria-hidden="true">
      <defs><clipPath id={`f${id}`} clipPathUnits="userSpaceOnUse"><polygon points="0,0 1,0 1,1 0,1" /></clipPath></defs>
      <polygon points={pts(top)} fill={shade(t, 1.25)} />
      <polygon points={pts(side)} fill={shade(t, 0.6)} />
      <polygon points={pts(front)} fill={shade(t, 0.9)} />
      {url && <g transform={`matrix(${m})`}><image href={url} x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice" clipPath={`url(#f${id})`} /></g>}
      <polygon points={pts(front)} fill="none" className="gear-edge" />
      <polygon points={pts(side)} fill="none" className="gear-edge" />
      <polygon points={pts(top)} fill="none" className="gear-edge" />
    </svg>
  );
}
