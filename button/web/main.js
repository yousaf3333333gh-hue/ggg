// "THE BUTTON NOBODY SHOULD PRESS" : 56.5 s. Voice = audio/voice_clean.mp3. Every beat is keyed to the word timestamps (button_words.json).
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph, makeCloud } from '../../web/models.js';
import { mkLook, mixLook, applyLook } from '../../web/looks.js';
import { Terrain, Path, place, EASE, sstep, clamp, lerp, hash } from '../../web/motion.js';
import { Performer, EMOTIONS } from '../../web/perform.js';
import { Cine, T as CT } from '../../web/cine.js';
import { toTex, mkCanvas } from '../../web/tex.js';
import { makeStickPerson, toonify, placeMarks, CAMPOS } from '../../web/toonkit.js';
for (const [n, base, ex] of [['smug', 'proud', 'smug'], ['grin', 'happy', 'grin'], ['gasp', 'shock', 'gasp'], ['awe', 'curious', 'awe'], ['blank', 'neutral', 'blank'], ['evil2', 'evil', 'evil'], ['gentle', 'calm', 'gentle']]) EMOTIONS[n] = { ...EMOTIONS[base], expr: ex };
const { stage, dofU, FPS, PX } = C;
export const DURATION = 56.5;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };
const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
const T = new Terrain(0);
const card = (w, h, draw, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), tm(0xffffff, { map: ctex(Math.round(256 * w / h), 256, draw), unlit: o.unlit ?? 0.35, noInk: 1, side: THREE.DoubleSide }));
const txt = (lines, bg, fg, font = 'bold 90px sans-serif') => (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 92)); };

// ======================= MUSEUM ROOM =======================
const floorTex = ctex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#b07a4a', '#a06c40', '#bc8656', '#9a6438'][i % 4]; g.fillRect(0, i * 32, w, 32); g.fillStyle = 'rgba(60,35,20,0.5)'; g.fillRect(0, i * 32, w, 2); g.fillRect(((i * 97) % 256), i * 32, 2, 32); } }, true);
W.add(box(10.4, 0.1, 8.4, tm(0xffffff, { map: floorTex, repeat: [5, 4] }), 0, -0.05, 0));
const wallM = tm(0xf0e2c8), wallD = tm(0xc8a878), trim = tm(0x7a4a2a);
W.add(box(10.4, 3.4, 0.2, wallM, 0, 1.7, -4.1)); W.add(box(0.2, 3.4, 8.4, wallM, 5.1, 1.7, 0)); W.add(box(0.2, 3.4, 5.6, wallM, -5.1, 1.7, -1.4)); W.add(box(0.2, 3.4, 1.2, wallM, -5.1, 1.7, 3.6)); W.add(box(0.2, 1.0, 1.6, wallM, -5.1, 2.9, 2.2));
for (const [x, z, w, d] of [[0, -3.98, 10.2, 0.05], [4.98, 0, 0.05, 8.2]]) W.add(box(w, 0.9, d, wallD, x, 0.45, z)); W.add(box(10.4, 0.12, 0.1, trim, 0, 0.95, -3.95));
// paintings
for (const [x, c1, c2] of [[-3.2, '#3a6ab8', '#f0c040'], [-1.0, '#c84a3a', '#2a8a5a'], [3.0, '#6a3a9a', '#f08a3a']]) { const p = card(1.1, 0.8, (g, w, h) => { g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, w, h); g.fillStyle = c1; g.fillRect(18, 18, w - 36, h - 36); g.fillStyle = c2; g.beginPath(); g.arc(w * 0.6, h * 0.45, h * 0.22, 0, 7); g.fill(); g.fillRect(30, h * 0.7, w * 0.5, 14); }); p.position.set(x, 2.0, -3.99); W.add(p); }
// rope stanchions
for (const [x, z] of [[-1.6, 1.4], [1.6, 1.4], [-1.6, -1.4], [1.6, -1.4]]) { W.add(cyl(0.04, 0.04, 0.9, tm(0xd8b030), x, 0.45, z, 8)); W.add(cyl(0.16, 0.18, 0.05, tm(0xd8b030), x, 0.025, z, 12)); W.add(sph(0.07, tm(0xd8b030), x, 0.93, z, 10, 8)); }
// THE BUTTON on its pedestal
const PED = V(0, 0, 0); W.add(cyl(0.22, 0.26, 0.6, tm(0xf4f0e8), 0, 0.3, 0, 24)); W.add(cyl(0.27, 0.27, 0.05, trim, 0, 0.6, 0, 24)); W.add(cyl(0.14, 0.15, 0.05, tm(0x2a2a2e), 0, 0.645, 0, 20));
const capM = tm(0xe8201e), capGlow = tm(0xff4030, { unlit: 1, noInk: 1 }); const CAP = cyl(0.105, 0.11, 0.07, capM, 0, 0.705, 0, 24); W.add(CAP); const CAP_Y = 0.705; const BTOP = V(0, 0.75, 0);
// cord that goes nowhere: pedestal -> floor -> plug lying on the floor; wall socket far away
{ const pts = [V(0.22, 0.03, 0.05), V(0.6, 0.02, 0.25), V(1.0, 0.02, 0.2), V(1.3, 0.02, 0.55)]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a); const c = cyl(0.012, 0.012, d.length(), tm(0x1a1a1a), 0, 0, 0, 6); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); W.add(c); } }
const PLUG = new THREE.Group(); PLUG.position.set(1.33, 0.03, 0.58); W.add(PLUG); PLUG.add(box(0.07, 0.04, 0.09, tm(0x2a2a2a))); for (const s of [-1, 1]) PLUG.add(box(0.008, 0.008, 0.04, tm(0xd8c060), s * 0.015, 0, 0.06));
const SOCK = card(0.16, 0.2, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.fillRect(w * 0.3, h * 0.35, 8, 26); g.fillRect(w * 0.62, h * 0.35, 8, 26); }); SOCK.position.set(4.99, 0.35, 2.6); SOCK.rotation.y = -Math.PI / 2; W.add(SOCK);
// signs on little stands (pop in on their words)
function signStand(x, z, lines, bg, fg) { const g = new THREE.Group(); g.position.set(x, 0, z); W.add(g); g.add(cyl(0.025, 0.025, 1.0, tm(0x5a3a2a), 0, 0.5, 0, 8)); g.add(cyl(0.12, 0.12, 0.03, tm(0x5a3a2a), 0, 0.015, 0, 12));
  for (const r of [0, Math.PI]) { const b = card(0.62, 0.36, txt(lines, bg, fg, 'bold 70px sans-serif'), { unlit: 0.6 }); b.material.side = THREE.FrontSide; b.rotation.y = r; b.position.set(0, 1.12, r ? -0.004 : 0.004); g.add(b); } g.add(box(0.64, 0.38, 0.006, tm(0x5a3a2a), 0, 1.12, 0)); return g; }
