'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe, requireAdmin } from '@/lib/session';

const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

export async function answerAssignment(eventId, status) {
  const { supabase, user } = await getMe();
  if (!['confirmed', 'declined'].includes(status)) return;
  await supabase.from('event_staff').update({ status }).eq('event_id', eventId).eq('user_id', user.id);
  revalidatePath('/');
  revalidatePath(`/events/${eventId}`);
}

// data comes from EventForm as one object.
export async function saveEvent(data) {
  const { supabase, user, isAdmin, canEdit } = await getMe();
  if (!canEdit) return { error: 'אין הרשאה' };
  if (!data.title || !data.event_date || !data.start_time || !data.end_time) return { error: 'חסרים שם, תאריך או שעות' };

  const row = {
    title: clean(data.title), event_date: data.event_date, setup_time: clean(data.setup_time),
    start_time: data.start_time, end_time: data.end_time, location: clean(data.location), notes: clean(data.notes),
    contact_name: clean(data.contact_name), contact_phone: clean(data.contact_phone), status: data.status || 'confirmed',
    updated_at: new Date().toISOString(),
  };
  let id = data.id;
  if (id) {
    const { error } = await supabase.from('events').update(row).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data: ins, error } = await supabase.from('events').insert({ ...row, created_by: user.id }).select('id').single();
    if (error) return { error: error.message };
    id = ins.id;
  }

  // Crew: keep answers of people who stay, add new as pending. Equipment: replace.
  const [{ data: oldCrew }] = await Promise.all([
    supabase.from('event_staff').select('user_id').eq('event_id', id),
    supabase.from('event_equipment').delete().eq('event_id', id),
  ]);
  const keep = new Set(data.crew || []);
  const gone = (oldCrew || []).map((c) => c.user_id).filter((u) => !keep.has(u));
  const had = new Set((oldCrew || []).map((c) => c.user_id));
  const added = [...keep].filter((u) => !had.has(u)).map((u) => ({ event_id: id, user_id: u }));
  const eq = (data.equipment || []).filter((x) => x.quantity > 0).map((x) => ({ event_id: id, equipment_id: x.id, quantity: x.quantity }));
  // Money and vendors don't depend on the crew/equipment writes, so all of it goes out together.
  const adminWork = isAdmin ? (async () => {
    const vs = (data.vendors || []).filter((v) => v.name).map((v) => ({
      event_id: id, type: v.type || 'ספק', name: v.name, arrival_time: clean(v.arrival_time),
      cost: Number(v.cost || 0), paid_by: v.paid_by === 'client' ? 'client' : 'us', status: v.status === 'confirmed' ? 'confirmed' : 'pending',
    }));
    const [fin, del] = await Promise.all([
      supabase.from('event_finance').upsert({
        event_id: id, price: Number(data.price || 0), payment_status: data.payment_status || 'unpaid',
        client_name: clean(data.client_name), client_phone: clean(data.client_phone),
      }),
      supabase.from('event_vendors').delete().eq('event_id', id),
    ]);
    const ins = !del.error && vs.length ? await supabase.from('event_vendors').insert(vs) : {};
    return fin.error || del.error || ins.error ? { error: (fin.error || del.error || ins.error) } : {};
  })() : {};
  const results = await Promise.all([
    gone.length ? supabase.from('event_staff').delete().eq('event_id', id).in('user_id', gone) : {},
    added.length ? supabase.from('event_staff').insert(added) : {},
    eq.length ? supabase.from('event_equipment').insert(eq) : {},
    adminWork,
  ]);
  const failed = results.find((r) => r.error);
  if (failed) return { error: 'האירוע נשמר, אבל חלק מהפרטים לא: ' + failed.error.message, id };

  revalidatePath('/');
  revalidatePath('/events');
  return { id };
}

export async function deleteEvent(id) {
  const { supabase, canEdit } = await getMe();
  if (!canEdit) return { error: 'אין הרשאה' };
  const { error } = await supabase.from('events').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/');
  revalidatePath('/events');
  return error ? { error: error.message } : { ok: true };
}

