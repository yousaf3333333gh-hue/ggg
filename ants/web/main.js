// TEMPLATE STORY (copy this folder for every new video: cp -r template mystory; echo mystory > app.txt)
// Shows every rule in one place: cast from the 56-person catalogue, solids registered for the camera guard, word-synced beats,
// a NEW SHOT ABOUT EVERY SECOND with fast moves, cartoon acting (takes/jolts/laughs), and the QA hook.
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph, makeCloud } from '../../web/models.js';
import { mkLook, applyLook } from '../../web/looks.js';
import { sstep, clamp, lerp, hash, EASE } from '../../web/motion.js';
import { Performer, EMOTIONS } from '../../web/perform.js';
import { Cine, T as CT } from '../../web/cine.js';
import { toonify, placeMarks, CAMPOS } from '../../web/toonkit.js';
import { makeCast } from '../../web/cast.js';
import { addSolidCentered, guardCam, setGround } from '../../web/safety.js';
for (const [n, base, ex] of [['smug', 'proud', 'smug'], ['grin', 'happy', 'grin'], ['gasp', 'shock', 'gasp'], ['awe', 'curious', 'awe'], ['blank', 'neutral', 'blank']]) EMOTIONS[n] = { ...EMOTIONS[base], expr: ex };
const { stage, dofU, FPS, PX } = C; export const DURATION = 47.6;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const tm = (h, o = {}) => C.toon({ color: new THREE.Color(h), ...o });
const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
// ============ "THE ANT HILL THAT BEAT THE TRAFFIC ENGINEERS" (swarm intelligence) : 47.6 s. Voice audio/voice_clean.mp3 (47.4 s). Beats keyed to words.json ============
import { toTex, mkCanvas } from '../../web/tex.js';
import { makeCar, makeTree } from '../../web/models.js';
const P = CT.pt; const frac = (x) => x - Math.floor(x); const Ks = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };
const card = (w, h, draw, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), tm(0xffffff, { map: ctex(Math.round(256 * w / h), 256, draw), unlit: o.unlit ?? 1, noInk: 1, side: THREE.DoubleSide }));
// ---------- pop-up signs (billboards that pop with overshoot) ----------
const SIGNS = [];
function sign(text, t0, t1, pos, w = 1.6, o = {}) {
  const h = o.h ?? w * 0.3;
  const m = card(w, h, (g, W_, H_) => {
    g.fillStyle = o.bg ?? '#ffe14a'; g.beginPath(); if (g.roundRect) g.roundRect(6, 6, W_ - 12, H_ - 12, 36); else g.rect(6, 6, W_ - 12, H_ - 12); g.fill();
    g.lineWidth = 12; g.strokeStyle = '#1a1a1a'; g.stroke();
    let sz = H_ * 0.62; g.font = `900 ${sz}px Arial Black, Arial, sans-serif`; const mw = g.measureText(text).width;
    if (mw > W_ - 60) { sz *= (W_ - 60) / mw; g.font = `900 ${sz}px Arial Black, Arial, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.fg ?? '#1a1a1a'; g.fillText(text, W_ / 2, H_ / 2 + 4);
  });
  m.visible = false; W.add(m); SIGNS.push({ m, t0, t1, w, frac: o.frac ?? (w < 0.8 ? 0.3 : 0.68), pos: typeof pos === 'function' ? pos : () => pos });
}
function updateSigns(t, cam) {
  const cp = V(...cam.pos), lk = V(...cam.look), f = lk.clone().sub(cp).normalize(), rt = V().crossVectors(f, V(0, 1, 0)).normalize(), up = V().crossVectors(rt, f), th = Math.tan(cam.fov * Math.PI / 360);
  for (const s of SIGNS) {
    const on = t > s.t0 && t < s.t1; s.m.visible = on; if (!on) continue;
    const k = Math.min(1, (t - s.t0) / 0.22), pop = (1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2) * (1 - Ks(s.t1 - 0.18, s.t1, t));
    const wp = s.pos(), v = wp.clone().sub(cp); let z = v.dot(f), x = v.dot(rt), y = v.dot(up); z = Math.max(z, 1.2);
    let nx = x / (z * th * 0.5625), ny = y / (z * th); const lim = Math.max(0.05, 1 - s.frac - 0.05); nx = clamp(nx, -lim, lim); ny = clamp(ny, -0.55, 0.62);
    const q = cp.clone().addScaledVector(f, z).addScaledVector(rt, nx * z * th * 0.5625).addScaledVector(up, ny * z * th);
    const visW = 2 * z * th * 0.5625, sc = clamp(s.frac * visW / s.w, 0.03, 8) * pop;
    s.m.position.copy(q); s.m.scale.setScalar(Math.max(0.001, sc)); s.m.lookAt(cp.x, cp.y, cp.z);
  }
}
// ---------- world ground (city at x≈0, park at x≈80) ----------
const FLOAT = { x0: 1.7, x1: 4.3, z0: -1.6, z1: -0.1 };
W.add(box(260, 0.1, 90, tm(0x86c95a), 40, -0.05, 0));
setGround((x, z) => (x > FLOAT.x0 && x < FLOAT.x1 && z > FLOAT.z0 && z < FLOAT.z1 ? 0.5 : 0));
for (let i = 0; i < 7; i++) { const cl = makeCloud(i + 3, 1.3); cl.position.set(-50 + i * 32, 38 + (i % 3) * 5, -95); W.add(cl); }
// ---------- CITY ----------
W.add(box(70, 0.06, 3.4, tm(0x4a4a55), 0, 0.03, 0)); for (let x = -32; x <= 32; x += 3) W.add(box(1.3, 0.065, 0.12, tm(0xf4f0e0), x, 0.032, 0));
for (const z of [-2.6, 2.6]) W.add(box(70, 0.03, 1.8, tm(0xd9d2c0), 0, 0.015, z));
const WIN = ctex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#6fb6f0'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(26 + x * 56, 26 + y * 56, 32, 38); });
const BCOL = [0xf0b27a, 0xe8d28a, 0xd98c8c, 0xa9d1a0, 0xa8c4e8, 0xe0a8d8];
for (let i = -6; i <= 6; i++) { const h = 4 + Math.floor(hash(i + 20) * 5) * 1.3, wd = 4.8, bz = -8.2; W.add(box(wd, h, 4, tm(BCOL[(i + 6) % 6], { map: WIN }), i * 5.1, h / 2, bz)); addSolidCentered('bld' + i, i * 5.1, h / 2, bz, wd, h, 4); }
for (let i = -3; i <= 3; i++) { const h = 3 + Math.floor(hash(i + 50) * 3) * 1.4; W.add(box(5, h, 4, tm(BCOL[(i + 9) % 6], { map: WIN }), i * 6.4, h / 2, 9.5)); addSolidCentered('bldF' + i, i * 6.4, h / 2, 9.5, 5, h, 4); }
const POLES = [];
for (let i = -6; i <= 6; i++) { const x = i * 4.6, g = new THREE.Group(); g.add(cyl(0.05, 0.05, 3.2, tm(0x33333a), 0, 1.6, 0, 8)); g.add(box(0.3, 0.8, 0.26, tm(0x22222a), 0, 3.3, 0.16, 0.04));
  const gr = sph(0.11, tm(0x3cff6a, { unlit: 1, noInk: 1 }), 0, 3.5, 0.3, 8, 6), rd = sph(0.11, tm(0xff3a2a, { unlit: 1, noInk: 1 }), 0, 3.5, 0.3, 8, 6); rd.visible = false; g.add(gr, rd);
  g.position.set(x, 0, -1.95); W.add(g); POLES.push({ gr, rd, i }); addSolidCentered('pole' + i, x, 1.6, -1.95, 0.25, 3.2, 0.25); }
{ const g = new THREE.Group(); g.add(cyl(0.05, 0.05, 2.6, tm(0x33333a), 0, 1.3, 0, 8)); g.add(card(1.5, 0.4, (c, w, h) => { c.fillStyle = '#1d7a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#fff'; c.font = '900 52px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MAIN STREET', w / 2, h / 2 + 3); }, { unlit: 0.6 })); g.children[1].position.set(0, 2.6, 0.06); g.position.set(-6.2, 0, -2.3); W.add(g); addSolidCentered('mainsign', -6.2, 1.3, -2.3, 0.2, 2.6, 0.2); }
for (const [x, z, s] of [[-12, -4.6, 1], [-3.5, -4.6, 0.9], [7, -4.6, 1.1], [12, -4.6, 1], [-9, 4.6, 1], [8, 4.8, 1.05]]) { const tr = makeTree(3 + 5 * ((Math.abs(Math.round(x * 3 + z)) % 9)), s); tr.position.set(x, 0, z); W.add(tr); }
// plan board (the mayor's "perfect road system")
{ const g = new THREE.Group(); g.add(card(1.7, 1.15, (c, w, h) => { c.fillStyle = '#2b5fa8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 7; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * w / 6, 20); c.lineTo(i * w / 6, h - 20); c.stroke(); c.beginPath(); c.moveTo(20, i * h / 6); c.lineTo(w - 20, i * h / 6); c.stroke(); } c.fillStyle = '#7dff8a'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(60 + (i % 4) * 110, 70 + Math.floor(i / 4) * 95, 15, 0, 7); c.fill(); } }, { unlit: 0.5 })); g.children[0].position.y = 1.35;
  g.add(box(0.08, 1.5, 0.08, tm(0x6b4a2a), -0.7, 0.75, -0.1), box(0.08, 1.5, 0.08, tm(0x6b4a2a), 0.7, 0.75, -0.1)); g.position.set(-3.7, 0, -3.1); g.rotation.y = 0.25; W.add(g); addSolidCentered('board', -3.7, 1, -3.1, 1.8, 2.0, 0.3); }
// ---------- cars: lanes, jam slots (stateless positions) ----------
const VCAR = 3.2, CC = [0xe5453a, 0x3a7be5, 0xf0c040, 0x6ac25a, 0xb050e0, 0xff8a30, 0xf2f2f2, 0x2ec4b6, 0xe07aa0, 0x5a5ae0, 0x9acd32, 0xffb347];
const LANE = [];
function lane(dir, z, k0, n, Fs, ts1, tag) {
  for (let k = k0; k < k0 + n; k++) { const car = makeCar(CC[(k * 5 + tag) % CC.length]); car.rotation.y = dir > 0 ? 0 : Math.PI; W.add(car); LANE.push({ car, dir, z, F: Fs - 3.7 * k, ts: ts1 + 1.4 * (k - k0), k, jam: true }); } }
lane(1, -0.85, 1, 11, 3.0, 9.8, 0); lane(-1, 0.85, 0, 11, 3.0, 11.6, 3);
for (const [dir, z, xo] of [[1, -0.85, 9], [1, -0.85, 19], [1, -0.85, 29], [-1, 0.85, -9], [-1, 0.85, -19], [-1, 0.85, -29]]) { const car = makeCar(CC[(Math.abs(xo) + 2) % CC.length]); car.rotation.y = dir > 0 ? 0 : Math.PI; W.add(car); LANE.push({ car, dir, z, xo, jam: false }); }
function updateCars(t) {
  const city = (t < 16 || (t >= 43.6 && t < 45.4));
  for (const c of LANE) {
    let x; if (c.jam) { const gone = t >= 43.5; x = c.F - VCAR * Math.max(0, c.ts - t); const moving = t < c.ts; x = c.dir * x; c.car.visible = city && !gone && Math.abs(x) < 48; c.car.position.set(x, moving ? 0 : 0.03 * Math.abs(Math.sin(t * 9 + c.k * 2)), c.z); c.car.rotation.z = moving ? 0 : 0.02 * Math.sin(t * 11 + c.k); }
    else { x = c.dir * (c.xo + VCAR * t); c.car.visible = city && Math.abs(x) < 34 && t < 43.5; c.car.position.set(x, 0, c.z); }
  }
}
// delivery vans (after the fix the road is clear)
const VANS = []; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.add(makeCar([0x2d6cdf, 0xf5a623, 0x34c26b, 0xe5453a, 0xb050e0][i])); g.add(box(1.9, 1.15, 1.55, tm(0xffffff), -0.75, 1.55, 0, 0.1)); g.add(box(1.5, 0.45, 0.04, tm([0x2d6cdf, 0xf5a623, 0x34c26b, 0xe5453a, 0xb050e0][i]), -0.75, 1.55, 0.8)); g.add(box(1.5, 0.45, 0.04, tm([0x2d6cdf, 0xf5a623, 0x34c26b, 0xe5453a, 0xb050e0][i]), -0.75, 1.55, -0.8)); W.add(g); VANS.push(g); }
function updateVans(t) { VANS.forEach((g, i) => { const on = t >= 43.55 && t < 45.45; g.visible = on; const lane1 = i % 2 === 0; const x = (lane1 ? -22 + i * 5.5 : 20 - i * 5.5) + (lane1 ? 1 : -1) * 9 * (t - 43.5); g.position.set(x, 0, lane1 ? -0.85 : 0.85); g.rotation.y = lane1 ? 0 : Math.PI; }); }
// parade float (the mayor gets stuck in his own parade)
const FLT = new THREE.Group(); W.add(FLT); FLT.add(box(2.6, 0.5, 1.5, tm(0xd04a8c), 3.0, 0.25, -0.85, 0.06)); FLT.add(box(2.7, 0.08, 1.6, tm(0xfff0c0), 3.0, 0.52, -0.85)); addSolidCentered('float', 3.0, 0.25, -0.85, 2.6, 0.5, 1.5);
for (const x of [1.75, 4.25]) FLT.add(cyl(0.05, 0.05, 3.6, tm(0x6b4a2a), x, 1.8, -1.45, 8));
FLT.add(card(2.7, 0.7, (g, w, h) => { g.fillStyle = '#7a1a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f0c040'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#f0c040'; g.font = '900 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MAYOR\'S PERFECT ROADS', w / 2, h / 2 + 2); }, { unlit: 0.5 })); FLT.children[FLT.children.length - 1].position.set(3.0, 3.35, -1.45);
const BAL = []; for (let i = 0; i < 6; i++) { const m = sph(0.28, tm([0xff4a5a, 0x4ac8ff, 0xffd84a, 0x7dff8a, 0xff8ae6, 0xff9a3a][i], { noInk: 0 }), 1.9 + i * 0.5, 3.9 + (i % 2) * 0.4, -0.5 - (i % 3) * 0.35, 12, 9); FLT.add(m); BAL.push(m); }
const CONF = []; const CCOL = [0xff4a5a, 0x4ac8ff, 0xffd84a, 0x7dff8a, 0xff8ae6]; for (let i = 0; i < 40; i++) { const m = box(0.09, 0.02, 0.06, tm(CCOL[i % 5], { unlit: 1, noInk: 1 })); W.add(m); CONF.push(m); }
function updateParade(t) { const on = t >= 13.2 && t < 16.0; FLT.visible = t >= 12.9 && t < 16.0; BAL.forEach((m, i) => { m.position.y = 3.9 + (i % 2) * 0.4 + 0.12 * Math.sin(t * 2.2 + i); });
  CONF.forEach((m, i) => { m.visible = on; if (!on) return; const ph = (t * 1.5 + hash(i * 5) * 4) % 4; m.position.set(3 + (hash(i) - 0.5) * 4.4 + 0.3 * Math.sin(t * 3 + i), 4.4 - ph * 1.05, -0.85 + (hash(i * 9) - 0.5) * 1.8); m.rotation.set(t * 4 + i, t * 3, 0); }); }
function updatePoles(t) { const green = t < 10.2 || t > 43.4; for (const p of POLES) { const blink = Math.sin(t * 7 + p.i) > 0; p.gr.visible = green; p.rd.visible = !green && (t < 11 || blink || t > 14); } }
// ---------- PARK (x≈80): picnic blanket + the mayor's sandwich, ant hill, two roads ----------
const BLK = ctex(256, 256, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#e8402f' : '#fff4e0'; g.fillRect(x * 32, y * 32, 32, 32); } });
W.add(box(3.4, 0.03, 3.2, tm(0xffffff, { map: BLK }), 77.6, 0.015, 0.2));
const SAND = new THREE.Group(); SAND.add(box(1.1, 0.14, 0.8, tm(0xe8c27a), 0, 0.1, 0, 0.05), box(1.14, 0.05, 0.84, tm(0xf08a8a), 0, 0.2, 0, 0.02), box(1.18, 0.05, 0.86, tm(0x7dd05a), 0, 0.25, 0, 0.02), box(1.1, 0.14, 0.8, tm(0xe8c27a), 0, 0.34, 0, 0.05)); SAND.add(box(0.06, 0.3, 0.06, tm(0xf0f0f0), 0.3, 0.5, 0.1), sph(0.07, tm(0xff3a3a), 0.3, 0.7, 0.1, 8, 6)); SAND.position.set(77.7, 0, 0.2); W.add(SAND); addSolidCentered('sandwich', 77.7, 0.2, 0.2, 1.2, 0.4, 0.9, { people: true, cam: true });
const HILL = new THREE.Group(); HILL.add(cyl(0.25, 1.15, 1.0, tm(0x9a6a3a), 0, 0.5, 0, 16)); HILL.add(sph(0.3, tm(0x120c0a), -0.9, 0.26, 0, 10, 8)); HILL.position.set(85.6, 0, 0.2); W.add(HILL); addSolidCentered('anthill', 85.6, 0.5, 0.2, 2.1, 1.0, 2.1);
for (let i = 0; i < 14; i++) { const x = 70 + hash(i) * 30, z = (hash(i + 30) < 0.5 ? -1 : 1) * (4 + hash(i + 9) * 4); const fl = new THREE.Group(); fl.add(cyl(0.02, 0.02, 0.35, tm(0x3a8a3a), 0, 0.17, 0, 6), sph(0.1, tm([0xff6a8a, 0xffd84a, 0xffffff, 0xb08aff][i % 4]), 0, 0.38, 0, 8, 6)); fl.position.set(x, 0, z); W.add(fl); }
for (const [x, z, s] of [[74, -7, 1.2], [90, -8, 1.1], [96, 5, 1], [68, 8, 1.2], [80, -9.5, 1.4]]) { const tr = makeTree(Math.round(x + z * 3), s); tr.position.set(x, 0, z); W.add(tr); }
for (const [x, z, r] of [[82.4, -1.5, 0.35], [80.2, 2.2, 0.28], [86.8, 2.6, 0.4]]) { const rk = sph(r, tm(0x9a9aa4), x, r * 0.5, z, 8, 6); rk.scale.y = 0.65; W.add(rk); addSolidCentered('rock' + x, x, r * 0.3, z, r * 1.8, r * 0.7, r * 1.8); }
// a tiny "no lights" traffic light that does nothing
{ const g = new THREE.Group(); g.add(cyl(0.04, 0.04, 1.4, tm(0x33333a), 0, 0.7, 0, 8), box(0.22, 0.55, 0.2, tm(0x22222a), 0, 1.5, 0, 0.03)); for (let i = 0; i < 3; i++) g.add(sph(0.065, tm(0x3a3a40), 0, 1.68 - i * 0.18, 0.1, 8, 6)); g.position.set(80.4, 0, 1.9); W.add(g); addSolidCentered('deadlight', 80.4, 0.7, 1.9, 0.3, 1.5, 0.3); }
const BF = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); const a = box(0.16, 0.01, 0.12, tm([0xffa04a, 0xff6a9a, 0x6ad0ff, 0xffe04a][i], { noInk: 1, side: THREE.DoubleSide }), 0, 0, 0.07), b = box(0.16, 0.01, 0.12, tm([0xffa04a, 0xff6a9a, 0x6ad0ff, 0xffe04a][i], { noInk: 1, side: THREE.DoubleSide }), 0, 0, -0.07); g.add(a, b); g.userData = { a, b }; W.add(g); BF.push(g); }
// ---------- the two roads ----------
const CS = new THREE.CatmullRomCurve3([V(84.5, 0, 0.2), V(78.9, 0, 0.2)]), CL = new THREE.CatmullRomCurve3([V(84.5, 0, 0.2), V(83.6, 0, -1.7), V(81.9, 0, -3.5), V(80.0, 0, -3.3), V(79.2, 0, -1.6), V(78.9, 0, 0.2)], false, 'catmullrom', 0.5);
const LS = CS.getLength(), LL = CL.getLength(), AV = 1.4;
const DOTM = tm(0xa6ff3c, { unlit: 1, noInk: 1 }), NS = 30, NL = 44, DS = [], DL = [];
for (let i = 0; i < NS; i++) { const m = cyl(0.085, 0.085, 0.02, DOTM, 0, 0.012, 0, 10); const p = CS.getPointAt((i + 0.5) / NS); m.position.set(p.x, 0.012, p.z); W.add(m); DS.push(m); }
for (let i = 0; i < NL; i++) { const m = cyl(0.085, 0.085, 0.02, DOTM, 0, 0.012, 0, 10); const p = CL.getPointAt((i + 0.5) / NL); m.position.set(p.x, 0.012, p.z); W.add(m); DL.push(m); }
function updateDots(t) {
  const lvlS = t < 3.4 ? 1 : 0.4 + 0.6 * sstep(19.3, 24.0, t), rev = 1 - (t - 17.9) * 3.0 / LS, lvlL = t < 19 ? 0 : 0.55 * (1 - sstep(22.6, 26.0, t));
  DS.forEach((m, i) => { const u = (i + 0.5) / NS; const on = (t < 3.4) || (t >= 17.9 && u > rev); const k = on ? lvlS : 0; m.scale.setScalar(k > 0.03 ? (0.25 + 0.95 * k) * (1 + 0.1 * Math.sin(t * 6 + i)) : 0.001); });
  DL.forEach((m, i) => { const u = (i + 0.5) / NL; const on = t >= 19 && u < (t - 19) / 1.2; const k = on ? lvlL : 0; m.scale.setScalar(k > 0.03 ? (0.25 + 0.95 * k) * (1 + 0.1 * Math.sin(t * 6 + i)) : 0.001); });
}
// road paint dashes (engineer paints where the ants walk)
const DASH = []; for (let i = 0; i < 9; i++) { const m = box(0.5, 0.02, 0.14, tm(0xfff2a0, { unlit: 0.8 }), 83.7 - i * 0.6, 0.012, 0.2); m.visible = false; W.add(m); DASH.push(m); }
// ---------- ants ----------
const ANTM = tm(0x2a1c18), ANTM2 = tm(0x3b2a22), EYEW = tm(0xffffff, { noInk: 1 }), PUP = tm(0x111111, { noInk: 1 }), CRUMB = tm(0xf1d9a0);
function makeAnt(hero = false) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  inner.add(sph(0.11, ANTM, -0.18, 0.17, 0, 10, 8), sph(0.07, ANTM2, -0.02, 0.17, 0, 10, 8), sph(0.09, ANTM, 0.14, 0.2, 0, 10, 8));
  for (const z of [0.045, -0.045]) { inner.add(sph(0.032, EYEW, 0.2, 0.25, z, 8, 6)); inner.add(sph(0.016, PUP, 0.228, 0.25, z, 6, 5)); }
  const legs = []; for (const dx of [-0.09, 0.0, 0.08]) { const l = box(0.022, 0.022, 0.36, ANTM, dx, 0.1, 0); inner.add(l); legs.push(l); }
  for (const z of [0.05, -0.05]) { const a = box(0.12, 0.016, 0.016, ANTM, 0.22, 0.34, z); a.rotation.z = 0.5; inner.add(a); }
  const crumb = box(0.13, 0.08, 0.12, CRUMB, -0.02, 0.33, 0, 0.02); inner.add(crumb);
  g.scale.setScalar(hero ? 1.45 : 1); g.userData = { inner, legs, crumb, hero }; W.add(g); return g;
}
function putAnt(a, curve, u, dir, t, ph, carry, sc = 1) {
  const p = curve.getPointAt(clamp(u, 0, 1)), tg = curve.getTangentAt(clamp(u, 0, 1)); a.visible = sc > 0.01;
  a.position.set(p.x, 0, p.z); a.rotation.y = Math.atan2(-tg.z * dir, tg.x * dir); const d = a.userData, hs = d.hero ? 1.45 : 1; a.scale.setScalar(hs * sc);
  d.legs.forEach((l, i) => { l.rotation.y = 0.5 * Math.sin(t * 15 + ph + i * 2.1); }); d.inner.position.y = 0.012 * Math.sin(t * 15 + ph); d.crumb.visible = carry;
}
const ANTS_S = [], ANTS_L = [], ANTS_F = []; for (let i = 0; i < 28; i++) ANTS_S.push(makeAnt()); for (let i = 0; i < 10; i++) ANTS_L.push(makeAnt()); for (let i = 0; i < 8; i++) ANTS_F.push(makeAnt());
const HERO = makeAnt(true); const HERO_POS = V(79, 0, 0.2);
function cyc(curve, L, t, T0, ant, i, sc = 1) { const c = frac((t - T0) * AV / (2 * L)); const out = c < 0.5; const u = out ? 2 * c : 2 - 2 * c; putAnt(ant, curve, u, out ? 1 : -1, t, i * 1.7, !out, sc); }
function updateAnts(t) {
  const park = t < 3.4 || (t >= 16 && t < 43.7); ANTS_S.concat(ANTS_L, ANTS_F, [HERO]).forEach((a) => { a.visible = false; });
  if (park) {
    ANTS_S.forEach((a, i) => { let on, T0, sc = 1; if (t < 3.4) { on = i < 24; T0 = -i * 0.55; } else if (i < 7) { on = true; T0 = -i * 1.1; } else { T0 = 25 + (i - 7) * 0.14; on = t >= T0; sc = Math.min(1, (t - T0) / 0.3); } if (on) cyc(CS, LS, t, T0, a, i, sc); });
    if (t >= 16) ANTS_L.forEach((a, j) => { const off = 25.2 + j * 0.3; if (t < off + 0.3) cyc(CL, LL, t, -j * 1.2, a, j + 40, Math.min(1, (off + 0.3 - t) / 0.3)); });
    // the hero ant
    if (t >= 16 && t < 17.2) { const k = Ks(16, 17.2, t); const u = 0.985 - 0.0 * k; const p = V(78.6 - 0.4 * (1 - k), 0, -1.0 + 1.2 * k); HERO.visible = true; HERO.position.copy(p); HERO.rotation.y = Math.atan2(-(1.2), -0.4 * -0.0 + 0.0001) + 0; HERO.rotation.y = -Math.atan2(1.2, 0.01) + 0; HERO.scale.setScalar(1.45); HERO.userData.legs.forEach((l, i) => { l.rotation.y = 0.5 * Math.sin(t * 15 + i * 2.1); }); HERO.userData.crumb.visible = false; HERO.userData.inner.position.y = 0.012 * Math.sin(t * 15); }
    else if (t >= 17.2 && t < 17.9) { HERO.visible = true; HERO.position.set(78.9, 0.09 * Math.abs(Math.sin((t - 17.2) * 9)), 0.2); HERO.rotation.y = Math.PI; HERO.scale.setScalar(1.45); HERO.userData.crumb.visible = t > 17.6; }
    else if (t >= 17.9 && t < 21.8) { const u = 1 - (t - 17.9) * AV / LS; putAnt(HERO, CS, u, -1, t, 0, true); }
    else if (t >= 21.8) cyc(CS, LS, t, 21.8, HERO, 99);
    if (HERO.visible) HERO_POS.set(HERO.position.x, 0.2, HERO.position.z);
  }
  // final: ants lead the mayor home
  const fin = t >= 45.35; ANTS_F.forEach((a, i) => { if (!fin) return; const x = 75.0 - 2.4 * (t - 45.4) - 0.55 * i; const sc = x > 70.9 ? 1 : Math.max(0, 1 - (70.9 - x) / 0.5); putAnt(a, new THREE.LineCurve3(V(x, 0, 0.3), V(x - 1, 0, 0.3)), 0, 1, t, i * 1.3, i % 2 === 0, sc); a.position.set(x, 0, 0.3 + 0.1 * Math.sin(i)); a.rotation.y = Math.PI; });
}
// house at the end of the road
const HOUSE = new THREE.Group(); HOUSE.add(box(5, 3, 4.2, tm(0xf0d6a0), 0, 1.5, 0, 0.08)); { const roof = cyl(0.01, 3.9, 1.5, tm(0xc0543e), 0, 3.75, 0, 4); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.85; HOUSE.add(roof); }
HOUSE.add(box(0.1, 1.9, 0.95, tm(0x7a4a2a), 2.5, 0.95, 0.3), box(0.06, 0.9, 0.9, tm(0xa8d8ff), 2.5, 1.9, -1.2), box(0.06, 0.9, 0.9, tm(0xa8d8ff), 2.5, 1.9, 1.6)); HOUSE.position.set(68.2, 0, 0.0); W.add(HOUSE); addSolidCentered('house', 68.2, 1.5, 0, 5, 3, 4.2);
// ---------- CAST: mayor, engineer, reporter (new for this video) ----------
const MAY = makeCast(W, 'mayor', { hits: [[9.7, 'take', 1], [11.45, 'jolt', 0.9], [13.4, 'double', 1], [15.2, 'jolt', 1], [45.9, 'double', 0.8]], loops: [[14.4, 15.9, 'rage'], [47.0, 47.6, 'bob']], marks: [['!', 11.45, 12.3], ['x', 14.4, 15.9]] });
const ENG = makeCast(W, 'engineer', { hits: [[9.8, 'shake', 0.8], [29.4, 'take', 1], [33.9, 'jolt', 0.6]], loops: [[40.7, 42.4, 'nod']], marks: [['!', 29.4, 30.1]] });
const REP = makeCast(W, 'reporter', { hits: [[9.7, 'take', 1], [12.0, 'jolt', 0.9], [43.9, 'jolt', 0.7]], loops: [[13.4, 14.8, 'laugh'], [44.3, 45.3, 'bob']], marks: [['!', 9.7, 10.5], ['!', 12.0, 12.8]] });
const ALL = [MAY, ENG, REP];
const beats = (arr) => arr.map(([t, emo, tr]) => ({ t, emo, trans: tr ?? 0.12 }));
const PERF = new Map([
  [MAY, new Performer(1, { intensity: 1.6, auto: false }).beats(beats([[0, 'proud'], [3.5, 'proud'], [5.5, 'smug'], [6.3, 'joy'], [8.6, 'smug'], [9.6, 'curious'], [10.3, 'worried'], [11.4, 'shock', 0.06], [12.4, 'angry'], [13.4, 'worried'], [14.4, 'angry'], [15.3, 'sad'], [45.4, 'curious'], [46.2, 'happy'], [47.0, 'joy']]))],
  [ENG, new Performer(2, { intensity: 1.6, auto: false }).beats(beats([[0, 'proud'], [3.5, 'happy'], [8.6, 'smug'], [9.6, 'worried'], [11.4, 'shock', 0.06], [13.4, 'worried'], [28.6, 'curious'], [29.4, 'shock', 0.06], [30.0, 'determined'], [31.0, 'happy'], [32.4, 'joy'], [34.0, 'smug'], [37.8, 'proud'], [40.6, 'happy']]))],
  [REP, new Performer(3, { intensity: 1.6, auto: false }).beats(beats([[0, 'curious'], [9.7, 'shock', 0.06], [10.6, 'worried'], [11.5, 'panic'], [12.3, 'angry'], [13.4, 'laugh'], [43.6, 'happy'], [44.5, 'joy']]))]]);
function pose(Pp, t, extra, walking = false) { const p = toonify({ ...PERF.get(Pp).at(t, { handsFree: true, walking }), t }, Pp, t); if (extra) extra(p); return p; }
const UP = (p, t, ph = 0) => { p.armL = { f: 120 + 15 * Math.sin(t * 13 + ph), o: -70, b: 10 }; p.armR = { f: 120 + 15 * Math.sin(t * 13 + ph + 1.3), o: -70, b: 10 }; };
// paint roller the engineer pushes along the ground
const ROLL = new THREE.Group(); { const r = cyl(0.07, 0.07, 0.34, tm(0xfff2a0), 0, 0, 0, 12); r.rotation.x = Math.PI / 2; ROLL.add(r); ROLL.add(box(0.03, 0.03, 0.4, tm(0x33333a), 0, 0, 0)); } W.add(ROLL);
const ROLLP = V();
function setup(f) {
  const t = f / FPS; const city = t < 16 || (t >= 43.6 && t < 45.4);
  // MAYOR: sidewalk (plan) -> parade float -> park (final)
  MAY.root.visible = t < 16 || t >= 45.35;
  if (t < 13.2) { MAY.root.position.set(-1.4, 0, -2.7); MAY.root.rotation.y = 0.15; MAY.update(pose(MAY, t, (p) => { if (t > 5.0 && t < 6.4) { p.armR = { f: 85, o: 20, b: 10 }; } if (t > 6.3 && t < 7.2) UP(p, t); if (t > 11.4 && t < 12.6) { p.armL = { f: 60, o: -30, b: 10 }; p.armR = { f: 60, o: -30, b: 10 }; } })); }
  else if (t < 16) { MAY.root.position.set(3.0, 0.5, -0.85); MAY.root.rotation.y = 0.0; MAY.update(pose(MAY, t, (p) => { if (t > 14.4) { p.armL = { f: 130, o: -60, b: 10 }; p.armR = { f: 130, o: -60, b: 10 }; } else { p.armR = { f: 90, o: -50, b: 10 }; } })); }
  else if (t >= 45.35) { const d = Math.max(0, t - 45.4), x = Math.max(72.4, 77.0 - 2.4 * d), walking = x > 72.45; MAY.root.position.set(x, 0, 0.3); MAY.root.rotation.y = walking ? -Math.PI / 2 : -Math.PI / 2 + 0.5; MAY.update(pose(MAY, t, (p) => { if (walking) { p.walk = d * 1.7; p.walkK = 1; p.gait = 1; p.cyc = 0.75; } else UP(p, t); }, walking)); }
  // ENGINEER: sidewalk (city) -> park (paints the road)
  ENG.root.visible = t < 16 || (t >= 28.6 && t < 43.6);
  if (t < 16) { ENG.root.position.set(0.0, 0, -2.7); ENG.root.rotation.y = -0.1; ENG.update(pose(ENG, t, (p) => { if (t > 11.4 && t < 12.5) { p.armL = { f: 70, o: -20, b: 10 }; } })); }
  else if (t >= 28.6) {
    const w0 = 30.0, w1 = 34.0, d = clamp((t - w0) / (w1 - w0), 0, 1), xe = 83.4 - 4.3 * d, walking = t > w0 && t < w1;
    ENG.root.position.set(t < w0 ? 83.4 : t < w1 ? xe : 79.1, 0, 1.15); ENG.root.rotation.y = t < w0 ? -1.3 : t < w1 ? -Math.PI / 2 : -2.0;
    ENG.update(pose(ENG, t, (p) => { if (walking) { p.walk = (t - w0) * 1.0; p.walkK = 1; p.gait = 1; p.cyc = 0.75; if (t > 30.9) { ROLLP.set(xe - 0.15, 0.3, 0.5); p.handR = { w: ROLLP.clone(), k: 1 }; p.reachAssist = false; } } else if (t < w0 && t > 29.3) { p.handL = { w: V(83.5, 1.75, 1.15), k: 1 }; } else if (t >= w1) { if (t < 34.6) UP(p, t); } }, walking));
  }
  // REPORTER
  REP.root.visible = t < 16 || (t >= 43.6 && t < 45.4);
  if (t < 16) { REP.root.position.set(1.8, 0, 2.8); REP.root.rotation.y = Math.PI; REP.update(pose(REP, t)); } else if (REP.root.visible) { REP.root.position.set(2.2, 0, 2.7); REP.root.rotation.y = Math.PI - 0.4; REP.update(pose(REP, t, (p) => { UP(p, t, 2); })); }
  // roller + paint
  const painting = t > 30.9 && t < 34.0; ROLL.visible = painting; if (painting) ROLL.position.copy(ROLLP);
  const xe2 = 83.4 - 4.3 * clamp((t - 30) / 4, 0, 1); DASH.forEach((m, i) => { m.visible = t >= 3.4 && ((t > 30.9 && 83.7 - i * 0.6 > xe2 - 0.2) || t >= 34.0) && t < 43.7; });
  // butterflies
  BF.forEach((b, i) => { const a = t * (0.5 + i * 0.12) + i * 1.9; b.position.set(80 + 5 * Math.cos(a) + i * 1.5, 0.9 + 0.3 * Math.sin(a * 2.1), -2 + 4 * Math.sin(a)); b.rotation.y = -a; const fl = 0.9 * Math.sin(t * 22 + i); b.userData.a.rotation.x = fl; b.userData.b.rotation.x = -fl; b.visible = (t < 3.4 || (t >= 16 && t < 43.7)); });
  updateCars(t); updateVans(t); updateParade(t); updatePoles(t); updateDots(t); updateAnts(t);
  return { t };
}
// ---------- SIGNS (popped on the words) ----------
const SY = (x, y, z) => V(x, y, z), heroUp = (dy = 0.75) => () => HERO_POS.clone().add(V(0, dy, 0));
sign('SHORTEST ROAD', 2.3, 3.3, SY(81.7, 1.2, 0.2), 2.4);
sign('HONKFORD', 3.55, 4.5, SY(-1, 3.4, -2.2), 2.3, { bg: '#7dd0ff' });
sign('40 LIGHTS', 6.3, 7.5, SY(0, 3.9, -1.9), 1.9, { bg: '#7dff8a' });
sign('ZERO JAMS!', 7.5, 8.9, SY(0, 2.7, 0), 2.1, { bg: '#7dff8a' });
sign('DAY 1', 9.6, 10.6, SY(-2.5, 2.8, 0), 1.3, { bg: '#ff9a4a' }); sign('JAM!', 10.5, 11.4, SY(-6, 3.4, 0), 1.2, { bg: '#ff5a4a', fg: '#fff' });
sign('DAY 2', 11.5, 12.5, SY(-1, 3.0, 0), 1.3, { bg: '#ff9a4a' }); sign('DAY 3', 13.4, 14.4, SY(3, 4.6, -0.85), 1.5, { bg: '#ff9a4a' });
[[10.5, -3.3], [10.9, -7, ], [11.8, 4.5], [12.2, -9.5], [12.6, 7], [13.0, -13], [13.4, 10.5], [13.8, -16]].forEach(([tt, x], i) => sign('BEEP!', tt, tt + 0.55, SY(x, 1.8 + (i % 2) * 0.3, i % 2 ? 0.85 : -0.85), 0.95, { bg: '#fff', fg: '#e5322a' }));
sign('MAYOR\'S SANDWICH', 16.2, 17.3, SY(77.7, 1.7, 0.2), 2.4);
sign('!', 17.2, 17.9, heroUp(0.6), 0.5, { bg: '#ff5a4a', fg: '#fff', h: 0.55 }); sign('SCENT TRAIL', 19.0, 19.9, heroUp(0.7), 1.7, { bg: '#c8ff6a' });
sign('SHORT ROAD', 19.95, 21.3, SY(81.7, 1.1, 0.2), 2.0, { bg: '#7dff8a' }); sign('FAST = STRONG', 21.5, 22.9, SY(80.8, 0.9, 0.2), 2.2, { bg: '#c8ff6a' });
sign('LONG ROAD', 22.9, 24.0, SY(81.0, 1.2, -3.3), 2.0, { bg: '#ffb06a' }); sign('LATE = FADES', 24.1, 25.3, SY(81.0, 1.0, -3.3), 2.2, { bg: '#ffb06a' });
sign('NO BOSS', 27.6, 28.4, SY(82.2, 1.5, 0.2), 1.7, { bg: '#ff6a6a', fg: '#fff' }); sign('NO LIGHTS', 28.45, 29.2, SY(80.4, 2.1, 1.9), 1.7, { bg: '#ff6a6a', fg: '#fff' });
sign('?', 29.4, 30.2, () => ENG.headWorld().add(V(0, 0.75, 0)), 0.55, { bg: '#fff', h: 0.6 }); sign('PAINT!', 32.0, 33.2, () => ENG.headWorld().add(V(0, 0.8, 0)), 1.2, { bg: '#fff2a0' });
sign('WHY?', 34.2, 35.0, heroUp(0.8), 1.0, { bg: '#fff' }); sign('SMELLS ONLY HERE', 35.2, 37.1, heroUp(0.85), 2.6, { bg: '#c8ff6a' });
sign('STRONGEST SMELL', 37.5, 39.3, SY(81.7, 1.2, 0.2), 2.7, { bg: '#c8ff6a' }); sign('EVERYONE PICKS IT', 39.5, 40.6, SY(81.7, 1.3, 0.2), 3.0, { bg: '#7dff8a' });
sign('TINY CHOICES', 40.65, 41.55, SY(81.7, 1.2, -0.3), 2.2, { bg: '#ffe14a' }); sign('SMART CROWD', 41.6, 42.5, SY(81.7, 1.3, 0.2), 2.4, { bg: '#ffe14a' });
sign('SWARM INTELLIGENCE', 42.6, 43.7, SY(82.4, 1.5, 0.2), 3.6, { bg: '#ff7ad9', fg: '#fff' });
sign('DELIVERY TRUCKS', 44.0, 45.3, SY(0, 3.0, 0), 2.6, { bg: '#7dd0ff' });
// ---------- CAMERA: ~58 shots, every shot moves; cuts only when the place changes ----------
const CINE = new Cine({ blend: 0.32 }); const HP = (m) => () => m.headWorld(); const hp = () => HERO_POS.clone();
const SH = [
  [0, 1.0, { rig: 'fly', path: [[90, 4.5, 6.5], [86.5, 1.6, 3.3]], at: P(84.5, 0.4, 0.2), fov: [40, 34], shake: 0.3, cut: true }],
  [1.0, 2.0, { rig: 'orbit', at: P(82, 0.2, 0.2), size: [1.3, 1.0], az: [75, 20], el: [4, 7], fov: 32, shake: 0.4 }],
  [2.0, 3.4, { rig: 'crane', at: P(81.7, 0, 0.2), size: [2.6, 6.5], az: [-20, 20], el: [12, 68], fov: 34, shake: 0.2 }],
  [3.4, 4.4, { rig: 'fly', path: [[-14, 6.5, 10], [-5, 3.0, 5.5]], at: P(-1, 1.2, -2), fov: [42, 36], shake: 0.3, cut: true }],
  [4.4, 5.5, { rig: 'orbit', at: HP(MAY), size: [1.7, 1.2], az: [-25, 40], el: [8, 6], fov: 32, shake: 0.4 }],
  [5.5, 6.3, { rig: 'push', at: P(-3.0, 1.3, -3.0), size: [4.2, 2.4], az: [10, -10], el: [6, 4], fov: 32, shake: 0.4 }],
  [6.3, 7.4, { rig: 'orbit', at: P(0, 1.6, -1.9), size: [5, 3.2], az: [-70, -15], el: [8, 12], fov: 34, shake: 0.3 }],
  [7.4, 8.6, { rig: 'orbit', at: P(0, 1.1, -1.0), size: [5.6, 4.4], az: [-30, 40], el: [26, 20], fov: 32, shake: 0.4 }],
  [8.6, 9.5, { rig: 'push', at: HP(MAY), size: [1.8, 1.0], az: [-20, -5], el: [6, 3], fov: 30, shake: 0.3, ease: 'snap', fovKick: 4 }],
  [9.5, 10.4, { rig: 'orbit', at: P(-2, 1.0, -1.0), size: [5.2, 4.0], az: [-30, 40], el: [28, 22], fov: 32, shake: 0.8, fovKick: 8 }],
  [10.4, 11.4, { rig: 'push', at: P(-6, 2, -1.5), size: [3, 1.8], az: [30, 10], el: [10, 6], fov: 32, shake: 0.7 }],
  [11.4, 12.2, { rig: 'crane', at: P(-3, 0.4, 0), size: [7, 16], az: [0, 40], el: [15, 70], fov: 36, shake: 0.5, ease: 'snap' }],
  [12.2, 13.3, { rig: 'orbit', at: P(-6, 1.0, 0.0), size: [5.0, 4.0], az: [-50, 10], el: [22, 16], fov: 32, shake: 1.0, fovKick: 8 }],
  [13.3, 14.3, { rig: 'crane', at: P(3.0, 1.9, -0.85), size: [3.4, 2.0], az: [40, -30], el: [30, 8], fov: 34, shake: 0.4 }],
  [14.3, 15.3, { rig: 'orbit', at: HP(MAY), size: [2.6, 2.0], az: [-70, 20], el: [6, 8], fov: 32, shake: 0.8 }],
  [15.3, 16.0, { rig: 'push', at: HP(MAY), size: [2.6, 1.7], az: [15, 5], el: [4, 4], fov: 30, shake: 0.5, ease: 'snap', fovKick: 8 }],
  [16.0, 17.0, { rig: 'crane', at: P(78.4, 0.3, 0.2), size: [3.2, 1.6], az: [30, -30], el: [60, 15], fov: 34, shake: 0.3, cut: true }],
  [17.0, 17.9, { rig: 'push', at: hp, size: [1.1, 0.55], az: [-40, -10], el: [10, 8], fov: 30, shake: 0.5, fovKick: 6 }],
  [17.9, 18.9, { rig: 'orbit', at: hp, size: [0.9, 0.8], az: [-80, 0], el: [8, 10], fov: 32, shake: 0.4 }],
  [18.9, 19.9, { rig: 'push', at: hp, size: [1.0, 0.55], az: [50, 80], el: [30, 22], fov: 30, shake: 0.4 }],
  [19.9, 21.0, { rig: 'crane', at: P(81.7, 0, -1.4), size: [6, 11], az: [0, 20], el: [55, 78], fov: 36, shake: 0.2 }],
  [21.0, 22.0, { rig: 'orbit', at: P(81.7, 0.1, 0.2), size: [1.4, 1.1], az: [90, 40], el: [4, 6], fov: 32, shake: 0.5 }],
  [22.0, 22.9, { rig: 'push', at: P(80.4, 0.05, 0.2), size: [1.2, 0.6], az: [10, -10], el: [25, 18], fov: 30, shake: 0.4 }],
  [22.9, 23.9, { rig: 'crane', at: P(81.0, 0, -3.2), size: [3, 6], az: [-50, 10], el: [20, 60], fov: 34, shake: 0.3 }],
  [23.9, 24.9, { rig: 'orbit', at: P(81.3, 0.1, -3.2), size: [1.6, 1.3], az: [-120, -60], el: [6, 8], fov: 32, shake: 0.4 }],
  [24.9, 26.0, { rig: 'crane', at: P(81.7, 0, -1.4), size: [9, 12], az: [20, -20], el: [55, 75], fov: 36, shake: 0.2 }],
  [26.0, 27.4, { rig: 'orbit', at: P(81.5, 0.1, 0.2), size: [1.6, 1.2], az: [-100, -30], el: [4, 8], fov: 32, shake: 0.5 }],
  [27.4, 28.2, { rig: 'push', at: P(82.3, 0.8, 0.2), size: [2.4, 1.4], az: [60, 40], el: [10, 8], fov: 32, shake: 0.6, ease: 'snap', fovKick: 6 }],
  [28.2, 29.0, { rig: 'orbit', at: P(80.4, 1.0, 1.9), size: [1.8, 1.4], az: [-50, 10], el: [8, 6], fov: 32, shake: 0.4 }],
  [29.0, 30.0, { rig: 'crane', at: HP(ENG), size: [3.0, 1.8], az: [25, -20], el: [45, 8], fov: 34, shake: 0.5, ease: 'snap', fovKick: 6 }],
  [30.0, 31.0, { rig: 'orbit', at: HP(ENG), size: [2.2, 1.6], az: [100, 40], el: [8, 10], fov: 32, shake: 0.4 }],
  [31.0, 32.0, { rig: 'push', at: () => ROLLP.clone().add(V(0, 0.1, -0.2)), size: [1.4, 0.7], az: [-30, -10], el: [30, 18], fov: 30, shake: 0.4 }],
  [32.0, 33.2, { rig: 'orbit', at: () => ENG.root.position.clone().add(V(0, 0.9, 0)), size: [3, 2.2], az: [-100, -30], el: [8, 12], fov: 32, shake: 0.3 }],
  [33.2, 34.2, { rig: 'crane', at: P(81.7, 0, 0.2), size: [3.5, 7], az: [-40, 0], el: [25, 62], fov: 34, shake: 0.2 }],
  [34.2, 35.0, { rig: 'push', at: hp, size: [1.0, 0.5], az: [-30, -10], el: [6, 4], fov: 30, shake: 0.4 }],
  [35.0, 36.0, { rig: 'orbit', at: hp, size: [0.7, 0.55], az: [-70, 30], el: [8, 10], fov: 30, shake: 0.4 }],
  [36.0, 37.2, { rig: 'push', at: () => V(HERO_POS.x, 0.05, HERO_POS.z), size: [1.0, 0.6], az: [20, 0], el: [30, 20], fov: 30, shake: 0.3 }],
  [37.2, 38.4, { rig: 'crane', at: P(81.7, 0.1, 0.2), size: [2.5, 4.5], az: [30, -10], el: [15, 50], fov: 34, shake: 0.3 }],
  [38.4, 39.5, { rig: 'orbit', at: P(80, 0.1, 0.2), size: [1.4, 1.0], az: [-60, 20], el: [5, 8], fov: 32, shake: 0.4 }],
  [39.5, 40.6, { rig: 'crane', at: P(81.7, 0, 0.2), size: [6, 10], az: [0, 50], el: [45, 75], fov: 36, shake: 0.3 }],
  [40.6, 41.5, { rig: 'orbit', at: P(81.7, 0.1, 0.2), size: [1.8, 1.3], az: [100, 160], el: [5, 8], fov: 32, shake: 0.4 }],
  [41.5, 42.6, { rig: 'push', at: P(82, 0.2, 0.2), size: [3.5, 1.8], az: [-20, -5], el: [20, 12], fov: 32, shake: 0.3 }],
  [42.6, 43.7, { rig: 'push', at: P(82.4, 1.3, 0.2), size: [3.8, 2.2], az: [-10, 10], el: [6, 4], fov: 32, shake: 0.7, ease: 'snap', fovKick: 8 }],
  [43.7, 44.6, { rig: 'orbit', at: P(0, 1.0, 0.0), size: [6, 4.8], az: [-30, 20], el: [24, 20], fov: 32, shake: 0.4, cut: true }],
  [44.6, 45.4, { rig: 'orbit', at: P(0, 1.0, 0.0), size: [5.5, 4.2], az: [20, 55], el: [22, 18], fov: 32, shake: 0.4 }],
  [45.4, 46.2, { rig: 'orbit', at: P(73.8, 0.3, 0.4), size: [2.6, 1.8], az: [-30, 50], el: [6, 10], fov: 32, shake: 0.4, cut: true }],
  [46.2, 47.0, { rig: 'push', at: HP(MAY), size: [1.8, 1.0], az: [-40, -20], el: [8, 4], fov: 30, shake: 0.4 }],
  [47.0, 47.7, { rig: 'crane', at: P(71.4, 1.0, 0.3), size: [3, 12], az: [40, -10], el: [10, 48], fov: 34, shake: 0.2 }],
];
SH.forEach(([a, b, s]) => { const big = (a < 3.4 && s.rig !== 'crane' && s.rig !== 'fly') ? 1.9 : (a >= 16 && b <= 43.7 && s.rig !== 'crane' && !(a >= 29 && a < 34.2)) ? 2.1 : 1; if (big !== 1 && s.size) s.size = s.size.map((v) => v * big); CINE.shot(a, b, s); });
const LOOK = mkLook({ sun: [0.5, 0.8, 0.5], lit: '#fff4dc', litK: 1.08, shade: '#a8b4e0', ambSky: '#eef4ff', ambGnd: '#f8f0d8', rim: '#fff0d0', fog: '#dcecff', fogR: [40, 260], sky: ['#2a7ae8', '#6ab6f4', '#cfeaff', '#ffffff'], contrast: 1.05, vig: 0.08, glow: 0.35, sat: 1.2, exposure: 1.05, shadow: 0.8 });
window.renderFrame = function (f) {
  const { t } = setup(f); const cam = guardCam(CINE.at(t)); updateSigns(t, cam); window.__W = W; window.__cam = cam; CAMPOS.set(...cam.pos); for (const Pp of ALL) placeMarks(Pp, t);
  applyLook(LOOK, { shadowCenter: [cam.look[0], 1, cam.look[2]], shadowSize: 14 }); C.skyU.uSunSize.value = 0;
  C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.03, far: 500 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37; dofU.uFade.value = 1 - Math.min(1, t / 0.4) + Math.max(0, (t - (DURATION - 0.6)) / 0.6); dofU.uFlash.value = 0;
  C.drawFrame(); return 'ok';
};
window.ready = true;
