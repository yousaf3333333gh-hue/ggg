// "NIGHT STORY" (rooftop pigeons) : 57 s. Voice = audio/voice_clean.mp3 (55.6 s). Scene times follow the SFX storyboard, snapped to voice pauses.
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph, makeCloud } from '../../web/models.js';
import { mkLook, mixLook, applyLook } from '../../web/looks.js';
import { Terrain, Path, place, EASE, sstep, clamp, lerp, hash } from '../../web/motion.js';
import { Performer, EMOTIONS } from '../../web/perform.js';
import { Cine, T as CT } from '../../web/cine.js';
import { handOnProp, propInHand } from '../../web/props.js';
import { toTex, mkCanvas } from '../../web/tex.js';
import { mergeGeometries } from '../../web/vendor/BufferGeometryUtils.js';
import { makeStickPerson, toonify, placeMarks, CAMPOS } from '../../web/toonkit.js';
for (const [n, base, ex] of [['smug', 'proud', 'smug'], ['grin', 'happy', 'grin'], ['gasp', 'shock', 'gasp'], ['awe', 'curious', 'awe'], ['blank', 'neutral', 'blank'], ['sob', 'cry', 'sob'], ['joyTears', 'happy', 'joyTears'], ['gentle', 'calm', 'gentle']]) EMOTIONS[n] = { ...EMOTIONS[base], expr: ex };
const { stage, dofU, FPS, PX } = C;
export const DURATION = 57.0;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };
const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
// scene boundaries (snapped to pauses in the voice)
const S2 = 5.5, S3 = 14.1, S4 = 22.0, S5 = 30.4, S6 = 41.7, S7 = 50.0;

// ======================= SET: our roof (h 3.6), outside stairs, courtyard, gate, neighbours =======================
const ROOF = 3.6; const T = new Terrain(0);
T.platform({ x: -0.25, z: 0, w: 11.5, d: 10, h: ROOF });
T.stairs({ x: 11.5, z: -4.2, dir: [-1, 0], width: 1.2, n: 20, rise: 0.18, run: 0.3 });
const plaster = tm(0xe8d2b0), plaster2 = tm(0xd8bc98), brickM = tm(0xb8643a), wood = tm(0x6a4428), woodD = tm(0x4a2e1a), stone = tm(0xb0a490);
const roofTex = ctex(256, 256, (g, w, h) => { g.fillStyle = '#c89a72'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,60,40,0.55)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } for (let i = 0; i < 300; i++) { g.fillStyle = hash(i) < 0.5 ? 'rgba(120,80,50,0.25)' : 'rgba(230,190,150,0.25)'; g.fillRect(hash(i + 1) * w, hash(i + 2) * h, 3, 3); } }, true);
W.add(T.buildMeshes((w, h, d, m) => box(w, h, d, m), plaster, plaster2));
W.add(box(11.5, 0.03, 10, tm(0xffffff, { map: roofTex, repeat: [6, 5] }), -0.25, ROOF + 0.015, 0));         // tiles
W.add(box(120, 1, 120, tm(0x9a8a70), 10, -0.5, 0));                                                           // courtyard / street ground
// parapet (0.8 high) with a gap where the stairs arrive (east edge, z -4.8..-3.6) and a LOOSE BRICK at (5.5, -1.0)
const PH = 0.8, PT = 0.22;
W.add(box(11.5, PH, PT, plaster2, -0.25, ROOF + PH / 2, 4.9)); W.add(box(11.5, PH, PT, plaster2, -0.25, ROOF + PH / 2, -4.9)); W.add(box(PT, PH, 10, plaster2, -5.9, ROOF + PH / 2, 0));
W.add(box(PT, PH, 4.7, plaster2, 5.4, ROOF + PH / 2, 2.55)); W.add(box(PT, PH, 1.65, plaster2, 5.4, ROOF + PH / 2, -2.62)); // east wall, hole at z -1.25..-0.75? (filled below)
W.add(box(PT, PH - 0.28, 0.5, plaster2, 5.4, ROOF + (PH - 0.28) / 2, -1.0)); W.add(box(PT, 0.1, 0.5, plaster2, 5.4, ROOF + PH - 0.05, -1.0));  // below & above the brick slot
const BRICK = box(PT * 0.95, 0.17, 0.48, brickM, 0, 0, 0, 0.02); W.add(BRICK); const BRICK_P = V(5.4, ROOF + PH - 0.19, -1.0);
W.add(box(PT, 0.17, 0.48, tm(0x2a1e16), 5.5, ROOF + PH - 0.19, -1.0));                                       // dark back of the slot
// stairs railing (north side of the stairs)
{ const top = (x) => (11.5 - x) / 0.3 * 0.18; for (let x = 5.8; x <= 11.6; x += 1.0) W.add(box(0.06, 0.9, 0.06, woodD, x, top(x) + 0.45, -3.55));
  const rail = box(6.6, 0.07, 0.08, wood, 8.6, 0, -3.55); rail.position.y = top(8.6) + 0.92; rail.rotation.z = -Math.atan2(0.18, 0.3); W.add(rail); }
