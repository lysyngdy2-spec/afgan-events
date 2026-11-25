// Ready-made event sets. Each set says what a typical event of that kind needs,
// scaled by the number of guests. Quantities are starting points, not rules:
// everything lands in the normal event form, where it can be changed.
//
// A "slot" asks for gear by catalog category id (and optionally a catalog group),
// so it can be matched against whatever Nir actually has in the warehouse.

const by = (g, steps) => {
  // steps: [[maxGuests, qty], ...] ascending; last one covers everything above.
  for (const [max, q] of steps) if (g <= max) return q;
  return steps[steps.length - 1][1];
};

export const SETS = [
  {
    id: 'wedding', name: 'חתונה', blurb: 'חופה, ריקודים ומסך לד גדול',
    guests: { min: 100, max: 800, step: 50, def: 350 },
    times: { setup: '15:00', start: '19:30', end: '01:00' },
    scene: { tables: 'round', dance: true, dj: true, chuppah: true, truss: true },
    slots: (g) => [
      { key: 'console', cat: 'mixers', group: 'דיגיטליים', label: 'מיקסר דיגיטלי', qty: 1 },
      { key: 'dj', cat: 'mixers', group: 'DJ', label: 'עמדת DJ (מיקסר ו־2 נגנים)', qty: 3 },
      { key: 'tops', cat: 'speakers', group: 'ראשיים אקטיביים', label: 'רמקולים ראשיים', qty: by(g, [[200, 2], [450, 4], [800, 6]]) },
      { key: 'subs', cat: 'subs', label: 'סאבים', qty: by(g, [[200, 2], [450, 4], [800, 6]]) },
      { key: 'wedges', cat: 'monitors', label: 'מוניטור ל־DJ', qty: 1 },
      { key: 'wireless', cat: 'mics', group: 'אלחוטיים', label: 'מיקרופונים אלחוטיים', qty: 2 },
      { key: 'heads', cat: 'lighting', group: 'ראשים נעים', label: 'ראשים נעים', qty: by(g, [[250, 4], [500, 8], [800, 12]]) },
      { key: 'pars', cat: 'lighting', group: 'פרים ופאר-לד', label: 'פאר לד לאווירה', qty: by(g, [[250, 8], [500, 12], [800, 16]]) },
      { key: 'fx', cat: 'lighting', group: 'לייזר ואפקטים מיוחדים', label: 'עשן ואפקטים', qty: 2 },
      { key: 'led', cat: 'led', label: 'מסך לד', qty: g >= 300 ? 1 : 0 },
      { key: 'truss', cat: 'stage', label: 'טראסים ועמודים', qty: 2 },
      { key: 'power', cat: 'power', label: 'לוח חשמל וכבילה', qty: 1 },
    ],
    vendors: (g) => (g >= 300 ? ['התקנת מסך לד'] : []),
    notes: ['בדיקת סאונד לפני כניסת אורחים', 'מיקרופון אלחוטי מוכן לחופה', 'שיר כניסה לחופה מוכן אצל ה־DJ', 'עשן כבוי בזמן החופה'],
  },
  {
    id: 'barmitzvah', name: 'בר / בת מצווה', blurb: 'ברכות, מצגת ורחבת ריקודים',
    guests: { min: 80, max: 500, step: 20, def: 220 },
    times: { setup: '15:30', start: '19:00', end: '23:30' },
    scene: { tables: 'round', dance: true, dj: true, truss: true },
    slots: (g) => [
      { key: 'console', cat: 'mixers', group: 'דיגיטליים', label: 'מיקסר דיגיטלי', qty: 1 },
      { key: 'dj', cat: 'mixers', group: 'DJ', label: 'עמדת DJ (מיקסר ו־2 נגנים)', qty: 3 },
      { key: 'tops', cat: 'speakers', group: 'ראשיים אקטיביים', label: 'רמקולים ראשיים', qty: by(g, [[200, 2], [500, 4]]) },
      { key: 'subs', cat: 'subs', label: 'סאבים', qty: by(g, [[200, 2], [500, 4]]) },
      { key: 'wedges', cat: 'monitors', label: 'מוניטור ל־DJ', qty: 1 },
      { key: 'wireless', cat: 'mics', group: 'אלחוטיים', label: 'מיקרופונים אלחוטיים לברכות', qty: 3 },
      { key: 'heads', cat: 'lighting', group: 'ראשים נעים', label: 'ראשים נעים', qty: by(g, [[200, 4], [500, 6]]) },
      { key: 'pars', cat: 'lighting', group: 'פרים ופאר-לד', label: 'פאר לד לאווירה', qty: by(g, [[200, 6], [500, 10]]) },
      { key: 'fx', cat: 'lighting', group: 'לייזר ואפקטים מיוחדים', label: 'עשן ואפקטים', qty: 1 },
      { key: 'led', cat: 'led', label: 'מסך למצגת', qty: 1 },
      { key: 'truss', cat: 'stage', label: 'טראסים ועמודים', qty: 2 },
      { key: 'power', cat: 'power', label: 'לוח חשמל וכבילה', qty: 1 },
    ],
    vendors: () => [],
    notes: ['מצגת על מחשב מוכנה ונבדקה', 'סדר ברכות ושמות המברכים אצל ה־DJ', 'מיקרופון לנער/ה בגובה הנכון'],
  },
  {
    id: 'conference', name: 'כנס / הרצאה', blurb: 'דיבור ברור, מסך ושורות כיסאות',
    guests: { min: 30, max: 600, step: 10, def: 150 },
    times: { setup: '07:00', start: '09:00', end: '16:00' },
    scene: { tables: 'rows', podium: true, screen: true },
    slots: (g) => [
      { key: 'console', cat: 'mixers', group: 'דיגיטליים', label: 'מיקסר דיגיטלי', qty: 1 },
      { key: 'tops', cat: 'speakers', group: g > 250 ? 'ראשיים אקטיביים' : 'קולונות ומערכות ניידות', label: g > 250 ? 'רמקולים ראשיים' : 'קולונות', qty: by(g, [[100, 2], [300, 2], [600, 4]]) },
      { key: 'subs', cat: 'subs', label: 'סאב', qty: g > 250 ? 1 : 0 },
      { key: 'wedges', cat: 'monitors', label: 'מוניטור לבמה', qty: 1 },
      { key: 'wireless', cat: 'mics', group: 'אלחוטיים', label: 'מיקרופונים אלחוטיים לשאלות', qty: 2 },
      { key: 'lav', cat: 'mics', group: 'דש ומדונה', label: 'מיקרופוני דש / מדונה', qty: 2 },
      { key: 'podium', cat: 'mics', group: 'חוטיים', label: 'מיקרופון לפודיום', qty: 1 },
      { key: 'source', cat: 'playback', label: 'מקור / מחשב למצגות', qty: 1 },
      { key: 'front', cat: 'lighting', group: 'פרופיל, פולו ותאטרון', label: 'תאורה קדמית לדובר', qty: by(g, [[150, 2], [600, 4]]) },
      { key: 'pars', cat: 'lighting', group: 'פרים ופאר-לד', label: 'פאר לד לבמה', qty: by(g, [[150, 4], [600, 8]]) },
      { key: 'led', cat: 'led', label: 'מסך / מקרן', qty: 1 },
      { key: 'stage', cat: 'stage', label: 'במה', qty: 1 },
      { key: 'comms', cat: 'comms', label: 'קשר להפקה', qty: 2 },
      { key: 'power', cat: 'power', label: 'חשמל וכבילה', qty: 1 },
    ],
    vendors: () => [],
    notes: ['בדיקת מצגות וממיר HDMI לכל מרצה', 'סוללות חדשות לכל אלחוטי', 'מים על הפודיום'],
  },
  {
    id: 'party', name: 'מסיבה', blurb: 'DJ, באס חזק ותאורה זזה',
    guests: { min: 50, max: 1000, step: 50, def: 300 },
    times: { setup: '18:00', start: '22:00', end: '03:00' },
    scene: { tables: 'bar', dance: true, dj: true, truss: true },
    slots: (g) => [
      { key: 'dj', cat: 'mixers', group: 'DJ', label: 'עמדת DJ (מיקסר ו־2 נגנים)', qty: 3 },
      { key: 'tops', cat: 'speakers', group: 'ראשיים אקטיביים', label: 'רמקולים ראשיים', qty: by(g, [[200, 2], [500, 4], [1000, 8]]) },
      { key: 'subs', cat: 'subs', label: 'סאבים', qty: by(g, [[200, 2], [500, 4], [1000, 8]]) },
      { key: 'wedges', cat: 'monitors', label: 'מוניטור ל־DJ', qty: 2 },
      { key: 'wireless', cat: 'mics', group: 'אלחוטיים', label: 'מיקרופון אלחוטי', qty: 1 },
      { key: 'heads', cat: 'lighting', group: 'ראשים נעים', label: 'ראשים נעים', qty: by(g, [[200, 4], [500, 8], [1000, 16]]) },
      { key: 'strobes', cat: 'lighting', group: 'סטרובים, בליינדרים ולד בר', label: 'סטרובים ולד בר', qty: by(g, [[200, 2], [1000, 4]]) },
      { key: 'fx', cat: 'lighting', group: 'לייזר ואפקטים מיוחדים', label: 'לייזר ועשן', qty: by(g, [[300, 2], [1000, 4]]) },
      { key: 'led', cat: 'led', label: 'מסך לד מאחורי ה־DJ', qty: g >= 400 ? 1 : 0 },
      { key: 'truss', cat: 'stage', label: 'טראסים ועמודים', qty: 2 },
      { key: 'power', cat: 'power', label: 'לוח חשמל וכבילה', qty: 1 },
    ],
    vendors: (g) => (g >= 400 ? ['גנרטור וחשמלאי'] : []),
    notes: ['שעת סיום מוזיקה לפי האישור של המקום', 'אוזניות ל־DJ ומוניטור בווליום'],
  },
  {
    id: 'show', name: 'הופעה חיה', blurb: 'להקה על במה, מוניטורים ומערך גדול',
    guests: { min: 100, max: 2000, step: 100, def: 600 },
    times: { setup: '12:00', start: '20:30', end: '23:30' },
    scene: { tables: 'standing', band: true, truss: true, stageBig: true },
    slots: (g) => [
      { key: 'console', cat: 'mixers', group: 'דיגיטליים', label: 'מיקסר FOH', qty: 1 },
      { key: 'stagebox', cat: 'mixers', group: 'סטייג׳ בוקס ורשת', label: 'סטייג׳ בוקס', qty: 1 },
      { key: 'tops', cat: 'speakers', group: g > 500 ? 'ליין אריי' : 'ראשיים אקטיביים', label: g > 500 ? 'ליין אריי' : 'רמקולים ראשיים', qty: by(g, [[500, 4], [1000, 8], [2000, 12]]) },
      { key: 'subs', cat: 'subs', label: 'סאבים', qty: by(g, [[500, 4], [1000, 6], [2000, 8]]) },
      { key: 'wedges', cat: 'monitors', label: 'מוניטורים לבמה', qty: 6 },
      { key: 'vocal', cat: 'mics', group: 'חוטיים', label: 'מיקרופונים חוטיים', qty: 8 },
      { key: 'drums', cat: 'mics', group: 'סט תופים ובס', label: 'סט מיקרופונים לתופים', qty: 1 },
      { key: 'wireless', cat: 'mics', group: 'אלחוטיים', label: 'אלחוטיים לסולן', qty: 2 },
      { key: 'heads', cat: 'lighting', group: 'ראשים נעים', label: 'ראשים נעים', qty: by(g, [[500, 8], [2000, 16]]) },
      { key: 'pars', cat: 'lighting', group: 'פרים ופאר-לד', label: 'פאר לד', qty: by(g, [[500, 12], [2000, 24]]) },
      { key: 'strobes', cat: 'lighting', group: 'סטרובים, בליינדרים ולד בר', label: 'בליינדרים וסטרובים', qty: 4 },
      { key: 'desk', cat: 'lighting', group: 'שליטה בתאורה', label: 'שולחן תאורה', qty: 1 },
      { key: 'led', cat: 'led', label: 'מסך לד אחורי', qty: g >= 500 ? 1 : 0 },
      { key: 'truss', cat: 'stage', label: 'במה וטראסים', qty: 4 },
      { key: 'comms', cat: 'comms', label: 'קשר להפקה', qty: 4 },
      { key: 'power', cat: 'power', label: 'חשמל וכבילה', qty: 2 },
    ],
    vendors: () => ['הקמת במה', 'טראסים ותלייה'],
    notes: ['ריידר טכני מהאמן התקבל ונבדק', 'סאונדצ׳ק עם הלהקה לפני פתיחת דלתות', 'מפת ערוצים מודפסת על השולחן'],
  },
];