const SIGN1 = signStand(-0.6, -0.75, ['DO NOT', 'PRESS'], '#fff4e0', '#c81e22'), SIGN2 = signStand(0.6, -0.75, ['SERIOUSLY.', 'DO NOT PRESS'], '#ffe24a', '#1a1a1a');
// glass case = thin frame + faint tint (no real transparency in this renderer)
const CASE = new THREE.Group(); W.add(CASE); { const e = tm(0x9ad8f0, { unlit: 0.7 }), s = 0.6, h = 0.55; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) CASE.add(box(0.025, h, 0.025, e, x * s / 2, h / 2, z * s / 2)); for (const y of [0, h]) { CASE.add(box(s, 0.025, 0.025, e, 0, y, s / 2)); CASE.add(box(s, 0.025, 0.025, e, 0, y, -s / 2)); CASE.add(box(0.025, 0.025, s, e, s / 2, y, 0)); CASE.add(box(0.025, 0.025, s, e, -s / 2, y, 0)); }
  for (let i = 0; i < 4; i++) CASE.add(sph(0.018, tm(0xb0b0b8), (i % 2 ? 1 : -1) * 0.26, 0.02, (i < 2 ? 1 : -1) * 0.3, 8, 6)); const shine = box(0.02, 0.4, 0.004, tm(0xffffff, { unlit: 1, noInk: 1 }), -0.12, 0.3, 0.302); shine.rotation.z = 0.5; CASE.add(shine); }
// PRESSES TODAY counter (north wall)
const CNT = {}; for (const n of ['0', '1', '2', '3', '4', '5', '15', '16', '999+']) { const c = card(1.0, 0.8, (g, w, h) => { g.fillStyle = '#1a2a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f0c040'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#f0c040'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText('PRESSES TODAY', w / 2, 62); g.fillStyle = '#ffffff'; g.font = 'bold 130px monospace'; g.fillText(n, w / 2, 200); }, { unlit: 0.8 }); c.position.set(1.1, 2.05, -3.97); c.visible = false; W.add(c); CNT[n] = c; }
// gift shop corner
W.add(box(1.8, 0.8, 0.7, tm(0x8a5a3a), 3.6, 0.4, -3.2)); W.add(box(1.9, 0.05, 0.8, tm(0xf0e0c0), 3.6, 0.825, -3.2));
for (let i = 0; i < 24; i++) W.add(cyl(0.035, 0.04, 0.03, capM, 2.9 + (i % 8) * 0.19, 0.865, -3.45 + Math.floor(i / 8) * 0.2, 10));
{ const gs = card(1.6, 0.45, txt(['GIFT SHOP'], '#2a8a5a', '#ffffff', 'bold 120px sans-serif'), { unlit: 0.7 }); gs.position.set(3.6, 2.4, -3.99); W.add(gs); }
// calendar (flips during "for a whole week")
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => card(0.55, 0.65, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d82a2a'; g.fillRect(0, 0, w, h * 0.3); g.fillStyle = '#fff'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.fillText('DAY', w / 2, 60); g.fillStyle = '#1a1a1a'; g.font = 'bold 90px sans-serif'; g.fillText(d, w / 2, 190); }, { unlit: 0.6 }));
DAYS.forEach((d) => { d.position.set(-2.6, 1.9, -3.98); W.add(d); });
// wall plaque REACTANCE + giant NO
const PLAQ = card(2.6, 0.7, txt(['REACTANCE'], '#1a2a4a', '#ffd24a', 'bold 150px sans-serif'), { unlit: 0.8 }); PLAQ.position.set(-0.6, 2.95, -3.97); W.add(PLAQ);
const BIGNO = card(2.2, 1.4, txt(['NO!'], '#e82020', '#ffffff', 'bold 260px sans-serif'), { unlit: 0.9 }); BIGNO.position.set(0, 1.6, -1.6); W.add(BIGNO);
const NOSIGN = new THREE.Group(); W.add(NOSIGN); for (const r of [0, Math.PI]) { const c = card(0.42, 0.3, txt(['NO'], '#ffffff', '#d81e1e', 'bold 150px sans-serif'), { unlit: 0.7 }); c.material.side = THREE.FrontSide; c.rotation.y = r; c.position.z = r ? -0.003 : 0.003; NOSIGN.add(c); }
const FLAG = new THREE.Group(); W.add(FLAG); FLAG.add(cyl(0.008, 0.008, 0.45, tm(0x5a3a2a), 0, 0.22, 0, 6)); for (const r of [0, Math.PI]) { const f = card(0.26, 0.16, txt(['FREEDOM'], '#2a6ad8', '#ffffff', 'bold 52px sans-serif'), { unlit: 0.7 }); f.material.side = THREE.FrontSide; f.rotation.y = r; f.position.set(0.13, 0.36, r ? -0.003 : 0.003); FLAG.add(f); }
const SCREW = new THREE.Group(); W.add(SCREW); SCREW.add(cyl(0.02, 0.022, 0.1, tm(0xf0c020), 0, 0.05, 0, 8)); SCREW.add(cyl(0.006, 0.006, 0.12, tm(0xc0c0c8), 0, 0.16, 0, 6));
const SAND = new THREE.Group(); W.add(SAND); SAND.add(box(0.14, 0.02, 0.1, tm(0xe8c890))); SAND.add(box(0.15, 0.012, 0.11, tm(0x6aa83a), 0, 0.016, 0)); SAND.add(box(0.14, 0.02, 0.1, tm(0xe8c890), 0, 0.03, 0));
const CASH = []; for (let i = 0; i < 34; i++) { const b = box(0.17, 0.005, 0.075, tm(0x6ab86a)); W.add(b); CASH.push(b); }

// ======================= OUTSIDE (x + 60): museum front, street, tour bus =======================
const OX = 60; { W.add(box(70, 0.1, 40, tm(0x8a8a8a), OX, -0.05, 6)); W.add(box(70, 0.11, 6, tm(0x4a4a52), OX, -0.04, 6)); for (let i = -6; i <= 6; i++) W.add(box(1.4, 0.115, 0.15, tm(0xf0f0e8), OX + i * 3, -0.03, 6));
  W.add(box(10, 4.2, 6, tm(0xf0e2c8), OX, 2.1, -3.5)); W.add(box(11, 0.6, 7, tm(0xd8c8a8), OX, 4.5, -3.5)); const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.2, 1.6, 3), tm(0xe8dcc0)); tri.rotation.set(Math.PI / 2, 0, 0); tri.scale.set(1, 1, 0.5); tri.position.set(OX, 5.5, -0.6); W.add(tri);
  for (let i = -2; i <= 2; i++) W.add(cyl(0.22, 0.26, 3.6, tm(0xfaf4e8), OX + i * 1.9, 2.0, 0.0, 14)); W.add(box(10.5, 0.3, 1.6, tm(0xd8c8a8), OX, 0.15, 0.2)); W.add(box(1.6, 2.6, 0.1, tm(0x5a3a2a), OX, 1.3, -0.45));
  const ms = card(4.2, 0.8, txt(['MUSEUM'], '#f8f0e0', '#5a3a1a', 'bold 170px serif'), { unlit: 0.5 }); ms.position.set(OX, 4.1, 0.02); W.add(ms);
  for (let i = 0; i < 5; i++) { const cl = makeCloud(i + 70, 1.2); cl.position.set(OX - 80 + i * 40, 45, -120); W.add(cl); } }
const BUS = new THREE.Group(); W.add(BUS); { const y = tm(0xf2b81c); BUS.add(box(2.4, 2.4, 9, y, 0, 1.6, 0, 0.2)); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) BUS.add(box(0.02, 0.7, 1.0, tm(0x2a3a52), s * 1.21, 2.1, -3.2 + i * 1.3)); BUS.add(box(2.0, 0.8, 0.02, tm(0x2a3a52), 0, 2.1, 4.51));
  const bt = card(3.0, 0.5, txt(['MUSEUM TOURS'], '#f2b81c', '#1a1a1a', 'bold 120px sans-serif'), { unlit: 0.4 }); bt.rotation.y = Math.PI / 2; bt.position.set(1.22, 1.1, 0); BUS.add(bt);
  for (const z of [-3, 3]) for (const s of [-1, 1]) { const w = cyl(0.5, 0.5, 0.3, tm(0x1a1a1e), s * 1.1, 0.5, z, 16); w.rotation.z = Math.PI / 2; BUS.add(w); } }

// ======================= PEOPLE =======================
const CUR = makeStickPerson(W, { top: '#6a3a8a', height: 0.62, seed: 3 }, { hair: '#8a8a8a', mustache: '#3a2a1a' }, { hits: [[11.3, 'take', 0.4], [13.66, 'jolt', 0.6], [14.64, 'take', 0.9], [16.45, 'double', 1.0], [18.42, 'jolt', 0.5], [19.7, 'take', 0.8], [20.2, 'shake', 0.7], [31.9, 'take', 0.4], [39.45, 'shake', 0.5], [40.5, 'take', 0.4]], loops: [[16.9, 17.6, 'rage'], [19.9, 20.6, 'rage'], [28.4, 30.8, 'laugh'], [33.6, 35.4, 'bob'], [39.6, 40.4, 'dizzy']], marks: [['!', 16.45, 17.3], ['x', 19.75, 20.65], ['!', 39.45, 40.2]] });
{ const G = CUR.toonHead.G; for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.009, 6, 18), tm(0x1a1a1a)); r.position.set(s * 0.072, 0.035, 0.235); G.add(r); } G.add(box(0.05, 0.01, 0.01, tm(0x1a1a1a), 0, 0.045, 0.24));
  CUR.torso.add(box(0.12, 0.05, 0.03, tm(0xd82a2a), 0, 0.58, 0.16)); }
