// "THE TREE" : 59.5 s, fast high-energy short built on Story Library v6.1. Voice = audio/voice.mp3 (times below are the voice times).
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph, makeCloud } from '../../web/models.js';
import { Person, SKIN, FACES, EXPR, M as PM } from './person.js';
import { mkLook, mixLook, applyLook, LOOKS, flicker } from '../../web/looks.js';
import { Terrain, Path, place, EASE, sstep, clamp, lerp, SPEED, hash } from '../../web/motion.js';
import { Performer, EMOTIONS } from '../../web/perform.js';
for (const [n, base, ex] of [['smug', 'proud', 'smug'], ['grin', 'happy', 'grin'], ['gasp', 'shock', 'gasp'], ['awe', 'curious', 'awe'], ['blank', 'neutral', 'blank'], ['sob', 'cry', 'sob']]) EMOTIONS[n] = { ...EMOTIONS[base], expr: ex };
import { Cine, T as CT } from '../../web/cine.js';
import { Furniture, sitOn } from '../../web/furniture.js';
import { Colliders } from '../../web/motion.js';
import { handOnProp, propInHand } from '../../web/props.js';
import { toTex, mkCanvas } from '../../web/tex.js';
import { mergeGeometries } from '../../web/vendor/BufferGeometryUtils.js';
const { stage, dofU, FPS, PX } = C;
export const DURATION = 59.5;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const W = new THREE.Group(); stage.world.add(W); const SKY = C.makeSky(); W.add(SKY);
const TER = new Terrain(0); const COL = new Colliders();
const TREE_P = V(-5.5, 0, 0);
const vis = (o, t, ranges) => { o.visible = ranges.some(([a, b]) => t >= a && t < b); };
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };

// ======================= GROUND, ROAD, FIELDS, FENCES =======================
const grassTex = ctex(256, 256, (g, w, h) => { g.fillStyle = '#7cc04a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const x = hash(i) * w, y = hash(i + 7.1) * h, s = hash(i + 3.3); g.fillStyle = s < 0.5 ? 'rgba(70,140,40,0.55)' : 'rgba(170,220,90,0.5)'; g.fillRect(x, y, 2 + s * 3, 6 + s * 10); } }, true);
W.add(box(900, 1, 2400, tm(0xffffff, { map: grassTex, repeat: [300, 800] }), 0, -0.5, 0));
const roadTex = ctex(128, 512, (g, w, h) => { g.fillStyle = '#55575e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = hash(i) < 0.5 ? 'rgba(40,40,46,0.6)' : 'rgba(110,110,118,0.5)'; g.fillRect(hash(i + 1) * w, hash(i + 2) * h, 2, 2); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(30,30,34,0.7)'; g.lineWidth = 1.5; g.beginPath(); let x = hash(i + 50) * w, y = hash(i + 60) * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i * 7 + k) - 0.5) * 30; y += 10 + hash(i * 3 + k) * 20; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(70,72,80,0.8)'; g.fillRect(hash(70) * w * 0.6, hash(71) * h, 30, 50);
  g.fillStyle = '#f0f0ea'; g.fillRect(4, 0, 4, h); g.fillRect(w - 8, 0, 4, h); g.fillStyle = '#f2c21c'; g.fillRect(w / 2 - 5, 0, 3, h); g.fillRect(w / 2 + 2, 0, 3, h); }, true);
W.add(box(7.4, 0.06, 2400, tm(0xffffff, { map: roadTex, repeat: [1, 2400 / 9] }), 0, 0.03, 0));
for (const [x0, x1] of [[-1.35, -4.9], [-2.25, -5.8]]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 1), tm(0x2a2a2e, { noInk: 1 })); const z0 = -24, z1 = -3.2; sk.scale.z = Math.hypot(x1 - x0, z1 - z0); sk.position.set((x0 + x1) / 2, 0.065, (z0 + z1) / 2); sk.rotation.y = Math.atan2(x1 - x0, z1 - z0); W.add(sk); }
// shoulders (gravel)
for (const s of [-1, 1]) W.add(box(0.8, 0.04, 2400, tm(0x9a8f78), s * 4.1, 0.02, 0));
// crop fields beyond the fences
{ const geos = { a: [], b: [], c: [] }; const tmp = new THREE.BoxGeometry(1, 0.06, 1);
  for (const s of [-1, 1]) for (let i = -30; i < 30; i++) { const g = tmp.clone(); const k = ['a', 'b', 'c'][(i + 60 + (s > 0 ? 1 : 0)) % 3]; g.scale(240, 1, 38); g.translate(s * (16 + 120), 0.03, i * 40 + 20); geos[k].push(g); }
  W.add(new THREE.Mesh(mergeGeometries(geos.a), tm(0xd8b54a))); W.add(new THREE.Mesh(mergeGeometries(geos.b), tm(0xa8c83e))); W.add(new THREE.Mesh(mergeGeometries(geos.c), tm(0xc89a3a))); }
// fences both sides: merged posts + 2 wires
{ const gs = []; const p = new THREE.BoxGeometry(0.12, 1.3, 0.12); for (const s of [-1, 1]) for (let z = -600; z <= 600; z += 5) { const g = p.clone(); g.translate(s * 15, 0.65, z + (s > 0 ? 2.5 : 0)); gs.push(g); }
  W.add(new THREE.Mesh(mergeGeometries(gs), tm(0x6a5038))); for (const s of [-1, 1]) for (const y of [0.75, 1.15]) W.add(box(0.03, 0.03, 1200, tm(0x3a3a3a), s * 15, y, 0)); }
// ---- dense grass: thousands of blades in clumps (merged, 3 shades, no ink outlines) ----
function grassGeo(seed, clumps, xr, zr, hMin, hMax) {
  const pos = [], nor = [], uv = [];
  for (let c = 0; c < clumps; c++) { const cx = xr[0] + hash(seed + c * 1.37) * (xr[1] - xr[0]), cz = zr[0] + hash(seed + c * 2.71 + 0.5) * (zr[1] - zr[0]); const nb = 5 + Math.floor(hash(seed + c * 9.1) * 6), hs = 0.7 + hash(seed + c * 4.4) * 0.6;
    for (let b = 0; b < nb; b++) { const q = seed + c * 13.1 + b * 1.9; const r = hash(q) * 0.16, ang = hash(q + 0.3) * 6.283; const x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r; const h = (hMin + hash(q + 0.7) * (hMax - hMin)) * hs;
      const a = hash(q + 1.1) * 6.283, w = 0.03 + hash(q + 1.7) * 0.025, lean = 0.15 + hash(q + 2.3) * 0.45, la = ang; const lx = Math.cos(a) * w, lz = Math.sin(a) * w;
      const tx = x + Math.cos(la) * lean * h, tz = z + Math.sin(la) * lean * h; pos.push(x - lx, 0, z - lz, x + lx, 0, z + lz, tx, h, tz); nor.push(0, 1, 0, 0, 1, 0, 0.2, 1, 0.2); uv.push(0, 0, 1, 0, 0.5, 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}
{ const cols = [0x4f9e2e, 0x6cbc3a, 0x8fd04a], areas = [[[-15, -4.7], [-40, 40], 2600], [[4.7, 15], [-40, 40], 2000], [[-15, -4.7], [-220, -40], 1500], [[4.7, 15], [-220, -40], 1100], [[-15, -4.7], [40, 220], 1500], [[4.7, 15], [40, 220], 1100], [[-12, -4.7], [-10, 10], 900]];
  cols.forEach((c, k) => { const gs = areas.map(([xr, zr, n], j) => grassGeo(100 * k + 17 * j + 3, Math.round(n / 3), xr, zr, 0.16, 0.5)); const m = new THREE.Mesh(mergeGeometries(gs), tm(c, { noInk: 1, side: THREE.DoubleSide, band: 0.2 })); m.frustumCulled = false; W.add(m); }); }
// far hills (break the flat horizon)
for (let i = 0; i < 14; i++) { const sd = i % 2 ? 1 : -1; const h = sph(1, tm([0x86a84a, 0x9ab44e, 0x7a9a46][i % 3], { band: 0.15 }), sd * (170 + hash(i) * 120), -8, -420 + i * 65, 20, 12); h.scale.set(60 + hash(i + 3) * 60, 22 + hash(i + 5) * 18, 50 + hash(i + 7) * 40); W.add(h); }
// clouds
for (let i = 0; i < 9; i++) { const cl = makeCloud(i + 2, 1.6); cl.position.set(-260 + i * 70, 70 + (i % 3) * 14, 260 + (i % 4) * 60 - 120 * (i % 2)); W.add(cl); }
for (let i = 0; i < 5; i++) { const cl = makeCloud(i + 30, 1.4); cl.position.set(-200 + i * 100, 75, -300); W.add(cl); }

// ======================= THE TREE =======================
const barkTex = ctex(128, 256, (g, w, h) => { g.fillStyle = '#7a5a40'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = hash(i) * w; g.strokeStyle = hash(i + 1) < 0.5 ? 'rgba(60,40,26,0.8)' : 'rgba(150,118,86,0.5)'; g.lineWidth = 1 + hash(i + 2) * 3; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 4, y); g.stroke(); } }, true);
const bark = tm(0xffffff, { map: barkTex, repeat: [3, 2] }), leafA = tm(0x3f9a3a, { band: 0.12 }), leafB = tm(0x5cb846, { band: 0.12 }), leafC = tm(0x2f7a32, { band: 0.12 });
const STUMP = new THREE.Group(); STUMP.position.copy(TREE_P); W.add(STUMP);
STUMP.add(cyl(0.52, 0.68, 0.6, bark, 0, 0.3, 0, 18)); STUMP.add(cyl(0.5, 0.5, 0.02, tm(0xd8b88a), 0, 0.61, 0, 18));
for (let i = 0; i < 5; i++) { const r = cyl(0.12, 0.2, 0.9, bark, Math.cos(i * 1.3) * 0.6, 0.12, Math.sin(i * 1.3) * 0.6, 8); r.rotation.z = Math.cos(i * 1.3) * 1.2; r.rotation.x = -Math.sin(i * 1.3) * 1.2; STUMP.add(r); }
const TREE = new THREE.Group(); TREE.position.set(TREE_P.x, 0.6, TREE_P.z); W.add(TREE);
const TRUNK = cyl(0.42, 0.52, 4.2, bark, 0, 2.1, 0, 18); TREE.add(TRUNK);
const branches = [[0, 3.6, 0, 1.0, 0.6, 2.8], [2.1, 3.3, 0.3, -0.9, 0.5, 2.6], [4.0, 3.9, -0.2, 0.2, -0.9, 2.4], [1.0, 3.0, 2.6, 0.7, 0.8, 2.2], [3.0, 4.1, 0, -0.4, -0.3, 2.0]];
for (const [a, y, b, rz, rx, l] of branches) { const g = new THREE.Group(); g.position.set(0, y, 0); g.rotation.set(rx, a, rz); g.add(cyl(0.12, 0.26, l, bark, 0, l / 2, 0, 10)); TREE.add(g); }
{ const buckets = [[], [], [], []], ico = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 190; i++) { const u = hash(i * 1.3), v = hash(i * 2.9 + 0.4), th = u * 6.283, ph = Math.acos(1 - 2 * v * 0.85), rr = 0.55 + 0.45 * Math.sqrt(hash(i * 3.7));
    const x = Math.cos(th) * Math.sin(ph) * 3.5 * rr, y = 6.2 + Math.cos(ph) * 2.3 * rr, z = Math.sin(th) * Math.sin(ph) * 3.5 * rr, sc = 0.55 + hash(i * 5.3) * 0.6;
    const g = ico.clone(); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const j = 1 + (hash(i * 7.1 + k * 0.37) - 0.5) * 0.35; p.setXYZ(k, p.getX(k) * j, p.getY(k) * j * 0.85, p.getZ(k) * j); }
    g.computeVertexNormals(); g.scale(sc, sc, sc); g.translate(x, y, z); const shade = (y - 4.2) / 4.5 + (hash(i * 9.9) - 0.5) * 0.5; buckets[Math.max(0, Math.min(3, Math.floor(shade * 4)))].push(g); }
  const lc = [tm(0x2a6a2a, { band: 0.15, noInk: 1 }), tm(0x3a8a32, { band: 0.15, noInk: 1 }), tm(0x52a83a, { band: 0.15, noInk: 1 }), tm(0x74c446, { band: 0.15, noInk: 1 })];
  buckets.forEach((b, k) => { if (b.length) TREE.add(new THREE.Mesh(mergeGeometries(b), lc[k])); }); }
