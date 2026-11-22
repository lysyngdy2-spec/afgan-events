'use client';
// Writes events straight into the editor's Google Calendar and invites the crew,
// so they land in everyone's calendar within seconds. Runs in the browser with a
// short-lived token the editor grants; nothing secret is stored anywhere.
export const GOOGLE_CLIENT_ID = '611344344517-5dmc1n81q6vfnbmdvh65solvmq2maro2.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const KEY = 'gcal_token';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const REDIRECT = 'https://afgan-sl.vercel.app/gcal';

export function cachedToken() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || 'null');
    return t && t.exp > Date.now() + 60000 ? t.token : null;
  } catch { return null; }
}

// Full-page trip to Google and back to /gcal (popups don't return to an installed app).
// After the first approval Google bounces straight back without showing anything.
export function goAuthorize(email, eventId) {
  const nonce = crypto.randomUUID();
  try { localStorage.setItem('gcal_nonce', nonce); } catch {}
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID, redirect_uri: REDIRECT, response_type: 'token',
    scope: SCOPE, state: `${nonce}.${eventId}`,
  });
  if (email) q.set('login_hint', email);
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}

// Reads Google's answer from the URL fragment on /gcal. Returns { token, eventId }.
export function readAnswer() {
  const h = new URLSearchParams(window.location.hash.slice(1));
  const [nonce, eventId] = (h.get('state') || '').split('.');
  let ok = false;
  try { ok = !!nonce && nonce === localStorage.getItem('gcal_nonce'); localStorage.removeItem('gcal_nonce'); } catch {}
  const token = ok ? h.get('access_token') : null;
  if (token) try { localStorage.setItem(KEY, JSON.stringify({ token, exp: Date.now() + (Number(h.get('expires_in')) || 3000) * 1000 })); } catch {}
  history.replaceState(null, '', window.location.pathname);
  return { token, eventId: ok ? eventId : null };
}

// payload comes from the server (calendarPayload). Returns { id } or { error }.
export async function pushEvent(token, p) {
  const body = {
    summary: p.title, location: p.location || undefined, description: p.description,
    start: { dateTime: p.start, timeZone: 'Asia/Jerusalem' },
    end: { dateTime: p.end, timeZone: 'Asia/Jerusalem' },
    attendees: p.attendees.map((email) => ({ email })),
    status: p.cancelled ? 'cancelled' : 'confirmed',
    guestsCanInviteOthers: false,
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10080 }, { method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 180 }] },
    source: { title: 'Afgan S&L', url: p.url },
  };
  const send = (method, url) => fetch(`${url}?sendUpdates=all`, {
    method, signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  let res = p.google_event_id ? await send('PATCH', `${API}/${encodeURIComponent(p.google_event_id)}`) : null;
  // Not in this person's calendar (someone else created it, or it was deleted): make a new one.
  if (!res || res.status === 404 || res.status === 410) {
    if (p.cancelled) return { id: null };
    res = await send('POST', API);
  }
  if (res.status === 401) { try { localStorage.removeItem(KEY); } catch {} }
  if (!res.ok) return { error: `Google ${res.status}` };
  return { id: (await res.json()).id };
}

// Fetch the event from our server and write it to Google. Returns true on success.
export async function syncEvent(token, id, { calendarPayload, setGoogleEventId }) {
  try {
    const payload = await calendarPayload(id);
    if (!token || !payload) return false;
    const res = await pushEvent(token, payload);
    if (res.error) return false;
    if (res.id !== payload.google_event_id) await setGoogleEventId(id, res.id);
    return true;
  } catch { return false; }
}
