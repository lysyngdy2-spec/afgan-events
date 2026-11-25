'use client';
export default function ReplayTour() {
  return (
    <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={() => window.dispatchEvent(new Event('afgan:tour'))}>
      הדרכה: איך עובדים עם האפליקציה
    </button>
  );
}