COL.box(TREE_P.x, TREE_P.z, 1.0, 1.0, 0);
// falling leaves pool
const LEAVES = []; for (let i = 0; i < 24; i++) { const l = box(0.14, 0.02, 0.09, [leafA, leafB][i % 2]); W.add(l); LEAVES.push(l); }

// ======================= SIGNS =======================
function textPlane(w, h, draw, emis = true) { const t = ctex(Math.round(256 * w / h), 256, draw); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), tm(0xffffff, { map: t, unlit: emis ? 1 : 0, noInk: 1 })); }
// days since last crash
const DAYS = new THREE.Group(); DAYS.position.set(-7.6, 0, -2.4); DAYS.rotation.y = 2.09; W.add(DAYS);
DAYS.add(box(0.1, 2.2, 0.1, tm(0x8a8a8a), 0, 1.1, -0.02)); DAYS.add(box(1.1, 1.3, 0.08, tm(0xf4f4f0), 0, 2.4, 0));
const daysHead = textPlane(1.0, 0.36, (g, w, h) => { g.fillStyle = '#d22a24'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 92px sans-serif'; g.textAlign = 'center'; g.fillText('DAYS SINCE', w / 2, 100); g.fillText('LAST CRASH', w / 2, 210); }, false); daysHead.position.set(0, 2.82, 0.045); DAYS.add(daysHead);
const digit = (n) => textPlane(0.62, 0.78, (g, w, h) => { g.fillStyle = '#1c1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 210px sans-serif'; g.textAlign = 'center'; g.fillText(String(n), w / 2, 205); }, false);
const D7 = digit(7), D0 = digit(0); for (const d of [D7, D0]) { d.position.set(0, 2.2, 0.045); DAYS.add(d); }
// speed sign "YOUR SPEED 15"
const SPEEDS = new THREE.Group(); SPEEDS.position.set(-4.7, 0, -18); SPEEDS.rotation.y = Math.PI + 0.35; W.add(SPEEDS);
SPEEDS.add(box(0.1, 2.0, 0.1, tm(0x8a8a8a), 0, 1.0, -0.03)); SPEEDS.add(box(0.95, 1.25, 0.12, tm(0x202024), 0, 2.4, 0));
const spHead = textPlane(0.8, 0.26, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.fillText('YOUR SPEED', w / 2, 170); }, false); spHead.position.set(0, 2.86, 0.065); SPEEDS.add(spHead);
const spNum = textPlane(0.8, 0.72, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb21c'; g.font = 'bold 200px monospace'; g.textAlign = 'center'; g.fillText('15', w / 2, 200); }); spNum.position.set(0, 2.3, 0.065); SPEEDS.add(spNum);
// the GIANT FLASHING ARROW ("DON'T HIT THIS TREE")
const ARROW = new THREE.Group(); const ARROW_P = V(-4.6, 0, 5.5); ARROW.position.copy(ARROW_P); ARROW.rotation.y = Math.PI / 2 + 0.35; W.add(ARROW);
const red = tm(0xd8262a), redD = tm(0x8a1618);
for (const x of [-0.95, 0.95]) ARROW.add(box(0.14, 3.0, 0.14, tm(0x6a6a70), x, 1.5, -0.1));
ARROW.add(box(2.5, 1.7, 0.18, red, 0, 3.4, 0, 0.06));
const arrowTxt = textPlane(2.1, 1.35, (g, w, h) => { g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c81e22'; g.font = 'bold 74px sans-serif'; g.textAlign = 'center'; g.fillText("DON'T", w / 2, 82); g.font = 'bold 82px sans-serif'; g.fillText('HIT THIS', w / 2, 166); g.fillText('TREE', w / 2, 246); }, false);
arrowTxt.position.set(0, 3.4, 0.1); ARROW.add(arrowTxt);
const ARC = new THREE.Group(); ARC.position.set(0, 4.6, 0.25); ARROW.add(ARC); const A0 = 35 * Math.PI / 180, AR = 1.6;
{ const tor = new THREE.Mesh(new THREE.TorusGeometry(AR, 0.3, 10, 40, Math.PI), red); tor.rotation.z = A0; ARC.add(tor);
  const tor2 = new THREE.Mesh(new THREE.TorusGeometry(AR, 0.17, 8, 40, Math.PI), tm(0xf6eedd)); tor2.position.z = 0.17; tor2.scale.z = 0.4; tor2.rotation.z = A0; ARC.add(tor2);
  const d = V(Math.sin(A0), -Math.cos(A0), 0); const head = cyl(0.0, 0.7, 1.1, red, 0, 0, 0, 4); head.rotation.z = A0 + Math.PI; head.position.set(AR * Math.cos(A0), AR * Math.sin(A0), 0).addScaledVector(d, 0.5); ARC.add(head); }
const BULBS = [], bulbOn = tm(0xfff2b0, { unlit: 1, noInk: 1 }), bulbOff = tm(0x8a5a3a, { noInk: 1 });
{ for (let i = 0; i < 24; i++) { const a = A0 + (i / 23) * Math.PI; const b = sph(0.075, bulbOn, AR * Math.cos(a), AR * Math.sin(a), 0.3, 8, 6); ARC.add(b); BULBS.push(b); }
  for (let i = 0; i < 20; i++) { const u = i / 20; const per = 2 * (2.5 + 1.7); let d = u * per, x, y; if (d < 2.5) { x = -1.25 + d; y = 0.85; } else if (d < 4.2) { x = 1.25; y = 0.85 - (d - 2.5); } else if (d < 6.7) { x = 1.25 - (d - 4.2); y = -0.85; } else { x = -1.25; y = -0.85 + (d - 6.7); }
    const b = sph(0.06, bulbOn, x, 3.4 + y, 0.12, 8, 6); ARROW.add(b); BULBS.push(b); } }

// ======================= VEHICLES =======================
const dark = tm(0x22222a), chrome = tm(0xd8d8de), tire = tm(0x1a1a1e), glass = tm(0x2a3a52), headL = tm(0xfff6d0, { unlit: 1, noInk: 1 }), tailL = tm(0xe02020, { unlit: 1, noInk: 1 });
function makeVehicle(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const col = tm(o.color), wheels = [];
  const L = o.len || 4.3, Wd = 1.9;
  if (!o.open) body.add(box(Wd, 0.62, L, col, 0, 0.66, 0, 0.16));                     // lower body
  else { // hollow cabin: hood, trunk, two side walls, floor -> seated people are visible inside
    const zf = 0.75, zb = -1.15; body.add(box(Wd, 0.62, L / 2 - zf, col, 0, 0.66, (L / 2 + zf) / 2, 0.14)); body.add(box(Wd, 0.62, L / 2 + zb, col, 0, 0.66, (zb - L / 2) / 2, 0.14));
    for (const sd of [-1, 1]) body.add(box(0.1, 0.62, zf - zb + 0.1, col, sd * (Wd / 2 - 0.05), 0.66, (zf + zb) / 2, 0.04));
    body.add(box(Wd - 0.2, 0.06, zf - zb, tm(0x2a2a2e), 0, 0.4, (zf + zb) / 2)); }
  body.add(box(Wd + 0.04, 0.16, 0.25, chrome, 0, 0.5, L / 2 + 0.02, 0.05)); body.add(box(Wd + 0.04, 0.16, 0.25, chrome, 0, 0.5, -L / 2 - 0.02, 0.05));
  for (const x of [-0.65, 0.65]) { body.add(box(0.36, 0.16, 0.06, headL, x, 0.78, L / 2 + 0.005)); body.add(box(0.32, 0.14, 0.06, tailL, x, 0.8, -L / 2 - 0.005)); }
  if (o.stripe) for (const s of [-1, 1]) body.add(box(0.02, 0.36, L * 0.52, tm(o.stripe), s * (Wd / 2 + 0.005), 0.66, -0.1));
  if (o.open) {   // open cabin (pillars, no glass) so the driver is visible
    for (const [x, z, h] of [[-0.86, 0.45, 1], [0.86, 0.45, 1], [-0.86, -1.35, 1], [0.86, -1.35, 1]]) { const p = box(0.08, 1.42, 0.1, col, x, 1.66, z); p.rotation.x = z > 0 ? -0.35 : 0.12; body.add(p); }
    body.add(box(1.86, 0.1, 1.85, col, 0, 2.36, -0.5, 0.04)); body.add(box(1.72, 0.42, 0.8, dark, 0, 1.1, 0.48, 0.05)); body.add(box(0.55, 0.14, 0.3, dark, 0.42, 1.36, 0.5, 0.04)); body.add(box(0.42, 0.1, 0.02, tm(0x9ad0ff, { unlit: 1, noInk: 1 }), 0.42, 1.36, 0.345)); // roof, dashboard, gauge hood
    body.add(box(1.75, 0.08, 0.06, col, 0, 1.0, 0.82));
    for (const x of [-0.42, 0.42]) { body.add(box(0.55, 0.12, 0.4, tm(0x3a3030), x, 0.74, -0.52)); body.add(box(0.55, 0.8, 0.12, tm(0x3a3030), x, 1.25, -0.8)); }
    const SW = new THREE.Group(); SW.position.set(0.42, 1.08, -0.24); SW.rotation.x = 0.45; body.add(SW);
    const swM = tm(0x2a2a30), swG = tm(0x8a8a94); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 10, 32), swM); SW.add(rim); for (const ang of [0, 2.094, 4.189]) { const sp = box(0.15, 0.03, 0.018, swM, Math.cos(ang - 1.5708) * 0.075, Math.sin(ang - 1.5708) * 0.075, 0); sp.rotation.z = ang - 1.5708; SW.add(sp); } SW.add(cyl(0.05, 0.05, 0.035, swG, 0, 0, 0.0).rotateX(Math.PI / 2)); SW.add(cyl(0.028, 0.034, 0.4, swM, 0, 0, 0.2).rotateX(Math.PI / 2));
    g.userData.SW = SW;
  } else { for (const sd of [-1, 1]) { const gl = box(0.02, 0.07, 0.9, tm(0xcfe4ff, { unlit: 1, noInk: 1 }), sd * 0.875, 1.32, -0.2); gl.rotation.x = 0.5; body.add(gl); }
    body.add(box(1.72, 0.62, 2.0, glass, 0, 1.25, -0.35, 0.14)); body.add(box(1.76, 0.1, 1.7, col, 0, 1.58, -0.35, 0.05)); body.add(box(0.06, 0.6, 0.1, col, 0, 1.25, -0.35)); }
  if (o.lightbar) { body.add(box(1.2, 0.14, 0.3, dark, 0, 2.46, -0.5)); g.userData.lbR = box(0.5, 0.14, 0.26, tm(0xff2222, { unlit: 1, noInk: 1 }), -0.32, 2.54, -0.5); g.userData.lbB = box(0.5, 0.14, 0.26, tm(0x2a5aff, { unlit: 1, noInk: 1 }), 0.32, 2.54, -0.5); body.add(g.userData.lbR); body.add(g.userData.lbB); }
  if (o.text) for (const s of [-1, 1]) { const tp = textPlane(1.6, 0.34, (gg, w, h) => { gg.fillStyle = o.textBg || '#ffffff'; gg.fillRect(0, 0, w, h); gg.fillStyle = o.textCol || '#1d5a2a'; gg.font = 'bold 170px sans-serif'; gg.textAlign = 'center'; gg.fillText(o.text, w / 2, 200); }, false); tp.position.set(s * (Wd / 2 + 0.02), 0.72, -0.1); tp.rotation.y = s * Math.PI / 2; body.add(tp); }
  for (const sd of [-1, 1]) { body.add(box(0.015, 0.5, 0.02, dark, sd * 0.955, 0.7, 0.35)); body.add(box(0.015, 0.5, 0.02, dark, sd * 0.955, 0.7, -0.75)); for (const z of [L / 2 - 0.85, -L / 2 + 0.85]) { const a = cyl(0.47, 0.47, 0.06, tm(0x18181c), sd * 0.93, 0.42, z, 18); a.rotation.z = Math.PI / 2; body.add(a); } }
  for (const z of [L / 2 - 0.85, -L / 2 + 0.85]) for (const x of [-0.92, 0.92]) { const wg = new THREE.Group(); wg.position.set(x, 0.38, z); const w = cyl(0.38, 0.38, 0.3, tire, 0, 0, 0, 16); w.rotation.z = Math.PI / 2; wg.add(w); const h = cyl(0.2, 0.2, 0.32, chrome, 0, 0, 0, 10); h.rotation.z = Math.PI / 2; wg.add(h); g.add(wg); wheels.push(wg); }
  W.add(g); return { group: g, body, wheels, L, SW: g.userData.SW, lbR: g.userData.lbR, lbB: g.userData.lbB, hood: null };
}
function makeTow() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const r = tm(0xd42a22), wh = tm(0xf0f0ea);
  body.add(box(2.1, 1.0, 2.0, r, 0, 1.0, 1.9, 0.12)); body.add(box(1.9, 0.9, 1.4, r, 0, 1.85, 1.6, 0.12)); body.add(box(1.8, 0.5, 0.06, glass, 0, 1.95, 2.31));
  body.add(box(2.1, 0.5, 3.4, wh, 0, 0.85, -0.9, 0.06)); body.add(box(2.0, 0.12, 0.3, chrome, 0, 0.55, 2.95));
  const boom = box(0.25, 0.25, 2.6, tm(0xf2c21c), 0, 2.0, -1.2); boom.rotation.x = 0.55; body.add(boom); body.add(box(0.05, 0.9, 0.05, dark, 0, 1.4, -2.4));
  for (const x of [-0.7, 0.7]) body.add(box(0.3, 0.12, 0.06, headL, x, 1.2, 2.92));
  for (const s of [-1, 1]) { const tp = textPlane(1.8, 0.45, (gg, w, h) => { gg.fillStyle = '#d42a22'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#fff'; gg.font = 'bold 150px sans-serif'; gg.textAlign = 'center'; gg.fillText('24HR TOWING', w / 2, 180); }, false); tp.position.set(s * 1.065, 1.05, 1.9); tp.rotation.y = s * Math.PI / 2; tp.scale.set(0.95, 0.95, 1); body.add(tp);
    const tp2 = textPlane(1.6, 0.4, (gg, w, h) => { gg.fillStyle = '#f0f0ea'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#c81e22'; gg.font = 'bold 120px sans-serif'; gg.textAlign = 'center'; gg.fillText('CASH ONLY', w / 2, 170); }, false); tp2.position.set(s * 1.06, 0.85, -1.0); tp2.rotation.y = s * Math.PI / 2; body.add(tp2); }
  const wheels = []; for (const z of [2.2, -0.6, -1.9]) for (const x of [-0.98, 0.98]) { const wg = new THREE.Group(); wg.position.set(x, 0.45, z); const w = cyl(0.45, 0.45, 0.34, tire, 0, 0, 0, 16); w.rotation.z = Math.PI / 2; wg.add(w); const h = cyl(0.22, 0.22, 0.36, chrome, 0, 0, 0, 10); h.rotation.z = Math.PI / 2; wg.add(h); g.add(wg); wheels.push(wg); }
  W.add(g); return { group: g, body, wheels };
}
const CR = makeVehicle({ color: 0xf4f4f0, stripe: 0x1d6a34, open: true, lightbar: true, text: 'SHERIFF' });        // sheriff cruiser
const NC = makeVehicle({ color: 0x3a4a6a, open: true });                                                            // night driver
const CARS = { blue: makeVehicle({ color: 0x2a6ae0 }), yellow: makeVehicle({ color: 0xf2c21c }), red: makeVehicle({ color: 0xd8382a }), teal: makeVehicle({ color: 0x2aa8a0 }), orange: makeVehicle({ color: 0xf08a2a }) };
const TOW_P = [-8.6, 4.6]; const TOW = makeTow(); TOW.group.position.set(TOW_P[0], 0, TOW_P[1]);
// ----- drive model: integrate speed backwards from the impact (or from a reference time) -----
function integ(vf, t0, t1) { let d = 0; const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) * 60)); for (let i = 0; i < n; i++) { const tt = t0 + (t1 - t0) * (i + 0.5) / n; d += vf(tt) * (t1 - t0) / n; } return d; }
function drive(D, t) {
  const v = typeof D.v === 'function' ? D.v : () => D.v; const dir = D.dir || 1;
  const tt = Math.min(t, D.tImp); const s = integ(v, tt, D.tImp);                    // metres still to go before the impact point
  const lat = (tq) => { const rem = D.tImp - tq; const u = clamp(1 - rem / D.veer, 0, 1); return lerp(D.lane, D.stop[0], EASE.inOut(u) * 1.0); };
  let x = lat(tt), z = D.stop[1] - dir * s; const x2 = lat(tt + 0.02), z2 = D.stop[1] - dir * integ(v, Math.min(tt + 0.02, D.tImp), D.tImp);
  let yaw = dir > 0 ? 0 : Math.PI; if (Math.hypot(x2 - x, z2 - z) > 1e-4) yaw = Math.atan2(x2 - x, z2 - z);
  const after = t - D.tImp; let pitch = 0, roll = 0, crushed = 0, spin = s / 0.38;
  if (after > 0) { const k = D.hard ?? 1; const back = 0.45 * k * Math.sin(Math.min(1, after / 0.35) * Math.PI / 2) * Math.exp(-after * 0.5); x -= Math.sin(yaw) * back; z -= Math.cos(yaw) * back;
    pitch = (D.stump ? -0.22 : 0.07 * k) * Math.exp(-after * 5) * Math.cos(after * 22) + (D.stump ? -0.09 : 0.025) ; roll = 0.05 * k * Math.exp(-after * 4) * Math.sin(after * 18); crushed = sstep(0, 0.12, after); }
  return { x, z, yaw, pitch, roll, crushed, after, spin, speed: after > 0 ? 0 : v(tt) };
}
function poseCar(car, st) { car.group.position.set(st.x, 0, st.z); car.group.rotation.set(0, st.yaw, 0); car.body.rotation.set(st.pitch, 0, st.roll);
  car.body.scale.z = 1 - 0.1 * st.crushed; car.body.position.z = -car.L * 0.05 * st.crushed; for (const w of car.wheels) w.rotation.x = st.spin; }
// crash events (impact times sit on the words of the voice)
const CRASH = [
  { car: CARS.blue, tImp: 3.62, v: 24, lane: -1.8, veer: 1.4, stop: [-5.5, -2.6], show: [[2.0, 4.13]] },
  { car: CARS.yellow, tImp: 10.53, v: 22, lane: -1.8, veer: 1.3, stop: [-5.5, -2.6], show: [[9.2, 11.77]] },
  { car: CARS.red, tImp: 15.98, v: 24, lane: -1.8, veer: 1.2, stop: [-5.5, -2.6], show: [[15.0, 21.77]] },
  { car: CARS.teal, tImp: 16.6, v: 24, lane: 1.8, veer: 1.4, stop: [-6.55, 2.6], dir: -1, show: [[15.0, 21.77]] },
];
// sheriff cruiser: three trips
const vSher1 = (t) => (t < 23.4 ? 30 : t < 24.4 ? lerp(30, 6.7, sstep(23.4, 24.4, t)) : 6.7);
const CRUISE = [
  { tImp: 27.8, v: vSher1, lane: -1.8, veer: 2.3, stop: [-5.5, -2.6], show: [21.77, 35.6] },
  { tImp: 41.15, v: (t) => (t < 39.6 ? 16 : 11), lane: -1.8, veer: 1.6, stop: [-5.5, -2.55], stump: true, hard: 0.6, show: [35.6, 43.57] },
  { tImp: 58.72, v: 13, lane: -1.8, veer: 1.5, stop: [-5.5, -2.55], stump: true, hard: 0.7, show: [57.77, 60] },
];
// night car: drifts toward the tree, never reaches it inside the night section
const NIGHT = { tImp: 60.5, v: 22, lane: -1.8, veer: 6.5, stop: [-5.0, -2.6] };

// ======================= PEOPLE =======================
// ---------- TOON HEAD v2: big round head, big eyes, thick brows, readable mouth shapes (replaces the realistic face) ----------
const MOUTHS = ['flat', 'smile', 'grin', 'laugh', 'frown', 'o', 'grit', 'wavy', 'smirk', 'sad'];
function mouthTex(skin, kind, blush) { return ctex(1024, 512, (g, w, h) => { g.fillStyle = skin; g.fillRect(0, 0, w, h); const cx = 256, cy = 300; g.lineCap = 'round'; g.lineJoin = 'round';
  if (blush) { g.fillStyle = 'rgba(255,90,90,0.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 88, cy - 38, 30, 16, 0, 0, 7); g.fill(); } }
  const ink = '#1a0e0e', inside = '#5a1418', tongue = '#e0606a', teeth = '#ffffff'; g.strokeStyle = ink; g.lineWidth = 9;
  const shape = (pts, fill) => { g.beginPath(); pts(); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); };
  if (kind === 'flat') { g.beginPath(); g.moveTo(cx - 34, cy); g.lineTo(cx + 34, cy); g.stroke(); }
  if (kind === 'smile') { g.beginPath(); g.moveTo(cx - 52, cy - 12); g.quadraticCurveTo(cx, cy + 40, cx + 52, cy - 12); g.stroke(); }
  if (kind === 'smirk') { g.beginPath(); g.moveTo(cx - 40, cy + 4); g.quadraticCurveTo(cx + 10, cy + 16, cx + 48, cy - 18); g.stroke(); }
  if (kind === 'frown') { g.beginPath(); g.moveTo(cx - 46, cy + 18); g.quadraticCurveTo(cx, cy - 26, cx + 46, cy + 18); g.stroke(); }
  if (kind === 'sad') { shape(() => { g.moveTo(cx - 40, cy + 22); g.quadraticCurveTo(cx, cy - 30, cx + 40, cy + 22); g.quadraticCurveTo(cx, cy + 6, cx - 40, cy + 22); }, inside); }
  if (kind === 'grin') { shape(() => { g.moveTo(cx - 60, cy - 16); g.lineTo(cx + 60, cy - 16); g.quadraticCurveTo(cx + 56, cy + 52, cx, cy + 54); g.quadraticCurveTo(cx - 56, cy + 52, cx - 60, cy - 16); }, inside);
    g.fillStyle = teeth; g.fillRect(cx - 54, cy - 12, 108, 18); g.strokeRect(cx - 54, cy - 12, 108, 18); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 36, 26, 12, 0, 0, 7); g.fill(); }
  if (kind === 'laugh') { shape(() => { g.moveTo(cx - 64, cy - 26); g.quadraticCurveTo(cx, cy - 10, cx + 64, cy - 26); g.quadraticCurveTo(cx + 60, cy + 74, cx, cy + 78); g.quadraticCurveTo(cx - 60, cy + 74, cx - 64, cy - 26); }, inside);
    g.fillStyle = teeth; g.beginPath(); g.moveTo(cx - 58, cy - 20); g.quadraticCurveTo(cx, cy - 6, cx + 58, cy - 20); g.lineTo(cx + 54, cy - 2); g.quadraticCurveTo(cx, cy + 10, cx - 54, cy - 2); g.closePath(); g.fill(); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 56, 34, 16, 0, 0, 7); g.fill(); }
  if (kind === 'o') { shape(() => { g.ellipse(cx, cy + 14, 30, 42, 0, 0, 7); }, inside); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 40, 18, 10, 0, 0, 7); g.fill(); }
  if (kind === 'grit') { shape(() => { g.rect(cx - 56, cy - 18, 112, 40); }, teeth); g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 56, cy + 2); g.lineTo(cx + 56, cy + 2); for (let i = -3; i <= 3; i++) { g.moveTo(cx + i * 16, cy - 18); g.lineTo(cx + i * 16, cy + 22); } g.stroke(); }
  if (kind === 'wavy') { shape(() => { g.moveTo(cx - 56, cy); for (let i = 0; i <= 8; i++) g.lineTo(cx - 56 + i * 14, cy + (i % 2 ? -12 : 10)); g.lineTo(cx + 50, cy + 34); g.quadraticCurveTo(cx, cy + 46, cx - 50, cy + 34); }, inside); }
}); }
class ToonHead {
  constructor(P, o) {
    this.P = P; for (const c of P.head.children) c.visible = false; const G = new THREE.Group(); P.head.add(G); this.G = G; const R = 0.235; this.R = R;
    this.tex = {}; for (const k of MOUTHS) { this.tex[k] = mouthTex(o.skin, k, false); this.tex[k + '+'] = mouthTex(o.skin, k, true); }
    this.skullM = tm(0xffffff, { map: this.tex.flat }); const sk = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), this.skullM); sk.scale.set(1, o.egg ? 1.08 : 1.04, 0.96); G.add(sk); if (o.egg) { G.position.y = 0.12; G.scale.setScalar(1.75); } const HG = new THREE.Group(); HG.position.y = o.egg ? R * 0.06 : 0; G.add(HG);
    const skinM = tm(o.skin); this.skinM = skinM; if (!o.egg) { const nose = sph(0.032, skinM, 0, -0.005, R * 0.97, 14, 10); nose.scale.set(1.1, 0.9, 0.9); G.add(nose);
    for (const sx of [-1, 1]) { const e = sph(0.045, skinM, sx * R * 0.98, -0.01, -0.01, 12, 10); e.scale.set(0.45, 1, 0.8); G.add(e); } }
    const white = tm(0xffffff, { unlit: 0.9, noInk: 1 }), blk = tm(0x111111, { unlit: 1, noInk: 1 }); this.eyes = []; const EW = 0.05, EH = 0.064; this.EW = EW; this.EH = EH;
    const surf = (x, y) => Math.sqrt(Math.max(0, R * R - x * x - (y / 1.08) * (y / 1.08))) * 0.96;
    for (const sx of [-1, 1]) { const x0 = sx * 0.072, y0 = 0.035; const E = new THREE.Group(); E.position.set(x0, y0, surf(x0, y0) + 0.004); E.quaternion.setFromUnitVectors(V(0, 0, 1), V(x0, y0 * 0.6, surf(x0, y0)).normalize()); G.add(E);
      const inner = new THREE.Group(); E.add(inner); const disc = (r, n = 32) => new THREE.CircleGeometry(r, n);
      const ol = new THREE.Mesh(disc(1), blk); ol.scale.set(EW + 0.012, EH + 0.012, 1); inner.add(ol); const wh = new THREE.Mesh(disc(1), white); wh.scale.set(EW, EH, 1); wh.position.z = 0.002; inner.add(wh);
      const pup = new THREE.Mesh(disc(1, 20), blk); pup.scale.set(0.024, 0.028, 1); pup.position.z = 0.004; inner.add(pup); const gl = new THREE.Mesh(disc(1, 12), tm(0xffffff, { unlit: 1, noInk: 1 })); gl.scale.setScalar(0.008); gl.position.z = 0.006; inner.add(gl);
      const lid = new THREE.Group(); E.add(lid); const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 32, 0, Math.PI), skinM); plate.scale.set(EW + 0.016, EH * 1.08, 1); plate.position.z = 0.008; plate.geometry = plate.geometry.clone(); lid.add(plate);
      const edge = box(2 * (EW + 0.014), 0.013, 0.004, blk, 0, 0, 0.0095); lid.add(edge); const arc = new THREE.Mesh(new THREE.TorusGeometry(EW * 0.95, 0.012, 6, 20, Math.PI), blk); arc.position.z = 0.006; E.add(arc);
      const brow = box(0.13, 0.032, 0.014, tm(o.brow || '#1a120c'), 0, 0, 0, 0.006); brow.position.set(sx * 0.08, 0.13, surf(sx * 0.08, 0.13) + 0.02); G.add(brow); this.eyes.push({ sx, E, inner, pup, gl, lid, edge, brow, arc, plate }); }
    if (o.mustache) { for (const sx of [-1, 1]) { const m = box(0.085, 0.03, 0.03, tm(o.mustache), sx * 0.042, -0.048, R * 0.93, 0.013); m.rotation.z = -sx * 0.28; m.rotation.y = sx * 0.3; G.add(m); } }
    if (o.hair) { const c = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 30, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), tm(o.hair)); c.rotation.x = -0.45; HG.add(c); const fr = sph(0.07, tm(o.hair), 0.04, R * 0.82, 0.1, 12, 8); fr.scale.set(1.8, 0.6, 1); HG.add(fr); }
    if (o.hat === 'brim') { HG.position.y = R * 0.2; const hc = tm(o.hatCol); const cr = cyl(R * 0.78, R * 0.92, 0.16, hc, 0, R * 0.86, -0.01, 24); HG.add(cr); const br = cyl(R * 1.55, R * 1.55, 0.02, hc, 0, R * 0.62, 0, 32); HG.add(br); HG.add(cyl(R * 0.93, R * 0.95, 0.04, tm(0x2a1a10), 0, R * 0.68, -0.01, 24)); HG.add(box(0.05, 0.02, R * 1.1, tm(0x5a3a20), 0, R * 0.86 + 0.081, 0)); }
    if (o.hat === 'cap') { const hc = tm(o.hatCol); const d = new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 30, 14, 0, Math.PI * 2, 0, Math.PI * 0.43), hc); d.rotation.x = -0.3; HG.add(d); const v = cyl(R * 0.74, R * 0.74, 0.024, hc, 0, R * 0.66, R * 0.8, 24); v.scale.set(1, 1, 0.75); v.rotation.x = 0.18; HG.add(v); HG.add(sph(0.025, tm(0xffffff), 0, R * 1.03, -0.05, 8, 6)); }
    this.drops = []; for (let i = 0; i < 4; i++) { const d = sph(0.018, tm(0x7ad0ff, { unlit: 0.5 }), 0, 0, 0, 8, 6); d.scale.set(1, 1.5, 1); G.add(d); this.drops.push(d); }
    this.sweat = sph(0.026, tm(0x9ae0ff, { unlit: 0.5 }), R * 0.75, R * 0.55, R * 0.45, 10, 8); this.sweat.scale.set(1, 1.6, 1); G.add(this.sweat);
  }
  update(p, t) {
    const e1 = EXPR[p.expr] || EXPR.neutral, e2 = p.expr2 ? EXPR[p.expr2] || e1 : e1, m = p.mix || 0; const ex = {}; for (const k in e1) ex[k] = e1[k] * (1 - m) + (e2[k] || 0) * m; if (p.fx) for (const k in p.fx) ex[k] = (ex[k] || 0) + p.fx[k];
    const blink = p.blink || 0, wide = clamp(ex.wide, 0, 1.3), lid = clamp(0.1 + ex.lid * 0.85 - wide * 0.15, 0, 1), cl = clamp(lid + blink * (1 - lid), 0, 1); const look = p.look || [0, 0];
    for (const e of this.eyes) { e.E.scale.setScalar(this.eggK || 1); const w = 1 + 0.25 * wide, hap = clamp(ex.cheek, 0, 1) * (ex.smile > 0.5 ? 1 : 0); e.inner.scale.set(w, w * (1 - 0.3 * hap), 1); e.inner.position.y = -0.012 * hap;
      const tilt = clamp(ex.lidTilt, 0, 1.2); let amt = Math.max(cl, tilt * 0.28 + clamp(ex.lid, 0, 1) * 0.3); if (amt > 0.8) amt = 1; const shut = ex.tear > 0.4 || (ex.smile > 0.6 && ex.lid > 0.35); e.arc.visible = shut; e.inner.visible = !shut; if (shut) { amt = 0; e.arc.position.y = -0.012; } e.lid.visible = amt > 0.05; const H = this.EH * w + 0.012;
      e.lid.visible = false; const sq = Math.max(0.1, 1 - amt * 0.95); e.inner.scale.y *= sq; e.inner.position.y += -this.EH * w * (1 - sq) * 0.55; e.inner.rotation.z = e.sx * 0.42 * tilt; const ps = 1 - 0.38 * clamp(ex.small, 0, 1); e.pup.scale.set(0.024 * ps, 0.028 * ps, 1);
      const lx = clamp(look[0], -1, 1) * 0.02, ly = clamp(look[1], -1, 1) * 0.024 + (ex.quiver ? 0.002 * Math.sin(t * 40) : 0); e.pup.position.set(lx, ly, 0.004); e.gl.position.set(lx + 0.008, ly + 0.01, 0.006);
      const bt = clamp(ex.browTilt, -1.5, 1.5); e.brow.position.y = Math.min(this.browMax || 9, 0.13 + 0.03 * ex.brow + 0.02 * wide + 0.012 * clamp(ex.browArc, 0, 1) - 0.01 * Math.max(0, -bt) + 0.006 * Math.max(0, bt) + (ex.asym ? e.sx * 0.012 * ex.asym : 0)); if (this.browMax) { e.brow.rotation.set(0, e.sx * 0.35, -e.sx * 0.42 * clamp(bt, -1.5, 0.6)); continue; }
      e.brow.rotation.set(0, e.sx * 0.35, -e.sx * 0.42 * bt); }
    // mouth shape from the expression numbers
    let k = 'flat'; const o = ex.open, sm = ex.smile, fr = ex.frown;
    if (ex.quiver > 0.75 && o > 0.3) k = 'wavy'; else if (ex.oround > 0.5 && o > 0.3) k = 'o'; else if (sm > 0.8 && o > 0.55) k = 'laugh'; else if (sm > 0.7 && ex.teeth > 0.5) k = 'grin';
    else if (bt_(ex) < -0.85 && fr > 0.6) k = 'grit'; else if (fr > 0.6 && o > 0.12) k = 'sad'; else if (fr > 0.45) k = 'frown'; else if (ex.smirk > 0.55 && sm < 0.6) k = 'smirk'; else if (sm > 0.3) k = 'smile';
    const blush = ex.cheek > 0.45 && sm > 0.5; this.skullM.uniforms.uMap.value = this.tex[k + (blush ? '+' : '')];
    const red = clamp(-ex.browTilt - 0.6, 0, 1) * clamp(ex.frown, 0, 1) * (this.P.userData.rage ? 1 : 0.55); this.skullM.uniforms.uColor.value.setRGB(1, 1 - 0.38 * red, 1 - 0.42 * red); this.skinM.uniforms.uColor.value.copy(new THREE.Color(this.skinHex || 0xffffff)).multiply(this.skullM.uniforms.uColor.value);
    const tear = ex.tear > 0.4; this.drops.forEach((d, i) => { d.visible = tear; if (!tear) return; const u = (t * 0.9 + i * 0.5) % 1; const sx = i % 2 ? 1 : -1; d.position.set(sx * 0.09, -0.02 - u * 0.13, this.R * 0.9 - u * 0.03); });
    this.sweat.visible = ex.sweat > 0.4; if (this.sweat.visible) this.sweat.position.y = this.R * 0.55 - ((t * 0.5) % 1) * 0.12;
  }
}
const bt_ = (ex) => ex.browTilt;
const TH = { SHER: null, GUY: null, DRV: null };
const SHER = new Person({ skin: SKIN.ruddy, face: { ...FACES.heavy, age: 0.45 }, hair: '#3a2a1c', hairStyle: 'crop', mustache: '#3a2418', browColor: '#3a2418', hat: '#8a6238', hatStyle: 'brim', top: '#c8b07a', sleeve: '#c8b07a', bottom: '#c8b07a', shoe: '#141414', eyeColor: '#3a4a58', build: { w: 1.25, belly: 0.0, arm: 1.0 }, height: 0.62, browW: 34, headScale: 1.24, seed: 21 });
W.add(SHER.root);
{ const star = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 5), tm(0xe8b830, { emis: 0.2 })); star.rotation.x = Math.PI / 2; star.position.set(0.09, 0.46, 0.165); SHER.torso.add(star); }
const GUY = new Person({ skin: SKIN.olive, face: { ...FACES.round, age: 0.3 }, hair: '#2a1e16', hairStyle: 'short', stubble: '#2a1e16', hat: '#d8302a', hatStyle: 'brim', top: '#e8a02a', sleeve: '#e8a02a', bottom: '#e8a02a', shoe: '#141414', eyeColor: '#3a2a1c', build: { w: 1.2, belly: 0.0 }, height: 0.6, headScale: 1.24, seed: 7 });
W.add(GUY.root);
const DRV = new Person({ skin: SKIN.wheatish, face: FACES.oval, hair: '#120d0b', hairStyle: 'side', top: '#4a7a6a', sleeve: '#4a7a6a', bottom: '#4a7a6a', shoe: '#141414', eyeColor: '#2e2218', height: 0.6, build: { w: 1.2, belly: 0.0 }, headScale: 1.22, seed: 31 });
W.add(DRV.root);
TH.SHER = new ToonHead(SHER, { skin: '#f6f4ee', egg: true, mustache: '#2a1a12', hat: 'brim', hatCol: 0x6a4a2a }); TH.SHER.skinHex = 0xf6f4ee;
TH.GUY = new ToonHead(GUY, { skin: '#f6f4ee', egg: true, hat: 'cap', hatCol: 0x2a5ad8 }); TH.GUY.skinHex = 0xf6f4ee;
TH.DRV = new ToonHead(DRV, { skin: '#f6f4ee', egg: true, hair: '#1a120e' }); TH.DRV.skinHex = 0xf6f4ee; for (const h of [TH.SHER, TH.GUY, TH.DRV]) h.eggK = 0.95; TH.GUY.browMax = 0.135;
// stick-figure bodies: thin black limbs, black hands and joints, shirt as a simple tube
const STICK = PM('#141414');
function stickify(P) { const skinMat = PM(P.skinHex, { unlit: P.sp.skinUnlit ?? 0.1 });
  P.root.traverse((m) => { if (!m.isMesh) return; let n = m, inHead = false; while (n) { if (n === P.head) { inHead = true; break; } n = n.parent; } if (inHead) return; if (m.material === skinMat) m.material = STICK; });
  for (const k of ['aL', 'aR', 'fL', 'fR', 'tL', 'tR', 'sL', 'sR', 'kL', 'kR']) if (P.limb[k]) P.limb[k].material = STICK; for (const k in P.jt) P.jt[k].material = STICK;
  for (const s of ['L', 'R']) if (P.hand && P.hand[s]) P.hand[s].traverse((m) => { if (m.isMesh) m.material = STICK; }); }