// courtyard walls + wooden GATE (east wall x = 14.5, opening z -0.8..0.8)
W.add(box(0.3, 2.4, 6.4, plaster, 14.5, 1.2, -4.0)); W.add(box(0.3, 2.4, 6.4, plaster, 14.5, 1.2, 4.0)); W.add(box(0.3, 0.5, 1.6, plaster, 14.5, 2.65, 0)); W.add(box(9, 2.4, 0.3, plaster, 10, 1.2, 7.1)); W.add(box(9, 2.4, 0.3, plaster, 10, 1.2, -7.1));
const GATE = new THREE.Group(); GATE.position.set(14.5, 0, -0.78); W.add(GATE);
for (let i = 0; i < 5; i++) GATE.add(box(0.06, 2.1, 0.3, i % 2 ? wood : woodD, 0, 1.05, 0.16 + i * 0.3)); GATE.add(box(0.08, 0.12, 1.5, woodD, 0.04, 1.6, 0.75)); GATE.add(box(0.08, 0.12, 1.5, woodD, 0.04, 0.5, 0.75)); GATE.add(box(0.06, 0.05, 0.12, tm(0x2a2a2a), 0.08, 1.05, 1.4));
// neighbouring rooftops, water tanks, chimneys, clotheslines, a distant minaret
{ const cols = [0xe8d2b0, 0xd8b088, 0xf0dcc0, 0xc8a080, 0xe0c8a8, 0xd0b8a0]; for (let i = 0; i < 46; i++) { const a = hash(i) * 6.283, r = 13 + hash(i + 3) * 40; const x = Math.cos(a) * r - 2, z = Math.sin(a) * r; if (x > 3 && x < 22 && Math.abs(z) < 9) continue;
    const h = 2.5 + hash(i + 5) * 5, w = 5 + hash(i + 7) * 6, d = 5 + hash(i + 9) * 6; W.add(box(w, h, d, tm(cols[i % 6]), x, h / 2, z)); W.add(box(w, 0.5, 0.18, tm(cols[(i + 2) % 6]), x, h + 0.25, z + d / 2)); W.add(box(w, 0.5, 0.18, tm(cols[(i + 2) % 6]), x, h + 0.25, z - d / 2));
    if (i % 3 === 0) W.add(cyl(0.55, 0.55, 1.0, tm(0x3a3a40), x + 1, h + 0.5, z - 1, 14)); if (i % 4 === 1) { W.add(box(0.5, 1.4, 0.5, tm(0x8a6a50), x - 1.2, h + 0.7, z + 1)); W.add(box(0.6, 0.12, 0.6, tm(0x3a3030), x - 1.2, h + 1.45, z + 1)); }
    if (i % 5 === 2) { W.add(box(0.03, 1.2, 0.03, tm(0x5a5a5a), x - 2, h + 0.6, z)); W.add(box(0.03, 1.2, 0.03, tm(0x5a5a5a), x + 2, h + 0.6, z)); W.add(box(4, 0.01, 0.01, tm(0x3a3a3a), x, h + 1.15, z)); for (let k = 0; k < 3; k++) W.add(box(0.5, 0.6, 0.01, tm([0xd84a3a, 0x3a8ad8, 0xf0c040][k]), x - 1.2 + k * 1.1, h + 0.85, z)); } } }
{ const mx = -48, mz = -55; W.add(cyl(1.4, 1.8, 26, tm(0xe8dcc8), mx, 13, mz, 16)); W.add(cyl(2.2, 2.2, 0.6, tm(0xd8c8b0), mx, 20, mz, 16)); W.add(sph(1.6, tm(0xd8c8b0), mx, 26.6, mz, 16, 10)); W.add(cyl(0.05, 0.3, 1.6, tm(0xc8a040), mx, 28.6, mz, 8)); }
for (let i = 0; i < 7; i++) { const cl = makeCloud(i + 50, 1.3); cl.position.set(-150 + i * 55, 55 + (i % 3) * 10, -120 + (i % 2) * 260); W.add(cl); }
// one small tree in the courtyard corner + a clay pot for life
{ const tr = new THREE.Group(); tr.position.set(9, 0, 5.8); W.add(tr); tr.add(cyl(0.12, 0.18, 2.4, tm(0x6a4a30), 0, 1.2, 0, 8)); for (let i = 0; i < 6; i++) tr.add(sph(0.7 + hash(i) * 0.3, tm(i % 2 ? 0x4a9a3a : 0x3a8a32, { band: 0.12 }), Math.cos(i) * 0.6, 2.6 + hash(i + 2) * 0.8, Math.sin(i) * 0.6, 10, 8)); }