// What the browser needs to write this event into Google Calendar. No money.
export async function calendarPayload(id) {
  const { supabase, canEdit, profile } = await getMe();
  if (!canEdit) return null;
  const { data: e } = await supabase.from('events')
    .select('id, title, event_date, setup_time, start_time, end_time, location, notes, status, google_event_id, event_staff(status, profiles(email, name))')
    .eq('id', id).maybeSingle();
  if (!e) return null;
  const crew = (e.event_staff || []).filter((s) => s.status !== 'declined' && s.profiles);
  const from = (e.setup_time || e.start_time).slice(0, 5);
  const to = e.end_time.slice(0, 5);
  let endDate = e.event_date;
  if (to <= e.start_time.slice(0, 5)) {
    const d = new Date(e.event_date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
    endDate = d.toISOString().slice(0, 10);
  }
  const url = `https://afgan-sl.vercel.app/events/${e.id}`;
  return {
    google_event_id: e.google_event_id, title: e.title, location: e.location, url,
    start: `${e.event_date}T${from}:00`, end: `${endDate}T${to}:00`,
    cancelled: e.status === 'cancelled',
    attendees: crew.map((s) => s.profiles.email).filter((m) => m !== profile.email),
    description: [
      e.setup_time ? `הקמה ${from}, אירוע ${e.start_time.slice(0, 5)} עד ${to}` : null,
      crew.length ? `צוות: ${crew.map((s) => s.profiles.name).join(', ')}` : null,
      e.notes || null,
      `כל הפרטים והמפרט: ${url}`,
    ].filter(Boolean).join('\n'),
  };
}

export async function setGoogleEventId(id, googleId) {
  const { supabase, canEdit } = await getMe();
  if (!canEdit) return;
  await supabase.from('events').update({ google_event_id: googleId ? String(googleId).slice(0, 200) : null }).eq('id', id);
}

export async function clashes(p) {
  const { supabase, canEdit } = await getMe();
  if (!canEdit || !p.event_date || !p.start_time || !p.end_time) return { staff: [], booked: [] };
  const args = { p_date: p.event_date, p_setup: p.setup_time || null, p_start: p.start_time, p_end: p.end_time, p_exclude: p.id || null };
  const [{ data: staff }, { data: booked }] = await Promise.all([
    supabase.rpc('staff_clashes', args),
    supabase.rpc('equipment_booked', args),
  ]);
  return { staff: staff || [], booked: booked || [] };
}

// Presets ("תבניות"): built by Nir or an editor. Gear is stored by catalog model
// (category + name), so a template can hold gear that isn't in the warehouse yet.
const ICONS = ['sound', 'lights', 'mic', 'stage', 'party', 'wedding', 'talk', 'dj'];
const hhmm = (t) => (/^\d{2}:\d{2}/.test(t || '') ? t.slice(0, 5) : null);
export async function savePreset(p) {
  const { supabase, user, canEdit, isAdmin } = await getMe();
  if (!canEdit) return { error: 'אין הרשאה' };
  const name = String(p?.name || '').trim().slice(0, 60);
  const items = (p?.items || [])
    .filter((x) => x && x.name && x.category && Number(x.quantity) > 0)
    .map((x) => ({ category: String(x.category), name: String(x.name).slice(0, 120), quantity: Math.min(999, Math.round(Number(x.quantity))) }));
  if (!name) return { error: 'צריך שם לסט' };
  if (!items.length) return { error: 'הסט ריק. הוסף לפחות פריט ציוד אחד.' };
  const row = {
    name, items, icon: ICONS.includes(p.icon) ? p.icon : 'sound',
    setup_time: hhmm(p.setup_time), start_time: hhmm(p.start_time), end_time: hhmm(p.end_time),
    notes: String(p.notes || '').trim().slice(0, 1000) || null,
    created_by: user.id, updated_at: new Date().toISOString(),
  };
  const q = p.id ? supabase.from('spec_presets').update(row).eq('id', p.id) : supabase.from('spec_presets').insert(row);
  const { data, error } = await q.select('id, name, icon, items, setup_time, start_time, end_time, notes').single();
  if (error) return { error: error.code === '23505' ? 'כבר יש סט בשם הזה' : error.message };
  // Nir picks gear he owns: anything new in the template joins the warehouse, so events built
  // from it get real items. Existing quantities are never lowered.
  if (isAdmin) {
    const { data: have } = await supabase.from('equipment').select('category, name');
    const known = new Set((have || []).map((e) => `${e.category}|${e.name}`));
    const add = items.filter((x) => !known.has(`${x.category}|${x.name}`));
    if (add.length) await supabase.from('equipment').insert(add);
  }
  revalidatePath('/presets');
  revalidatePath('/events/new');
  return { preset: data };
}

export async function deletePreset(id) {
  const { supabase, canEdit } = await getMe();
  if (!canEdit) return { error: 'אין הרשאה' };
  const { error } = await supabase.from('spec_presets').delete().eq('id', id);
  revalidatePath('/presets');
  revalidatePath('/events/new');
  return error ? { error: error.message } : { ok: true };
}

// Team
export async function saveMember(form) {
  const { supabase } = await requireAdmin();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const name = String(form.get('name') || '').trim();
  if (!email.includes('@') || !name) return;
  await supabase.from('members').upsert({
    email, name, role: form.get('role') === 'admin' ? 'admin' : 'worker',
    can_edit_events: form.get('can_edit') === 'on', active: true,
  });
  await supabase.from('rates').upsert({ email, rate_type: form.get('rate_type') === 'hour' ? 'hour' : 'day', amount: Number(form.get('rate') || 0) });
  revalidatePath('/team');
}

export async function setMemberActive(email, active) {
  const { supabase, profile } = await requireAdmin();
  if (email === profile.email) return;
  await supabase.from('members').update({ active }).eq('email', email);
  revalidatePath('/team');
}

// Inventory
export async function saveInventory(category, items) {
  const { supabase } = await requireAdmin();
  const keep = items.filter((it) => it.quantity > 0).map((it) => ({ category, name: it.name, quantity: it.quantity }));
  const drop = items.filter((it) => !(it.quantity > 0)).map((it) => it.name);
  const [a, b] = await Promise.all([
    keep.length ? supabase.from('equipment').upsert(keep, { onConflict: 'category,name' }) : {},
    drop.length ? supabase.from('equipment').delete().eq('category', category).in('name', drop) : {},
  ]);
  revalidatePath('/inventory');
  const error = a.error || b.error;
  return error ? { error: error.code === '23503' ? 'אי אפשר להסיר ציוד שמשובץ לאירוע' : error.message } : { ok: true };
}

// Money
export async function addExpense(form) {
  const { supabase } = await requireAdmin();
  const amount = Number(form.get('amount'));
  const description = String(form.get('description') || '').trim();
  if (!amount || !description) return;
  await supabase.from('expenses').insert({ amount, description, spent_on: form.get('spent_on') || undefined });
  revalidatePath('/money');
}

export async function setPayment(eventId, payment_status) {
  const { supabase } = await requireAdmin();
  await supabase.from('event_finance').upsert({ event_id: eventId, payment_status }, { onConflict: 'event_id' });
  revalidatePath('/money');
}

// Gear from a photo: any member may add a new model to the warehouse.
export async function addGear(g) {
  const { supabase, user } = await getMe();
  const name = String(g?.name || '').trim().slice(0, 80);
  const category = String(g?.category || '').trim();
  const quantity = Math.max(1, Math.min(999, Math.round(Number(g?.quantity) || 1)));
  if (!name || !category) return { error: 'חסרים שם וסוג' };
  const base = `${String(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '')}/storage/v1/object/public/equipment/${user.id}/`;
  const tail = typeof g.photo_url === 'string' && g.photo_url.startsWith(base) ? g.photo_url.slice(base.length) : '';
  const photo_url = /^[0-9a-f-]{36}\.(webp|jpg)$/.test(tail) ? g.photo_url : null;
  const tone = /^#[0-9a-fA-F]{6}$/.test(g?.tone || '') ? g.tone : null;
  const { data, error } = await supabase.from('equipment')
    .insert({ category, name, quantity, photo_url, tone, catalog_group: g.group || null, added_by: user.id })
    .select('id, category, name, quantity, photo_url, tone, catalog_group').single();
  if (error) return { error: error.code === '23505' ? 'הדגם הזה כבר במחסן' : error.message };
  for (const path of ['/inventory', '/events/new', '/presets/new']) revalidatePath(path);
  return { row: { ...data, group: data.catalog_group } };
}
