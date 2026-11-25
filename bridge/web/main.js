// "WHY SOLDIERS NEVER MARCH ACROSS BRIDGES" : 47.6 s. Voice = audio/voice_clean.mp3 (46.6 s). Beats keyed to bridge_words.json.
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph, makeCloud } from '../../web/models.js';
import { mkLook, mixLook, applyLook } from '../../web/looks.js';
import { EASE, sstep, clamp, lerp, hash } from '../../web/motion.js';
import { Performer, EMOTIONS } from '../../web/perform.js';
import { Cine, T as CT } from '../../web/cine.js';
import { toTex, mkCanvas } from '../../web/tex.js';
import { mergeGeometries } from '../../web/vendor/BufferGeometryUtils.js';
import { makeStickPerson, toonify, placeMarks, CAMPOS } from '../../web/toonkit.js';
for (const [n, base, ex] of [['smug', 'proud', 'smug'], ['grin', 'happy', 'grin'], ['gasp', 'shock', 'gasp'], ['awe', 'curious', 'awe'], ['blank', 'neutral', 'blank'], ['gentle', 'calm', 'gentle']]) EMOTIONS[n] = { ...EMOTIONS[base], expr: ex };
const { stage, dofU, FPS, PX } = C;
export const DURATION = 47.6;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };
const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
const card = (w, h, draw, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), tm(0xffffff, { map: ctex(Math.round(256 * w / h), 256, draw), unlit: o.unlit ?? 0.4, noInk: 1, side: THREE.DoubleSide }));

