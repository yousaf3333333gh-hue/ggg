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
const { stage, dofU, FPS, PX } = C; export const DURATION = 12.0;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const tm = (h, o = {}) => C.toon({ color: new THREE.Color(h), ...o });
const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
// ---- WORD TIMES: fill from words.json (GitHub 'transcribe' workflow). w('bounces') = start time of that word; w('left', 2) = 2nd 'left'
const WORDS = []; // e.g. paste: [{"w":"Ten","s":0.0},...]  or load at build time
const w = (word, n = 1, fallback = 0) => { let k = 0; for (const x of WORDS) if (x.w.toLowerCase().replace(/\W/g, '') === word.toLowerCase() && ++k === n) return x.s; return fallback; };
// ---- SET: ground, a table, a wall. EVERY solid object is also registered with addSolidCentered (camera never enters it; QA checks people)
W.add(box(40, 0.1, 40, tm(0x8ccf5a), 0, -0.05, 0)); setGround(() => 0);
W.add(box(1.6, 0.75, 0.9, tm(0x8a5a32), 0, 0.375, -1.2)); addSolidCentered('table', 0, 0.375, -1.2, 1.6, 0.75, 0.9);
W.add(box(8, 2.6, 0.2, tm(0xf0e2c8), 0, 1.3, -3)); addSolidCentered('backwall', 0, 1.3, -3, 8, 2.6, 0.2);
for (let i = 0; i < 4; i++) { const cl = makeCloud(i + 3, 1.2); cl.position.set(-60 + i * 40, 40, -90); W.add(cl); }
// ---- CAST (pick NEW ids for every video, see catalogue/CAST.md and casting_log.json)
const A = makeCast(W, 'inventor', { hits: [[2.0, 'take', 1.0], [6.0, 'jolt', 0.8]], loops: [[3.0, 4.5, 'laugh']], marks: [['!', 2.0, 2.8]] });
const Bp = makeCast(W, 'mayor', { hits: [[6.1, 'double', 1.0]], loops: [[8.0, 9.5, 'rage']], marks: [['x', 8.0, 9.4]] });
const Ck = makeCast(W, 'kid2', { hits: [[2.1, 'take', 0.8]], loops: [[9.6, 11.5, 'bob']], marks: [] });
const ALL = [A, Bp, Ck];
const beats = (arr) => arr.map(([t, emo, tr]) => ({ t, emo, trans: tr ?? 0.12 }));
const PERF = new Map([[A, new Performer(1, { intensity: 1.5, auto: false }).beats(beats([[0, 'proud'], [2.0, 'shock', 0.06], [2.6, 'grin'], [3.0, 'laugh'], [4.6, 'smug'], [6.0, 'gasp', 0.06], [7.0, 'worried'], [9.6, 'joy']]))],
  [Bp, new Performer(2, { intensity: 1.5, auto: false }).beats(beats([[0, 'stern'], [2.0, 'curious'], [4.0, 'smug'], [6.1, 'shock', 0.06], [7.2, 'angry'], [9.6, 'relief']]))],
  [Ck, new Performer(3, { intensity: 1.5, auto: false }).beats(beats([[0, 'happy'], [2.1, 'awe', 0.08], [3.2, 'joy'], [6.0, 'gasp'], [9.6, 'laugh']]))]]);
