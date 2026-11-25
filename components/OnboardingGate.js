'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Loads the tour code only for someone who hasn't seen it on this phone (or asked to replay it),
// so returning users don't pay for it on every open.
const Tour = dynamic(() => import('./Tour'), { ssr: false });
export const tourKey = (id) => `afgan-tour-v1:${id}`;

export default function OnboardingGate({ userId, name, role }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = true;
    try { seen = !!localStorage.getItem(tourKey(userId)); } catch {}
    if (!seen) setShow(true);
    const replay = () => setShow(true);
    window.addEventListener('afgan:tour', replay);
    return () => window.removeEventListener('afgan:tour', replay);
  }, [userId]);
  if (!show) return null;
  const done = () => {
    try { localStorage.setItem(tourKey(userId), new Date().toISOString()); } catch {}
    setShow(false);
  };
  return <Tour name={name} role={role} onDone={done} />;
}
