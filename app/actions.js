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

  // Crew: keep answers of people who stay, add new as pending.
  const { data: oldCrew } = await supabase.from('event_staff').select('user_id').eq('event_id', id);
  const keep = new Set(data.crew || []);
  const gone = (oldCrew || []).map((c) => c.user_id).filter((u) => !keep.has(u));
  if (gone.length) await supabase.from('event_staff').delete().eq('event_id', id).in('user_id', gone);
  const had = new Set((oldCrew || []).map((c) => c.user_id));
  const added = [...keep].filter((u) => !had.has(u)).map((u) => ({ event_id: id, user_id: u }));
  if (added.length) await supabase.from('event_staff').insert(added);

  // Equipment: replace.
  await supabase.from('event_equipment').delete().eq('event_id', id);
  const eq = (data.equipment || []).filter((x) => x.quantity > 0).map((x) => ({ event_id: id, equipment_id: x.id, quantity: x.quantity }));
  if (eq.length) await supabase.from('event_equipment').insert(eq);

  if (isAdmin) {
    await supabase.from('event_finance').upsert({
      event_id: id, price: Number(data.price || 0), payment_status: data.payment_status || 'unpaid',
      client_name: clean(data.client_name), client_phone: clean(data.client_phone),
    });
    await supabase.from('event_vendors').delete().eq('event_id', id);
    const vs = (data.vendors || []).filter((v) => v.name).map((v) => ({
      event_id: id, type: v.type || 'ספק', name: v.name, arrival_time: clean(v.arrival_time),
      cost: Number(v.cost || 0), paid_by: v.paid_by === 'client' ? 'client' : 'us', status: v.status === 'confirmed' ? 'confirmed' : 'pending',
    }));
    if (vs.length) await supabase.from('event_vendors').insert(vs);
  }
  revalidatePath('/');
  revalidatePath('/events');
  return { id };
}

export async function deleteEvent(id) {
  const { supabase, canEdit } = await getMe();
  if (!canEdit) return;
  await supabase.from('events').update({ status: 'cancelled' }).eq('id', id);
  revalidatePath('/');
  redirect('/events');
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
  for (const it of items) {
    if (it.quantity > 0) await supabase.from('equipment').upsert({ category, name: it.name, quantity: it.quantity }, { onConflict: 'category,name' });
    else await supabase.from('equipment').delete().eq('category', category).eq('name', it.name);
  }
  revalidatePath('/inventory');
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
