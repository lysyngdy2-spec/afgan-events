// "Fresh" = the page on screen came from the server with a valid sign-in, not from the
// saved copy the service worker shows while the server wakes up. Prefetching before that
// would send several requests that each renew the sign-in at once, so it waits.
let fresh = typeof window === 'undefined' ? false : !window.__afganStale;
const waiting = new Set();

export function markFresh() {
  if (fresh) return;
  fresh = true;
  waiting.forEach((cb) => cb());
  waiting.clear();
}

// Runs cb once the page is fresh and the phone is idle. Returns a cancel function.
export function whenFresh(cb, delay = 600) {
  let t = null, done = false;
  const run = () => { if (!done) t = setTimeout(() => { done = true; cb(); }, delay); };
  const go = () => run();
  if (fresh) run(); else waiting.add(go);
  return () => { done = true; clearTimeout(t); waiting.delete(go); };
}
