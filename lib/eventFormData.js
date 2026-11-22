// Everything EventForm needs: crew list, inventory and (when editing/duplicating) the event.
export async function eventFormData(me, id, { duplicate = false } = {}) {
  const s = me.supabase;
  const [{ data: profiles }, { data: members }, { data: inventory }, { data: presets }] = await Promise.all([
    s.from('profiles').select('id, name, email').order('name'),
    s.from('members').select('email, active'),
    s.from('equipment').select('id, category, name, quantity').order('category').order('name'),
    s.from('spec_presets').select('id, name, items').order('name'),
  ]);
  const active = new Set((members || []).filter((m) => m.active).map((m) => m.email));
  let initial = null;
  if (id) {
    const { data: e } = await s.from('events').select('*, event_staff(user_id), event_equipment(equipment_id, quantity)').eq('id', id).maybeSingle();
    if (e) {
      const finance = me.isAdmin ? (await s.from('event_finance').select('*').eq('event_id', id).maybeSingle()).data : null;
      const vendors = me.isAdmin ? (await s.from('event_vendors').select('type, name, arrival_time, cost, paid_by, status').eq('event_id', id)).data : [];
      initial = { ...e, crew: e.event_staff.map((x) => x.user_id), equipment: e.event_equipment, finance, vendors: (vendors || []).map((v) => ({ ...v, arrival_time: v.arrival_time?.slice(0, 5) || '' })) };
      if (duplicate) initial = { ...initial, id: undefined, event_date: '', vendors: initial.vendors.map((v) => ({ ...v, status: 'pending' })), finance: initial.finance && { ...initial.finance, payment_status: 'unpaid' } };
    }
  }
  return { members: (profiles || []).filter((p) => active.has(p.email)), inventory: inventory || [], presets: presets || [], initial };
}