const GUS = makeStickPerson(W, { top: '#2a3a6a', height: 0.64, seed: 8 }, { hat: 'cap', hatCol: 0x1a2a4a, browMax: 0.135 }, { hits: [[22.7, 'take', 0.5], [23.65, 'jolt', 0.5], [46.5, 'take', 0.5], [47.6, 'double', 0.9]], loops: [[22.9, 23.5, 'bob'], [23.8, 24.4, 'laugh'], [42.0, 43.8, 'bob']], marks: [['!', 23.6, 24.2], ['!', 47.6, 48.3]] });
const V1 = makeStickPerson(W, { top: '#3aa86a', height: 0.6, seed: 11 }, { hair: '#1a120e' }, { hits: [[6.05, 'jolt', 0.5], [7.75, 'take', 0.4], [7.95, 'double', 0.8], [14.7, 'take', 0.8], [16.6, 'jolt', 0.5], [46.8, 'take', 1.1], [47.6, 'jolt', 0.6], [50.9, 'take', 1.3], [51.4, 'jolt', 1.0]], loops: [[6.2, 6.9, 'laugh'], [16.7, 17.5, 'laugh'], [42.6, 44.0, 'rage'], [44.6, 46.4, 'bob'], [48.1, 49.2, 'laugh'], [51.5, 52.1, 'laugh']], marks: [['x', 42.6, 44.0], ['!', 46.7, 47.4], ['!', 50.9, 51.5]] });
const V2 = makeStickPerson(W, { top: '#e85a8a', height: 0.58, seed: 12 }, { hat: 'cap', hatCol: 0xe8a020, browMax: 0.135 }, { hits: [[6.65, 'jolt', 0.5], [10.45, 'jolt', 0.5], [14.7, 'take', 0.8], [16.85, 'jolt', 0.5], [27.4, 'take', 0.4]], loops: [[6.8, 7.4, 'laugh'], [10.5, 11.1, 'laugh'], [16.9, 17.5, 'laugh'], [27.6, 28.3, 'bob']], marks: [] });
const V3 = makeStickPerson(W, { top: '#e8b020', height: 0.6, seed: 14 }, { hair: '#4a2a1a' }, { hits: [[7.15, 'jolt', 0.5], [14.7, 'take', 0.8], [17.1, 'jolt', 0.5], [19.2, 'take', 0.3]], loops: [[7.3, 7.6, 'laugh'], [17.2, 17.6, 'laugh'], [19.7, 20.7, 'bob']], marks: [] });
const TOUR = [0, 1, 2].map((i) => makeStickPerson(W, { top: ['#d84a3a', '#4a8ad8', '#8a5ad8'][i], height: 0.58 + i * 0.02, seed: 20 + i }, i === 1 ? { hat: 'cap', hatCol: 0x2aa84a, browMax: 0.135 } : { hair: ['#1a120e', '#3a2a1a', '#2a2a2a'][i] }, {}));
const ALL = [CUR, GUS, V1, V2, V3, ...TOUR];
const B = (arr) => arr.map(([t, emo, trans]) => ({ t, emo, trans: trans ?? 0.14 }));
const perf = {
  CUR: new Performer(3, { intensity: 1.45, auto: false }).beats(B([[0, 'stern'], [11.2, 'stern'], [13.6, 'proud'], [14.64, 'stern', 0.08], [15.6, 'smug'], [16.45, 'shock', 0.08], [17.66, 'determined'], [18.5, 'smug'], [19.7, 'shock', 0.1], [20.8, 'proud'], [26.4, 'happy'], [28.4, 'laugh'], [30.86, 'calm'], [33.2, 'smug'], [34.2, 'happy'], [35.8, 'gentle'], [39.45, 'curious'], [40.0, 'pensive']])),
  GUS: new Performer(8, { intensity: 1.4, auto: false }).beats(B([[0, 'stern'], [21.0, 'stern'], [22.66, 'sneaky'], [23.6, 'evil2', 0.08], [24.1, 'smug'], [41.8, 'stern'], [46.5, 'evil2'], [47.6, 'shock', 0.08]])),
  V1: new Performer(11, { intensity: 1.5, auto: false }).beats(B([[0, 'curious'], [5.8, 'happy'], [7.62, 'curious'], [8.0, 'blank'], [10.0, 'happy'], [14.7, 'shock', 0.08], [15.4, 'smug'], [16.5, 'joy'], [37.4, 'neutral'], [41.9, 'suspicious'], [42.6, 'angry', 0.1], [44.1, 'happy'], [46.7, 'shock', 0.08], [47.5, 'determined'], [48.3, 'smug'], [49.5, 'shock', 0.08], [50.9, 'joy', 0.08], [51.5, 'laugh']])),
  V2: new Performer(12, { intensity: 1.5, auto: false }).beats(B([[0, 'curious'], [6.4, 'joy'], [10.3, 'laugh'], [11.2, 'curious'], [14.7, 'shock', 0.08], [15.4, 'suspicious'], [16.7, 'joy'], [26.4, 'happy'], [27.4, 'joy']])),
  V3: new Performer(14, { intensity: 1.5, auto: false }).beats(B([[0, 'curious'], [7.0, 'grin'], [14.7, 'shock', 0.08], [15.4, 'smug'], [16.9, 'joy'], [19.2, 'sneaky'], [19.7, 'determined'], [37.4, 'neutral']])),
  T0: new Performer(20, { intensity: 1.3, auto: false }).beats(B([[0, 'happy'], [25.7, 'joy']])), T1: new Performer(21, { intensity: 1.3, auto: false }).beats(B([[0, 'curious'], [25.7, 'awe']])), T2: new Performer(22, { intensity: 1.3, auto: false }).beats(B([[0, 'joy']])),
};
// presses: [time the cap goes down, who, hand]
const PRESS = [[6.0, 'V1', 'L'], [6.6, 'V2', 'R'], [7.1, 'V3', 'L'], [7.7, 'V1', 'L'], [10.4, 'V2', 'R'], [16.55, 'V1', 'L'], [16.8, 'V2', 'R'], [17.05, 'V3', 'L'], [23.65, 'GUS', 'L'], [51.35, 'V1', 'L']];
const pressK = (who, t) => { let k = 0, hand = 'L'; for (const [tp, w, h] of PRESS) if (w === who) { const v = sstep(tp - 0.32, tp - 0.06, t) * (1 - sstep(tp + 0.12, tp + 0.38, t)); if (v > k) { k = v; hand = h; } } return { k, hand }; };
// where everybody stands (inside), by time
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const SPOT = { V1: [0.44, 0.0], V2: [-0.22, 0.38], V3: [-0.22, -0.38], GUS: [-0.22, -0.38], CUR: [1.15, -0.5] };
const pCurIn = new Path(11.15, [{ p: [-2.0, 1.6] }, { p: [-1.2, 1.3], v: 2.2 }, { p: [1.2, 0.9], v: 2.2 }, { p: [1.15, -0.5], v: 2.2, wait: 40, face: yawTo([1.15, -0.5], [0.4, -0.6]) }], 70, 0.8, T);
const pCurOut = new Path(35.8, [{ p: [0, -1.25] }, { p: [-1.4, -1.2], v: 1.9 }, { p: [-4.8, 2.0], v: 1.9, wait: 3 }], 70, 0.8, T);
const pPassA = new Path(37.3, [{ p: [-3.5, 1.9] }, { p: [3.8, 1.6], v: 1.6, wait: 5 }], 70, 0.8, T), pPassB = new Path(37.6, [{ p: [3.6, -1.9] }, { p: [-3.8, -2.2], v: 1.6, wait: 5 }], 70, 0.8, T);
const pTour = [0, 1, 2].map((i) => new Path(25.6, [{ p: [OX + 1.6 + i * 0.8, 4.9 + i * 0.2] }, { p: [OX + 0.3 * (i - 1), 0.9], v: 1.5, wait: 5 }], 70, 0.8, T));
function standAt(P, name, x, z, yaw, t, extra) { P.root.visible = true; P.root.position.set(x, T.at(x, z), z); P.root.rotation.set(0, yaw, 0); const fp = perf[name].at(t, { handsFree: true }); const p = toonify({ ...fp, t }, P, t); if (extra) extra(p); return p; }
function walkOn(P, name, path, t, extra) { P.root.visible = true; const r = place(P, path, t, { terrain: T }); const walking = r.speed > 0.25; const fp = perf[name].at(t, { walking, handsFree: !walking }); const p = toonify({ ...r.pose, ...fp, t }, P, t); if (extra) extra(p, walking); return p; }
const handTo = (p, hand, w, k) => { p['hand' + hand] = { w, k }; p.reachAssist = false; };
const heldAt = (P, hand) => P.palmWorld(hand);

