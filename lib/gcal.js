'use client';
// Writes events straight into the editor's Google Calendar and invites the crew,
// so they land in everyone's calendar within seconds. Runs in the browser with a
// short-lived token the editor grants; nothing secret is stored anywhere.
export const GOOGLE_CLIENT_ID = '611344344517-5dmc1n81q6vfnbmdvh65solvmq2maro2.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const KEY = 'gcal_token';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function loadScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = ok; s.onerror = () => fail(new Error('gsi'));
    document.head.appendChild(s);
  });
}

function cached() {
  try {
    const t = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return t && t.exp > Date.now() + 60000 ? t.token : null;
  } catch { return null; }
}

// Call early (page load) so the click handler can open the popup without delay.
export const warmUp = () => loadScript().catch(() => {});

// Must be called directly from a tap. Resolves to a token, or null if declined.
export async function getToken(email) {
  const have = cached();
  if (have) return have;
  try { await loadScript(); } catch { return null; }
  return new Promise((resolve) => {
    const done = (v) => { clearTimeout(timer); resolve(v); };
    const timer = setTimeout(() => resolve(null), 90000);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: SCOPE, login_hint: email || undefined, prompt: '',
      callback: (r) => {
        if (!r?.access_token) return done(null);
        try { sessionStorage.setItem(KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3000) * 1000 })); } catch {}
        done(r.access_token);
      },
      error_callback: () => done(null),
    });
    client.requestAccessToken();
  });
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
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  let res = p.google_event_id ? await send('PATCH', `${API}/${encodeURIComponent(p.google_event_id)}`) : null;
  // Not in this person's calendar (someone else created it, or it was deleted): make a new one.
  if (!res || res.status === 404 || res.status === 410) {
    if (p.cancelled) return { id: null };
    res = await send('POST', API);
  }
  if (res.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} }
  if (!res.ok) return { error: `Google ${res.status}` };
  return { id: (await res.json()).id };
}