function stickPose(P) { for (const k of ['aL', 'aR', 'fL', 'fR']) if (P.limb[k]) { P.limb[k].scale.x = 0.58; P.limb[k].scale.z = 0.58; } for (const k of ['tL', 'tR', 'sL', 'sR', 'kL', 'kR']) if (P.limb[k]) { P.limb[k].scale.x = 0.3; P.limb[k].scale.z = 0.3; }
  for (const k in P.jt) { const j = P.jt[k]; if (j.userData.s0 === undefined) j.userData.s0 = j.scale.clone(); j.scale.copy(j.userData.s0).multiplyScalar(k.startsWith('sh') ? 0.6 : 0.36); } for (const s of ['L', 'R']) if (P.hand && P.hand[s]) { const h = P.hand[s]; if (h.userData.s0 === undefined) h.userData.s0 = h.scale.clone(); h.scale.copy(h.userData.s0).multiplyScalar(1.25); } }
for (const [P, h] of [[SHER, TH.SHER], [GUY, TH.GUY], [DRV, TH.DRV]]) { stickify(P); const up = P.update.bind(P); P.update = (pose) => { up(pose); stickPose(P); h.update(pose, pose.t || 0); }; }
const FUR = new Furniture(W, COL); const CHAIR = FUR.add('chair', { x: -11.2, z: -5.0, yaw: 0.85, color: '#2a8a6a', cushion: '#e8e0c8' });
// acting beats
const B = (arr) => arr.map(([t, emo, trans]) => ({ t, emo, trans: trans ?? 0.14 }));
const perfS = new Performer(21, { intensity: 1.5 }).beats(B([[0, 'stern'], [21.9, 'stern'], [22.5, 'suspicious'], [23.25, 'curious'], [23.9, 'determined'], [24.45, 'stern'], [25.15, 'proud'], [25.85, 'determined'], [26.55, 'nervous'], [27.15, 'worried'], [27.68, 'shock', 0.08], [28.15, 'panic', 0.1],
  [28.57, 'angry', 0.08], [29.3, 'angry'], [29.9, 'determined'], [30.4, 'evil'], [31.0, 'angry'], [31.6, 'determined'], [32.4, 'angry', 0.08], [32.9, 'proud'], [33.6, 'smug'], [34.4, 'proud'],
  [35.6, 'joy'], [36.4, 'smug'], [37.2, 'happy'], [37.9, 'joy'], [38.5, 'laugh'], [39.3, 'joy'], [40.1, 'happy'], [40.6, 'curious'], [40.9, 'shock', 0.07], [41.35, 'panic', 0.1], [41.9, 'blank'], [42.4, 'curious'], [42.9, 'worried'],
  [57.77, 'happy'], [58.25, 'smug'], [58.52, 'shock', 0.07], [58.9, 'panic', 0.1]]));