export const setById = (id) => SETS.find((s) => s.id === id);

// Catalog category id -> the Hebrew category name stored on equipment rows.
export const CATEGORY_NAMES = {
  mixers: 'מיקסרים ושולחנות', speakers: 'רמקולים ומערכות', subs: 'סאבים', monitors: 'מוניטורים',
  mics: 'מיקרופונים', playback: 'מקורות ונגנים', lighting: 'תאורה', led: 'מסכי לד ווידאו',
  stage: 'במות, טראסים ותלייה', power: 'חשמל וכבילה', comms: 'קשר והפקה',
};

// Fill each slot from the warehouse. inventory items: { id, category, name, quantity, group? }.
// Items already matching the slot's group are used first, then any item in the category
// that has no catalog group (custom models). Returns qty per equipment id plus what's missing.
export function allocate(slots, inventory) {
  const left = Object.fromEntries(inventory.map((i) => [i.id, i.quantity]));
  const qty = {};
  const lines = [];
  for (const s of slots) {
    if (!s.qty) continue;
    const catName = CATEGORY_NAMES[s.cat];
    const inCat = inventory.filter((i) => i.category === catName);
    const exact = inCat.filter((i) => !s.group || i.group === s.group);
    const loose = s.group ? inCat.filter((i) => !i.group) : [];
    const pool = [...exact, ...loose].sort((a, b) => left[b.id] - left[a.id]);
    let need = s.qty;
    const used = [];
    for (const i of pool) {
      if (need <= 0) break;
      const take = Math.min(need, left[i.id]);
      if (take <= 0) continue;
      left[i.id] -= take; need -= take;
      qty[i.id] = (qty[i.id] || 0) + take;
      used.push({ name: i.name, take });
    }
    lines.push({ ...s, used, missing: need });
  }
  return { qty, lines };
}