// ======================= LAND, RIVER =======================
const BANK = 1.5, WATER = 0.35, HALF = 7.0;               // river |x| < 7, banks at y 1.5
const grassTex = ctex(256, 256, (g, w, h) => { g.fillStyle = '#7cc04a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const s = hash(i + 3.3); g.fillStyle = s < 0.5 ? 'rgba(70,140,40,0.55)' : 'rgba(170,220,90,0.5)'; g.fillRect(hash(i) * w, hash(i + 7.1) * h, 2 + s * 3, 6 + s * 10); } }, true);
const gM = tm(0xffffff, { map: grassTex, repeat: [40, 80] });
for (const s of [-1, 1]) { W.add(box(200, BANK, 400, gM, s * (HALF + 100), BANK / 2, 0)); W.add(box(0.8, BANK, 400, tm(0x8a6a48), s * (HALF + 0.4), BANK / 2, 0)); }
W.add(box(2 * HALF, 0.2, 400, tm(0x6a5a40), 0, 0.0, 0));
const waterTex = ctex(256, 256, (g, w, h) => { g.fillStyle = '#3a8ac8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.strokeStyle = hash(i) < 0.5 ? 'rgba(200,235,255,0.55)' : 'rgba(30,90,150,0.4)'; g.lineWidth = 3; const x = hash(i + 1) * w, y = hash(i + 2) * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 5, x + 22, y); g.stroke(); } }, true);
const WATERM = tm(0xffffff, { map: waterTex, repeat: [4, 100], noInk: 1 }); const WATERMESH = box(2 * HALF, 0.05, 400, WATERM, 0, WATER, 0); W.add(WATERMESH);
const SPARK = []; for (let i = 0; i < 40; i++) { const m = box(0.5 + hash(i) * 0.6, 0.02, 0.06, tm(0xe8f6ff, { unlit: 0.8, noInk: 1 })); W.add(m); SPARK.push(m); }
// trees, bushes, hills, clouds
function tree(x, z, s = 1) { const g = new THREE.Group(); g.position.set(x, BANK, z); W.add(g); g.add(cyl(0.18 * s, 0.26 * s, 2.4 * s, tm(0x7a5a3a), 0, 1.2 * s, 0, 8)); for (let i = 0; i < 7; i++) g.add(sph((0.9 + hash(x + i) * 0.5) * s, tm([0x3f9a3a, 0x5cb846, 0x2f7a32][i % 3], { band: 0.15, noInk: 1 }), Math.cos(i * 2.2) * 0.8 * s, (2.8 + hash(z + i) * 1.2) * s, Math.sin(i * 2.2) * 0.8 * s, 10, 8)); return g; }
for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; const x = s * (HALF + 3 + hash(i) * 30), z = -60 + hash(i + 5) * 120; if (Math.abs(z) < 7 && Math.abs(x) < 26) continue; tree(x, z, 0.9 + hash(i + 2) * 0.6); }
for (let i = 0; i < 10; i++) { const h = sph(1, tm([0x6aa84a, 0x5a9a42, 0x7ab452][i % 3], { band: 0.15 }), (i % 2 ? 1 : -1) * (60 + hash(i) * 80), -6, -140 + i * 30, 18, 12); h.scale.set(50 + hash(i + 1) * 40, 24 + hash(i + 2) * 14, 40); W.add(h); }
for (let i = 0; i < 7; i++) { const cl = makeCloud(i + 90, 1.3); cl.position.set(-150 + i * 50, 50 + (i % 3) * 8, -150); W.add(cl); }

// ======================= THE BRIDGE (deck flexes) =======================
const DW = 3.2, DECKY = BANK + 0.12; const DECK = []; const plank = [tm(0xa0703e), tm(0x8a5e32), tm(0xb07c46)];
for (let i = 0; i < 36; i++) { const x = -HALF - 0.4 + (i + 0.5) * ((2 * HALF + 0.8) / 36); const g = new THREE.Group(); g.position.set(x, DECKY, 0); W.add(g); g.add(box((2 * HALF + 0.8) / 36 - 0.02, 0.12, DW, plank[i % 3], 0, 0, 0));
  if (i % 3 === 0) for (const s of [-1, 1]) g.add(box(0.1, 0.9, 0.1, tm(0x6a4424), 0, 0.5, s * (DW / 2 - 0.05))); DECK.push(g); }
const RAILS = []; for (const s of [-1, 1]) for (let i = 0; i < 35; i++) { const r = box(0.42, 0.08, 0.08, tm(0x7a4e28), 0, 0, 0); W.add(r); RAILS.push({ r, i, s }); }
for (const x of [-3.6, 3.6]) { W.add(box(0.7, DECKY - 0.06, 0.7, tm(0x9a8a78), x, (DECKY - 0.06) / 2, -1.2)); W.add(box(0.7, DECKY - 0.06, 0.7, tm(0x9a8a78), x, (DECKY - 0.06) / 2, 1.2)); }
const bounceA = (t) => { let a = 0; a += 0.06 * sstep(14.7, 15.4, t) * (1 - sstep(16.4, 16.9, t)); a += lerp(0.12, 0.34, sstep(16.5, 22.0, t)) * sstep(16.4, 16.9, t) * (1 - sstep(25.5, 29.9, t)); a += 0.3 * sstep(38.8, 39.6, t) * (1 - sstep(41.3, 41.9, t)); a += 0.05 * Math.exp(-Math.max(0, t - 1.96) * 4) * (t > 1.96 && t < 2.6 ? 1 : 0); return a; };
const deckY = (x, t) => DECKY + (Math.abs(x) < HALF + 0.4 ? -bounceA(t) * Math.cos(Math.PI * x / (2 * HALF + 0.8)) * Math.sin(t * 2 * Math.PI * 1.25) : 0);
// ======================= CASTLE (right bank) + flags + parade banners =======================
const CX = 16; { const st = tm(0xc8bca8), st2 = tm(0xb0a490), roof = tm(0x3a5aa8);
  W.add(box(1.0, 5, 14, st, CX, BANK + 2.5, 0)); for (const z of [-7, 7]) { W.add(cyl(1.6, 1.7, 8, st2, CX, BANK + 4, z, 16)); W.add(cyl(0.0, 2.0, 2.6, roof, CX, BANK + 9.3, z, 16)); }
  for (let i = -6; i <= 6; i++) W.add(box(1.2, 0.7, 0.8, st, CX, BANK + 5.35, i * 1.1));
  W.add(box(1.2, 3.2, 3.0, tm(0x4a2e1a), CX - 0.2, BANK + 1.6, 0)); W.add(box(1.4, 0.4, 3.4, st2, CX - 0.2, BANK + 3.3, 0)); }
const FLAGS = []; for (let i = 0; i < 10; i++) { const x = i < 5 ? -HALF - 1.0 : HALF + 1.0, z = (i % 5 - 2) * 0.9 + (i < 5 ? 0 : 0); const g = new THREE.Group(); g.position.set(x, BANK, (i % 2 ? 1 : -1) * (DW / 2 + 0.6) + (i % 5) * 0.01); W.add(g); g.add(cyl(0.04, 0.04, 2.6, tm(0x5a3a2a), 0, 1.3, 0, 6)); const f = box(0.02, 0.5, 0.8, tm([0xd82a2a, 0xf0c020, 0x2a6ad8][i % 3]), 0, 2.3, 0.42); g.add(f); FLAGS.push({ g, f, i }); }
const BANNER = card(3.2, 0.9, (g, w, h) => { g.fillStyle = '#7a1a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f0c040'; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#f0c040'; g.font = 'bold 150px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESONANCE', w / 2, h / 2 + 6); }, { unlit: 0.7 });
BANNER.rotation.y = -Math.PI / 2; BANNER.position.set(CX - 0.52, BANK + 4.0, 0); W.add(BANNER);
// ======================= HAY CARTS with horses =======================
function horse() { const g = new THREE.Group(), b = tm(0x8a5a32), d = tm(0x4a2e1a); g.add(box(0.5, 0.5, 1.2, b, 0, 1.0, 0, 0.12)); const nk = box(0.28, 0.6, 0.3, b, 0, 1.4, 0.6, 0.08); nk.rotation.x = -0.6; g.add(nk); g.add(box(0.26, 0.26, 0.55, b, 0, 1.7, 0.92, 0.06)); g.add(box(0.08, 0.4, 0.3, d, 0, 1.5, 0.55)); g.add(box(0.08, 0.5, 0.08, d, 0, 0.9, -0.66));
  const legs = []; for (const [x, z] of [[-0.17, 0.45], [0.17, 0.45], [-0.17, -0.45], [0.17, -0.45]]) { const l = new THREE.Group(); l.position.set(x, 0.8, z); l.add(box(0.1, 0.8, 0.1, b, 0, -0.4, 0)); g.add(l); legs.push(l); } g.userData.legs = legs; for (const s of [-1, 1]) g.add(sph(0.03, tm(0x111111, { unlit: 1 }), s * 0.13, 1.76, 1.12, 6, 4)); return g; }
const CARTS = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); W.add(g); const h = horse(); h.position.z = 1.3; g.add(h); g.add(box(1.3, 0.12, 1.8, tm(0x7a4e28), 0, 0.75, -0.5)); for (const s of [-1, 1]) { g.add(box(0.06, 0.06, 1.3, tm(0x5a3a1a), s * 0.32, 0.85, 0.7)); const wh = cyl(0.42, 0.42, 0.08, tm(0x5a3a1a), s * 0.7, 0.45, -0.5, 14); wh.rotation.z = Math.PI / 2; g.add(wh); }
  const hay = sph(0.8, tm(0xf0c860, { band: 0.15 }), 0, 1.2, -0.5, 12, 8); hay.scale.set(0.85, 0.65, 1.15); g.add(hay); CARTS.push({ g, h }); }
// ======================= SWING (left bank tree), FERRY =======================
const SWT = tree(-11, 5.5, 1.3); SWT.add(box(3.0, 0.22, 0.22, tm(0x7a5a3a), 1.2, 3.2, 0));
const SWING = new THREE.Group(); SWING.position.set(-11 + 1.8, BANK + 3.15, 5.5); W.add(SWING); for (const s of [-1, 1]) SWING.add(box(0.03, 2.2, 0.03, tm(0x8a7a5a), 0, -1.1, s * 0.25)); SWING.add(box(0.3, 0.05, 0.6, tm(0x7a4e28), 0, -2.2, 0));
const BOAT = new THREE.Group(); W.add(BOAT); BOAT.add(box(0.9, 0.35, 2.0, tm(0x8a5e32), 0, 0.15, 0, 0.12)); BOAT.add(box(0.7, 0.05, 1.8, tm(0x6a4424), 0, 0.3, 0)); for (const s of [-1, 1]) { const o = box(0.05, 0.05, 1.4, tm(0xc8a060), s * 0.6, 0.45, 0); o.rotation.y = s * 0.5; BOAT.add(o); }
// drum + sticks
const DRUM = new THREE.Group(); W.add(DRUM); DRUM.add(cyl(0.2, 0.2, 0.24, tm(0xd82a2a), 0, 0, 0, 16)); DRUM.add(cyl(0.205, 0.205, 0.02, tm(0xf4ece0), 0, 0.12, 0, 16)); for (let i = 0; i < 6; i++) { const r = box(0.01, 0.26, 0.01, tm(0xf0c020), Math.cos(i) * 0.205, 0, Math.sin(i) * 0.205); r.rotation.z = (i % 2 ? 1 : -1) * 0.4; DRUM.add(r); }
const STICKS = [0, 1].map(() => { const s = cyl(0.008, 0.01, 0.3, tm(0xe8d8b0), 0, 0, 0, 6); W.add(s); return s; });
const CROWN = new THREE.Group(); W.add(CROWN); CROWN.add(cyl(0.13, 0.13, 0.08, tm(0xf0c020, { emis: 0.15 }), 0, 0, 0, 14)); for (let i = 0; i < 6; i++) { const sp = cyl(0.0, 0.03, 0.09, tm(0xf0c020, { emis: 0.15 }), Math.cos(i * 1.047) * 0.12, 0.08, Math.sin(i * 1.047) * 0.12, 5); CROWN.add(sp); } CROWN.add(sph(0.025, tm(0xd82a2a, { unlit: 0.5 }), 0, 0.03, 0.13, 6, 4));

// ======================= PEOPLE =======================
const KING = makeStickPerson(W, { top: '#a8203a', height: 0.62, build: { w: 1.35, belly: 0.3 }, seed: 1 }, { hair: '#d8d8d8', mustache: '#e8e8e8', brow: '#a0a0a0' }, { hits: [[2.0, 'take', 0.5], [15.34, 'take', 0.9], [18.34, 'double', 1.0], [29.96, 'take', 0.4]], loops: [[6.6, 7.7, 'laugh'], [18.9, 19.6, 'dizzy'], [30.2, 30.7, 'bob']], marks: [['!', 18.4, 19.3]] });
KING.torso.add(box(0.42, 0.6, 0.04, tm(0xd8302a), 0, 0.25, -0.22));
const DRUMMER = makeStickPerson(W, { top: '#2a6ad8', height: 0.58, seed: 2 }, { hat: 'cap', hatCol: 0xd82a2a, browMax: 0.135 }, { hits: [[8.52, 'jolt', 0.3], [9.18, 'jolt', 0.3], [19.96, 'take', 0.4]], loops: [[19.6, 21.9, 'bob'], [44.5, 46.6, 'bob']], marks: [] });
const CAPT = makeStickPerson(W, { top: '#3a4a3a', height: 0.64, seed: 4 }, { hat: 'cap', hatCol: 0x6a6a70, browMax: 0.135, mustache: '#2a1a12' }, { hits: [[22.44, 'take', 1.2], [23.86, 'jolt', 0.7], [25.08, 'shake', 0.8]], loops: [[22.5, 23.8, 'rage'], [30.2, 30.7, 'bob']], marks: [['!', 22.4, 23.4]] });
const SOL = []; for (let i = 0; i < 10; i++) SOL.push(makeStickPerson(W, { top: i % 2 ? '#8a2a2a' : '#9a3030', height: 0.6 + (i % 3) * 0.015, seed: 30 + i }, { hat: 'cap', hatCol: 0x8a8a92, browMax: 0.135 }, { hits: [[15.34, 'take', 0.6 + 0.1 * (i % 3)], [24.0, 'take', 0.5], [29.96, 'take', 0.3]], loops: [[16.5, 23.9, 'bob'], [25.2, 26.8, 'bob']], marks: i === 3 ? [['!', 15.3, 16.1]] : [] }));
const SPEARS = SOL.map(() => { const g = new THREE.Group(); g.add(cyl(0.012, 0.012, 1.4, tm(0x6a4424), 0, 0.3, 0, 6)); g.add(cyl(0.0, 0.03, 0.12, tm(0xc0c0c8), 0, 1.06, 0, 6)); W.add(g); return g; });
const CHILD = makeStickPerson(W, { top: '#f08a2a', height: 0.46, seed: 50 }, { hair: '#2a1a10' }, { hits: [], loops: [[36.4, 38.3, 'laugh']], marks: [] });
const CROWD = [0, 1, 2, 3].map((i) => makeStickPerson(W, { top: ['#e85a8a', '#3aa86a', '#e8b020', '#8a5ad8'][i], height: 0.56 + i * 0.02, seed: 60 + i }, i % 2 ? { hat: 'cap', hatCol: [0x2a8a5a, 0xe8a020][i >> 1], browMax: 0.135 } : { hair: '#1a120e' }, { hits: [[15.34, 'take', 0.7]], loops: [[6.6, 8.0, 'laugh'], [29.96, 30.6, 'laugh']], marks: [] }));
const ALL = [KING, DRUMMER, CAPT, ...SOL, CHILD, ...CROWD];
const B = (arr) => arr.map(([t, emo, trans]) => ({ t, emo, trans: trans ?? 0.14 }));
const perf = new Map([[KING, new Performer(1, { intensity: 1.5, auto: false }).beats(B([[0, 'proud'], [2.0, 'shock', 0.06], [2.6, 'smug'], [3.5, 'proud'], [4.9, 'grin'], [6.0, 'smug'], [6.6, 'joy'], [7.4, 'laugh'], [7.8, 'happy'], [15.34, 'shock', 0.06], [16.0, 'worried'], [16.9, 'scared'], [18.34, 'panic', 0.06], [19.0, 'shock'], [19.6, 'worried'], [29.96, 'relief', 0.1], [30.4, 'happy'], [31.6, 'joy'], [33.7, 'laugh'], [35.0, 'joy'], [36.6, 'laugh']]))],
  [DRUMMER, new Performer(2, { intensity: 1.4, auto: false }).beats(B([[0, 'determined'], [7.8, 'proud'], [15.34, 'shock', 0.08], [16.0, 'determined'], [19.96, 'joy'], [21.04, 'smug'], [44.48, 'happy'], [45.3, 'smug']]))],
  [CAPT, new Performer(4, { intensity: 1.5, auto: false }).beats(B([[0, 'stern'], [9.84, 'proud'], [15.34, 'shock', 0.08], [16.6, 'worried'], [22.16, 'panic', 0.08], [23.86, 'angry', 0.08], [24.7, 'determined'], [27.0, 'worried'], [29.96, 'relief'], [30.5, 'proud']]))],
  [CHILD, new Performer(50, { intensity: 1.5, auto: false }).beats(B([[0, 'happy'], [33.7, 'joy'], [36.5, 'laugh']]))]]);
SOL.forEach((P, i) => perf.set(P, new Performer(30 + i, { intensity: 1.4, auto: false }).beats(B([[0, 'determined'], [11.0, 'proud'], [12.3, 'determined'], [15.34, 'shock', 0.06], [15.9, 'worried'], [16.6, 'scared'], [17.3, 'panic', 0.08], [18.4, 'scared'], [19.4, 'worried'], [20.5, 'panic'], [21.6, 'scared'], [22.6, 'worried'], [24.0, 'blank', 0.08], [24.7, 'curious'], [25.4, 'blank'], [26.2, 'curious'], [27.0, 'happy'], [28.1, 'grin'], [29.96, 'relief'], [38.8, 'determined'], [40.0, 'scared'], [42.2, 'happy'], [43.3, 'grin']]))));
CROWD.forEach((P, i) => perf.set(P, new Performer(60 + i, { intensity: 1.4, auto: false }).beats(B([[0, 'happy'], [6.6, 'joy'], [15.34, 'shock', 0.08], [16.5, 'scared'], [29.96, 'relief'], [30.3, 'laugh']]))));
const STEPS = [11.58, 12.32, 13.16, 14.02];  // "Left. Right. Left. Right."
const marchPhase = (t) => { if (t < STEPS[0]) return (t - 9.84) * 0.62; const per = 0.82; return (STEPS[0] - 9.84) * 0.62 + (t - STEPS[0]) / per * 0.5 + 0.0; };
// soldier formation: 2 columns x 5 rows. column state by time
function solState(i, t) { const row = Math.floor(i / 2), col = i % 2; const z = col ? 0.62 : -0.62;
  const lead = (tt) => -14 + clamp(tt - 9.84, 0, 99) * 2.1;       // leader x while marching in (fast)
  let x, mode = 'march', ph = marchPhase(t) + (col ? 0.5 * 0 : 0);
  if (t < 14.7) x = Math.min(lead(t), 1.2) - row * 1.1; else if (t < 24.6) x = 1.2 - row * 1.1;            // stomp in place on the bridge
  else if (t < 30.6) { x = 1.2 - row * 1.1 + (t - 24.6) * 0.95; mode = 'waddle'; } else if (t >= 38.7 && t < 41.9) { x = -1.6 + (t - 38.7) * 0.0 - row * 1.1; } else if (t >= 42.1 && t < 44.5) { x = -5 + (t - 42.1) * 1.3 - row * 1.1 + hash(i) * 0.4; mode = 'casual'; } else x = 1.2 - row * 1.1 + 6 * 0.95;
  return { x, z: z + (mode === 'waddle' ? 0.12 * Math.sin(t * 7 + i) : 0) + (mode === 'casual' ? (hash(i * 3) - 0.5) * 0.4 : 0), mode, ph }; }

// ======================= EXTRA LIFE: splashes, nails, birds, dust =======================
const SPL = []; for (let i = 0; i < 36; i++) { const m = sph(0.07 + hash(i) * 0.08, tm(0xeaf6ff, { unlit: 0.6, noInk: 1 }), 0, -50, 0, 8, 6); W.add(m); SPL.push(m); }
const NAILS = []; for (let i = 0; i < 14; i++) { const m = box(0.03, 0.09, 0.03, tm(0x9a9aa4)); W.add(m); NAILS.push(m); }
const BIRDS = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(); for (const s of [-1, 1]) { const w = box(0.32, 0.03, 0.1, tm(0x2a2a30)); w.position.x = s * 0.15; w.userData.s = s; g.add(w); } W.add(g); BIRDS.push(g); }
const DUST = []; for (let i = 0; i < 30; i++) { const m = sph(0.08, tm(0xd8c8a8, { noInk: 1 }), 0, -50, 0, 8, 6); W.add(m); DUST.push(m); }
function extras(t) {
  const A = bounceA(t); SPL.forEach((m, i) => { const ph = (t * 1.25 + hash(i)) % 1; const on = A > 0.12; m.visible = on; if (!on) return; const x = (hash(i * 3) - 0.5) * 10, z = (hash(i * 5) - 0.5) * 3.4; m.position.set(x, WATER + 0.05 + Math.sin(ph * Math.PI) * (0.4 + A * 2.2) * hash(i + 9), z); });
  NAILS.forEach((m, i) => { const t0 = [17.3, 17.75, 39.9][i % 3] + hash(i) * 0.3, a = t - t0; m.visible = a > 0 && a < 1.0; if (!m.visible) return; const x = (hash(i * 2) - 0.5) * 6; m.position.set(x + a * (hash(i) - 0.5) * 1.5, deckY(x, t) + 0.1 + 3.2 * a - 4.9 * a * a, (hash(i * 7) - 0.5) * 2.4); m.rotation.set(a * 14, a * 9, 0); });
  BIRDS.forEach((g, i) => { const a = t - 15.34 - hash(i) * 0.3; g.visible = a > 0 && a < 4; if (!g.visible) return; const sx = -12 + (i % 3) * 9, sz = -4 + (i % 4) * 3; g.position.set(sx + a * (2 + hash(i) * 2) * (i % 2 ? 1 : -1), BANK + 4 + a * 2.5, sz - a * 1.5); g.rotation.y = i % 2 ? -0.6 : 0.6; g.children.forEach((w) => (w.rotation.z = w.userData.s * 0.7 * Math.sin(t * 22 + i))); });
  DUST.forEach((m, i) => { const st = [11.58, 12.32, 13.16, 14.02, 38.8, 39.6, 40.4][i % 7], a = t - st; m.visible = a > 0 && a < 0.7 && SOL[i % 10].root.visible; if (!m.visible) return; const P = SOL[i % 10].root.position; m.position.set(P.x + (hash(i) - 0.5) * 0.4, P.y + 0.06 + a * 0.4, P.z + (hash(i + 1) - 0.5) * 0.4); m.scale.setScalar(0.5 + a * 2.2); });
}
// ======================= PER FRAME =======================
let SHAKE = 0, FLASH = 0;
function setup(f) {
  const t = f / FPS; for (const P of ALL) P.root.visible = false; SHAKE = 0; FLASH = 0;
  // deck + rails flex
  DECK.forEach((g) => { g.position.y = deckY(g.position.x, t); g.rotation.z = 0; });
  RAILS.forEach(({ r, i, s }) => { const a = DECK[i].position, b = DECK[i + 1].position; r.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.9, s * (DW / 2 - 0.05)); r.rotation.set(0, 0, Math.atan2(b.y - a.y, b.x - a.x)); r.scale.x = Math.hypot(b.x - a.x, b.y - a.y) / 0.42 * 1.05; });
  SPARK.forEach((m, i) => { m.position.set((hash(i) - 0.5) * 2 * HALF * 0.95, WATER + 0.04, ((hash(i + 3) * 120 + t * 1.6) % 120) - 60); });
  FLAGS.forEach(({ g, f, i }) => { const up = t >= 6.6 ? EASE.outBack(clamp((t - 6.6 - (i % 5) * 0.06) / 0.35, 0, 1)) : 0; g.scale.setScalar(Math.max(0.001, up)); f.rotation.y = 0.15 * Math.sin(t * 5 + i); });
  BANNER.visible = t >= 41.36; BANNER.scale.setScalar(t < 41.7 ? Math.max(0.01, EASE.outBack(clamp((t - 41.36) / 0.3, 0, 1))) : 1);
  for (const ti of [1.96, 15.34, 41.62]) { const a = t - ti; if (a > 0 && a < 0.6) { SHAKE += Math.exp(-a * 6) * (ti === 41.62 ? 1.4 : 1); FLASH = Math.max(FLASH, (ti === 41.62 ? 0.5 : 0.2) * Math.exp(-a * 12)); } }
  SHAKE += bounceA(t) * 1.2;
  // hay carts (4.6 - 6.6)
  CARTS.forEach(({ g, h }, i) => { const on = t >= 3.4 && t < 7.0; g.visible = on; if (!on) return; const x = -13 + (t - 3.4) * 5.2 - i * 3.1; g.position.set(x, deckY(x, t) - (Math.abs(x) < HALF + 0.4 ? 0 : 0.12) + (Math.abs(x) < HALF + 0.4 ? 0 : 0), i % 2 ? 0.5 : -0.5); g.rotation.set(0, Math.PI / 2, 0); h.userData.legs.forEach((l, k) => { l.rotation.x = 0.5 * Math.sin(t * 9 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)); }); });
  // ---- king on the right bank ----
  { const P = KING; P.root.visible = t < 38.7; P.root.position.set(8.6, BANK, -2.2); P.root.rotation.set(0, -2.2, 0); let p = toonify({ ...perf.get(P).at(t, { handsFree: true }), t }, P, t);
    if (t >= 2.6 && t < 6.6) p.armR = { f: 80, o: -20, b: 5 }; if (t >= 6.6 && t < 7.8) { p.armL = { f: 125 + 12 * Math.sin(t * 12), o: -70, b: 10 }; p.armR = { f: 125 + 12 * Math.sin(t * 12 + 1), o: -70, b: 10 }; }
    if (t >= 18.34 && t < 19.5) { p.armL = { f: 140, o: -50, b: 30 }; p.armR = { f: 140, o: -50, b: 30 }; }
    P.update(p); const hw = P.headWorld(); const cu = t >= 18.34 && t < 19.4 ? (t - 18.34) / 1.06 : -1; CROWN.visible = P.root.visible; CROWN.position.copy(hw).add(V(0, 0.36 + (cu >= 0 ? Math.sin(cu * Math.PI) * 0.9 : 0), 0)); CROWN.rotation.set(cu >= 0 ? cu * 8 : 0, cu >= 0 ? cu * 12 : 0, 0); }
  if (t >= 38.7) CROWN.visible = false;
  // ---- crowd on the left bank ----
  if (t < 30.8) CROWD.forEach((P, i) => { P.root.visible = true; const x = -HALF - 1.6 - (i % 2) * 0.8, z = -2.4 + i * 0.5 - (i > 1 ? 4.2 : 0) + (i > 1 ? 0 : 0); P.root.position.set(x, BANK, i < 2 ? -2.4 - i * 0.7 : 2.4 + (i - 2) * 0.7); P.root.rotation.set(0, Math.PI / 2 + (i < 2 ? 0.5 : -0.5), 0); const p = toonify({ ...perf.get(P).at(t, { handsFree: true }), t }, P, t);
    if ((t >= 6.6 && t < 8.2) || (t >= 29.96 && t < 30.8)) { p.armL = { f: 125 + 12 * Math.sin(t * 13 + i), o: -70, b: 10 }; p.armR = { f: 125 + 12 * Math.sin(t * 13 + i + 1), o: -70, b: 10 }; } if (t >= 15.34 && t < 23) { p.armL = { f: 60, o: -15, b: 110 }; p.armR = { f: 60, o: -15, b: 110 }; } P.update(p); });
  // ---- soldiers ----
  const solOn = (t >= 9.6 && t < 31.0) || (t >= 38.7 && t < 44.5);
  if (solOn) SOL.forEach((P, i) => { const s = solState(i, t); P.root.visible = true; const y = deckY(s.x, t); P.root.position.set(s.x, Math.abs(s.x) < HALF + 0.4 ? y + 0.06 : BANK, s.z); P.root.rotation.set(0, Math.PI / 2 + (s.mode === 'waddle' ? 0.3 * Math.sin(t * 6 + i) : 0), (s.mode === 'waddle' ? 0.12 * Math.sin(t * 6 + i) : 0));
    const base = perf.get(P).at(t, { walking: true, handsFree: false }); let ph = s.ph; let gait = 1; if (s.mode === 'waddle') { ph = t * (1.6 + hash(i) * 0.7) + hash(i * 3); gait = 0.45; } if (s.mode === 'casual') { ph = t * 1.3 + hash(i * 7); gait = 0.8; }
    const p = toonify({ ...base, t, walk: ph, walkK: 1, gait, cyc: 0.75, duty: 0.6 }, P, t);
    if (s.mode === 'march') { p.armL = { f: 30 * Math.sin(ph * 2 * Math.PI + Math.PI), o: -14, b: 10 }; p.armR = { f: 70, o: -10, b: 70 }; } if (s.mode === 'waddle') { p.armL = { f: 5, o: -55, b: 5 }; p.armR = { f: 5, o: -55, b: 5 }; p.lean = (p.lean || 0) + 10 * Math.sin(t * 7 + i); }
    P.update(p); const sp = SPEARS[i]; sp.visible = true; sp.position.copy(P.palmWorld('R')); sp.rotation.set(0, 0, s.mode === 'waddle' ? 0.5 : 0.05); });
  SPEARS.forEach((sp, i) => { if (!solOn) sp.visible = false; });
  // ---- drummer: front of the column, then the ferry ----
  { const P = DRUMMER; let x, y, onB = false, rotY = Math.PI / 2; if (t >= 7.7 && t < 31.0) { x = t < 14.7 ? Math.min(-14 + clamp(t - 9.84, 0, 99) * 2.1, 1.2) + 1.3 : (t < 24.6 ? 2.5 : 2.5 + (t - 24.6) * 0.95); if (t < 9.84) x = -12.7; onB = true; } else if (t >= 44.4) { onB = false; }
    if (onB) { P.root.visible = true; y = Math.abs(x) < HALF + 0.4 ? deckY(x, t) + 0.06 : BANK; P.root.position.set(x, y, 0); P.root.rotation.set(0, rotY, 0); }
    if (t >= 44.4) { P.root.visible = true; const bx = -1.0 + 0, bz = 9 - (t - 44.4) * 1.4; BOAT.visible = true; BOAT.position.set(bx, WATER + 0.02 + 0.03 * Math.sin(t * 3), bz); BOAT.rotation.set(0.03 * Math.sin(t * 2.4), Math.PI, 0.04 * Math.sin(t * 2)); P.root.position.set(bx, WATER + 0.33, bz); P.root.rotation.set(0, Math.PI, 0); } else BOAT.visible = false;
    if (P.root.visible) { const walking = onB && (t < 14.7 || (t > 24.6)); const base = perf.get(P).at(t, { walking, handsFree: false }); const p = toonify({ ...base, t }, P, t); if (onB) { p.walk = t < 9.84 ? null : marchPhase(t); p.walkK = t < 9.84 ? 0 : 1; p.gait = 1; p.cyc = 0.75; }
      if (t >= 44.4) { p.sit = { h: WATER + 0.45, k: 1, footZ: 0.35, kneeX: 0.12, front: 0.2 }; }
      // drum hits: on 'Boom' words, then on every step
      const hits = [8.52, 9.18, ...STEPS, 14.85, 15.67, 16.49, 17.31, 18.13, 18.95, 19.77, 20.59, 21.41, 22.23, 44.9, 45.5, 46.1]; let hk = 0, hand = 'L'; hits.forEach((h, k) => { const v = sstep(h - 0.18, h - 0.02, t) * (1 - sstep(h + 0.02, h + 0.2, t)); if (v > hk) { hk = v; hand = k % 2 ? 'R' : 'L'; } });
      P.update(p); const dpos = P.torso.localToWorld(V(0, 0.18, 0.34)); DRUM.visible = true; DRUM.position.copy(dpos); DRUM.rotation.set(0, P.root.rotation.y, 0);
      const top = DRUM.position.clone().add(V(0, 0.13, 0)); for (const [k, hd] of [[0, 'L'], [1, 'R']]) { const side = V(Math.cos(P.root.rotation.y), 0, -Math.sin(P.root.rotation.y)).multiplyScalar(k ? 0.08 : -0.08); p['hand' + hd] = { w: top.clone().add(side).add(V(0, (hd === hand ? 1 - hk : 1) * 0.22 + 0.04, -0.02)), k: 1 }; }
      p.reachAssist = false; P.update(p); STICKS.forEach((s, k) => { const pw = P.palmWorld(k ? 'R' : 'L'); s.visible = true; s.position.copy(pw.clone().lerp(top, 0.35)); s.lookAt(top); s.rotateX(Math.PI / 2); }); }
    else { DRUM.visible = false; STICKS.forEach((s) => (s.visible = false)); } }
  // ---- captain: in front of the column on the bridge ----
  if (t >= 9.6 && t < 31.0) { const P = CAPT; P.root.visible = true; const x = t < 14.7 ? Math.min(-14 + clamp(t - 9.84, 0, 99) * 2.1, 1.2) + 2.6 : (t < 24.6 ? 3.8 : 3.8 + (t - 24.6) * 0.95); const y = Math.abs(x) < HALF + 0.4 ? deckY(x, t) + 0.06 : BANK; const turn = t >= 22.16 && t < 27.0; P.root.position.set(x, y, 0.25); P.root.rotation.set(0, turn ? -Math.PI / 2 : Math.PI / 2, 0);
    const walking = t < 14.7 || t > 24.6; const base = perf.get(P).at(t, { walking, handsFree: false }); const p = toonify({ ...base, t }, P, t); if (walking) { p.walk = t > 24.6 ? t * 1.5 : marchPhase(t); p.walkK = 1; p.gait = 1; p.cyc = 0.75; }
    if (t >= 23.86 && t < 26.9) { p.armL = { f: 130 + 25 * Math.sin(t * 16), o: -60, b: 15 }; p.armR = { f: 75, o: -20, b: 20 }; } if (t >= 22.2 && t < 23.86) { p.armL = { f: 60, o: -20, b: 130 }; p.armR = { f: 60, o: -20, b: 130 }; }
    P.update(p); }
  // ---- explanation: the swing (30.76 - 38.7) ----
  { const on = t >= 30.7 && t < 38.75; const amp = lerp(0.12, 0.72, sstep(33.7, 38.1, t)); const ang = on ? amp * Math.sin((t - 30.7) * 2 * Math.PI * 0.55) : 0; SWING.rotation.set(ang, 0, 0);
    CHILD.root.visible = on; if (on) { SWING.updateMatrixWorld(true); const seat = SWING.localToWorld(V(0, -2.17, 0)); const P = CHILD; const p = toonify({ ...perf.get(P).at(t, { handsFree: false }), t }, P, t); P.root.position.set(seat.x, seat.y - 0.45 * 0.46 * 1.0, seat.z); P.root.rotation.set(0, Math.PI / 2, 0);
      p.sit = { h: seat.y, k: 1, footZ: 0.32, kneeX: 0.1, front: 0.18 }; p.armL = { f: 150, o: -10, b: 20 }; p.armR = { f: 150, o: -10, b: 20 }; P.update(p); P.root.rotation.set(ang, Math.PI / 2, 0, 'YXZ'); }
    if (on) { const P = KING; P.root.visible = true; const pushK = Math.max(0, Math.sin((t - 30.7) * 2 * Math.PI * 0.55 - 0.4)); P.root.position.set(-11 + 1.8 + 0.85, BANK, 5.5 + 0.9); P.root.rotation.set(0, Math.PI + 0.9, 0); const p = toonify({ ...perf.get(P).at(t, { handsFree: false }), t }, P, t);
      p.armL = { f: 70 + 25 * pushK, o: -10, b: 40 - 30 * pushK }; p.armR = { f: 70 + 25 * pushK, o: -10, b: 40 - 30 * pushK }; p.lean = 10 * pushK; P.update(p); CROWN.visible = true; CROWN.position.copy(P.headWorld()).add(V(0, 0.36, 0)); CROWN.rotation.set(0, 0, 0); } }
  extras(t);
  return { t };
}