// ======================= PEOPLE (stick style) =======================
const CHILD = makeStickPerson(W, { top: '#e8742a', height: 0.46, build: { w: 1.15, belly: 0, arm: 0.95 }, seed: 5 }, { hair: '#1a120e', eggK: 1.0 },
  { hits: [[10.6, 'take', 0.6]], loops: [[11.4, 13.4, 'bob']], marks: [] });
const MANY = makeStickPerson(W, { top: '#3a5a8a', height: 0.62, seed: 9 }, { hair: '#1a120e' }, { hits: [[19.4, 'take', 0.3]], loops: [], marks: [] });
const MANO = makeStickPerson(W, { top: '#3a5a8a', height: 0.6, seed: 13 }, { hair: '#b8b8b8', mustache: '#d8d8d8', brow: '#9a9a9a' },
  { hits: [[39.3, 'take', 0.9], [45.4, 'take', 0.5]], loops: [[40.3, 41.8, 'sob'], [36.4, 37.4, 'nod']], marks: [] });
for (const P of [CHILD, MANY, MANO]) P.root.visible = false;
const B = (arr) => arr.map(([t, emo, trans]) => ({ t, emo, trans: trans ?? 0.18 }));
const perfC = new Performer(5, { intensity: 1.45, auto: false }).beats(B([[0, 'happy'], [7.0, 'curious'], [8.6, 'joy'], [10.6, 'awe', 0.1], [11.4, 'joy'], [12.4, 'laugh'], [13.4, 'joy']]));
const perfY = new Performer(9, { intensity: 1.35, auto: false }).beats(B([[0, 'pensive'], [15.0, 'sad'], [16.4, 'determined'], [19.4, 'sad', 0.1], [20.2, 'gentle'], [21.2, 'sad']]));
const perfO = new Performer(13, { intensity: 1.35, auto: false }).beats(B([[0, 'tired'], [33.6, 'tired'], [34.8, 'pensive'], [36.4, 'hopeful'], [38.2, 'curious'], [39.3, 'awe', 0.1], [40.3, 'cry'], [42.0, 'hopeful'], [44.0, 'gentle'], [45.4, 'joyTears', 0.12], [48.0, 'love'], [50.0, 'gentle'], [52.4, 'joyTears'], [54.6, 'calm']]));
// paths (Path durations are absolute seconds from 0)
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const DANA = [3.0, 0.1];
const pChild = new Path(S2, [{ p: [6.4, -4.2] }, { p: [5.2, -4.2], v: 0.9 }, { p: [3.95, -0.85], v: 1.25, wait: 20, face: yawTo([3.95, -0.85], DANA) }], 60, 0.62, T);
const pYoungA = new Path(S3, [{ p: [4.95, -1.0], wait: 2.2, face: Math.PI / 2 }, { p: [5.15, -4.2], v: 1.45 }, { p: [9.5, -4.2], v: 1.2, wait: 20, face: Math.PI / 2 }], 60, 0.8, T);
const pYoungB = new Path(19.0, [{ p: [13.6, 0.2], wait: 0.9, face: Math.PI / 2 }, { p: [16.5, 0.0], v: 1.35, wait: 20 }], 60, 0.8, T);
const pOld = new Path(S5, [{ p: [9.4, -3.95] }, { p: [5.6, -3.95], v: 0.95 }, { p: [5.2, -4.0], v: 0.9 }, { p: [4.95, -1.0], v: 1.2, wait: 4.5, face: Math.PI / 2 }, { p: [4.25, -0.7], v: 0.8, wait: 30, face: yawTo([4.25, -0.7], DANA) }], 60, 0.78, T);
// potli (cloth grain bag) with a grip on the knot
const POTLI = (() => { const g = new THREE.Group(); const b = sph(0.075, tm(0xc8a060), 0, 0, 0, 14, 10); b.scale.set(1, 0.85, 1); g.add(b); g.add(cyl(0.012, 0.04, 0.05, tm(0xb08848), 0, 0.075, 0, 8)); g.add(box(0.06, 0.012, 0.012, tm(0x8a3a2a), 0, 0.06, 0)); W.add(g);
  return { group: g, size: 0.03, grips: { top: { p: [0.01, 0.09, 0], dir: [0, 1, 0], pn: [-1, 0, 0], curl: 0.9, thumb: 0.8 } } }; })();
const BAG = box(0.28, 0.32, 0.12, tm(0x5a4030), 0, 0.3, -0.16, 0.03); MANY.torso.add(BAG); BAG.add(box(0.02, 0.5, 0.02, tm(0x3a2a1a), 0.1, 0.22, 0.07));