// ======================= PER FRAME =======================
const inside = (t) => !(t >= 24.45 && t < 26.35);
function setup(f) {
  const t = f / FPS; for (const P of ALL) P.root.visible = false;
  const out = !inside(t);
  // signs, case, plaque, calendar, big NO
  const pop = (t0) => Math.max(0.001, EASE.outBack ? EASE.outBack(clamp((t - t0) / 0.25, 0, 1)) : sstep(t0, t0 + 0.25, t));
  SIGN1.visible = t >= 4.3 && t < 32.3; SIGN1.scale.setScalar(t < 4.6 ? pop(4.3) : 1); SIGN2.visible = t >= 13.6 && t < 32.5; SIGN2.scale.setScalar(t < 14.0 ? pop(13.6) : 1);
  if (t >= 31.9 && t < 32.5) { const u = sstep(31.9, 32.4, t); SIGN1.position.set(-0.6, u * 2.5, -0.75); SIGN2.position.set(0.6, u * 2.5, -0.75); } else { SIGN1.position.set(-0.6, 0, -0.75); SIGN2.position.set(0.6, 0, -0.75); }
  CASE.visible = t >= 17.75 && t < 32.6; const cy = t < 18.4 ? 0.6 + 2.2 * (1 - EASE.outCubic(clamp((t - 17.75) / 0.65, 0, 1))) : 0.6; let lift = 0; if (t >= 22.9 && t < 24.3) lift = sstep(22.9, 23.25, t) * (1 - sstep(23.95, 24.3, t)); if (t >= 32.0) lift = sstep(32.0, 32.5, t) * 3;
  CASE.position.set(0, cy + lift * 0.45, 0); CASE.rotation.set(0, 0, 0);
  PLAQ.visible = t >= 40.5; PLAQ.scale.setScalar(t < 40.9 ? pop(40.5) : 1);
  const wd = t < 38.3 ? -1 : Math.min(6, Math.floor((t - 38.3) / 0.13)); DAYS.forEach((d, i) => { d.visible = (wd < 0 ? i === 0 : i === wd); });
  BIGNO.visible = t >= 49.4 && t < 52.1; BIGNO.scale.setScalar(t < 50.4 ? 0.2 + 0.9 * EASE.outBack(clamp((t - 49.4) / 0.9, 0, 1)) : 1.1 + 0.03 * Math.sin(t * 20));
  BUS.visible = out; const bu = EASE.outCubic(clamp((t - 24.45) / 1.1, 0, 1)); BUS.position.set(OX + 5 + 40 * (1 - bu), 0, 6.5); BUS.rotation.set(0, -Math.PI / 2, 0.01 * Math.sin(t * 3));
  // ---- people ----
  const press = (P, name, p) => { const cel = PRESS.some(([tp, w]) => w === name && t > tp + 0.25 && t < tp + 0.95); if (cel) { p.armL = { f: 120 + 15 * Math.sin(t * 14), o: -70, b: 10 }; p.armR = { f: 120 + 15 * Math.sin(t * 14 + 1.3), o: -70, b: 10 }; } const { k, hand } = pressK(name, t); if (k > 0) { const ht = BTOP.clone().add(V(0, 0.015 + (1 - k) * 0.16, 0)); if (CASE.visible && lift < 0.5 && name !== 'GUS') ht.y += 0.5; handTo(p, hand, ht, Math.min(1, k * 1.4)); } return k; };
  let down = 0;
  if (inside(t) && t < 24.45) {
    const vis = (t >= 5.5);
    if (vis) for (const [P, n] of [[V1, 'V1'], [V2, 'V2'], [V3, 'V3']]) { const s = SPOT[n]; const p = standAt(P, n, s[0], s[1], yawTo(s, [0, 0]), t, (pp) => { down = Math.max(down, press(P, n, pp)); if (t >= 14.6 && t < 15.6) pp.head = { ...(pp.head || {}), yaw: (pp.head?.yaw || 0) + 30 * (n === 'V1' ? -1 : 1) }; });
      if (n === 'V3' && t >= 19.1 && t < 21.0) { const k = sstep(19.15, 19.45, t); handTo(p, 'L', V(-0.15, 0.66 + 0.02 * Math.sin(t * 25), -0.27), k); p.handR = { w: V(-0.21, 0.74, -0.25), k: k * 0.8 }; p.reachAssist = false; }
      if (n === 'V1' && t >= 7.62 && t < 9.8) p.head = { ...(p.head || {}), yaw: (p.head?.yaw || 0) + 35 * Math.sin((t - 7.9) * 3.2) * sstep(7.9, 8.1, t) };
      P.update(p);
      if (n === 'V3') { SCREW.visible = t >= 19.1 && t < 21.0; if (SCREW.visible) { SCREW.position.copy(heldAt(V3, 'L')).add(V(0, -0.03, 0)); SCREW.rotation.set(1.2, t * 9, 0); } } }
    if (t >= 11.15) { const p = walkOn(CUR, 'CUR', pCurIn, t, (pp, walking) => { if (t >= 13.2 && t < 14.0) handTo(pp, 'L', V(0.62, 1.05, -0.72), sstep(13.2, 13.5, t) * (1 - sstep(13.75, 14.0, t))); if (t >= 14.6 && t < 15.3) handTo(pp, 'R', V(0.6, 1.16, -0.73), sstep(14.55, 14.7, t) * (1 - sstep(15.05, 15.3, t))); if (t >= 15.3 && t < 16.4) { pp.armL = { f: 85 + 8 * Math.sin(t * 12), o: 20, b: 5 }; } if (t >= 16.45 && t < 17.6) { pp.armL = { f: -5, o: 55, b: 115 }; pp.armR = { f: -5, o: 55, b: 115 }; }
        if (t >= 17.7 && t < 18.6) { pp.armL = { f: 150, o: 30, b: 20 }; pp.armR = { f: 150, o: 30, b: 20 }; } if (t >= 19.7 && t < 20.6) { pp.armL = { f: 60, o: 40, b: 110 }; pp.armR = { f: 60, o: 40, b: 110 }; } }); CUR.update(p); }
    if (t >= 20.74) { const p = standAt(GUS, 'GUS', SPOT.GUS[0], SPOT.GUS[1], yawTo(SPOT.GUS, [0, 0.4]), t, (pp) => { down = Math.max(down, press(GUS, 'GUS', pp)); if (t < 22.66) { pp.armL = { f: -15, o: 20, b: 20 }; pp.armR = { f: -15, o: 20, b: 20 }; }
        if (t >= 22.66) { pp.armR = { f: 70, o: 20, b: 80 }; } if (t >= 22.66 && t < 23.4) pp.head = { ...(pp.head || {}), yaw: 40 * Math.sin((t - 22.66) * 8) }; if (t >= 22.85 && t < 24.3 && !(t > 23.3 && t < 24.0)) handTo(pp, 'L', CASE.position.clone().add(V(0, 0.55, 0.28)), sstep(22.85, 23.0, t)); });
      GUS.update(p); SAND.visible = t >= 22.66; if (SAND.visible) { SAND.position.copy(heldAt(GUS, 'R')).add(V(0, 0.02, 0)); SAND.rotation.set(0, GUS.root.rotation.y, 0); } }
    if (t >= 20.74 && t < 22.6) { V1.root.visible = V2.root.visible = V3.root.visible = false; }  // lunch: only Gus
    if (t >= 22.6) { V1.root.visible = V2.root.visible = V3.root.visible = false; CUR.root.visible = false; }
  }
  if (t < 22.66 || t >= 24.45) SAND.visible = false; if (!(t >= 19.1 && t < 21.0)) SCREW.visible = false;
  // outside: bus + tourists walking to the door
  if (out) { TOUR.forEach((P, i) => { if (t < 25.6) { P.root.visible = false; return; } const p = walkOn(P, 'T' + i, pTour[i], t); P.update(p); }); }
  // gift shop + money (26.38 - 30.4)
  if (t >= 26.35 && t < 30.85) { const p2 = standAt(V2, 'V2', 3.4, -2.25, Math.PI, t, (pp) => { if (t < 28.3) handTo(pp, 'R', V(3.3, 0.9, -2.95), sstep(26.6, 27.0, t) * (1 - sstep(27.9, 28.2, t))); }); V2.update(p2);
    const p1 = standAt(V1, 'V1', 4.2, -2.35, Math.PI + 0.3, t); V1.update(p1);
    const pc = standAt(CUR, 'CUR', 3.7, -3.75, 0, t, (pp) => { if (t >= 28.4) { pp.armL = { f: 120 + 15 * Math.sin(t * 9), o: -70, b: 10 }; pp.armR = { f: 120 + 15 * Math.sin(t * 9 + 1), o: -70, b: 10 }; } }); CUR.update(pc); }
  CASH.forEach((b, i) => { const a = t - 28.4 - hash(i) * 0.6; b.visible = a > 0 && t < 30.85; if (!b.visible) return; b.position.set(3.7 + (hash(i + 2) - 0.5) * 2.4 + Math.sin(a * 4 + i) * 0.2, Math.max(0.86, 2.8 - a * (1.3 + hash(i + 9) * 0.6)), -3.3 + (hash(i + 5) - 0.5) * 1.8); b.rotation.set(Math.sin(a * 6 + i) * 0.8, a * 2 + i, Math.cos(a * 5 + i) * 0.6); });
  // 30.86 - 37.2 curator removes the signs, shows the plug, leaves
  if (t >= 30.85 && t < 37.3) { const p = t < 35.8 ? standAt(CUR, 'CUR', 0, -1.25, 0, t, (pp) => { if (t >= 31.6 && t < 32.4) { pp.armL = { f: 150, o: 25, b: 15 }; pp.armR = { f: 150, o: 25, b: 15 }; } if (t >= 33.6 && t < 35.4) { pp.armL = { f: 40, o: 70, b: 70 }; pp.armR = { f: 40, o: 70, b: 70 }; pp.shrug = (pp.shrug || 0) + 2.2 * Math.sin((t - 33.6) * 3.2) ** 2; } })
      : walkOn(CUR, 'CUR', pCurOut, t); CUR.update(p); }
  // 37.3 - 39.3 people walk past, nobody looks
  if (t >= 37.3 && t < 39.35) { V1.update(walkOn(V1, 'V1', pPassA, t)); V3.update(walkOn(V3, 'V3', pPassB, t)); }
  // 39.4 - 41.8 curator puzzled next to the button
  if (t >= 39.35 && t < 41.8) { const p = standAt(CUR, 'CUR', -0.95, 0.35, yawTo([-0.95, 0.35], [0, 0]), t, (pp) => { pp.handR = { w: CUR.headWorld().add(V(0.05, 0.2, 0)).addScaledVector(V(Math.cos(CUR.root.rotation.y), 0, -Math.sin(CUR.root.rotation.y)), -0.32), k: 1 }; pp.reachAssist = false; }); CUR.update(p); }
  // 41.8 - 49.2 freedom: Gus with a NO sign takes the FREEDOM flag away, V1 grabs it back
  if (t >= 41.8 && t < 49.25) { const p1 = standAt(V1, 'V1', 0.6, 0.6, yawTo([0.6, 0.6], [1.35, 0.85]), t, (pp) => { pp.armL = { f: 70, o: 20, b: 60 }; if (t >= 47.5 && t < 48.1) handTo(pp, 'L', V(1.0, 0.95, 0.72), sstep(47.5, 47.7, t)); }); V1.update(p1);
    const pg = standAt(GUS, 'GUS', 1.35, 0.85, yawTo([1.35, 0.85], [0.6, 0.6]), t, (pp) => { pp.armR = { f: 85, o: 15, b: 30 }; if (t >= 46.4 && t < 47.5) handTo(pp, 'L', V(0.85, 0.95, 0.68), sstep(46.4, 46.7, t) * (1 - sstep(47.2, 47.5, t))); }); GUS.update(pg);
    NOSIGN.visible = t < 44.0; if (NOSIGN.visible) { NOSIGN.position.copy(heldAt(GUS, 'R')).add(V(0, 0.18, 0)); NOSIGN.rotation.set(0, GUS.root.rotation.y, 0); NOSIGN.scale.setScalar(t < 42.1 ? pop(41.8) : 1); }
    FLAG.visible = t >= 44.0; const fV = heldAt(V1, 'L'), fG = heldAt(GUS, 'L'); const own = t < 46.8 ? 0 : t < 47.7 ? 1 : 0; FLAG.position.copy(own ? fG : fV); FLAG.rotation.set(0, 0, 0.2 * Math.sin(t * 4)); if (t >= 44.0 && t < 44.3) FLAG.scale.setScalar(pop(44.0)); else FLAG.scale.setScalar(1); }
  else { NOSIGN.visible = false; FLAG.visible = false; }
  // 49.25 - 52.1 giant NO, then V1 slams the button
  if (t >= 49.25 && t < 52.1) { const p = standAt(V1, 'V1', SPOT.V1[0], SPOT.V1[1], yawTo(SPOT.V1, [0, 0]), t, (pp) => { down = Math.max(down, press(V1, 'V1', pp)); }); V1.update(p); }
  CAP.position.y = CAP_Y - 0.035 * clamp(down * 1.5 - 0.5, 0, 1); const glow = t >= 52.1 ? 0.5 + 0.5 * Math.sin((t - 52.1) * 5) : 0; CAP.material = glow > 0.6 ? capGlow : capM;
  // counter value by time
  let cv = '0'; const ups = [[6.0, '1'], [6.6, '2'], [7.1, '3'], [7.7, '4'], [10.4, '5'], [17.05, '15'], [23.65, '16'], [26.3, '999+'], [37.3, '0'], [51.35, '1']]; let tc = -9; for (const [tt, v] of ups) if (t >= tt) { cv = v; tc = tt; }
  for (const k in CNT) { CNT[k].visible = k === cv && !out; if (CNT[k].visible) CNT[k].scale.setScalar(t - tc < 0.3 ? 1 + 0.35 * Math.sin((t - tc) / 0.3 * Math.PI) : 1); }
  // tourists queue behind the rope while the button is famous (inside, 5.5 - 17.6)
  if (!out && t >= 5.5 && t < 17.6) TOUR.forEach((Pq, i) => { const x = -1.4 - i * 0.75, z = 2.15; const pq = standAt(Pq, 'T' + i, x, z, yawTo([x, z], [0, 0]), t, (pp) => { pp.head = { ...(pp.head || {}), yaw: (pp.head?.yaw || 0) + 18 * Math.sin(t * 1.3 + i * 2) }; if (t > 16.55 && t < 17.6) { pp.armL = { f: 120, o: -70, b: 10 }; pp.armR = { f: 120, o: -70, b: 10 }; } }); Pq.update(pq); });
  return { t, out };
}