// ======================= CAMERA: moving shots, cuts only where the place changes =======================
const CINE = new Cine({ blend: 0.32 }); const P = CT.pt;
const soldierMid = () => SOL[4].root.position.clone().add(V(0, 0.9, 0));
const solHead = (k) => () => SOL[k].headWorld(); const solFeet = (k) => () => SOL[k].root.position.clone().add(V(0, 0.25, 0));
const deckMid = P(0, DECKY + 0.3, 0);
const S = [
  [0.0, 0.95, { rig: 'fly', path: [[-28, 10, 30], [-12, 4.5, 14]], at: P(0, DECKY, 0), fov: [44, 38], shake: 0.3 }],
  [0.95, 1.9, { rig: 'orbit', at: deckMid, size: [8, 6], az: [70, -20], el: [4, 10], fov: 36, shake: 0.4 }],
  [1.9, 2.55, { rig: 'push', at: deckMid, size: [5, 3.2], az: [-25, -10], el: [2, 1], fov: 34, shake: 0.9, ease: 'snap', fovKick: 8 }],
  [2.55, 3.5, { rig: 'crane', at: () => KING.headWorld(), size: ['fs', 'ms'], az: [-70, -20], el: [40, 6], fov: 34, shake: 0.4 }],
  [3.5, 4.7, { rig: 'orbit', at: P(0, DECKY - 0.2, 0), size: [6.5, 5.0], az: [15, 60], el: [2, 6], fov: 36, shake: 0.4 }],
  [4.7, 5.6, { rig: 'track', at: () => CARTS[0].g.position.clone().add(V(0, 1.3, 0)), size: [3.6, 3.0], az: [10, 80], el: [10, 6], fov: 34, shake: 0.45 }],
  [5.6, 6.6, { rig: 'orbit', at: () => CARTS[2].g.position.clone().add(V(0, 1.0, 0)), size: [7, 6], az: [0, 90], el: [70, 60], fov: 36, shake: 0.3 }],
  [6.6, 7.3, { rig: 'orbit', at: P(-HALF - 1.0, BANK + 2.0, 1.5), size: [3.6, 2.6], az: [150, 80], el: [10, 14], fov: 34, shake: 0.5, fovKick: 6 }],
  [7.3, 7.8, { rig: 'push', at: () => CROWD[2].headWorld(), size: [1.8, 1.2], az: [100, 70], el: [6, 4], fov: 32, shake: 0.6, ease: 'snap' }],
  [7.8, 8.6, { rig: 'push', at: () => DRUM.position.clone().add(V(0, 0.15, 0)), size: [1.0, 0.55], az: [-60, -20], el: [24, 12], fov: 30, shake: 0.6, ease: 'snap' }],
  [8.6, 9.84, { rig: 'orbit', at: () => DRUMMER.headWorld().lerp(DRUM.position, 0.5), size: [1.6, 1.4], az: [-90, 40], el: [8, 14], fov: 32, shake: 0.5 }],
  [9.84, 10.8, { rig: 'track', at: () => SOL[2].root.position.clone().add(V(0, 0.8, 0)), size: [4.2, 3.4], az: [20, 85], el: [16, 8], fov: 34, shake: 0.5 }],
  [10.8, 11.5, { rig: 'orbit', at: solFeet(0), size: [1.4, 1.1], az: [70, 20], el: [4, 6], fov: 34, shake: 0.6 }],
  [11.5, 12.3, { rig: 'push', at: solHead(0), size: [2.4, 1.4], az: [100, 80], el: [6, 4], fov: 32, shake: 0.6, ease: 'snap', fovKick: 6 }],
  [12.3, 13.1, { rig: 'orbit', at: solFeet(1), size: [1.6, 1.2], az: [-20, 30], el: [6, 4], fov: 34, shake: 0.6 }],
  [13.1, 14.0, { rig: 'crane', at: soldierMid, size: [3.5, 6], az: [30, 70], el: [30, 75], fov: 36, shake: 0.4 }],
  [14.0, 14.7, { rig: 'orbit', at: soldierMid, size: [4.5, 4.0], az: [-40, -5], el: [-4, 2], fov: 36, shake: 0.6, ease: 'snap' }],
  [14.7, 15.6, { rig: 'orbit', at: P(0.5, DECKY + 0.5, 0), size: [7.5, 6.0], az: [5, -25], el: [3, 5], fov: 36, shake: 0.9, fovKick: 10 }],
  [15.6, 16.5, { rig: 'push', at: () => CROWD[0].headWorld().lerp(CROWD[1].headWorld(), 0.5), size: [2.4, 1.6], az: [80, 110], el: [6, 4], fov: 32, shake: 0.7, ease: 'snap' }],
  [16.5, 17.3, { rig: 'orbit', at: soldierMid, size: [3.0, 2.6], az: [-40, 30], el: [10, 14], fov: 34, shake: 0.9 }],
  [17.3, 17.9, { rig: 'orbit', at: P(0.3, DECKY + 0.2, 0.3), size: [1.8, 1.4], az: [20, 70], el: [24, 18], fov: 32, shake: 0.8 }],
  [17.9, 18.3, { rig: 'orbit', at: P(0, WATER + 0.7, 2.2), size: [3.4, 3.8], az: [0, 25], el: [12, 10], fov: 36, shake: 0.8 }],
  [18.3, 19.5, { rig: 'push', at: () => KING.headWorld().add(V(0, 0.5, 0)), size: [2.4, 1.6], az: [-130, -100], el: [6, 12], fov: 30, shake: 0.8, ease: 'snap' }],
  [19.5, 20.8, { rig: 'orbit', at: () => DRUMMER.headWorld().lerp(DRUM.position, 0.4), size: [2.0, 1.6], az: [20, 75], el: [8, 12], fov: 32, shake: 0.8 }],
  [20.8, 22.1, { rig: 'push', at: () => DRUM.position.clone().add(V(0, 0.2, 0)), size: [1.2, 0.7], az: [40, 70], el: [26, 16], fov: 30, shake: 0.7 }],
  [22.1, 23.0, { rig: 'push', at: CT.head(CAPT), size: [1.6, 1.1], az: [-150, -125], el: [8, 5], fov: 30, shake: 0.9, ease: 'snap', fovKick: 8 }],
  [23.0, 23.86, { rig: 'orbit', at: () => CAPT.headWorld().lerp(soldierMid(), 0.5), size: [3.2, 2.8], az: [-30, 10], el: [12, 8], fov: 32, shake: 0.7 }],
  [23.86, 24.7, { rig: 'push', at: CT.head(CAPT), size: [1.5, 1.0], az: [-160, -140], el: [4, 2], fov: 30, shake: 1.2, ease: 'snap', fovKick: 10 }],
  [24.7, 26.1, { rig: 'orbit', at: () => CAPT.torso.localToWorld(V(0, 0.3, 0)), size: [2.2, 1.9], az: [-170, -100], el: [10, 14], fov: 32, shake: 0.7 }],
  [26.1, 27.0, { rig: 'push', at: solHead(1), size: [1.8, 1.2], az: [110, 80], el: [6, 4], fov: 30, shake: 0.6, ease: 'snap' }],
  [27.0, 28.2, { rig: 'crane', at: soldierMid, size: [4.0, 6.5], az: [10, 50], el: [12, 55], fov: 36, shake: 0.4 }],
  [28.2, 29.2, { rig: 'orbit', at: solFeet(3), size: [1.6, 1.3], az: [120, 60], el: [6, 4], fov: 34, shake: 0.5 }],
  [29.2, 30.3, { rig: 'push', at: P(1.5, DECKY + 0.6, 0), size: [8, 6.5], az: [-10, 0], el: [2, 3], fov: 36, shake: 0.2 }],
  [30.3, 30.75, { rig: 'push', at: () => KING.headWorld(), size: [1.4, 1.0], az: [-110, -95], el: [6, 4], fov: 30, shake: 0.4, ease: 'snap' }],
  [30.75, 31.6, { rig: 'fly', path: [[-6, 7, 14], [-6.5, 4.5, 10]], at: P(-9.2, BANK + 1.5, 5.5), fov: [40, 36], shake: 0.3 }],
  [31.6, 33.2, { rig: 'orbit', at: () => SWING.localToWorld(V(0, -1.6, 0)), size: [4.0, 3.2], az: [60, 110], el: [8, 10], fov: 34, shake: 0.35 }],
  [33.2, 34.6, { rig: 'orbit', at: () => KING.headWorld().lerp(CHILD.headWorld(), 0.5), size: [3.0, 2.6], az: [150, 100], el: [10, 8], fov: 32, shake: 0.4 }],
  [34.6, 36.4, { rig: 'track', at: () => CHILD.headWorld(), size: [1.6, 1.2], az: [80, 110], el: [8, 4], fov: 32, shake: 0.4 }],
  [36.4, 38.1, { rig: 'orbit', at: () => SWING.localToWorld(V(0, -1.3, 0)), size: [3.8, 5.0], az: [100, 40], el: [-8, 6], fov: 36, shake: 0.5 }],
  [38.1, 38.75, { rig: 'crane', at: () => SWING.localToWorld(V(0, -1.0, 0)), size: [5, 8], az: [40, 20], el: [10, 50], fov: 36, shake: 0.4 }],
  [38.75, 39.6, { rig: 'orbit', at: solFeet(0), size: [1.4, 1.1], az: [80, 30], el: [4, 6], fov: 34, cut: true, shake: 0.7 }],
  [39.6, 40.4, { rig: 'orbit', at: P(0, DECKY + 0.5, 0), size: [7.5, 6.5], az: [-10, 20], el: [2, 4], fov: 36, shake: 1.0 }],
  [40.4, 41.3, { rig: 'orbit', at: soldierMid, size: [2.8, 2.4], az: [60, 100], el: [8, 10], fov: 32, shake: 0.9 }],
  [41.3, 42.15, { rig: 'push', at: P(CX - 0.6, BANK + 4.0, 0), size: [8.0, 6.2], az: [-100, -85], el: [6, 4], fov: 32, shake: 1.0, ease: 'snap', fovKick: 10 }],
  [42.15, 43.3, { rig: 'orbit', at: () => SOL[4].root.position.clone().add(V(0, 0.8, 0)), size: [5, 4], az: [40, -10], el: [12, 10], fov: 34, cut: true, shake: 0.3 }],
  [43.3, 44.45, { rig: 'crane', at: () => SOL[4].root.position.clone().add(V(0, 0.6, 0)), size: [4, 7], az: [-20, 20], el: [20, 65], fov: 36, shake: 0.3 }],
  [44.45, 45.6, { rig: 'orbit', at: () => BOAT.position.clone().add(V(0, 0.8, 0)), size: [4.5, 3.4], az: [120, 170], el: [4, 8], fov: 34, cut: true, shake: 0.3 }],
  [45.6, 46.6, { rig: 'push', at: () => DRUMMER.headWorld(), size: [1.6, 1.1], az: [170, 200], el: [6, 4], fov: 30, shake: 0.4, ease: 'snap' }],
  [46.6, 47.7, { rig: 'crane', at: () => BOAT.position.clone().add(V(0, 1.0, 0)), size: [3, 12], az: [200, 230], el: [10, 45], fov: 36, shake: 0.2 }],
];
for (const [a, b, sp] of S) CINE.shot(a, b, sp);

