'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { whenFresh } from '@/lib/fresh';

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  events: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  manage: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const keyOf = (path) => (path === '/' ? 'home' : path.startsWith('/events') ? 'events' : path.startsWith('/me') ? 'me' : 'manage');

// Liquid-glass tab bar. Tap a tab, or press anywhere on the bar and slide: the lens lifts,
// follows the finger, magnifies the tab under it and springs onto the one you release on.
//
// Rules that keep the bar and the screen in agreement:
// - The tab shown is always the current address, except while a move you asked for is on its
//   way ("pending"). Pending clears the moment the address changes, and falls back to the real
//   tab if the move never lands, so the lens can't sit on Home while Profile is on screen.
// - Touch and mouse moves are made here, by the router, one path for tap and slide alike. The
//   browser's own click on the link is cancelled right after, so nothing navigates twice and no
//   flag is left behind to eat the next tap.
// - While the finger moves, the lens is moved directly on the screen (no React re-render per
//   frame), once per frame.
export default function Nav({ isAdmin }) {
  const path = usePathname();
  const router = useRouter();
  const bar = useRef(null);
  const lensEl = useRef(null);
  const tabs = useRef([]);
  const drag = useRef(null);
  const handledAt = useRef(0);
  const frame = useRef(0);
  const [pending, setPending] = useState(null); // { i, from } : tab index asked for, and the address it was asked from
  const [lift, setLift] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [under, setUnder] = useState(-1);

  const items = [
    ['/', 'home', 'בית'],
    ['/events', 'events', 'אירועים'],
    ...(isAdmin ? [['/manage', 'manage', 'ניהול']] : []),
    ['/me', 'me', 'פרופיל'],
  ];
  const key = keyOf(path);
  const active = Math.max(0, items.findIndex((i) => i[1] === key));
  // A pending move only counts on the screen it was made from.
  const shown = pending && pending.from === path ? pending.i : active;

  // The address changed (the move landed, or something else navigated): drop the pending move.
  useEffect(() => { setPending(null); }, [path]);
  // A move that hasn't landed in 8 s isn't coming; show the real tab again.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 8000);
    return () => clearTimeout(t);
  }, [pending]);

  const rectOf = (i) => {
    const el = tabs.current[i];
    return el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
  };
  const place = (x, w, extra = '') => {
    const l = lensEl.current;
    if (!l) return;
    l.style.width = `${w}px`;
    l.style.transform = `translateX(${x}px)${extra}`;
  };
  const stretch = (isLift, isDrag) => (isLift ? (isDrag ? ' scale(1.16,1.1)' : ' scale(1.1,1.06)') : '');

  // Rest position: on the shown tab. Runs before paint, so the lens never flashes elsewhere.
  useIsoLayout(() => {
    if (dragging) return;
    const r = rectOf(shown);
    if (r) place(r.x, r.w, stretch(lift, false));
    const onResize = () => { const q = rectOf(shown); if (q && !drag.current) place(q.x, q.w); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [shown, dragging, lift, items.length]);

  // Every tab's page is fetched ahead once the screen is fresh, so switching tabs doesn't wait on the server.
  useEffect(() => whenFresh(() => {
    items.forEach(([href, k]) => { if (k !== key) router.prefetch(href, { kind: 'full' }); });
  }, 1200), [items.length, router]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // The last tab asked for always wins: going back to the current tab while another move is on
  // its way is a real move too (it cancels that one), not a no-op.
  const go = (i) => {
    const moving = pending && pending.from === path && pending.i !== active;
    setPending({ i, from: path });
    if (i !== active || moving) router.push(items[i][0]);
  };

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.pointerType === 'mouse' && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    const b = bar.current.getBoundingClientRect();
    const i = nearest(e.clientX);
    drag.current = { startX: e.clientX, x: e.clientX, moved: false, left: b.left, id: e.pointerId, under: i };
    setLift(true);
    setUnder(i);
    if (items[i][1] !== key) router.prefetch(items[i][0], { kind: 'full' });
  };
  const paintDrag = () => {
    frame.current = 0;
    const d = drag.current;
    if (!d || !d.moved) return;
    const w = rectOf(shown)?.w || 80;
    const max = bar.current.clientWidth - w - 4;
    const x = Math.min(max, Math.max(4, d.x - d.left - w / 2));
    place(x, w, stretch(true, true));
    const i = nearest(d.x);
    if (i !== d.under) {
      d.under = i;
      setUnder(i);
      if (items[i][1] !== key) router.prefetch(items[i][0], { kind: 'full' });
    }
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.x = e.clientX;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < 6) return;
      d.moved = true;
      setDragging(true);
      // The finger now belongs to the bar (the browser had handed it to the icon under it; that
      // icon's lost-capture event bubbles up to the bar and must not end the slide).
      try { bar.current.setPointerCapture(e.pointerId); } catch {}
    }
    if (!frame.current) frame.current = requestAnimationFrame(paintDrag);
  };
  const finish = (e, cancel) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
    setLift(false);
    setDragging(false);
    setUnder(-1);
    if (cancel) return; // the layout effect puts the lens back on the shown tab
    handledAt.current = performance.now();
    go(nearest(d.moved ? e.clientX : d.startX));
  };

  // The link's own click: cancelled when the pointer handlers above already moved (tap or slide),
  // kept for keyboard and for opening in a new tab.
  const onClickCapture = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (performance.now() - handledAt.current < 1000) { e.preventDefault(); return; }
    const i = tabs.current.findIndex((el) => el && el.contains(e.target));
    if (i >= 0) setPending({ i, from: path });
  };

  // Native listeners, not React props: a press that starts while a screen change is still being
  // committed must not be dropped (React holds its own events back during that moment).
  const handlers = useRef(null);
  handlers.current = { onDown, onMove, finish, onClickCapture };
  useEffect(() => {
    const el = bar.current;
    const h = (name) => (e) => handlers.current[name](e);
    const on = [
      ['pointerdown', h('onDown')], ['pointermove', h('onMove')],
      ['pointerup', (e) => handlers.current.finish(e, false)], ['pointercancel', (e) => handlers.current.finish(e, true)],
      ['lostpointercapture', (e) => { if (e.target === el && drag.current?.moved) handlers.current.finish(e, false); }],
    ];
    on.forEach(([t, f]) => el.addEventListener(t, f));
    const click = h('onClickCapture');
    el.addEventListener('click', click, true);
    return () => { on.forEach(([t, f]) => el.removeEventListener(t, f)); el.removeEventListener('click', click, true); };
  }, []);

  // Full-screen forms have their own bottom bar.
  const hidden = path === '/events/new' || path.endsWith('/edit') || path.startsWith('/presets/');

  return (
    <nav ref={bar} className={`nav${lift ? ' pressed' : ''}${hidden ? ' away' : ''}`} inert={hidden} aria-label="ניווט ראשי"
      onContextMenu={(e) => e.preventDefault()}>
      <span ref={lensEl} aria-hidden="true" className={`lens${lift ? ' lift' : ''}${dragging ? ' drag' : ''}`} />
      {items.map(([href, k, label], i) => (
        <Link key={k} href={href} prefetch={false} ref={(el) => (tabs.current[i] = el)} draggable={false}
          className={`${i === shown ? 'on' : ''}${under === i ? ' under' : ''}`} aria-current={k === key ? 'page' : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[k]}</svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