// ======================= CAMERA (cuts on the words) =======================
const CINE = new Cine({ blend: 0.5 }); const P = CT.pt;
const btn = P(0, 0.85, 0);
CINE.shot(0.0, 1.75, { rig: 'fly', path: [[OX - 7, 6, 18], [OX - 2, 3.2, 9]], at: P(OX, 3.4, 0), fov: [42, 36], shake: 0.15, ease: 'inOut' })
  .shot(1.75, 4.3, { rig: 'crane', at: btn, size: [5.0, 1.5], az: [35, 10], el: [50, 14], fov: 34, shake: 0.25, cut: true, ease: 'inOut' })
  .shot(4.3, 5.55, { rig: 'orbit', at: P(-0.3, 0.95, -0.4), size: [1.9, 1.5], az: [-15, 30], el: [10, 6], fov: 32, shake: 0.3, kick: 9 })
  .shot(5.55, 6.35, { rig: 'orbit', at: () => V1.headWorld().lerp(BTOP, 0.5), size: [2.1, 1.8], az: [-80, -100], el: [58, 50], fov: 32, shake: 0.4 })
  .shot(6.35, 6.95, { rig: 'orbit', at: () => V2.headWorld().lerp(BTOP, 0.5), size: [1.8, 1.6], az: [135, 160], el: [16, 12], fov: 32, shake: 0.4 })
  .shot(6.95, 7.55, { rig: 'orbit', at: () => V3.headWorld().lerp(BTOP, 0.5), size: [1.8, 1.6], az: [15, 40], el: [18, 14], fov: 32, shake: 0.4 })
  .shot(7.55, 8.35, { rig: 'push', at: () => V1.headWorld().lerp(BTOP, 0.4), size: [1.9, 1.35], az: [-98, -86], el: [52, 44], fov: 32, shake: 0.35, ease: 'snap' })
  .shot(8.35, 9.95, { rig: 'push', at: P(0.85, 0.12, 0.35), size: [1.9, 0.9], az: [35, 62], el: [38, 26], fov: 32, shake: 0.25 })
  .shot(9.95, 11.1, { rig: 'orbit', at: () => V2.headWorld().lerp(BTOP, 0.5), size: [1.7, 1.45], az: [165, 140], el: [14, 10], fov: 32, shake: 0.4 })
  .shot(11.1, 13.4, { rig: 'track', at: () => CUR.torso.localToWorld(V(0, 0.3, 0)), size: ['fs', 'ms'], az: [70, 25], el: [10, 6], fov: 34, shake: 0.35 })
  .shot(13.4, 14.55, { rig: 'push', at: P(0.62, 1.1, -0.75), size: [1.4, 0.85], az: [30, 50], el: [24, 16], fov: 30, shake: 0.3 })
  .shot(14.55, 15.95, { rig: 'push', at: CT.head(CUR), size: ['ms', 'mcu'], az: [-130, -105], el: [8, 4], fov: 30, shake: 0.5, ease: 'snap' })
  .shot(15.95, 17.6, { rig: 'orbit', at: P(0.2, 1.1, -0.3), size: [3.0, 2.4], az: [45, -30], el: [26, 16], fov: 34, shake: 0.6, fovKick: 6 })
  .shot(17.6, 19.1, { rig: 'crane', at: P(0, 0.95, 0), size: [3.0, 1.8], az: [-25, 10], el: [30, 10], fov: 34, shake: 0.35 })
  .shot(19.1, 20.7, { rig: 'push', at: () => SCREW.visible ? SCREW.position.clone().add(V(0, 0.1, 0)) : V(0, 0.8, -0.3), size: [1.3, 0.75], az: [10, 35], el: [14, 8], fov: 30, shake: 0.35 })
  .shot(20.7, 22.6, { rig: 'push', at: CT.head(GUS), size: ['ms', 'mcu'], az: [-45, -25], el: [14, 10], fov: 30, shake: 0.3 })
  .shot(22.6, 24.45, { rig: 'orbit', at: () => GUS.torso.localToWorld(V(0, 0.4, 0)).lerp(BTOP, 0.3), size: [1.7, 1.3], az: [25, 75], el: [14, 9], fov: 32, shake: 0.4 })
  .shot(24.45, 26.35, { rig: 'orbit', at: P(OX + 2, 2.2, 2.5), size: [11, 9], az: [-34, -18], el: [8, 10], fov: 38, cut: true, shake: 0.3 })
  .shot(26.35, 28.35, { rig: 'push', at: P(3.6, 1.0, -3.0), size: [2.8, 1.8], az: [25, 0], el: [38, 30], fov: 34, cut: true, shake: 0.3 })
  .shot(28.35, 30.85, { rig: 'orbit', at: CT.head(CUR), size: ['ms', 'mcu'], az: [-20, 25], el: [6, 4], fov: 30, shake: 0.5 })
  .shot(30.85, 33.1, { rig: 'orbit', at: P(0, 1.0, -0.8), size: [2.8, 2.2], az: [45, 10], el: [12, 8], fov: 34, cut: true, shake: 0.3 })
  .shot(33.1, 35.75, { rig: 'orbit', at: () => CUR.torso.localToWorld(V(0, 0.2, 0)).lerp(PLUG.position, 0.35), size: [2.0, 1.5], az: [10, 40], el: [16, 10], fov: 32, shake: 0.3 })
  .shot(35.75, 37.35, { rig: 'push', at: btn, size: [2.4, 1.3], az: [25, 0], el: [8, 4], fov: 32, shake: 0.2 })
  .shot(37.35, 39.35, { rig: 'push', at: P(-0.4, 1.1, -1.4), size: [4.0, 3.0], az: [20, 8], el: [10, 8], fov: 36, cut: true, shake: 0.15 })
  .shot(39.35, 40.45, { rig: 'orbit', at: () => CUR.headWorld().lerp(BTOP, 0.45), size: [1.9, 1.4], az: [55, 80], el: [8, 5], fov: 32, shake: 0.35 })
  .shot(40.45, 41.8, { rig: 'push', at: P(-0.6, 2.6, -3.9), size: [5.8, 4.8], az: [-12, 8], el: [2, 2], fov: 30, shake: 0.2 })
  .shot(41.8, 44.05, { rig: 'orbit', at: () => V1.headWorld().lerp(GUS.headWorld(), 0.5), size: [2.0, 1.6], az: [5, -30], el: [8, 6], fov: 32, cut: true, shake: 0.35 })
  .shot(44.05, 46.45, { rig: 'push', at: () => V1.headWorld().lerp(FLAG.position.clone().add(V(0, 0.3, 0)), 0.4), size: [1.4, 0.95], az: [-40, -18], el: [8, 6], fov: 30, shake: 0.3 })
  .shot(46.45, 49.25, { rig: 'orbit', at: () => V1.headWorld().lerp(GUS.headWorld(), 0.5), size: [2.0, 1.7], az: [-20, 20], el: [10, 8], fov: 32, shake: 0.5 })
  .shot(49.25, 50.85, { rig: 'push', at: P(0, 1.3, -0.8), size: [3.6, 2.4], az: [25, 10], el: [8, 4], fov: 34, cut: true, shake: 0.5, ease: 'snap' })
  .shot(50.85, 52.1, { rig: 'orbit', at: () => V1.headWorld().lerp(BTOP, 0.35), size: [1.7, 1.3], az: [-55, -85], el: [16, 12], fov: 30, shake: 0.6 })
  .shot(52.1, 56.6, { rig: 'push', at: P(0, 0.75, 0), size: [1.6, 0.3], az: [-60, 0], el: [30, 55], fov: [32, 28], shake: 0.1, ease: 'inOut' });