// ======================= LOOK =======================
const DAY = mkLook({ sun: [0.55, 0.75, 0.45], lit: '#fff4dc', litK: 1.08, shade: '#a8b4e0', ambSky: '#eef4ff', ambGnd: '#f8f0d8', rim: '#fff0d0', fog: '#dcecff', fogR: [50, 320], sky: ['#2a7ae8', '#6ab6f4', '#cfeaff', '#ffffff'], contrast: 1.05, vig: 0.08, glow: 0.35, grain: 0, desat: 0, sat: 1.22, lo: '#f8f8ff', hi: '#fffff0', exposure: 1.05, shadow: 0.8 });
const GOLD = mkLook({ sun: [0.8, 0.4, 0.3], lit: '#ffe0b8', litK: 1.1, shade: '#a8a0c8', ambSky: '#fff0e0', ambGnd: '#f8e0c0', rim: '#ffd0a0', fog: '#f8e0c8', fogR: [50, 320], sky: ['#4a80d0', '#f0c8a0', '#ffd8a8', '#fff0e0'], contrast: 1.05, vig: 0.12, glow: 0.5, grain: 0, desat: 0, sat: 1.18, lo: '#fff4e8', hi: '#fff0d8', exposure: 1.05, shadow: 0.8 });
window.renderFrame = function (f) {
  const { t } = setup(f); const cam = CINE.at(t); const sh = SHAKE; if (sh > 0) { cam.pos[0] += 0.05 * sh * Math.sin(t * 91); cam.pos[1] += 0.06 * sh * Math.sin(t * 77 + 1); cam.roll += 0.02 * sh * Math.sin(t * 63); }
  CAMPOS.set(...cam.pos); for (const Pp of ALL) placeMarks(Pp, t);
  applyLook(mixLook(DAY, GOLD, sstep(43.8, 44.6, t)), { shadowCenter: [clamp(cam.look[0], -14, CX), 1.5, clamp(cam.look[2], -8, 10)], shadowSize: 22 });
  C.skyU.uSunSize.value = 0; C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.04, far: 700 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37;
  dofU.uFade.value = 1 - Math.min(1, t / 0.4) + Math.max(0, (t - (DURATION - 0.9)) / 0.9); dofU.uFlash.value = FLASH;
  C.drawFrame(); return 'ok';
};
window.ready = true;
