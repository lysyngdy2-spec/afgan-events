'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  events: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  manage: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Liquid-glass tab bar. Tap a tab, or press anywhere on the bar and slide: the lens lifts,
// follows the finger, magnifies the tab under it and springs onto the one you release on.
export default function Nav({ isAdmin }) {
  const path = usePathname();
  const router = useRouter();
  const bar = useRef(null);
  const tabs = useRef([]);
  const drag = useRef(null);
  const [lens, setLens] = useState(null); // { x, w }
  const [lift, setLift] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [under, setUnder] = useState(-1);

  const items = [
    ['/', 'home', 'בית'],
    ['/events', 'events', 'אירועים'],
    ...(isAdmin ? [['/manage', 'manage', 'ניהול']] : []),
    ['/me', 'me', 'פרופיל'],
  ];
  const key = path === '/' ? 'home' : path.startsWith('/events') ? 'events' : path.startsWith('/me') ? 'me' : 'manage';
  const active = Math.max(0, items.findIndex((i) => i[1] === key));
  const [target, setTarget] = useState(active);
  useEffect(() => setTarget(active), [active]);

  const rectOf = (i) => {
    const el = tabs.current[i], b = bar.current;
    if (!el || !b) return null;
    return { x: el.offsetLeft, w: el.offsetWidth };
  };
  useIsoLayout(() => {
    if (!dragging) setLens(rectOf(target));
    const onResize = () => setLens(rectOf(target));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [target, dragging, items.length]);

  const nearest = (clientX) => {
    let best = 0, dist = Infinity;
    tabs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - clientX);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const b = bar.current.getBoundingClientRect();
    drag.current = { startX: e.clientX, moved: false, left: b.left, id: e.pointerId };
    setLift(true);
    setUnder(nearest(e.clientX));
    router.prefetch(items[nearest(e.clientX)][0]);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 6) return;
    if (!d.moved) { d.moved = true; setDragging(true); bar.current.setPointerCapture?.(e.pointerId); }
    const w = rectOf(target)?.w || 80;
    const max = bar.current.clientWidth - w - 4;
    const x = Math.min(max, Math.max(4, e.clientX - d.left - w / 2));
    setLens({ x, w });
    setUnder(nearest(e.clientX));
  };
  const finish = (e, cancel) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setLift(false);
    setDragging(false);
    setUnder(-1);
    if (cancel) { setLens(rectOf(target)); return; }
    const i = nearest(e.clientX);
    setTarget(i);
    setLens(rectOf(i));
    if (d.moved) {
      // A slide replaces the click, so the link under the release point must not fire again.
      d.swallow = true;
      swallowNext.current = true;
      if (items[i][1] !== key) router.push(items[i][0]);
    }
  };
  const swallowNext = useRef(false);
  const onClick = (i) => (e) => {
    if (swallowNext.current) { e.preventDefault(); swallowNext.current = false; return; }
    setTarget(i);
  };

  // Full-screen forms have their own bottom bar.
  const hidden = path === '/events/new' || path.endsWith('/edit') || path.startsWith('/presets/');

  const stretch = lift ? (dragging ? 'scale(1.16,1.1)' : 'scale(1.1,1.06)') : 'scale(1)';
  return (
    <nav ref={bar} className={`nav${lift ? ' pressed' : ''}${hidden ? ' away' : ''}`} inert={hidden} aria-label="ניווט ראשי"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={(e) => finish(e, false)} onPointerCancel={(e) => finish(e, true)}
      onContextMenu={(e) => e.preventDefault()}>
      {lens && (
        <span aria-hidden="true" className={`lens${lift ? ' lift' : ''}${dragging ? ' drag' : ''}`}
          style={{ width: lens.w, transform: `translateX(${lens.x}px) ${stretch}` }} />
      )}
      {items.map(([href, k, label], i) => (
        <Link key={k} href={href} prefetch ref={(el) => (tabs.current[i] = el)} onClick={onClick(i)} draggable={false}
          className={`${i === target ? 'on' : ''}${under === i ? ' under' : ''}`} aria-current={k === key ? 'page' : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[k]}</svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
