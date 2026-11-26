import { flushSync } from 'react-dom';

// Run a state change inside a view transition when the browser has them
// (Safari 18+, Chrome); elsewhere just run it. Reduced motion skips the animation.
export function go(update) {
  if (typeof document === 'undefined' || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return update();
  document.startViewTransition(() => flushSync(update));
}