const perfG = new Performer(7, { intensity: 1.5, auto: false }).beats(B([[0, 'smug'], [18.13, 'proud'], [18.8, 'smug'], [19.4, 'joy'], [19.85, 'laugh', 0.08], [20.5, 'joy'], [20.9, 'laugh'], [21.4, 'joy'], [27.8, 'grin'], [32.75, 'shock', 0.07], [33.2, 'gasp'], [33.7, 'panic'], [34.3, 'grief'], [34.65, 'sob', 0.1]]));
const perfD = new Performer(31, { intensity: 1.45 }).beats(B([[0, 'tired'], [44.4, 'sleepy'], [45.55, 'curious', 0.1], [46.5, 'awe'], [47.6, 'curious'], [48.4, 'awe'], [49.2, 'curious'], [50.3, 'awe'], [51.0, 'blank'], [51.75, 'awe', 0.08], [52.6, 'blank'], [53.6, 'nervous'], [54.6, 'blank'], [55.5, 'worried'], [56.4, 'terrified', 0.08], [57.2, 'panic']]));
// ---------- CARTOON ACTING LAYER: exaggerated faces, head takes, jolts, rage tremble, laugh bounce, '!' and anger marks ----------
const BOOST = ['brow', 'browTilt', 'browArc', 'open', 'smile', 'frown', 'cheek', 'lidTilt', 'press', 'teeth', 'oround', 'smirk', 'mw', 'quiver'];
SHER.userData = { hits: [[27.68, 'take', 1.4], [27.8, 'jolt', 1.1], [28.6, 'take', 0.9], [29.25, 'shake', 1], [30.4, 'take', 0.5], [31.95, 'jolt', 0.4], [32.45, 'jolt', 0.5], [40.9, 'take', 1.4], [41.15, 'jolt', 1.3], [42.0, 'shake', 0.7], [58.52, 'take', 1.4], [58.72, 'jolt', 1.3]],
  loops: [[28.57, 30.0, 'rage'], [31.0, 31.6, 'rage'], [36.4, 37.2, 'bob'], [38.4, 39.3, 'laugh'], [41.9, 42.4, 'dizzy']], marks: [['!', 27.68, 28.5], ['!', 40.9, 41.8], ['!', 58.52, 59.6], ['x', 28.57, 30.3], ['x', 31.0, 32.7]] };