// What the figure draws, from the set's slots (what the event needs, not what's in stock).
export function sceneCounts(slots) {
  const c = {};
  for (const s of slots) c[s.key] = (c[s.key] || 0) + s.qty;
  return c;
}

// Everything EventForm needs to open pre-filled from a set.
export function prefill(set, guests, inventory) {
  const slots = set.slots(guests);
  const { qty } = allocate(slots, inventory);
  return {
    title: `${set.name} `,
    setup_time: set.times.setup, start_time: set.times.start, end_time: set.times.end,
    notes: set.notes.map((n) => `• ${n}`).join('\n'),
    equipment: Object.entries(qty).map(([equipment_id, quantity]) => ({ equipment_id, quantity })),
    vendors: set.vendors(guests).map((type) => ({ type, name: '', arrival_time: '', cost: '', paid_by: 'us', status: 'pending' })),
    crewHint: Math.max(2, Math.ceil(guests / 200) + (set.id === 'show' ? 2 : 1)),
  };
}

// Guess the kind of an existing event from its title, for the figure on the event page.
export function guessSet(title = '') {
  const t = title.replace(/\s+/g, ' ');
  if (/חתונ|חינה/.test(t)) return 'wedding';
  if (/מצו|בר |בת /.test(t)) return 'barmitzvah';
  if (/כנס|הרצא|סמינר|כנס|השקה/.test(t)) return 'conference';
  if (/הופע|להק|פסטיבל|קונצרט/.test(t)) return 'show';
  return 'party';
}

