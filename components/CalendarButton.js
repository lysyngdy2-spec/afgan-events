'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calendarPayload, setGoogleEventId } from '@/app/actions';
import { cachedToken, goAuthorize, syncEvent } from '@/lib/gcal';

export default function CalendarButton({ id, email }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const go = () => start(async () => {
    const token = cachedToken();
    if (!token) return goAuthorize(email, id);
    const ok = await syncEvent(token, id, { calendarPayload, setGoogleEventId });
    if (ok) setDone(true);
    router.replace(`/events/${id}?cal=${ok ? 1 : 0}`);
  });
  return (
    <button type="button" className="glass tap" onClick={go} disabled={pending || done}
      style={{ padding: '12px 16px', borderRadius: 16, width: '100%', color: 'inherit', font: 'inherit' }}>
      {pending ? 'שולח…' : done ? '✓ נשלח ליומן גוגל' : 'שלח ליומן גוגל'}
    </button>
  );
}
