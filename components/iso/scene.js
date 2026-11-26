// A small isometric kit and the venue model for the event figure.
// Style follows the "anatomy" approach: a real object (the hall, set up for the night)
// built from many small solid parts, four-tone shading, painted back to front,
// one lit accent for what the reader should look at, and nothing floating.
//
// World: x runs along the stage (to the lower right on screen), y runs from the stage
// toward the audience (to the lower left), z is up. 1 unit = 25 cm.

const C = Math.cos(Math.PI / 6);
const S = 0.5;
// Heights are drawn 1.3x so low gear on a big floor still reads as solid.
export const proj = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z * 1.3];

const r1 = (n) => Math.round(n * 10) / 10;
export const pathOf = (pts) => 'M' + pts.map(([a, b]) => `${r1(a)} ${r1(b)}`).join('L') + 'Z';
const lineOf = (pts) => 'M' + pts.map(([a, b]) => `${r1(a)} ${r1(b)}`).join('L');

// Tiny seeded random, so the crowd and tables don't jump between renders.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildScene({ setId = '', scene, counts, guests = 0, fixed = false, compact = false }) {
  const out = []; // { d, cls, k, z } z = painter's key
  const lights = []; // moving heads: world position, for the live beams
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  const P = (x, y, z) => {
    const p = proj(x, y, z);
    if (p[0] < bb[0]) bb[0] = p[0]; if (p[1] < bb[1]) bb[1] = p[1];
    if (p[0] > bb[2]) bb[2] = p[0]; if (p[1] > bb[3]) bb[3] = p[1];
    return p;
  };
  const add = (d, cls, k, z) => out.push({ d, cls, k, z });

  // A solid box: top, +x face, +y face, plus its outline. tone: lo | mid | hi
  function box(x, y, z, w, dp, h, tone, k, { key, seams = 0, grill = false } = {}) {
    const zk = key ?? (x + w / 2) + (y + dp / 2) + z * 0.02;
    const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + dp, z + h), P(x, y + dp, z + h)];
    const fx = [P(x + w, y, z), P(x + w, y + dp, z), P(x + w, y + dp, z + h), P(x + w, y, z + h)];
    const fy = [P(x, y + dp, z), P(x + w, y + dp, z), P(x + w, y + dp, z + h), P(x, y + dp, z + h)];
    let svg = `<path class="${tone} fy" d="${pathOf(fy)}"/><path class="${tone} fx" d="${pathOf(fx)}"/><path class="${tone} ft" d="${pathOf(top)}"/>`;
    // Seams wrap the corner: they run across the +y face and on around the +x face.
    for (let i = 1; i <= seams; i++) {
      const zz = z + (h * i) / (seams + 1);
      svg += `<path class="seam" d="${lineOf([P(x, y + dp, zz), P(x + w, y + dp, zz), P(x + w, y, zz)])}"/>`;
    }
    if (grill) {
      // Speaker grille: woofer and horn on the audience face (y + d plane).
      const cx = x + w / 2, cz = z + h * 0.38, r = Math.min(w, h) * 0.34;
      const ring = (rr, zc) => Array.from({ length: 18 }, (_, i) => { const t = (i / 18) * Math.PI * 2; return P(cx + rr * Math.cos(t), y + dp, zc + rr * Math.sin(t)); });
      svg += `<path class="cone" d="${pathOf(ring(r, cz))}"/><path class="cone-in" d="${pathOf(ring(r * 0.45, cz))}"/>`;
      svg += `<path class="cone" d="${pathOf(ring(r * 0.32, z + h * 0.8))}"/>`;
    }
    add(svg, '', k, zk);
  }

  // A round part standing on z: smooth side shading from one gradient.
  function cyl(cx, cy, z, r, h, tone, k, { key } = {}) {
    const zk = key ?? cx + cy + z * 0.02;
    const n = 20;
    const ring = (zz, a0, a1) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return P(cx + r * Math.cos(t), cy + r * Math.sin(t), zz); });
    const front = ring(z + h, -Math.PI / 4, (3 * Math.PI) / 4);
    const side = [...front, ...ring(z, -Math.PI / 4, (3 * Math.PI) / 4).reverse()];
    const top = ring(z + h, 0, Math.PI * 2);
    add(`<path class="${tone} cyl" d="${pathOf(side)}"/><path class="${tone} ft" d="${pathOf(top)}"/>`, '', k, zk);
  }

  const dot = (x, y, z, r, cls, k, zk) => { const [a, b] = P(x, y, z); add(`<circle class="${cls}" cx="${r1(a)}" cy="${r1(b)}" r="${r}"/>`, '', k, zk ?? x + y + z * 0.02); };
  const wire = (pts, k, zk) => {
    const sp = pts.map(([x, y, z]) => P(x, y, z));
    const [a, b] = sp[0], [c, e] = sp[sp.length - 1];
    add(`<path class="wire" d="${lineOf(sp)}"/><circle class="term" cx="${r1(a)}" cy="${r1(b)}" r="0.9"/><circle class="term" cx="${r1(c)}" cy="${r1(e)}" r="0.9"/>`, '', k, zk);
  };

  const n = (key) => counts[key] || 0;
  // compact: the set builder, a shorter room so the gear reads large on a phone.
  const W = compact ? 60 : 64, D = compact ? 46 : 70;
  const big = !!scene.stageBig;
  const st = big ? { x0: 10, x1: 54, y0: 3, y1: 22, h: 4 } : { x0: 18, x1: 54, y0: 3, y1: 16, h: 3 };

  // Floor: a thick plate with an edge rule, ticks every 4 units and a major every 5th.
  box(0, 0, -2, W, D, 2, 'lo', 'venue', { key: -1000 });
  {
    let d = '';
    for (let i = 4; i < W; i += 4) { const L = i % 20 === 0 ? 2.4 : 1.2; d += lineOf([P(i, D, 0), P(i, D - L, 0)]); }
    for (let i = 4; i < D; i += 4) { const L = i % 20 === 0 ? 2.4 : 1.2; d += lineOf([P(W, i, 0), P(W - L, i, 0)]); }
    add(`<path class="tick" d="${d}"/><path class="groove" d="${pathOf([P(1.5, 1.5, 0), P(W - 1.5, 1.5, 0), P(W - 1.5, D - 1.5, 0), P(1.5, D - 1.5, 0)])}"/>`, '', 'venue', -999);
    // Back wall stub: a low skirting along both back edges, so the room reads as a room.
    box(0, -1, 0, W, 1, 6, 'lo', 'venue', { key: -998 });
    box(-1, 0, 0, 1, D, 6, 'lo', 'venue', { key: -997 });
    // Corner screws on the plate.
    for (const [x, y] of [[3, D - 3], [W - 3, D - 3], [W - 3, 3]]) dot(x, y, 0, 0.6, 'screw', 'venue', -996);
  }

  // Stage with its front fascia seam and steps.
  box(st.x0, st.y0, 0, st.x1 - st.x0, st.y1 - st.y0, st.h, 'mid', 'truss', { seams: 1, key: st.x0 + st.y0 });
  box(st.x0 + 4, st.y1, 0, 5, 2, st.h / 2, 'mid', 'truss', { key: st.x0 + st.y1 + 6 });

  // LED wall or projection screen at the back of the stage, with its frame.
  const wallH = big ? 22 : 16;
  if (n('led') || scene.screen) {
    const lx0 = st.x0 + 6, lx1 = st.x1 - 6, ly = st.y0 + 1;
    box(lx0 - 1, ly - 1, st.h, 1, 1.4, wallH + 1, 'mid', 'led', { key: lx0 + ly });
    box(lx1, ly - 1, st.h, 1, 1.4, wallH + 1, 'mid', 'led', { key: lx1 + ly });
    let d = '';
    const cols = 12, rows = 6;
    const cw = (lx1 - lx0) / cols, rh = wallH / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = lx0 + c * cw, z = st.h + 0.6 + r * rh;
      d += `<path class="${scene.screen ? 'scr' : 'px'}" style="--i:${(r * 7 + c * 3) % 11}" d="${pathOf([P(x + 0.15, ly, z), P(x + cw - 0.15, ly, z), P(x + cw - 0.15, ly, z + rh - 0.3), P(x + 0.15, ly, z + rh - 0.3)])}"/>`;
    }
    d += `<path class="frame" d="${pathOf([P(lx0, ly, st.h + 0.6), P(lx1, ly, st.h + 0.6), P(lx1, ly, st.h + wallH + 0.6), P(lx0, ly, st.h + wallH + 0.6)])}"/>`;
    add(d, '', 'led', lx0 + ly + 1);
  }

  // DJ booth on stage: a cased table with two players and a mixer on top.
  if (scene.dj) {
    const bx = (st.x0 + st.x1) / 2 - 6, by = st.y1 - 6;
    box(bx, by, st.h, 12, 4, 4, 'mid', 'dj', { seams: 1 });
    box(bx + 1, by + 0.8, st.h + 4, 3, 2.4, 0.6, 'hi', 'dj');
    box(bx + 4.6, by + 0.6, st.h + 4, 2.8, 2.8, 0.7, 'hi', 'dj');
    box(bx + 8, by + 0.8, st.h + 4, 3, 2.4, 0.6, 'hi', 'dj');
    for (let i = 0; i < 3; i++) dot(bx + 5.4 + i * 0.6, by + 2.6, st.h + 4.7, 0.25, 'knob', 'dj', bx + by + 9);
    if (n('wedges')) box(bx - 4, by + 1, st.h, 2.5, 2.5, 2, 'mid', 'wedges', { grill: true });
  }

  // Band: drum riser with kit, amps and mic stands.
  if (scene.band) {
    const rx = (st.x0 + st.x1) / 2 - 7, ry = st.y0 + 4;
    box(rx, ry, st.h, 14, 7, 1.6, 'mid', 'drums', { seams: 0 });
    cyl(rx + 7, ry + 3, st.h + 1.6, 1.6, 1.4, 'hi', 'drums');
    cyl(rx + 4, ry + 4, st.h + 1.6, 1.1, 2.2, 'hi', 'drums');
    cyl(rx + 10, ry + 4, st.h + 1.6, 1.1, 2.2, 'hi', 'drums');
    cyl(rx + 3, ry + 2, st.h + 1.6, 1.0, 1.0, 'hi', 'drums');
    box(st.x0 + 4, st.y0 + 6, st.h, 4, 2, 4, 'mid', 'console', { grill: true });
    box(st.x1 - 8, st.y0 + 6, st.h, 4, 2, 4, 'mid', 'console', { grill: true });
    const mics = Math.min(5, n('vocal') || 3);
    for (let i = 0; i < mics; i++) {
      const mx = st.x0 + 8 + ((st.x1 - st.x0 - 16) * (i + 0.5)) / mics, my = st.y1 - 3;
      add(`<path class="stand" d="${lineOf([P(mx, my, st.h), P(mx, my, st.h + 6)])}"/>`, '', 'vocal', mx + my);
      dot(mx, my, st.h + 6.2, 0.55, 'mic', 'vocal', mx + my + 0.01);
      dot(mx, my, st.h, 0.5, 'term', 'vocal', mx + my);
    }
    const w = Math.min(6, n('wedges'));
    for (let i = 0; i < w; i++) {
      const wx = st.x0 + 6 + ((st.x1 - st.x0 - 14) * (i + 0.5)) / w;
      box(wx, st.y1 - 1.6, st.h, 2.6, 1.4, 1.2, 'mid', 'wedges', { seams: 0 });
    }
  }

  // No band: mics stand along the stage front, wedges face them from the lip.
  if (!scene.band) {
    const span = st.x1 - st.x0 - 16;
    const mics = Math.min(6, n('vocal'));
    for (let i = 0; i < mics; i++) {
      const mx = st.x0 + 8 + (span * (i + 0.5)) / mics, my = st.y1 - 4;
      add(`<path class="stand" d="${lineOf([P(mx, my, st.h), P(mx, my, st.h + 6)])}"/>`, '', 'vocal', mx + my);
      dot(mx, my, st.h + 6.2, 0.55, 'mic', 'vocal', mx + my + 0.01);
      dot(mx, my, st.h, 0.5, 'term', 'vocal', mx + my);
    }
    const w = scene.dj ? 0 : Math.min(6, n('wedges'));
    for (let i = 0; i < w; i++) {
      const wx = st.x0 + 6 + ((st.x1 - st.x0 - 14) * (i + 0.5)) / w;
      box(wx, st.y1 - 1.6, st.h, 2.6, 1.4, 1.2, 'mid', 'wedges', { seams: 0 });
    }
  }

  // Podium with a gooseneck mic, for talks.
  if (scene.podium) {
    const px = st.x1 - 10, py = st.y1 - 5;
    box(px, py, st.h, 4, 3, 5, 'mid', 'podium', { seams: 2 });
    add(`<path class="stand" d="${lineOf([P(px + 2, py + 3, st.h + 5), P(px + 2, py + 4, st.h + 6.4)])}"/>`, '', 'podium', px + py + 4);
    dot(px + 2, py + 4, st.h + 6.5, 0.5, 'mic', 'podium', px + py + 4.1);
    if (n('wedges')) box(px - 4, py + 2, st.h, 2.4, 1.6, 1.2, 'mid', 'wedges');
  }

  // Speakers: subs on the floor at both stage corners, tops stacked on them.
  // A line array hangs from a fly bar instead.
  const lineArray = scene.lineArray || (setId === 'show' && guests > 500);
  const perSide = (k) => Math.ceil(n(k) / 2);
  for (const side of [0, 1]) {
    const sx = side ? st.x1 + 1 : st.x0 - 6;
    const sy = st.y1 - 5;
    const subs = Math.min(4, perSide('subs'));
    for (let i = 0; i < subs; i++) box(sx, sy - i * 4.4, 0, 5, 4.2, 4.4, 'mid', 'subs', { seams: 1, grill: i === 0 });
    const tops = Math.min(6, Math.ceil((n('tops') + n('array')) / 2));
    if (lineArray) {
      const hx = sx + 0.5, hy = sy + 0.5, topZ = st.h + wallH + 2;
      box(hx - 0.5, hy - 0.5, topZ, 5, 4, 0.6, 'hi', 'tops');
      for (let i = 0; i < tops; i++) box(hx, hy + i * 0.25, topZ - (i + 1) * 2, 4, 3, 1.8, 'mid', 'tops', { seams: 0, key: hx + hy + 30 + i });
      add(`<path class="stand" d="${lineOf([P(hx + 2, hy, topZ + 0.6), P(hx + 2, hy, topZ + 6)])}"/>`, '', 'tops', hx + hy + 29);
    } else {
      const base = subs ? 4.4 : 0;
      for (let i = 0; i < tops; i++) {
        const stacked = i < 2;
        const tx = stacked ? sx + 0.75 : sx + (side ? 5.5 : -4.5), ty = stacked ? sy : sy - (i - 2) * 4;
        box(tx, ty, stacked ? base + i * 6 : 0, 3.5, 3, 6, 'hi', 'tops', { grill: true, key: tx + ty + 0.3 + i });
      }
    }
  }

  // Truss: two towers and a box truss across the front of the stage, lattice on its face.
  if (scene.truss || n('heads')) {
    const tz = st.h + wallH + (big ? 6 : 4), ty = st.y1 - 2;
    const t0 = st.x0 - 1, t1 = st.x1 - 1;
    for (const tx of [t0, t1]) {
      box(tx, ty, 0, 2, 2, tz, 'mid', 'truss', { key: tx + ty + 0.4 });
      let d = '';
      for (let z = 1; z < tz - 1; z += 2) d += lineOf([P(tx, ty + 2, z), P(tx + 2, ty + 2, z + 2)]);
      add(`<path class="lattice" d="${d}"/>`, '', 'truss', tx + ty + 0.41);
      box(tx - 1, ty - 1, 0, 4, 4, 0.4, 'lo', 'truss', { key: tx + ty - 0.5 });
    }
    box(t0, ty, tz, t1 - t0 + 2, 2, 2, 'mid', 'truss', { key: 200 });
    let d = '';
    for (let x = t0; x < t1 + 1; x += 2) d += lineOf([P(x, ty + 2, tz), P(x + 2, ty + 2, tz + 2)]);
    add(`<path class="lattice" d="${d}"/>`, '', 'truss', 200.1);
    // Moving heads hang under the bar: a yoke and a round head.
    const heads = Math.min(12, n('heads'));
    for (let i = 0; i < heads; i++) {
      const hx = t0 + 3 + ((t1 - t0 - 4) * (i + 0.5)) / heads;
      box(hx - 0.8, ty + 0.3, tz - 1.2, 1.6, 1.4, 1.2, 'hi', 'heads', { key: 201 + i * 0.01 });
      cyl(hx, ty + 1, tz - 2.6, 0.8, 1.4, 'hi', 'heads', { key: 201.005 + i * 0.01 });
      lights.push({ x: hx, y: ty + 1, z: tz - 2.6, i });
    }
    const strobes = Math.min(6, n('strobes'));
    for (let i = 0; i < strobes; i++) {
      const sx = t0 + 2 + ((t1 - t0 - 2) * (i + 0.5)) / strobes;
      box(sx - 1, ty + 1.8, tz + 0.4, 2, 0.6, 1.2, 'hi', 'strobes', { key: 202 + i * 0.01 });
    }
  }

  // Uplights along the side walls, each with a soft pool on the wall.
  const pars = Math.min(16, n('pars') + n('front'));
  for (let i = 0; i < pars; i++) {
    const left = i % 2 === 0;
    const j = Math.floor(i / 2);
    const x = left ? 1.5 : 8 + j * 8, y = left ? 8 + j * 8 : 1.5;
    if ((left && y > D - 6) || (!left && x > W - 4)) continue;
    cyl(x, y, 0, 0.8, 1.2, 'hi', n('front') && i < n('front') ? 'front' : 'pars');
    const [a, b] = P(x, y, 5);
    add(`<ellipse class="pool" cx="${r1(a)}" cy="${r1(b)}" rx="2.6" ry="5"/>`, '', 'pars', -990);
  }

  // Smoke machine at a stage corner, with its hose-free nozzle facing the floor.
  if (n('fx')) { box(st.x1 - 4, st.y1 - 3, st.h, 3, 2, 1.6, 'hi', 'fx', { seams: 0 }); dot(st.x1 - 2.5, st.y1 - 1, st.h + 0.8, 0.35, 'knob', 'fx'); }

  // Dance floor: a flat inlay of tiles in front of the stage.
  const dfY0 = st.y1 + 4, dfY1 = st.y1 + (big ? 20 : 22);
  if (scene.dance) {
    const x0 = st.x0 + 2, x1 = st.x1 - 2, cell = 4;
    let d = '';
    for (let x = x0; x < x1; x += cell) for (let y = dfY0; y < dfY1; y += cell) {
      const odd = ((x - x0) / cell + (y - dfY0) / cell) % 2 === 0;
      d += `<path class="${odd ? 'tile' : 'tile2'}" d="${pathOf([P(x, y, 0.05), P(x + cell, y, 0.05), P(x + cell, y + cell, 0.05), P(x, y + cell, 0.05)])}"/>`;
    }
    add(d, '', 'venue', -900);
  }

  // Chuppah: four posts and a cloth canopy, beside the dance floor.
  if (scene.chuppah) {
    const cx = 4, cy = dfY0, s = 8, h = 10;
    for (const [dx, dy] of [[0, 0], [s, 0], [0, s], [s, s]]) box(cx + dx, cy + dy, 0, 0.7, 0.7, h, 'hi', 'chuppah', { key: cx + dx + cy + dy });
    box(cx - 0.5, cy - 0.5, h, s + 1.7, s + 1.7, 0.4, 'hi', 'chuppah', { key: cx + cy + s * 2 + 1 });
  }

  // Seating.
  const rand = rng(guests * 31 + setId.length);
  const fohY = D - (compact ? 9 : 12);
  if (scene.tables === 'round') {
    const tables = Math.ceil(guests / 10);
    const draw = Math.min(42, tables);
    const spots = [];
    for (let y = dfY1 + 5; y < fohY - 3; y += 8) for (let x = 6; x < W - 5; x += 8) spots.push([x, y]);
    for (let y = dfY0 + 2; y < dfY1; y += 8) { spots.push([W - 6, y]); if (!scene.chuppah || y > dfY0 + 12) spots.push([6, y]); }
    for (const [x, y] of spots.slice(0, draw)) {
      for (let c = 0; c < 6; c++) { const t = (c / 6) * Math.PI * 2 + 0.3; box(x + 3.3 * Math.cos(t) - 0.5, y + 3.3 * Math.sin(t) - 0.5, 0, 1, 1, 1.6, 'lo', 'guests'); }
      cyl(x, y, 0, 2.3, 2, 'mid', 'guests');
    }
  } else if (scene.tables === 'rows') {
    const rows = Math.min(14, Math.ceil(guests / 20));
    for (let r = 0; r < rows; r++) {
      const y = st.y1 + 6 + r * 3.6;
      if (y > fohY - 2) break;
      for (const [x0, x1] of [[8, W / 2 - 3], [W / 2 + 3, W - 8]]) box(x0, y, 0, x1 - x0, 1.6, 1.8, 'lo', 'guests', { seams: 0 });
    }
  } else {
    // Standing crowd or a bar: people as small heads on shoulders.
    const people = Math.min(scene.tables === 'bar' ? 60 : 140, Math.ceil(guests / (scene.tables === 'bar' ? 8 : 10)));
    for (let i = 0; i < people; i++) {
      const x = 8 + rand() * (W - 16), y = (scene.dance ? dfY0 : st.y1 + 4) + rand() * (fohY - 4 - (scene.dance ? dfY0 : st.y1 + 4));
      cyl(x, y, 0, 0.8, 3.6, 'lo', 'guests');
      dot(x, y, 4.3, 0.75, 'head', 'guests', x + y + 0.2);
    }
    if (scene.tables === 'bar') { box(W - 8, 30, 0, 5, 26, 4.4, 'mid', 'guests', { seams: 1 }); }
  }

  // FOH: the sound desk at the back of the room, with a snake cable to the stage.
  if (n('console') || n('desk') || n('ldesk') || n('comms')) {
    const fx = W / 2 - 5, fy = fohY;
    box(fx, fy, 0, 10, 5, 3.6, 'mid', 'console', { seams: 1 });
    box(fx + 1, fy + 0.6, 3.6, 6, 3.6, 0.7, 'hi', 'console');
    let d = '';
    for (let i = 0; i < 10; i++) d += lineOf([P(fx + 1.5 + i * 0.55, fy + 1.4, 4.31), P(fx + 1.5 + i * 0.55, fy + 3.6, 4.31)]);
    add(`<path class="fader" d="${d}"/>`, '', 'console', fx + fy + 6);
    if (n('desk')) box(fx + 7.4, fy + 0.8, 3.6, 2.2, 3, 0.6, 'hi', 'desk');
    if (n('ldesk')) { box(fx + 11, fy, 0, 7, 5, 3.6, 'mid', 'ldesk', { seams: 1 }); box(fx + 12, fy + 0.8, 3.6, 5, 3.2, 0.6, 'hi', 'ldesk'); }
    if (n('comms')) { box(fx - 4, fy + 1, 0, 3, 3, 3.6, 'mid', 'comms'); add(`<path class="stand" d="${lineOf([P(fx - 2.5, fy + 2.5, 3.6), P(fx - 2.5, fy + 2.5, 7)])}"/>`, '', 'comms', fx + fy + 0.6); }
    wire([[fx + 5, fy, 0.1], [fx + 5, st.y1 + 1, 0.1], [st.x0 + 2, st.y1 + 1, 0.1]], 'console', -800);
  }

  // Power distro by the stage with its feed.
  if (n('stagebox')) { box(st.x0 + 1, st.y0 + 1, st.h, 3, 2, 2.4, 'hi', 'stagebox', { seams: 1 }); }
  if (n('power')) {
    // In the back corner, behind the stage, with its feed running along the wall.
    if (compact) {
      box(W - 6, 2, 0, 3, 2, 3.4, 'mid', 'power', { seams: 1 });
      wire([[W - 6, 3, 0.1], [st.x1, 3, 0.1]], 'power', -799);
    } else {
      box(2, 2, 0, 3, 2, 3.4, 'mid', 'power', { seams: 1 });
      wire([[5, 3, 0.1], [st.x0, 3, 0.1]], 'power', -799);
    }
  }

  out.sort((a, b) => a.z - b.z);
  const tzTop = st.h + wallH + (big ? 6 : 4) + 2;
  if (fixed) {
    // A fixed frame around the stage and the sound desk, so adding gear never rescales the picture.
    // The far corners of the floor may run off the card; that's fine.
    const crop = [P(st.x0 - 7, st.y0 - 1, tzTop + 4), P(st.x1 + 6, st.y0 - 1, tzTop + 4), P(W, 0, 0), P(st.x0 - 10, fohY + 7, 0), P(W / 2 + 10, fohY + 7, 0), P(W - 2, st.y1, 0)];
    bb[0] = Math.min(...crop.map((p) => p[0])); bb[1] = Math.min(...crop.map((p) => p[1]));
    bb[2] = Math.max(...crop.map((p) => p[0])); bb[3] = Math.max(...crop.map((p) => p[1]));
  }
  // Tap targets on screen, in the same units as the viewBox.
  const anchors = {
    sound: proj(st.x0 - 3.5, st.y1 - 3, 10),
    stage: proj((st.x0 + st.x1) / 2, st.y1 - 3, st.h + 3),
    light: proj(st.x1 - 4, st.y1 - 1, tzTop),
    video: proj(st.x0 + 9, st.y0 + 1, st.h + wallH * 0.75),
    foh: proj(W / 2, fohY + 2, 4),
    power: compact ? proj(W - 4.5, 3, 3.4) : proj(3.5, 3, 3.4),
  };
  // Fit the viewBox to everything drawn (beams stay inside: they only fall toward the floor).
  const pad = 2;
  const viewBox = `${r1(bb[0] - pad)} ${r1(bb[1] - pad)} ${r1(bb[2] - bb[0] + pad * 2)} ${r1(bb[3] - bb[1] + pad * 2)}`;
  return { parts: out, lights, viewBox, anchors, box: [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2], floor: { x0: st.x0 + 4, x1: st.x1 - 4, y0: dfY0, y1: dfY1 } };
}