GUY.userData = { hits: [[19.85, 'take', 0.6], [32.75, 'double', 1], [34.95, 'take', 1.1]], loops: [[18.13, 19.4, 'bob'], [19.9, 21.77, 'laugh'], [34.65, 35.6, 'sob']], marks: [['!', 32.85, 33.7]] };
DRV.userData = { hits: [[45.55, 'take', 0.4], [51.75, 'take', 0.7], [56.4, 'take', 0.9]], loops: [[43.57, 45.4, 'nod']], marks: [['!', 56.4, 57.3]] };
function toonify(pose, P, t) {
  const e1 = EXPR[pose.expr] || EXPR.neutral, e2 = pose.expr2 ? EXPR[pose.expr2] || e1 : e1, m = pose.mix || 0; const fx = { ...(pose.fx || {}) };
  for (const k of BOOST) fx[k] = (fx[k] || 0) + 0.75 * ((e1[k] || 0) * (1 - m) + (e2[k] || 0) * m);
  pose.fx = fx; let hp = 0, hy = 0, hr = 0, ln = 0, sh = 0; const U = P.userData;
  for (const [ht, k, s] of U.hits) { const a = t - ht; if (a < -0.14 || a > 1.4) continue;
    if (a < 0) { ln -= 5 * s * Math.sin(((a + 0.14) / 0.14) * Math.PI); sh -= 0.4 * s * Math.sin(((a + 0.14) / 0.14) * Math.PI); continue; }   // anticipation
    const d = Math.exp(-a * 6), osc = Math.cos(a * 22);
    if (k === 'take') { hp -= 20 * s * d * osc; sh += 1.6 * s * d; ln -= 12 * s * d; }
    if (k === 'jolt') { hp += 28 * s * d * osc; ln += 26 * s * d * osc; hr += 8 * s * d * Math.sin(a * 30); }
    if (k === 'shake') { hy += 26 * s * Math.exp(-a * 2.2) * Math.sin(a * 28); }
    if (k === 'double') { hy += 32 * s * (sstep(0, 0.1, a) - sstep(0.22, 0.32, a)) + 42 * s * sstep(0.42, 0.52, a) * Math.exp(-Math.max(0, a - 0.6) * 1.5); hp -= 14 * s * sstep(0.42, 0.52, a) * Math.exp(-Math.max(0, a - 0.6) * 2); sh += 1.4 * s * sstep(0.42, 0.5, a) * Math.exp(-Math.max(0, a - 0.5) * 3); } }
  for (const [a0, a1, k] of U.loops) { if (t < a0 || t >= a1) continue; const env = sstep(a0, a0 + 0.15, t) * (1 - sstep(a1 - 0.15, a1, t));
    if (k === 'laugh') { sh += 1.1 * env * Math.abs(Math.sin(t * 15)); hp += 9 * env * Math.sin(t * 15); ln -= 6 * env; }
    if (k === 'rage') { hr += 5 * env * Math.sin(t * 47); ln += 6 * env + 3 * env * Math.sin(t * 39); sh += 0.9 * env; hp += 6 * env; }
    if (k === 'bob') { hy += 14 * env * Math.sin(t * 4.2); hp += 5 * env * Math.sin(t * 8.4); hr += 5 * env * Math.sin(t * 4.2); }
    if (k === 'sob') { sh += 1.0 * env * Math.abs(Math.sin(t * 11)); hp += 12 * env + 4 * env * Math.sin(t * 11); }
    if (k === 'dizzy') { hr += 12 * env * Math.sin(t * 9); hy += 10 * env * Math.cos(t * 9); }
    if (k === 'nod') { const c = (t * 0.9) % 1; hp += 22 * env * sstep(0.2, 0.7, c) * (1 - sstep(0.75, 0.82, c)); } }
  const h = pose.head || { yaw: 0, pitch: 0, roll: 0 }; pose.head = { yaw: (h.yaw || 0) + hy, pitch: (h.pitch || 0) + hp, roll: (h.roll || 0) + hr };
  pose.lean = (pose.lean || 0) + ln; pose.shrug = (pose.shrug || 0) + sh;
  // stick arms must stay OUTSIDE the body: minimum outward angle; walking arms swing outside too
  if (pose.walk != null) { const ph = pose.walk * Math.PI * 2, g = pose.gait ?? 1; if (!pose.armL && !pose.handL) pose.armL = { f: Math.sin(ph + Math.PI) * 30 * g, o: 18, b: 18 }; if (!pose.armR && !pose.handR) pose.armR = { f: Math.sin(ph) * 30 * g, o: 18, b: 18 }; }
  for (const k of ['armL', 'armR']) if (!pose[k] && !pose['hand' + k.slice(3)]) pose[k] = { f: 4, o: 16, b: 12 };
  for (const k of ['armL', 'armR']) if (pose[k] && !pose['hand' + k.slice(3)]) pose[k] = { ...pose[k], o: Math.max(pose[k].o ?? 0, 16) };
  return pose;
}
// cartoon marks over heads
const markM = tm(0xff2a2a, { unlit: 1 }), markY = tm(0xffe23a, { unlit: 1 });
function makeMark(kind) { const g = new THREE.Group(); if (kind === '!') { g.add(box(0.075, 0.24, 0.075, markM, 0, 0.17, 0)); g.add(sph(0.05, markM, 0, -0.02, 0, 10, 8)); }
  else for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const b = box(0.04, 0.13, 0.04, markM, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0); b.rotation.z = a + Math.PI / 2; g.add(b); } W.add(g); return g; }