// ======================= PIGEONS =======================
const PIG = []; const pc = [0x8a96a8, 0x9aa4b4, 0xd8d8dc, 0x7a8698, 0xa8b0bc, 0x6a7488, 0xc8ccd4];
for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const c = tm(pc[i]), dk = tm(0x4a5060), nk = tm(0x5a8a7a);
  const body = sph(0.1, c, 0, 0.11, 0, 12, 8); body.scale.set(0.95, 0.9, 1.6); g.add(body); const neck = sph(0.06, nk, 0, 0.2, 0.1, 10, 8); g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.14); g.add(head); head.add(sph(0.052, c, 0, 0, 0, 10, 8)); head.add(cyl(0.0, 0.016, 0.05, tm(0xd88a40), 0, -0.005, 0.06, 6).rotateX(Math.PI / 2)); for (const s of [-1, 1]) head.add(sph(0.012, tm(0xff8a20, { unlit: 1 }), s * 0.04, 0.012, 0.025, 6, 4));
  const wings = []; for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.07, 0.15, 0.02); g.add(w); const m = box(0.22, 0.02, 0.15, dk); m.position.x = s * 0.11; w.add(m); wings.push(w); }
  g.add(box(0.1, 0.02, 0.14, dk, 0, 0.1, -0.2)); for (const s of [-1, 1]) g.add(cyl(0.008, 0.008, 0.08, tm(0xd06050), s * 0.04, 0.03, 0.02, 5)); W.add(g); PIG.push({ g, head, wings }); }
// landing schedule: [tLand, x, z] per bird (two feedings); circle flights otherwise
const LAND1 = [[11.0, 2.7, 0.3], [12.4, 3.4, -0.25], [12.9, 2.5, -0.35]], LAND2 = [[45.3, 2.8, 0.4], [45.9, 3.3, -0.3], [46.4, 2.4, -0.2], [46.9, 3.6, 0.35], [47.5, 2.9, -0.6]];
function circle(i, t) { const a = t * 0.55 + i * 0.9, r = 9 + (i % 3) * 2.2; return { p: V(1 + Math.cos(a) * r, ROOF + 6 + (i % 2) * 1.6 + Math.sin(t * 1.3 + i) * 0.6, Math.sin(a) * r), yaw: -a, fly: 1 }; }
function birdAt(i, t) {
  const land = (tl, x, z, tUp = null) => { const pos = V(x, ROOF, z); const dt = t - tl; const from = circle(i, tl - 1.6).p;
    if (dt < -1.6) return null; if (dt < 0) { const u = EASE.inOut((dt + 1.6) / 1.6); const p = from.clone().lerp(pos, u); p.y += Math.sin(u * Math.PI) * 0.6; return { p, yaw: Math.atan2(x - from.x, z - from.z), fly: 1, flare: u > 0.75 ? 1 : 0 }; }
    if (tUp !== null && t > tUp) { const u = EASE.in(clamp((t - tUp) / 1.8, 0, 1)); const to = circle(i, tUp + 1.8).p; const p = pos.clone().lerp(to, u); return { p, yaw: Math.atan2(to.x - x, to.z - z), fly: 1 }; }
    return { p: pos, yaw: hash(i * 7) * 6.28, fly: 0, peck: 1 }; };
  if (t < S2 + 3) return t < S2 ? circle(i, t) : (i < 4 ? circle(i, t) : null);
  if (t < S4) { const L = LAND1[i]; if (L) return land(L[0], L[1], L[2], S4 - 0.4) || circle(i, t); return null; }
  if (t < S6) return null;
  if (t < S7 + 0.8) { const L = LAND2[i]; if (L) return land(L[0], L[1], L[2], S7 + 0.8 + i * 0.12) || (t > 44 ? circle(i, t) : null); return t > 44 ? circle(i, t) : null; }
  return land(LAND2[i % 5][0], LAND2[i % 5][1], LAND2[i % 5][2], S7 + 0.8 + i * 0.12) || circle(i, t);
}
function updateBirds(t) { PIG.forEach((b, i) => { const s = birdAt(i, t); b.g.visible = !!s; if (!s) return; b.g.position.copy(s.p); b.g.rotation.set(s.fly ? -0.15 : 0, s.yaw, 0);
  const fl = s.fly ? (s.flare ? 1.1 * Math.sin(t * 26 + i) : 0.9 * Math.sin(t * 20 + i * 1.7)) : -0.15; b.wings[0].rotation.z = fl; b.wings[1].rotation.z = -fl;
  b.head.position.z = 0.14 + (s.peck ? 0.04 * Math.max(0, Math.sin(t * 7 + i * 2.1)) : 0); b.head.position.y = 0.25 - (s.peck ? 0.1 * Math.max(0, Math.sin(t * 7 + i * 2.1)) ** 3 : 0); }); }

