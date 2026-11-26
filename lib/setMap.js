// How each piece of gear shows up in the event's set (the isometric stage).
// kind  = the drawing in components/iso/scene.js
// layer = which exploded layer it lifts into
// zone  = the tap target on the stage that opens it

export const LAYERS = [
  { id: 'base', name: 'במה וטראסים', zone: 'stage' },
  { id: 'power', name: 'חשמל', zone: 'power' },
  { id: 'sound', name: 'סאונד', zone: 'sound' },
  { id: 'video', name: 'מסכים', zone: 'video' },
  { id: 'light', name: 'תאורה', zone: 'light' },
];

// Zones on the stage: what you tap, and which categories open in the sheet.
export const ZONES = {
  sound: { name: 'רמקולים', hint: 'רמקולים, סאבים, מוניטורים', cats: ['רמקולים ומערכות', 'סאבים', 'מוניטורים'] },
  stage: { name: 'על הבמה', hint: 'מיקרופונים, נגנים, במה וטראסים', cats: ['מיקרופונים', 'מקורות ונגנים', 'במות, טראסים ותלייה'] },
  light: { name: 'תאורה', hint: 'ראשים, פרים, סטרובים, אפקטים', cats: ['תאורה'] },
  video: { name: 'מסך', hint: 'מסכי לד ווידאו', cats: ['מסכי לד ווידאו'] },
  foh: { name: 'עמדת סאונד', hint: 'מיקסרים, קשר והפקה', cats: ['מיקסרים ושולחנות', 'קשר והפקה'] },
  power: { name: 'חשמל', hint: 'לוחות, כבלים, גנרטור', cats: ['חשמל וכבילה'] },
};
export const ZONE_OF_CAT = Object.fromEntries(Object.entries(ZONES).flatMap(([z, v]) => v.cats.map((c) => [c, z])));

const LIGHT = { 'ראשים נעים': 'heads', 'פרים ופאר-לד': 'pars', 'סטרובים, בליינדרים ולד בר': 'strobes', 'לייזר ואפקטים מיוחדים': 'fx', 'פרופיל, פולו ותאטרון': 'front', 'שליטה בתאורה': 'ldesk' };

// One inventory row -> the drawing it becomes.
export function kindOf({ category, group, name = '' }) {
  switch (category) {
    case 'רמקולים ומערכות': return group === 'ליין אריי' ? 'array' : 'tops';
    case 'סאבים': return 'subs';
    case 'מוניטורים': return 'wedges';
    case 'מיקרופונים': return 'vocal';
    case 'מיקסרים ושולחנות': return group === 'DJ' ? 'dj' : group === 'סטייג׳ בוקס ורשת' ? 'stagebox' : 'console';
    case 'מקורות ונגנים': return 'desk';
    case 'תאורה': return LIGHT[group] || (/strobe|bar|blinder/i.test(name) ? 'strobes' : /head|beam|spot|wash/i.test(name) ? 'heads' : 'pars');
    case 'מסכי לד ווידאו': return 'led';
    case 'במות, טראסים ותלייה': return 'truss';
    case 'חשמל וכבילה': return 'power';
    case 'קשר והפקה': return 'comms';
    default: return 'misc';
  }
}

export const LAYER_OF_KIND = {
  venue: 'base', truss: 'base',
  power: 'power', stagebox: 'power',
  tops: 'sound', array: 'sound', subs: 'sound', wedges: 'sound', vocal: 'sound', console: 'sound', desk: 'sound', dj: 'sound', comms: 'sound',
  led: 'video',
  heads: 'light', pars: 'light', strobes: 'light', fx: 'light', front: 'light', ldesk: 'light',
};

// Chosen rows ({category, group, name, qty}) -> counts per drawing + scene switches.
export function sceneFrom(rows) {
  const counts = {};
  for (const r of rows) if (r.qty > 0) { const k = kindOf(r); counts[k] = (counts[k] || 0) + r.qty; }
  return {
    counts,
    scene: {
      truss: !!(counts.truss || counts.heads || counts.strobes),
      dj: !!counts.dj,
      lineArray: !!counts.array,
      stageBig: false,
      dance: true,
    },
  };
}

// What a photographed item is: picked once when adding it, so the stage knows where it goes.
// shape = proportions of its isometric object [width, depth, height]
export const GEAR_TYPES = [
  { id: 'top', label: 'רמקול', category: 'רמקולים ומערכות', group: 'ראשיים אקטיביים', shape: [1, 0.9, 1.5] },
  { id: 'array', label: 'ליין אריי', category: 'רמקולים ומערכות', group: 'ליין אריי', shape: [1.4, 1, 0.6] },
  { id: 'sub', label: 'סאב', category: 'סאבים', group: null, shape: [1.3, 1.3, 1.2] },
  { id: 'wedge', label: 'מוניטור', category: 'מוניטורים', group: null, shape: [1.2, 1, 0.7] },
  { id: 'mic', label: 'מיקרופון', category: 'מיקרופונים', group: 'חוטיים', shape: [0.6, 0.6, 1] },
  { id: 'mixer', label: 'מיקסר', category: 'מיקסרים ושולחנות', group: 'דיגיטליים', shape: [1.6, 1.1, 0.5] },
  { id: 'dj', label: 'ציוד DJ', category: 'מיקסרים ושולחנות', group: 'DJ', shape: [1.6, 1, 0.45] },
  { id: 'player', label: 'נגן / מחשב', category: 'מקורות ונגנים', group: null, shape: [1.2, 0.9, 0.4] },
  { id: 'head', label: 'ראש נע', category: 'תאורה', group: 'ראשים נעים', shape: [0.9, 0.9, 1.3] },
  { id: 'par', label: 'פר לד', category: 'תאורה', group: 'פרים ופאר-לד', shape: [0.8, 0.8, 0.9] },
  { id: 'strobe', label: 'סטרוב / לד בר', category: 'תאורה', group: 'סטרובים, בליינדרים ולד בר', shape: [1.7, 0.5, 0.5] },
  { id: 'fx', label: 'עשן / לייזר / אפקט', category: 'תאורה', group: 'לייזר ואפקטים מיוחדים', shape: [1.1, 0.9, 0.8] },
  { id: 'ldesk', label: 'שולחן תאורה', category: 'תאורה', group: 'שליטה בתאורה', shape: [1.5, 1, 0.5] },
  { id: 'led', label: 'מסך / לד', category: 'מסכי לד ווידאו', group: null, shape: [1.6, 0.3, 1] },
  { id: 'truss', label: 'במה / טראס', category: 'במות, טראסים ותלייה', group: null, shape: [1.8, 0.6, 0.6] },
  { id: 'power', label: 'חשמל / כבלים', category: 'חשמל וכבילה', group: null, shape: [1, 0.8, 1] },
  { id: 'comms', label: 'קשר', category: 'קשר והפקה', group: null, shape: [0.7, 0.6, 1] },
];
export const shapeOf = (row) => (GEAR_TYPES.find((t) => t.category === row.category && (t.group === (row.group ?? row.catalog_group ?? null))) || GEAR_TYPES.find((t) => t.category === row.category) || GEAR_TYPES[0]).shape;
