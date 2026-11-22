import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// RFC 5545: lines max 75 octets, continuation starts with a space.
const fold = (line) => {
  const out = []; let cur = ''; let len = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (len + b > 74) { out.push(cur); cur = ' '; len = 1; }
    cur += ch; len += b;
  }
  return [...out, cur].join('\r\n');
};

export async function GET(_req, { params }) {
  const token = String((await params).token || '').replace(/\.ics$/, '');
  if (!UUID.test(token)) return new Response('Not found', { status: 404 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc('calendar_feed', { p_token: token });
  if (error) return new Response('Error', { status: 500 });

  const now = utc(Date.now());
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Afgan S&L//Events//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Afgan S&L', 'X-WR-TIMEZONE:Asia/Jerusalem',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of data || []) {
    const desc = [
      e.my_status === 'pending' ? 'ממתין לאישור שלך באפליקציה' : null,
      e.crew ? `צוות: ${e.crew}` : null,
      e.notes || null,
      `https://afgan-sl.vercel.app/events/${e.id}`,
    ].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@afgan-sl`,
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${utc(e.updated_at)}`,
      `SEQUENCE:${Math.floor(new Date(e.updated_at).getTime() / 1000) % 2147483647}`,
      `DTSTART:${utc(e.starts)}`,
      `DTEND:${utc(e.ends)}`,
      `SUMMARY:${esc((e.my_status === 'pending' ? '❓ ' : '') + e.title)}`,
      e.location ? `LOCATION:${esc(e.location)}` : null,
      `DESCRIPTION:${esc(desc)}`,
      `URL:https://afgan-sl.vercel.app/events/${e.id}`,
      `STATUS:${e.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:-P1D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:-PT3H', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  const body = lines.filter(Boolean).map(fold).join('\r\n') + '\r\n';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="afgan-sl.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