// ======================= GRAIN =======================
const GR = []; const grM = tm(0xf0c860); for (let i = 0; i < 70; i++) { const m = box(0.025, 0.018, 0.035, grM); W.add(m); GR.push(m); }
function grain(t) { const ev = t >= S6 ? { t0: 44.0, from: V(4.0, ROOF + 0.85, -0.6) } : { t0: 9.9, from: V(3.75, ROOF + 0.62, -0.7) }; const live = (t >= 9.9 && t < S4 + 1.0) || t >= 44.0;
  GR.forEach((m, i) => { m.visible = live && t >= ev.t0 + i * 0.006; if (!m.visible) return; const a = t - ev.t0 - i * 0.006, T0 = 0.55; const to = V(DANA[0] + (hash(i * 3.3) - 0.5) * 1.6, ROOF + 0.03, DANA[1] + (hash(i * 7.7) - 0.5) * 1.4);
    if (a < T0) { const u = a / T0; const p = ev.from.clone().lerp(to, u); p.y += Math.sin(u * Math.PI) * 0.45 - (1 - u) * 0 ; m.position.copy(p); m.rotation.set(a * 20, a * 13, 0); } else { m.position.copy(to); m.rotation.set(0, hash(i) * 6, 0); }
    if (t >= S4 && t < S4 + 1.0) m.position.x += (t - S4) * 3 * hash(i); }); }

// ======================= RAIN, LEAVES, LIGHTNING =======================
const RN = 600; const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RN * 12), 3)); { const idx = []; for (let i = 0; i < RN; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); rainGeo.setIndex(idx); }
rainGeo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(RN * 12).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3)); rainGeo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(RN * 8), 2));
const RAIN = new THREE.Mesh(rainGeo, tm(0xe8eef8, { unlit: 1, noInk: 1, side: THREE.DoubleSide })); RAIN.frustumCulled = false; W.add(RAIN);
function rain(t, c, cp) { const on = t >= S4 + 0.3 && t < S5; RAIN.visible = on; if (!on) return; const k = sstep(S4 + 0.3, S4 + 1.3, t) * (1 - sstep(S5 - 0.8, S5, t)); const a = rainGeo.attributes.position.array;
  const side = V(c.x - cp.x, 0, c.z - cp.z).normalize(); const sx = -side.z * 0.016, sz = side.x * 0.016;
  for (let i = 0; i < RN; i++) { const y0 = (hash(i * 1.3) * 12 - ((t * 15 + hash(i) * 12) % 12)); const x = c.x + (hash(i * 2.1) - 0.5) * 14 + y0 * 0.22, z = c.z + (hash(i * 3.7) - 0.5) * 14, y = c.y + y0 - 3; const on2 = hash(i * 9.1) < k; const yy = on2 ? y : -99;
    a.set([x - sx, yy, z - sz, x + sx, yy, z + sz, x + sx - 0.13, yy + 0.6, z + sz, x - sx - 0.13, yy + 0.6, z - sz], i * 12); } rainGeo.attributes.position.needsUpdate = true; rainGeo.computeBoundingSphere(); }
const LEAF = []; for (let i = 0; i < 26; i++) { const l = box(0.12, 0.015, 0.08, tm([0x9a6a2a, 0xb88a3a, 0x7a5a2a][i % 3])); W.add(l); LEAF.push(l); }
function leaves(t) { const on = t >= S4 && t < S5; LEAF.forEach((l, i) => { l.visible = on; if (!on) return; const u = ((t - S4) * (1.2 + hash(i) * 0.8) + hash(i * 3)) % 1; l.position.set(-6 + u * 13, ROOF + 0.05 + Math.abs(Math.sin(t * 3 + i)) * 0.8 * hash(i + 1), -4 + hash(i * 5) * 8); l.rotation.set(t * 5 + i, t * 3, t * 7); }); }
const LIGHT = [24.3, 27.5];

