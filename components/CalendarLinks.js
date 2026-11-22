'use client';
import { useState } from 'react';

export default function CalendarLinks({ token }) {
  const [copied, setCopied] = useState(false);
  const https = `https://afgan-sl.vercel.app/api/ics/${token}.ics`;
  const webcal = https.replace('https://', 'webcal://');
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(https); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <a className="btn full" href={webcal}>אייפון: הוסף ליומן</a>
      <a className="btn ghost full" href={google} target="_blank" rel="noopener">אנדרואיד / גוגל: הוסף ליומן</a>
      <button type="button" className="btn ghost full" onClick={copy}>{copied ? 'הועתק' : 'העתק קישור ליומן'}</button>
    </div>
  );
}