// ======================= LOOK =======================
const ROOM = mkLook({ sun: [0.45, 0.85, 0.4], lit: '#fff2dc', litK: 1.08, shade: '#b0a8c8', ambSky: '#fff8f0', ambGnd: '#f8e8d0', rim: '#fff0d8', fog: '#f8f0e8', fogR: [30, 200], sky: ['#5a9ae8', '#a8d0f4', '#fff0d8', '#f8f0e8'], contrast: 1.04, vig: 0.1, glow: 0.35, grain: 0, desat: 0, sat: 1.18, lo: '#fff8f0', hi: '#fffff0', exposure: 1.05, shadow: 0.75 });
const OUTL = mkLook({ sun: [0.5, 0.8, 0.5], lit: '#fff6e0', litK: 1.08, shade: '#a8b4e0', ambSky: '#eef4ff', ambGnd: '#f8f0d8', rim: '#fff4d8', fog: '#e0ecff', fogR: [60, 300], sky: ['#2a7ae8', '#6ab6f4', '#cfeaff', '#ffffff'], contrast: 1.04, vig: 0.06, glow: 0.3, grain: 0, desat: 0, sat: 1.2, lo: '#f8f8ff', hi: '#fffff0', exposure: 1.05, shadow: 0.8 });
const DIM = mkLook({ sun: [0.45, 0.85, 0.4], lit: '#c8c0d8', shade: '#6a6488', ambSky: '#d8d0f0', ambGnd: '#a898b0', rim: '#a0a8ff', fog: '#3a3a50', fogR: [10, 60], sky: ['#1a1a2a', '#2a2a40', '#3a3a50', '#1a1a2a'], contrast: 1.1, vig: 0.5, glow: 0.6, grain: 0.01, desat: 0.2, sat: 1.0, lo: '#d0d8ff', hi: '#fff0e0', exposure: 0.95, shadow: 0.8 });
window.renderFrame = function (f) {
  const { t, out } = setup(f); const cam = CINE.at(t); CAMPOS.set(...cam.pos); for (const Pp of ALL) placeMarks(Pp, t);
  const dark = sstep(37.3, 37.6, t) * (1 - sstep(39.2, 39.5, t)) * 0.65 + sstep(52.1, 52.6, t) * 0.85;   // "nobody touches it" dims the room; ending spotlight
  const L = out ? OUTL : mixLook(ROOM, DIM, dark);
  const pl = []; if (t >= 52.1) pl.push({ pos: [0, 1.4, 0.3], col: [2.2, 0.6, 0.4], range: 2.4 });
  applyLook(L, { shadowCenter: [clamp(cam.look[0], -5, OX + 5), 1, clamp(cam.look[2], -5, 8)], shadowSize: out ? 30 : 14, pl });
  C.skyU.uSunSize.value = 0; C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.03, far: 500 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37;
  dofU.uFade.value = 1 - Math.min(1, t / 0.4) + Math.max(0, (t - (DURATION - 0.9)) / 0.9); dofU.uFlash.value = 0;
  C.drawFrame(); return 'ok';
};
window.dbg = (f) => { setup(f); const r = (v) => v.toArray().map((x) => +x.toFixed(2)); return { cur: r(CUR.root.position), v1: r(V1.root.position), gus: r(GUS.root.position) }; };
window.ready = true;