// ======================= PER FRAME =======================
let FLASH = 0;
function setup(f) {
  const t = f / FPS; FLASH = 0; for (const lt of LIGHT) { const a = t - lt; if (a > 0 && a < 0.5) FLASH = Math.max(FLASH, (a < 0.08 ? 1 : 0.4 * Math.exp(-(a - 0.08) * 8)) * 0.9); }
  updateBirds(t); grain(t); leaves(t);
  // loose brick: slides out 14.7-15.1, back 15.7-16.1 (young man); out again 38.4-38.9 (old man) and stays out
  let bo = 0; if (t >= 14.7 && t < S4) bo = sstep(14.7, 15.1, t) * (1 - sstep(15.7, 16.1, t)); if (t >= 38.4) bo = sstep(38.4, 38.9, t);
  BRICK.position.copy(BRICK_P).add(V(-0.32 * bo, 0.02 * Math.sin(bo * Math.PI), 0)); BRICK.rotation.y = 0.15 * bo; if (t >= 39.0) { BRICK.position.set(5.0, ROOF + 0.09, -1.55); BRICK.rotation.set(0, 0.4, 0); }
  // gate: open 19.3-19.9, close 21.1-21.5
  const go = t < 19.3 ? 0 : t < 21.1 ? sstep(19.3, 19.9, t) : 1 - sstep(21.1, 21.5, t); GATE.rotation.y = go * 1.6;
  // ---- child (S2) ----
  CHILD.root.visible = t >= S2 && t < S3;
  if (CHILD.root.visible) { const r = place(CHILD, pChild, t, { terrain: T }); const walking = r.speed > 0.25; const fp = perfC.at(t, { walking, handsFree: !walking }); const p = toonify({ ...r.pose, ...fp, t }, CHILD, t);
    const sc = sstep(9.4, 9.9, t) * (1 - sstep(10.3, 10.6, t)); if (!walking || sc > 0) { p.armL = { f: lerp(25, 115, sc), o: lerp(20, 30, sc), b: lerp(35, 10, sc) }; }
    p.armR = { f: 35, o: 18, b: 70 }; if (t > 11.4) { p.armL = { f: 150 + 10 * Math.sin(t * 9), o: 50, b: 20 }; p.armR = { f: 150 + 10 * Math.sin(t * 9 + 1), o: 50, b: 20 }; }
    CHILD.update(p); POTLI.group.visible = true; propInHand(CHILD, 'R', POTLI, 'top'); }
  // ---- young man (S3) ----
  MANY.root.visible = t >= S3 && t < S4 && !(t >= 18.6 && t < 19.0);
  if (MANY.root.visible) { const path = t < 19.0 ? pYoungA : pYoungB; const r = place(MANY, path, t, { terrain: T }); const walking = r.speed > 0.25; const fp = perfY.at(t, { walking, handsFree: false }); const p = toonify({ ...r.pose, ...fp, t }, MANY, t);
    if (t < 16.2) { // hide the potli in the wall
      const reach = sstep(14.4, 14.7, t) * (1 - sstep(16.0, 16.3, t)); const pIn = sstep(15.15, 15.6, t);
      POTLI.group.visible = t < 15.7; const held = V(4.95 + 0.3, ROOF + 0.62, -0.85), slot = V(5.42, ROOF + PH - 0.2, -1.0); POTLI.group.position.copy(held.clone().lerp(slot, pIn)); POTLI.group.rotation.set(0, 0, 0);
      if (reach > 0) handOnProp(MANY, 'R', POTLI, 'top', p, t < 15.7 ? 1 : reach); p.handL = { w: BRICK.position.clone().add(V(-0.12, 0.02, 0.08)), k: reach * (t < 15.1 || t > 15.65 ? 1 : 0.3) }; p.reachAssist = true; }
    if (t > 19.3 && t < 19.9) p.handR = { w: GATE.localToWorld(V(0.1, 1.05, 1.35)), k: sstep(19.2, 19.4, t) * (1 - sstep(19.8, 19.95, t)) };
    if (t >= 19.4 && t < 20.3) p.head = { ...(p.head || {}), yaw: (p.head?.yaw || 0) - 120 * sstep(19.4, 19.7, t) * (1 - sstep(20.0, 20.3, t)) };
    MANY.update(p); }
  // ---- old man (S5..) ----
  MANO.root.visible = t >= S5;
  if (MANO.root.visible) { const r = place(MANO, pOld, t, { terrain: T }); const walking = r.speed > 0.25; const fp = perfO.at(t, { walking, handsFree: false }); const p = toonify({ ...r.pose, ...fp, t }, MANO, t); p.lean = (p.lean || 0) + 9;
    if (t < 34.6 && walking) { const rx = MANO.root.position.x - 0.15; p.handR = { w: V(rx, (11.5 - rx) / 0.3 * 0.18 + 0.92, -3.6), k: 0.9 }; p.reachAssist = false; }   // hand on the railing while climbing
    if (t >= 36.4 && t < 37.4) p.shrug = (p.shrug || 0) + 1.4 * Math.sin((t - 36.4) * Math.PI);                                     // long breath
    const hasPotli = t >= 39.0; POTLI.group.visible = t >= 38.9;
    if (t >= 38.2 && t < 39.0) { p.handL = { w: BRICK.position.clone().add(V(-0.12, 0.02, 0.08)), k: sstep(38.2, 38.45, t) }; p.reachAssist = true; }
    if (t >= 38.9 && t < 39.6) { const u = sstep(38.9, 39.5, t); POTLI.group.position.copy(V(5.42, ROOF + PH - 0.2, -1.0).lerp(V(5.1, ROOF + 0.75, -0.9), u)); POTLI.group.rotation.set(0, 0, 0); handOnProp(MANO, 'R', POTLI, 'top', p, 1); }
    if (t >= 39.6 && t < 43.5) { p.armR = { f: 55, o: 5, b: 105 }; p.armL = { f: 45, o: 10, b: 110 }; }                                     // potli held to the chest
    const sc = sstep(43.5, 44.0, t) * (1 - sstep(44.5, 44.9, t)); if (t >= 43.5) { p.armL = { f: lerp(25, 110, sc), o: lerp(18, 28, sc), b: lerp(30, 12, sc) }; p.armR = { f: 30, o: 18, b: 70 }; }
    if (t >= 51.0) { p.head = { ...(p.head || {}), pitch: (p.head?.pitch || 0) - 28 * sstep(51.0, 52.2, t) }; p.look = [p.look?.[0] || 0, 0.7]; }
    MANO.update(p); if (hasPotli && !(t >= 38.9 && t < 39.6)) propInHand(MANO, 'R', POTLI, 'top'); }
  if (!(CHILD.root.visible || MANY.root.visible || MANO.root.visible) || (t >= S4 && t < 38.9)) POTLI.group.visible = false;
  return { t };
}

