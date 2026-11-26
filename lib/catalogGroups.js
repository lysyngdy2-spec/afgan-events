import catalog from './catalog.json';

// "category|model" -> catalog group, built once per server instance.
// Kept on the server so the 11 KB catalog never ships to the phone.
const MAP = new Map();
for (const c of catalog.categories) for (const g of c.groups || []) for (const i of g.items) MAP.set(`${c.name}|${i}`, g.name);

export const withGroups = (rows) => rows.map((r) => ({ ...r, group: r.catalog_group || MAP.get(`${r.category}|${r.name}`) || null }));