for (const P of [SHER, GUY, DRV]) P.userData.markMesh = P.userData.marks.map(([k]) => makeMark(k));
function placeMarks(P, t) { P.userData.marks.forEach(([k, a, b], i) => { const g = P.userData.markMesh[i]; g.visible = P.root.visible && t >= a && t < b; if (!g.visible) return;
  const hw = P.headWorld(), u = t - a; const pop = EASE.outBack ? EASE.outBack(clamp(u / 0.18, 0, 1)) : sstep(0, 0.18, u); const s = Math.max(0.01, pop * (1 + 0.12 * Math.sin(u * 18)));
  g.scale.setScalar(s * 1.3); if (k === '!') g.position.set(hw.x, hw.y + 0.5, hw.z); else { const r = P.root.rotation.y; g.position.set(hw.x + Math.cos(r) * 0.28, hw.y + 0.32 + 0.03 * Math.sin(u * 20), hw.z - Math.sin(r) * 0.28); }
  g.lookAt(CAMPOS); }); }
const CAMPOS = V();
// sheriff on foot after the first crash
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const CHOP = [-6.65, 0.95];
const pSh = new Path(28.75, [{ p: [-4.25, -2.1] }, { p: [-4.1, 0.75], v: 4.0 }, { p: [-6.95, 2.75], v: 4.2, wait: 0.45, face: -Math.PI / 2 }, { p: CHOP, v: 2.6, wait: 12, face: yawTo(CHOP, [TREE_P.x, TREE_P.z]) }], 48, 0.8, TER);
// axe
const AXE = (() => { const g = new THREE.Group(), L = 0.95; const h = cyl(0.018, 0.022, L, tm(0x9a6a3a), 0, L / 2, 0, 10); g.add(h);
  const hd = box(0.05, 0.17, 0.24, tm(0x7a7a84), 0, L - 0.06, 0.07); g.add(hd); g.add(box(0.012, 0.19, 0.05, chrome, 0, L - 0.06, 0.21)); W.add(g);
  return { group: g, size: 0.02, grips: { high: { p: [0.02, 0.55, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.95, thumb: 0.9 }, low: { p: [0.02, 0.14, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.95, thumb: 0.9 } } }; })();
const AXE_REST = V(-7.48, 0.55, 2.75);
// money
const BILLS = []; const billM = tm(0x6ab86a); for (let i = 0; i < 40; i++) { const b = box(0.17, 0.005, 0.075, billM); W.add(b); BILLS.push(b); }
// debris pool per crash
const DEB = []; const debM = [glass, tm(0x9aa0a8), leafA, leafB, dark];
for (let c = 0; c < 6; c++) { const arr = []; for (let i = 0; i < 18; i++) { const s = 0.06 + hash(c * 40 + i) * 0.12; const b = box(s, s * 0.5, s * 1.3, debM[i % debM.length]); W.add(b); arr.push(b); } DEB.push(arr); }
const SMOKE = []; for (let c = 0; c < 6; c++) { const arr = []; for (let i = 0; i < 6; i++) { const s = sph(1, tm(0xb8b4ae, { band: 0.2 }), 0, -50, 0, 12, 8); W.add(s); arr.push(s); } SMOKE.push(arr); }
function impactFX(slot, t, tImp, at, dirYaw, carCol) {
  const a = t - tImp, arr = DEB[slot], sm = SMOKE[slot]; const on = a > 0 && a < 2.2;
  for (let i = 0; i < arr.length; i++) { const b = arr[i]; b.visible = on; if (!on) continue; const h1 = hash(slot * 31 + i), h2 = hash(slot * 17 + i * 3.1), h3 = hash(i * 7.7 + slot);
    const sp = 3 + h1 * 6, ang = dirYaw + Math.PI + (h2 - 0.5) * 2.6; const vx = Math.sin(ang) * sp, vz = Math.cos(ang) * sp, vy = 2 + h3 * 5;
    let y = 0.9 + vy * a - 4.9 * a * a; const ground = 0.05; let tt = a; if (y < ground) { tt = (vy + Math.sqrt(vy * vy + 4 * 4.9 * 0.85)) / (2 * 4.9); y = ground; }
    const drag = 1 - Math.exp(-tt * 1.5); b.position.set(at.x + vx * drag / 1.5, y, at.z + vz * drag / 1.5); b.rotation.set(tt * 9 * h1, tt * 7 * h2, tt * 5); }
  for (let i = 0; i < sm.length; i++) { const s = sm[i]; const aa = a - i * 0.05; s.visible = aa > 0 && aa < 1.4; if (!s.visible) continue; const r = (0.2 + 0.4 * (1 - Math.exp(-aa * 3))) * (1 - sstep(0.7, 1.2, aa)) * (0.8 + hash(i + slot) * 0.5);
    s.scale.setScalar(Math.max(0.01, r)); s.position.set(at.x + (hash(i * 3 + slot) - 0.5) * 1.2, 0.8 + aa * 1.2 + i * 0.12, at.z + (hash(i * 5 + slot) - 0.5) * 1.2); }
}

// ======================= PER-FRAME SCENE =======================
let SHAKE = 0, FLASH = 0;
const IMPACTS = [3.62, 10.53, 15.98, 16.6, 27.8, 41.15, 58.72];
function setup(f) {
  const t = f / FPS; SHAKE = 0; FLASH = 0; for (const a of DEB) for (const b of a) b.visible = false; for (const a of SMOKE) for (const b of a) b.visible = false;
  for (const ti of IMPACTS) { const a = t - ti; if (a > 0 && a < 0.6) { SHAKE += (ti === 27.8 || ti > 41 ? 1.4 : 1) * Math.exp(-a * 6); FLASH = Math.max(FLASH, Math.exp(-a * 14) * 0.5); } }
  const night = t >= 43.57 && t < 57.77;
  // ----- tree: grows in, stands, gets chopped, stump, (explanation: standing again at night), stump -----
  const grow = EASE.outBack ? EASE.outBack(clamp(t / 1.1, 0, 1)) : sstep(0, 1.1, t);
  const standing = t < 32.6 || night; TREE.visible = t < 35.6 || night; STUMP.visible = true;
  TREE.scale.setScalar(t < 1.2 ? Math.max(0.02, grow) : 1); STUMP.scale.setScalar(t < 1.2 ? Math.max(0.02, grow) : 1);
  let wob = 0; for (const ti of IMPACTS) { const a = t - ti; if (a > 0 && a < 1.5) wob += 0.035 * Math.exp(-a * 3) * Math.sin(a * 20); }
  TREE.quaternion.setFromAxisAngle(V(0, 0, 1), wob);
  if (!standing) { const fd = V(-1, 0, 0.25).normalize(), ax = V(0, 1, 0).cross(fd).normalize(); let th;
    if (t < 33.2) th = 0.04 * Math.sin((t - 32.6) * 9) * (1 - (t - 32.6) / 0.6) + 0.02 * (t - 32.6); else th = Math.min(1.47, 0.03 + 1.44 * Math.pow((t - 33.2) / 1.75, 2.3));
    if (t > 34.95) th = 1.47 - 0.05 * Math.exp(-(t - 34.95) * 5) * Math.abs(Math.sin((t - 34.95) * 14));
    TREE.quaternion.setFromAxisAngle(ax, th); }
  // leaves falling after impacts / chops
  { const evs = [...IMPACTS, 31.95, 32.45, 34.95]; let last = -9; for (const e of evs) if (t >= e && e > last) last = e; const a = t - last;
    LEAVES.forEach((l, i) => { l.visible = a < 3 && TREE.visible && standing; if (!l.visible) return; const x0 = TREE_P.x + (hash(i) - 0.5) * 6, z0 = (hash(i + 4) - 0.5) * 6, y0 = 5 + hash(i + 8) * 3;
      l.position.set(x0 + Math.sin(a * 2 + i) * 0.5, Math.max(0.05, y0 - a * (1.4 + hash(i) * 1.2)), z0 + Math.cos(a * 1.7 + i) * 0.4); l.rotation.set(a * 3 + i, a * 2, a * 4 + i); }); }
  // ----- signs -----
  vis(DAYS, t, [[0, 43.57]]); D7.visible = t < 10.6; D0.visible = t >= 10.6;
  vis(SPEEDS, t, [[21.0, 30]]);
  const drop = t < 12.5 ? 1 - sstep(11.9, 12.5, t) : 0; ARROW.visible = t >= 11.9; ARROW.position.set(ARROW_P.x, drop * 22 + (t > 12.5 && t < 12.9 ? 0.25 * Math.abs(Math.sin((t - 12.5) * 8)) * Math.exp(-(t - 12.5) * 6) : 0), ARROW_P.z);
  const chase = Math.floor(t * 9); BULBS.forEach((b, i) => { b.material = ((i + chase) % 3 === 0) || (Math.floor(t * 3) % 2 === 0 && t > 13.4 && t < 15.7) ? bulbOn : bulbOff; });
  // ----- crash cars -----
  CRASH.forEach((c, i) => { vis(c.car.group, t, c.show); if (!c.car.group.visible) return; const st = drive(c, t); poseCar(c.car, st);
    impactFX(i, t, c.tImp, V((c.stop[0] + TREE_P.x) / 2, 0, c.dir === -1 ? 0.6 : -0.6), st.yaw); });
  CARS.orange.group.visible = false;
  // ----- cruiser -----
  let cr = null, crD = null; for (const d of CRUISE) if (t >= d.show[0] && t < d.show[1]) crD = d;
  CR.group.visible = !!crD; if (crD) { cr = drive(crD, t); poseCar(CR, cr); impactFX(4 + (crD === CRUISE[0] ? 0 : 1), t, crD.tImp, V(-5.5, 0, -0.5), cr.yaw); }
  const lb = Math.floor(t * 6) % 2; CR.lbR.visible = lb === 0; CR.lbB.visible = lb === 1;
  // ----- night car -----
  NC.group.visible = night; let nc = null; if (night) { nc = drive(NIGHT, t); poseCar(NC, nc); }
  // ----- tow truck + guy -----
  const towIn = t >= 17.07 && t < 43.57; TOW.group.visible = towIn || t >= 57.77; GUY.root.visible = t >= 18.13 && t < 43.57; CHAIR.group.visible = t >= 18.13 && t < 43.57;
  if (towIn && t < 18.4) { const u = EASE.outCubic(clamp((t - 17.07) / 1.3, 0, 1)); TOW.group.position.set(TOW_P[0] + (1 - u) * 5, 0, TOW_P[1] - (1 - u) * 34); TOW.group.rotation.y = -0.18 * (1 - u); for (const w of TOW.wheels) w.rotation.x = u * 60; }
  else TOW.group.position.set(TOW_P[0], 0, TOW_P[1]), TOW.group.rotation.y = 0;
  if (GUY.root.visible) { const sit = sitOn(GUY, CHAIR.seats[0], { footZ: 0.5 }); const fg = perfG.at(t, { handsFree: true }); const pg = { ...fg, ...sit, t };
    if (t > 19.8 && t < 21.8) { pg.armL = { f: 120 + 18 * Math.sin(t * 9), o: -70, b: 25 }; pg.armR = { f: 120 + 18 * Math.sin(t * 9 + 1.5), o: -70, b: 25 }; pg.handL = null; pg.handR = null; }
    const look = sstep(32.6, 33.0, t); pg.head = { ...pg.head, yaw: (pg.head.yaw || 0) - 25 * look, pitch: (pg.head.pitch || 0) - 8 * look * (t < 34.9 ? 1 : 0) };
    const lg = sstep(19.85, 20.0, t) * (1 - sstep(21.6, 21.77, t)); if (lg > 0 && !(t > 19.8 && t < 21.8 && pg.armL && pg.armL.o === -70)) { pg.armL = { f: 25, o: 18, b: 95 }; pg.armR = { f: 25, o: 18, b: 95 }; }
    if (t >= 34.65 && t < 35.6) { pg.armL = { f: 40, o: 10, b: 120 }; pg.armR = { f: 40, o: 10, b: 120 }; }
    toonify(pg, GUY, t); GUY.update(pg); }
  // money rain
  BILLS.forEach((b, i) => { const a = t - 19.8 - hash(i) * 0.6; b.visible = a > 0 && t < 21.9; if (!b.visible) return; const x0 = -11.2 + (hash(i + 2) - 0.5) * 3.2, z0 = -5.0 + (hash(i + 5) - 0.5) * 3.2;
    b.position.set(x0 + Math.sin(a * 4 + i) * 0.25, Math.max(0.02, 3.6 - a * (1.3 + hash(i + 9) * 0.6)), z0 + Math.cos(a * 3 + i) * 0.25); b.rotation.set(Math.sin(a * 6 + i) * 0.8, a * 2 + i, Math.cos(a * 5 + i) * 0.6); });
  // ----- sheriff -----
  const inCar = crD && !(t >= 28.57 && t < 35.6);
  SHER.root.visible = !!crD || (t >= 28.57 && t < 35.6);
  const fs = perfS.at(t, { handsFree: !inCar, walking: false });
  if (SHER.root.visible && inCar) seatDriver(SHER, CR, fs, t, cr);
  else if (SHER.root.visible) {
    const r = place(SHER, pSh, t, { terrain: TER, colliders: null }); const walking = r.speed > 0.25; const fw = perfS.at(t, { walking, handsFree: false }); const ps = toonify({ ...r.pose, ...fw, t }, SHER, t);
    if (walking) { delete ps.armL; delete ps.armR; }
    const grab = sstep(30.15, 30.5, t), carry = t >= 30.5, chopK = sstep(31.5, 31.7, t);
    if (!carry) { AXE.group.position.copy(AXE_REST); AXE.group.rotation.set(0, Math.PI / 2, 0.08); if (grab > 0) handOnProp(SHER, 'L', AXE, 'high', ps, grab); SHER.update(ps); }
    else if (chopK <= 0) { ps.armL = { f: 18, o: 14, b: 38 }; SHER.update(ps); propInHand(SHER, 'L', AXE, 'high'); }
    else { const sw = (tt) => { const c = tt % 0.5; return c < 0.32 ? EASE.inOut(c / 0.32) : 1 - EASE.in((c - 0.32) / 0.18); }; let up = t < 31.7 ? chopK : sw(t - 31.7 + 0.02); if (t > 32.6) up = Math.max(0, 1 - (t - 32.6) * 3);
      ps.armL = { f: lerp(62, 168, up), o: lerp(4, 12, up), b: lerp(14, 40, up) }; ps.lean = lerp(18, -6, up); ps.reachAssist = false; ps.armR = { f: lerp(58, 160, up), o: lerp(0, 10, up), b: lerp(30, 50, up) };
      SHER.update(ps); propInHand(SHER, 'L', AXE, 'high'); handOnProp(SHER, 'R', AXE, 'low', ps, 1); SHER.update(ps); propInHand(SHER, 'L', AXE, 'high'); }
  }
  AXE.group.visible = (t >= 17.07 && t < 35.6);
  if (t < 28.57 && AXE.group.visible) { AXE.group.position.copy(AXE_REST); AXE.group.rotation.set(0, Math.PI / 2, 0.08); }
  // ----- night driver -----
  DRV.root.visible = night; if (night) { const fd = perfD.at(t, { handsFree: false }); seatDriver(DRV, NC, fd, t, nc, true); }
  return { t, cr, nc, night };
}
const steerAt = (t, night) => night ? -0.9 * sstep(54.7, 57.6, t) : (t > 26.0 && t < 27.8 ? -0.5 * sstep(26.0, 27.4, t) : 0);
function seatDriver(P, car, perf, t, st, night = false) {
  car.group.updateMatrixWorld(true); const sp = car.group.localToWorld(V(0.42, 0, -0.42)); const yaw = car.group.rotation.y;
  const seat = { x: sp.x, z: sp.z, yaw, top: 0.8, back: 0.2, front: 0.1, floor: 0.41, kind: 'chair' };
  const sit = sitOn(P, seat, { footZ: 0.62 }); const pose = { ...perf, ...sit, t };
  car.SW.rotation.z = steerAt(t, night) * 2.2; car.SW.updateMatrixWorld(true);
  const R = 0.15, aR = 0.84 * Math.PI, aL = 0.16 * Math.PI;
  pose.handL = { w: car.SW.localToWorld(V(R * Math.cos(aR), R * Math.sin(aR), 0.02)), k: 1 }; pose.handR = { w: car.SW.localToWorld(V(R * Math.cos(aL), R * Math.sin(aL), 0.02)), k: 1 };
  pose.gripL = { curl: 0.85, thumb: 0.6 }; pose.gripR = { curl: 0.85, thumb: 0.6 }; pose.reachAssist = false;
  if (st && st.after > 0 && st.after < 1.2) { pose.lean = (pose.lean || 0) + 22 * Math.exp(-st.after * 4) * Math.sin(Math.min(1, st.after * 6) * Math.PI / 2 + 0.3); }
  if (night) { const lockK = sstep(51.8, 52.8, t); pose.head = { ...pose.head, yaw: lerp(pose.head.yaw || 0, -14, lockK), pitch: (pose.head.pitch || 0) * (1 - lockK) }; pose.look = [lerp(pose.look[0], -0.75, lockK), lerp(pose.look[1], 0.05, lockK)]; pose.blink = lockK > 0.5 && t > 52.8 ? 0 : pose.blink; }
  toonify(pose, P, t); P.update(pose);
}

// ======================= CAMERA =======================
const CINE = new Cine({ blend: 0.42 });
const P = CT.pt, OBJ = CT.obj;
const relCR = () => CR.group.rotation.y, relNC = () => NC.group.rotation.y;
const crashTarget = (car) => () => car.group.localToWorld(V(0, 0.9, 0));
CINE.shot(0.0, 2.37, { rig: 'crane', at: P(-5.0, 3.0, 0), size: ['ws', 15], az: [140, 95], el: [0, 18], fov: [30, 36], shake: 0.25, ease: 'inOut' })
  .shot(2.37, 4.13, { rig: 'orbit', at: P(-4.6, 1.3, -3.2), size: [8, 6.5], az: [42, 55], el: [6, 9], fov: 36, shake: 0.6, ease: 'lin' })
  .shot(4.13, 6.77, { rig: 'fly', path: [[1.8, 3.5, -95], [3.0, 20, -45]], at: P(-3.0, 0, 30), fov: [42, 46], shake: 0.15, ease: 'inOut', cut: true })
  .shot(6.77, 9.17, { rig: 'push', at: P(-5.5, 3.6, 0), size: [28, 10.5], az: [70, 48], el: [3, 9], fov: 34, shake: 0.2, ease: 'outCubic' })
  .shot(9.17, 10.95, { rig: 'orbit', at: P(-6.2, 1.6, -1.6), size: [6.5, 5.5], az: [62, 74], el: [5, 7], fov: 34, shake: 0.4, ease: 'lin' })
  .shot(10.95, 11.77, { rig: 'push', at: OBJ(DAYS, [0, 2.4, 0]), size: [1.9, 1.3], az: [130, 118], el: [4, 2], fov: 30, shake: 0.5, ease: 'snap' })
  .shot(11.77, 13.4, { rig: 'low', at: P(-4.6, 4.5, 5.5), size: [16, 10], az: [98, 118], fov: [38, 34], shake: 0.4, ease: 'outCubic' })
  .shot(13.4, 15.7, { rig: 'orbit', at: OBJ(ARROW, [0, 4.1, 0]), size: [4.8, 3.4], az: [130, 96], el: [2, 8], fov: 32, shake: 0.3, ease: 'inOut' })
  .shot(15.7, 17.07, { rig: 'orbit', at: P(-5.5, 1.2, 0), size: [15, 13], az: [95, 75], el: [24, 18], fov: 36, shake: 0.6, ease: 'lin' })
  .shot(17.07, 18.13, { rig: 'track', at: OBJ(TOW.group, [0, 1.4, 1.0]), size: 'ws', az: [40, 75], el: [2, 4], fov: 34, shake: 0.5, ease: 'lin' })
  .shot(18.13, 19.8, { rig: 'orbit', at: () => GUY.torso.localToWorld(V(0, 0.35, 0.1)), size: ['fs', 'ms'], az: [95, 55], el: [8, 6], fov: 32, shake: 0.25 })
  .shot(19.8, 21.77, { rig: 'push', at: CT.head(GUY), size: ['ms', 'ms'], az: [40, 62], el: [10, 4], fov: [32, 28], shake: 0.3, ease: 'snap' })
  .shot(21.77, 22.9, { rig: 'track', at: OBJ(CR.group, [0, 1.0, 0]), rel: relCR, size: ['ws', 'fs'], az: [-45, -25], el: [6, 4], fov: 34, shake: 0.5, ease: 'lin', cut: true })
  .shot(22.9, 24.33, { rig: 'track', at: CT.head(SHER), rel: relCR, size: ['ms', 'ms'], az: [52, 38], el: [2, 4], fov: 30, shake: 0.35 })
  .shot(24.33, 25.83, { rig: 'orbit', at: OBJ(SPEEDS, [0, 2.4, 0]), size: [2.4, 2.0], az: [200, 180], el: [3, 5], fov: 32, shake: 0.3 })
  .shot(25.83, 27.13, { rig: 'track', at: () => SHER.torso.localToWorld(V(0, 0.5, 0)).lerp(CR.SW.localToWorld(V(0, 0, 0)), 0.35), rel: relCR, size: [1.6, 1.35], az: [62, 48], el: [14, 18], fov: 32, shake: 0.3 })
  .shot(27.13, 28.57, { rig: 'orbit', at: P(-5.4, 1.2, -2.2), size: [7.5, 6.2], az: [78, 92], el: [6, 8], fov: 34, shake: 0.5, ease: 'lin' })
  .shot(28.57, 30.0, { rig: 'push', at: CT.head(SHER), size: ['ms', 'ms'], az: [-10, 15], el: [3, 1], fov: [32, 28], shake: 0.5, cut: true, ease: 'snap' })
  .shot(30.0, 31.0, { rig: 'orbit', at: () => SHER.torso.localToWorld(V(0, 0.3, 0.1)), size: ['fs', 'ms'], az: [-10, 25], el: [8, 10], fov: 32, shake: 0.4 })
  .shot(31.0, 32.73, { rig: 'orbit', at: P(-6.2, 1.5, 0.6), size: [3.4, 2.8], az: [-122, -98], el: [10, 6], fov: 34, shake: 0.5 })
  .shot(32.73, 34.4, { rig: 'fly', path: [[-14.8, 2.4, -8.8], [-14.2, 2.9, -8.0]], at: P(-7.8, 2.6, -1.4), fov: 40, shake: 0.4, ease: 'lin' })
  .shot(34.4, 35.6, { rig: 'push', at: CT.head(GUY), size: ['ms', 'ms'], az: [62, 45], el: [6, 4], fov: 30, shake: 0.7, ease: 'snap' })
  .shot(35.6, 37.5, { rig: 'track', at: OBJ(CR.group, [0, 1.1, 0]), rel: relCR, size: ['fs', 'ws'], az: [55, 100], el: [4, 7], fov: 34, shake: 0.3, cut: true })
  .shot(37.5, 40.0, { rig: 'track', at: CT.head(SHER), rel: relCR, size: ['ms', 'ms'], az: [36, 55], el: [3, 5], fov: 30, shake: 0.3 })
  .shot(40.0, 41.9, { rig: 'orbit', at: P(-5.3, 0.9, -2.3), size: [7, 5.5], az: [52, 68], el: [5, 7], fov: 34, shake: 0.5, ease: 'lin' })
  .shot(41.9, 43.57, { rig: 'orbit', at: CT.head(SHER), rel: relCR, size: ['ms', 'mcu'], az: [-14, 6], el: [8, 4], fov: 30, shake: 0.35 })
  .shot(43.57, 45.5, { rig: 'pov', from: () => NC.group.localToWorld(V(-0.15, 1.9, -1.25)), at: () => NC.group.localToWorld(V(-1.0, 0.9, 40)), fov: 46, shake: 0.4, cut: true })
  .shot(45.5, 49.0, { rig: 'fly', path: [[3, 26, -170], [2, 14, -70]], at: P(-5.5, 3, 0), fov: [38, 32], shake: 0.2, ease: 'inOut' })
  .shot(49.0, 51.63, { rig: 'orbit', at: OBJ(ARROW, [0, 4.1, 0]), size: [5.6, 3.6], az: [135, 98], el: [-2, 8], fov: 32, shake: 0.3 })
  .shot(51.63, 54.6, { rig: 'push', at: CT.eyes(DRV), rel: relNC, size: ['ms', 0.75], az: [8, -4], el: [2, 0], fov: [30, 26], shake: 0.25, ease: 'inOut', cut: true })
  .shot(54.6, 57.77, { rig: 'track', at: () => DRV.torso.localToWorld(V(0, 0.5, 0)).lerp(NC.SW.localToWorld(V(0, 0, 0)), 0.35), rel: relNC, size: [1.6, 1.3], az: [60, 46], el: [14, 18], fov: 32, shake: 0.35 })
  .shot(57.77, 59.6, { rig: 'orbit', at: P(-5.3, 0.9, -2.3), size: [7.2, 5.8], az: [55, 70], el: [5, 7], fov: 34, shake: 0.5, ease: 'lin', cut: true });

// ======================= LOOK =======================
const DAY = mkLook({ sun: [0.5, 0.85, -0.35], lit: '#fff6dc', litK: 1.08, shade: '#9cb0e0', ambSky: '#eaf4ff', ambGnd: '#f8f0c8', rim: '#fff4d0', fog: '#dceeff', fogR: [60, 420], sky: ['#2a7ae8', '#6ab6f4', '#cfeaff', '#ffffff'], contrast: 1.05, vig: 0.08, glow: 0.35, grain: 0, desat: 0, sat: 1.25, lo: '#f8f8ff', hi: '#fffff0', exposure: 1.04, shadow: 0.8 });
const NITE = mkLook({ sun: [0.3, 0.5, 0.8], lit: '#7a8ac0', shade: '#26305a', ambSky: '#b0c4ff', ambGnd: '#6a6a80', rim: '#6a8ad0', rimDir: [-0.4, 0.3, 0.8], fog: '#141c34', fogR: [20, 200], sky: ['#050a1c', '#14224a', '#34446e', '#05070e'], contrast: 1.12, vig: 0.45, glow: 0.9, grain: 0.03, desat: 0.1, sat: 1.0, lo: '#c8d8ff', hi: '#ffe0b0', exposure: 1.0, shadow: 0.9 });

window.renderFrame = function (f) {
  const { t, night, nc } = setup(f); const cam = CINE.at(t); CAMPOS.set(...cam.pos); for (const P of [SHER, GUY, DRV]) placeMarks(P, t);
  const sh = SHAKE; if (sh > 0) { cam.pos[0] += 0.06 * sh * Math.sin(t * 91); cam.pos[1] += 0.05 * sh * Math.sin(t * 77 + 1); cam.roll += 0.03 * sh * Math.sin(t * 63); }
  const pl = [];
  if (night) { NC.group.updateMatrixWorld(true); const hp = NC.group.localToWorld(V(0, 0.9, 7)); pl.push({ pos: hp.toArray(), col: [1.6, 1.45, 1.1], range: 16 });
    const fl = 0.75 + 0.25 * (Math.floor(t * 3) % 2); const ap = ARROW.localToWorld(V(0.5, 4.0, 1.5)); pl.push({ pos: ap.toArray(), col: [2.4 * fl, 0.9 * fl, 0.5 * fl], range: 11 }); pl.push({ pos: [TREE_P.x + 1.5, 2.5, -1.5], col: [1.0, 0.6, 0.35], range: 9 }); }
  else if (t >= 13.4 && t < 15.7) { const ap = ARROW.localToWorld(V(0, 4, 1.2)); pl.push({ pos: ap.toArray(), col: [0.6, 0.35, 0.2], range: 5 }); }
  applyLook(night ? NITE : DAY, { shadowCenter: [clamp(cam.look[0], -14, 6), 1, clamp(cam.look[2], -40, 40)], shadowSize: 26, pl });
  if (!night) { C.skyU.uSunSize.value = 0.012; C.skyU.uGlow.value = 0.4; }
  C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.05, far: 900 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37;
  dofU.uFade.value = Math.max(0, (t - (DURATION - 0.25)) / 0.25); dofU.uFlash.value = FLASH;
  C.drawFrame(); return 'ok';
};
window.dbg = (f) => { setup(f); const c = CINE.at(f / FPS); return { sher: SHER.root.position.toArray().map(v=>+v.toFixed(2)), vis: SHER.root.visible, cam: c.pos.map(v=>+v.toFixed(2)), look: c.look.map(v=>+v.toFixed(2)) }; };
window.dbg2 = (f) => { setup(f); const r = (v) => v.toArray().map((x) => +x.toFixed(3)); CR.SW.updateMatrixWorld(true); const c = CR.group;
  const loc = (v) => r(c.worldToLocal(v.clone()));
  return { palmL: loc(SHER.palmWorld('L')), palmR: loc(SHER.palmWorld('R')), wheel: loc(CR.SW.localToWorld(V(0, 0, 0))), head: loc(SHER.headWorld()), shoulderL: loc(SHER.torso.localToWorld(V(-SHER.LS, 0.55, 0))), pelvis: loc(SHER.pelvis.localToWorld(V(0, 0, 0))) }; };
window.dbg3 = (f) => { setup(f); const out = {}; for (const [n, P, car] of [['sher', SHER, CR], ['drv', DRV, NC]]) { if (!P.root.visible || !car.group.visible) continue; car.group.updateMatrixWorld(true);
  const loc = (v) => car.group.worldToLocal(v.clone()).toArray().map((x) => +x.toFixed(3)); out[n] = { footL: loc(P.footWorld(0)), footR: loc(P.footWorld(1)), knee: loc(P.pelvis.localToWorld(P.jt.knL.position.clone())), pelvis: loc(P.pelvis.localToWorld(V(0, 0, 0))) }; } return out; };
window.ready = true;
