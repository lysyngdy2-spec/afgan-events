'use client';
// Landing page for the trip back from Google: write the event to the calendar, then show it.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendarPayload, setGoogleEventId } from '@/app/actions';
import { readAnswer, syncEvent } from '@/lib/gcal';

export default function GcalReturn() {
  const router = useRouter();
  const [msg, setMsg] = useState('שולח ליומן גוגל…');
  useEffect(() => {
    (async () => {
      const { token, eventId } = readAnswer();
      if (!eventId) return router.replace('/events');
      const payload = token ? await calendarPayload(eventId).catch(() => null) : null;
      const ok = token ? await syncEvent(token, eventId, { calendarPayload, setGoogleEventId }) : false;
      setMsg(ok ? 'נשלח' : 'לא נשלח');
      router.replace(payload?.cancelled ? '/events' : `/events/${eventId}?cal=${ok ? 1 : 0}`);
    })();
  }, [router]);
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--muted, #9aa0aa)' }}><p role="status">{msg}</p></main>;
}