function pose(P, t, extra) { const p = toonify({ ...PERF.get(P).at(t, { handsFree: true }), t }, P, t); if (extra) extra(p); return p; }
const UP = (p, t, ph = 0) => { p.armL = { f: 120 + 15 * Math.sin(t * 13 + ph), o: -70, b: 10 }; p.armR = { f: 120 + 15 * Math.sin(t * 13 + ph + 1.3), o: -70, b: 10 }; };   // celebration: arms OUT, never in front of the face
const GADGET = new THREE.Group(); W.add(GADGET); GADGET.add(box(0.4, 0.3, 0.3, tm(0xd8402a), 0, 0.15, 0, 0.04)); GADGET.add(cyl(0.05, 0.05, 0.25, tm(0x2a2a2a), 0, 0.42, 0, 10)); const BULB = sph(0.09, tm(0xfff2a0, { unlit: 1, noInk: 1 }), 0, 0.6, 0, 12, 8); GADGET.add(BULB);
GADGET.position.set(0, 0.75, -1.2);
function setup(f) {
  const t = f / FPS;
  A.root.position.set(-0.9, 0, -0.25); A.root.rotation.y = 0.5; A.update(pose(A, t, (p) => { if (t > 3.0 && t < 4.5) UP(p, t); if (t > 1.2 && t < 2.0) p.handR = { w: V(-0.15, 0.95, -0.95), k: 1 }; }));
  Bp.root.position.set(1.0, 0, -0.2); Bp.root.rotation.y = -0.5; Bp.update(pose(Bp, t, (p) => { if (t > 8.0 && t < 9.5) { p.armL = { f: 70, o: -20, b: 10 }; } }));
  Ck.root.position.set(0.1, 0, 0.75); Ck.root.rotation.y = Math.PI * 0.95; Ck.update(pose(Ck, t, (p) => { if (t > 9.6) UP(p, t, 1); }));
  BULB.visible = (t > 2.0 && t < 6.0) || t > 9.6; GADGET.rotation.y = t > 6.0 && t < 9.6 ? 0.2 * Math.sin(t * 40) : 0;
  return { t };
}
// ---- CAMERA: a new shot about every 1 s, every shot MOVES (orbit/push/crane/track), cut:true only when the place changes
const CINE = new Cine({ blend: 0.32 }); const P = CT.pt; const table = P(0, 0.95, -1.2);
[[0, 1.0, { rig: 'fly', path: [[-6, 4, 7], [-2.5, 2, 3.5]], at: table, fov: [40, 34], shake: 0.3 }],
 [1.0, 2.0, { rig: 'orbit', at: () => A.headWorld(), size: [1.6, 1.2], az: [-10, 25], el: [10, 6], fov: 32, shake: 0.4 }],
 [2.0, 2.8, { rig: 'push', at: () => BULB.getWorldPosition(V()), size: [1.2, 0.6], az: [-20, 0], el: [20, 12], fov: 30, shake: 0.6, ease: 'snap', fovKick: 8 }],
 [2.8, 4.0, { rig: 'orbit', at: () => A.headWorld().lerp(Ck.headWorld(), 0.5), size: [2.4, 2.0], az: [-40, 30], el: [10, 14], fov: 32, shake: 0.5 }],
 [4.0, 5.0, { rig: 'crane', at: table, size: [2.6, 4.0], az: [60, 20], el: [10, 60], fov: 34, shake: 0.3 }],
 [5.0, 6.0, { rig: 'push', at: () => Bp.headWorld(), size: [1.8, 1.1], az: [-60, -40], el: [6, 4], fov: 30, shake: 0.4 }],
 [6.0, 7.0, { rig: 'orbit', at: table, size: [2.2, 1.8], az: [10, -60], el: [14, 8], fov: 32, shake: 0.9, fovKick: 10 }],
 [7.0, 8.0, { rig: 'push', at: () => A.headWorld(), size: [1.6, 1.0], az: [50, 35], el: [4, 2], fov: 30, shake: 0.6, ease: 'snap' }],
 [8.0, 9.6, { rig: 'orbit', at: () => Bp.headWorld(), size: [1.8, 1.5], az: [-70, -20], el: [8, 10], fov: 32, shake: 0.7 }],
 [9.6, 12.1, { rig: 'crane', at: () => Ck.headWorld(), size: [1.6, 6.0], az: [20, -20], el: [6, 45], fov: 34, shake: 0.2 }],
].forEach(([a, b, s]) => CINE.shot(a, b, s));
const LOOK = mkLook({ sun: [0.5, 0.8, 0.5], lit: '#fff4dc', litK: 1.08, shade: '#a8b4e0', ambSky: '#eef4ff', ambGnd: '#f8f0d8', rim: '#fff0d0', fog: '#dcecff', fogR: [40, 260], sky: ['#2a7ae8', '#6ab6f4', '#cfeaff', '#ffffff'], contrast: 1.05, vig: 0.08, glow: 0.35, sat: 1.2, exposure: 1.05, shadow: 0.8 });
window.renderFrame = function (f) {
  const { t } = setup(f); const cam = guardCam(CINE.at(t)); CAMPOS.set(...cam.pos); for (const Pp of ALL) placeMarks(Pp, t);
  applyLook(LOOK, { shadowCenter: [cam.look[0], 1, cam.look[2]], shadowSize: 14 }); C.skyU.uSunSize.value = 0;
  C.setCam({ pos: cam.pos, look: cam.look, fov: cam.fov, roll: cam.roll, near: 0.03, far: 500 });
  dofU.uFocus.value = cam.focus; dofU.uAper.value = cam.ap * PX * 0.6; dofU.uMaxC.value = 10 * PX; dofU.uTime.value = f * 0.37; dofU.uFade.value = 1 - Math.min(1, t / 0.4) + Math.max(0, (t - (DURATION - 0.6)) / 0.6); dofU.uFlash.value = 0;
  C.drawFrame(); return 'ok';
};
window.ready = true;