// ======================= CAMERA =======================
const CINE = new Cine({ blend: 0.45 }); const P = CT.pt;
const walkerH = (path, h) => CT.walker(path, T, h);
CINE.shot(0.0, S2, { rig: 'fly', path: [[-24, 15, -22], [-7, 8.5, -8]], at: P(3.0, ROOF + 0.6, -0.6), fov: [44, 36], shake: 0.15, ease: 'inOut' })
  .shot(S2, 8.0, { rig: 'track', at: walkerH(pChild, 0.6), lag: 0.2, size: 'fs', az: [-60, -95], el: [10, 8], fov: 34, shake: 0.25, cut: true })
  .shot(8.0, 10.5, { rig: 'orbit', at: () => CHILD.torso.localToWorld(V(0, 0.3, 0)), size: ['ms', 'mcu'], az: [-40, -80], el: [10, 14], fov: 32, shake: 0.2 })
  .shot(10.5, 12.2, { rig: 'orbit', at: P(3.0, ROOF + 0.3, 0.0), size: 1.9, az: [-75, -45], el: [16, 11], fov: 34, shake: 0.2 })
  .shot(12.2, S3, { rig: 'push', at: CT.head(CHILD), size: ['ms', 'mcu'], az: [-75, -55], el: [6, 4], fov: 30, shake: 0.2 })
  .shot(S3, 16.4, { rig: 'orbit', at: () => MANY.torso.localToWorld(V(0, 0.4, 0)).lerp(BRICK_P, 0.4), size: ['ms', 0.9], az: [65, 100], el: [8, 12], fov: 32, shake: 0.2, cut: true })
  .shot(16.4, 18.9, { rig: 'track', at: walkerH(pYoungA, 0.9), lag: 0.2, size: 'ws', az: [175, 150], el: [6, 10], fov: 34, shake: 0.25 })
  .shot(18.9, S4, { rig: 'orbit', at: () => MANY.root.visible ? MANY.headWorld() : V(13.8, 1.3, 0), size: [2.4, 3.8], az: [-100, -80], el: [6, 8], fov: 32, shake: 0.2, cut: true })
  .shot(S4, 26.2, { rig: 'crane', at: P(2.0, ROOF + 0.4, -0.5), size: [9, 7], az: [-130, -105], el: [28, 16], fov: 38, shake: 0.5, cut: true })
  .shot(26.2, S5, { rig: 'push', at: P(5.35, ROOF + 0.6, -1.0), size: [2.2, 1.1], az: [-110, -85], el: [14, 10], fov: 32, shake: 0.4 })
  .shot(S5, 33.6, { rig: 'track', at: walkerH(pOld, 0.8), lag: 0.15, size: 'fs', az: [205, 185], el: [12, 9], fov: 34, shake: 0.25, cut: true })
  .shot(33.6, 36.4, { rig: 'track', at: CT.head(MANO), size: ['ms', 'mcu'], az: [-35, -15], el: [5, 3], fov: 30, shake: 0.2 })
  .shot(36.4, 38.1, { rig: 'orbit', at: () => MANO.torso.localToWorld(V(0, 0.3, 0)), size: 'ms', az: [-140, -120], el: [10, 12], fov: 32, shake: 0.2 })
  .shot(38.1, 39.8, { rig: 'push', at: P(5.25, ROOF + 0.75, -0.95), size: [1.5, 1.15], az: [62, 82], el: [14, 10], fov: 32, shake: 0.2 })
  .shot(39.8, S6, { rig: 'push', at: CT.head(MANO), size: ['ms', 'mcu'], az: [72, 95], el: [-16, -20], fov: 30, shake: 0.25 })
  .shot(S6, 44.8, { rig: 'orbit', at: () => MANO.torso.localToWorld(V(0, 0.3, 0)), size: 'fs', az: [-35, -80], el: [10, 14], fov: 34, shake: 0.2 })
  .shot(44.8, 47.6, { rig: 'orbit', at: P(3.2, ROOF + 0.4, -0.2), size: 2.6, az: [-40, -10], el: [14, 10], fov: 36, shake: 0.2 })
  .shot(47.6, S7, { rig: 'push', at: CT.head(MANO), size: ['ms', 'mcu'], az: [-80, -60], el: [6, 3], fov: 30, shake: 0.2 })
  .shot(S7, 57.5, { rig: 'crane', at: () => MANO.headWorld().add(V(0, 0.3, 0)), size: ['ms', 14], az: [-95, -150], el: [6, 42], fov: [32, 40], shake: 0.15, ease: 'inOut' });