// Rough counts per slot key from an event's real equipment rows (category + catalog group).
export function countsFromEquipment(rows) {
  const k = {};
  const add = (key, n) => { k[key] = (k[key] || 0) + n; };
  for (const r of rows) {
    const n = r.quantity;
    const cat = Object.keys(CATEGORY_NAMES).find((id) => CATEGORY_NAMES[id] === r.category);
    const g = r.group || '';
    if (cat === 'mixers') add(g === 'DJ' ? 'dj' : g.startsWith('סטייג') ? 'stagebox' : 'console', n);
    else if (cat === 'speakers') add('tops', n);
    else if (cat === 'subs') add('subs', n);
    else if (cat === 'monitors') add('wedges', n);
    else if (cat === 'mics') add(g === 'סט תופים ובס' ? 'drums' : g === 'חוטיים' ? 'vocal' : 'wireless', n);
    else if (cat === 'lighting') add(g === 'ראשים נעים' ? 'heads' : g.startsWith('סטרובים') ? 'strobes' : g.startsWith('לייזר') ? 'fx' : g.startsWith('פרופיל') ? 'front' : g.startsWith('שליטה') ? 'desk' : 'pars', n);
    else if (cat === 'led') add('led', n);
    else if (cat === 'stage') add('truss', n);
    else if (cat === 'power') add('power', n);
    else if (cat === 'comms') add('comms', n);
  }
  return k;
}
