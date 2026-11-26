// Everything EventForm needs: crew list, inventory and (when editing/duplicating) the event.
// One round of parallel queries, so the form opens in the time of the slowest one.
export async function eventFormData(me, id, { duplicate = false } = {}) {
  const s = me.supabase;
  const none = Promise.resolve({ data: null });
  const [{ data: profiles }, { data: members }, { data: inventory }, { data: presets }, { data: e }, { data: finance }, { data: vendors }] = await Promise.all([
    s.from('profiles').select('id, name, email').order('name'),
    s.from('members').select('email, active'),
    s.from('equipment').select('id, category, name, quantity').order('category').order('name'),
    s.from('spec_presets').select('id, name, icon, items, setup_time, start_time, end_time, notes').order('name'),
    id ? s.from('events').select('*, event_staff(user_id), event_equipment(equipment_id, quantity)').eq('id', id).maybeSingle() : none,
    id && me.isAdmin ? s.from('event_finance').select('*').eq('event_id', id).maybeSingle() : none,
    id && me.isAdmin ? s.from('event_vendors').select('type, name, arrival_time, cost, paid_by, status').eq('event_id', id) : none,
  ]);
  const active = new Set((members || []).filter((m) => m.active).map((m) => m.email));
  let initial = null;
  if (e) {
    initial = { ...e, crew: e.event_staff.map((x) => x.user_id), equipment: e.event_equipment, finance, vendors: (vendors || []).map((v) => ({ ...v, arrival_time: v.arrival_time?.slice(0, 5) || '' })) };
    if (duplicate) initial = { ...initial, id: undefined, event_date: '', google_event_id: undefined, vendors: initial.vendors.map((v) => ({ ...v, status: 'pending' })), finance: initial.finance && { ...initial.finance, payment_status: 'unpaid' } };
  }
  return { members: (profiles || []).filter((p) => active.has(p.email)), inventory: inventory || [], presets: presets || [], initial };
}