// ======================= LOOK =======================
const DAWN = mkLook({ sun: [0.8, 0.42, 0.3], lit: '#ffe8cc', litK: 1.1, shade: '#a0a8c0', ambSky: '#eef2ff', ambGnd: '#fff0dc', rim: '#ffd8a8', rimDir: [0.8, 0.3, 0.2], fog: '#f0e0d0', fogR: [50, 300], sky: ['#3a78d0', '#a8c8ec', '#ffd8b0', '#f8e8d8'], contrast: 1.06, vig: 0.14, glow: 0.55, grain: 0, desat: 0, sat: 1.15, lo: '#f0f0ff', hi: '#fff0d8', exposure: 1.04, shadow: 0.85 });
const STORM = mkLook({ sun: [0.4, 0.6, -0.5], lit: '#b0bacc', shade: '#5a6478', ambSky: '#c0c8dc', ambGnd: '#6a6a70', rim: '#8a9ab8', fog: '#5a6274', fogR: [14, 120], sky: ['#2a3040', '#4a5264', '#6a7284', '#3a3e48'], contrast: 1.08, vig: 0.32, glow: 0.2, grain: 0.015, desat: 0.2, sat: 0.9, lo: '#c8d4ff', hi: '#e8ecff', exposure: 1.06, shadow: 0.6 });
const AFTER = mkLook({ sun: [0.7, 0.45, 0.4], lit: '#ffe6c0', litK: 1.06, shade: '#8a96c0', ambSky: '#e8f0ff', ambGnd: '#f8e8d0', rim: '#ffd8a8', rimDir: [0.7, 0.3, 0.3], fog: '#e8e0d8', fogR: [40, 260], sky: ['#4a80d0', '#a8c4e8', '#ffe0b8', '#f0e8e0'], contrast: 1.05, vig: 0.12, glow: 0.5, grain: 0, desat: 0, sat: 1.12, lo: '#f0f4ff', hi: '#fff4e0', exposure: 1.05, shadow: 0.85 });
window.renderFrame = function (f) {
  const { t } = setup(f); const cam = CINE.at(t); CAMPOS.set(...cam.pos); for (const Pp of [CHILD, MANY, MANO]) placeMarks(Pp, t);
  rain(t, V(cam.look[0], cam.look[1], cam.look[2]), V(cam.pos[0], cam.pos[1], cam.pos[2]));
  const k1 = sstep(S4 - 0.4, S4 + 0.6, t), k2 = sstep(S5 - 0.6, S5 + 0.8, t); let L = k2 > 0 ? mixLook(STORM, AFTER, k2) : mixLook(DAWN, STORM, k1);
  if (FLASH > 0) { L = mixLook(L, AFTER, FLASH * 0.8); }
  applyLook(L, { shadowCenter: [clamp(cam.look[0], -6, 15), 2, clamp(cam.look[2], -6, 6)], shadowSize: 18 });
  C.skyU.uSunSize.value = t < S4 || t > S5 ? 0.02 : 0.0; C.skyU.uGlow.value = 0.5;
  C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.05, far: 600 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37;
  dofU.uFade.value = 1 - Math.min(1, t / 0.6) + Math.max(0, (t - (DURATION - 1.6)) / 1.6); dofU.uFlash.value = FLASH;
  C.drawFrame(); return 'ok';
};
window.dbg = (f) => { setup(f); const r = (v) => v.toArray().map((x) => +x.toFixed(2)); return { child: r(CHILD.root.position), y: r(MANY.root.position), o: r(MANO.root.position) }; };
window.ready = true;
