'use client';
import { useTransition } from 'react';
import { answerAssignment } from '@/app/actions';

export default function AnswerButtons({ eventId, status }) {
  const [pending, start] = useTransition();
  const answer = (s) => start(() => answerAssignment(eventId, s));
  if (status === 'confirmed') return <span className="small" style={{ color: 'var(--green)' }}>אישרת · <button onClick={() => answer('declined')} style={{ background: 'none', border: 0, color: 'var(--muted)', font: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 8 }}>לא אוכל להגיע</button></span>;
  return (
    <div className="grid2">
      <button className="btn light" disabled={pending} onClick={() => answer('confirmed')}>מאשר</button>
      <button className="btn ghost" disabled={pending} onClick={() => answer('declined')}>{status === 'declined' ? 'סירבת' : 'לא יכול'}</button>
    </div>
  );
}
