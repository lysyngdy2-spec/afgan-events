import { today } from './format';

// Upcoming events the caller can see, with crew. RLS decides what "can see" means.
export async function upcomingEvents(supabase, { limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, setup_time, start_time, end_time, location, status, event_staff(user_id, status, profiles(name))')
    .gte('event_date', today())
    .neq('status', 'cancelled')
    .order('event_date')
    .order('start_time')
    .limit(limit);
  if (error) throw error;
  return data;
}

function hoursBetween(e) {
  const [sh, sm] = (e.setup_time || e.start_time).split(':').map(Number);
  const [eh, em] = e.end_time.split(':').map(Number);
  let h = eh + em / 60 - (sh + sm / 60);
  if (h <= 0) h += 24;
  return h;
}

// Cost of one crew member on one event.
export function staffCost(row, event, rate) {
  if (row.pay_override != null) return Number(row.pay_override);
  if (!rate) return 0;
  return rate.rate_type === 'hour' ? Number(rate.amount) * Number(row.hours ?? hoursBetween(event)) : Number(rate.amount);
}

// Money summary for a date range. Admin only (RLS returns nothing otherwise).
export async function moneySummary(supabase, from, to) {
  const [{ data: events }, { data: rates }, { data: expenses }] = await Promise.all([
    supabase.from('events')
      .select('id, title, event_date, setup_time, start_time, end_time, status, event_finance(price, payment_status), event_staff(user_id, status, hours, pay_override, profiles(email, name)), event_vendors(cost, paid_by)')
      .gte('event_date', from).lte('event_date', to).neq('status', 'cancelled').order('event_date'),
    supabase.from('rates').select('email, rate_type, amount'),
    supabase.from('expenses').select('amount, spent_on, description, event_id').gte('spent_on', from).lte('spent_on', to),
  ]);
  const rateBy = Object.fromEntries((rates || []).map((r) => [r.email, r]));
  const rows = (events || []).map((e) => {
    const fin = e.event_finance || {};
    const crew = (e.event_staff || []).filter((s) => s.status !== 'declined');
    const crewCost = crew.reduce((t, s) => t + staffCost(s, e, rateBy[s.profiles?.email]), 0);
    const vendorCost = (e.event_vendors || []).filter((v) => v.paid_by === 'us').reduce((t, v) => t + Number(v.cost), 0);
    const price = Number(fin.price || 0);
    return { ...e, price, paymentStatus: fin.payment_status || 'unpaid', crewCost, vendorCost, profit: price - crewCost - vendorCost };
  });
  const otherExpenses = (expenses || []).reduce((t, x) => t + Number(x.amount), 0);
  const income = rows.filter((r) => r.paymentStatus === 'paid').reduce((t, r) => t + r.price, 0);
  const open = rows.filter((r) => r.paymentStatus !== 'paid').reduce((t, r) => t + r.price, 0);
  const crewTotal = rows.reduce((t, r) => t + r.crewCost, 0);
  const vendorTotal = rows.reduce((t, r) => t + r.vendorCost, 0);
  const profit = rows.reduce((t, r) => t + r.price, 0) - crewTotal - vendorTotal - otherExpenses;
  // Pay owed per worker
  const perWorker = {};
  for (const e of events || []) for (const s of e.event_staff || []) {
    if (s.status === 'declined') continue;
    const k = s.profiles?.name || '?';
    perWorker[k] = (perWorker[k] || 0) + staffCost(s, e, rateBy[s.profiles?.email]);
  }
  return { rows, income, open, crewTotal, vendorTotal, otherExpenses, profit, perWorker, expenses: expenses || [] };
}

export function monthRange(d = today()) {
  const [y, m] = d.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${last}`];
}
