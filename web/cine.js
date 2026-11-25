// cine.js v6.1 : cinematography. Fast, continuous, high-energy camera built from SHOTS that always keep their subject framed.
//   const cam = new Cine();   cam.shot(0, 2.5, {rig:'orbit', at:T.head(A), size:'cu', az:[-40, 70], el:[5,12]});   ...   const c = cam.at(t);  C.setCam(c)
// No cuts by default: neighbouring shots blend with a FAST swoosh (roll + fov kick) so every transition is a move through space (house style). {cut:true} gives a hard cut if a story needs it.
// Rigs: static push orbit crane track pov ots dollyzoom low high fly.   Sizes: ecu cu mcu ms mws fs ws ews (or metres of frame height).
import * as THREE from 'three';
import { clamp, lerp, sstep, EASE, noise1 } from './motion.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SIZE = { ecu: 0.16, cu: 0.42, mcu: 0.7, ms: 1.05, mws: 1.45, fs: 2.1, ws: 3.6, ews: 9 };
// ---- target resolvers: fn(t) -> Vector3. Person-based ones read the CURRENT frame pose (call cam.at(t) after updating people). ----
export const T = {
  head: (P) => () => P.headWorld(), chest: (P) => () => P.torso.localToWorld(V(0, 0.4, 0.1)), body: (P) => () => P.root.position.clone().add(V(0, 0.95 * P.height, 0)),
  hand: (P, s = 'L') => () => P.palmWorld(s), feet: (P) => () => P.root.position.clone(), eyes: (P) => () => P.head.localToWorld(V(0, 0.03, 0.17)),
  pt: (x, y, z) => { const f = () => V(x, y, z); f.pure = true; return f; }, obj: (g, o = [0, 0, 0]) => () => g.localToWorld(V(...o)),
  mid: (a, b, w = 0.5) => (t) => a(t).lerp(b(t), w),
  // time-pure walker target (lets the camera LEAD/LAG smoothly): path + terrain + height above ground
  walker: (path, terrain, h = 1.5) => { const f = (t) => { const s = path.at(t); return V(s.x, (terrain ? terrain.at(s.x, s.z) : 0) + h, s.z); }; f.pure = true; return f; },
  heading: (P) => () => P.root.rotation.y,
};
const lerpA = (a, t) => (Array.isArray(a) ? lerp(a[0], a[1], t) : a);
export class Cine {
  constructor(o = {}) { this.shots = []; this.blend = o.blend ?? 0.55; this.env = o.env || {}; this.defaults = { fov: 32, shake: 0.35 }; }
  shot(t0, t1, s) { this.shots.push({ t0, t1, ...s }); this.shots.sort((a, b) => a.t0 - b.t0); return this; }
  _eval(s, t) {
    const u0 = clamp((t - s.t0) / Math.max(1e-3, s.t1 - s.t0), 0, 1), u = EASE[s.ease || 'inOut'](u0);
    let c = s.at(t); if (s.lag && s.at.pure) { const a = V(); for (let i = 0; i <= 4; i++) a.add(s.at(t - s.lag * i / 4)); c = a.multiplyScalar(1 / 5); }
    const fov = lerpA(s.fov ?? this.defaults.fov, u) + (s.fovKick || 0) * Math.sin(Math.PI * u0);
    const size = s.size ?? 'ms', S = (k) => (typeof k === 'number' ? k : SIZE[k] ?? 1.05); const H = Array.isArray(size) ? lerp(S(size[0]), S(size[1]), u) : S(size);
    let d = (H / 2) / Math.tan((fov * Math.PI) / 360);
    let az = lerpA(s.az ?? 0, u), el = lerpA(s.el ?? 8, u); const rel = s.rel && s.rel(t) !== undefined ? s.rel(t) * 180 / Math.PI : 0; az += rel;
    if (s.rig === 'crane') el = lerpA(s.el ?? [5, 55], u); if (s.rig === 'low') el = -10; if (s.rig === 'high') el = 60;
    const A = (az * Math.PI) / 180, E = (el * Math.PI) / 180; let pos = c.clone().add(V(Math.sin(A) * Math.cos(E), Math.sin(E), Math.cos(A) * Math.cos(E)).multiplyScalar(d)); let look = c.clone();
    if (s.rig === 'pov' && s.from) { pos = s.from(t).clone(); look = s.at(t).clone(); }
    if (s.rig === 'ots' && s.from) { const a = s.from(t), b = c; const dir = b.clone().sub(a).setY(0).normalize(); const side = V(-dir.z, 0, dir.x); pos = a.clone().addScaledVector(dir, -0.45).addScaledVector(side, 0.3 * (s.side ?? 1)).add(V(0, 0.28, 0)); look = b.clone(); }
    if (s.rig === 'fly' && s.path) { const k = s.path; const n = k.length - 1, f = u * n, i = Math.min(n - 1, Math.floor(f)), w = f - i; pos = V(...k[i]).lerp(V(...k[i + 1]), w); }
    let roll = lerpA(s.roll ?? 0, u);
    if (s.pan) { look.add(V(...s.pan).multiplyScalar(u)); }
    // handheld energy (deterministic noise): position + roll + a little aim drift
    const sh = (s.shake ?? this.defaults.shake); if (sh) { const q = t * 1.0 + (s.seed || 0); pos.add(V(noise1(q * 1.7, 1), noise1(q * 2.1, 2), noise1(q * 1.3, 3)).multiplyScalar(0.012 * sh)); look.add(V(noise1(q * 1.9, 4), noise1(q * 1.5, 5), noise1(q * 2.3, 6)).multiplyScalar(0.01 * sh)); roll += 0.45 * sh * noise1(q * 1.1, 7); }
    let focus = pos.distanceTo(look); if (typeof s.focus === 'number') focus = s.focus; else if (typeof s.focus === 'function') focus = pos.distanceTo(s.focus(t));
    return { pos, look, fov, roll, focus, ap: s.ap ?? clamp(2.2 / Math.max(0.35, H) * 4.0, 1.5, 9) };
  }
  at(t) {
    const S = this.shots; let i = 0; while (i < S.length - 1 && t >= S[i + 1].t0) i++;
    let c = this._eval(S[i], t); const nx = S[i + 1];
    if (nx && !nx.cut) { const b = nx.blend ?? this.blend, tb = nx.t0 - b * 0.5, u = clamp((t - tb) / b, 0, 1); if (u > 0) { const n = this._eval(nx, t), w = EASE.inOutCubic(u), sw = Math.sin(Math.PI * u);
      c = { pos: c.pos.lerp(n.pos, w), look: c.look.lerp(n.look, w), fov: lerp(c.fov, n.fov, w) + (nx.kick ?? 7) * sw, roll: lerp(c.roll, n.roll, w) + (nx.swing ?? 5) * sw * (i % 2 ? -1 : 1), focus: lerp(c.focus, n.focus, w), ap: lerp(c.ap, n.ap, w) }; } }
    else if (nx && nx.cut && t >= nx.t0) c = this._eval(nx, t);
    // safety: never inside a solid / below ground
    const env = this.env; if (env.colliders) { let n = 0; while (env.colliders.inside(c.pos.x, c.pos.y, c.pos.z, 0.14) && n++ < 30) c.pos.lerp(c.look, 0.06); }
    if (env.terrain) c.pos.y = Math.max(c.pos.y, env.terrain.at(c.pos.x, c.pos.z) + 0.18);
    return { pos: c.pos.toArray(), look: c.look.toArray(), fov: c.fov, roll: (c.roll * Math.PI) / 180 /* degrees in, radians out */, focus: Math.max(0.4, c.focus), ap: c.ap };
  }
}
// ---- automatic shot plan from beats: [{t0,t1, subject:resolver-or-Person, intensity 0..1, from?:resolver}]. Picks fast, varied rigs; never repeats a rig twice in a row. ----
export function planShots(cine, beats, style = {}) {
  const pal = style.palette || ['orbit', 'push', 'track', 'crane', 'static', 'low', 'ots'], speed = style.speed ?? 1, shake = style.shake ?? 0.35; let last = '', k = 0;
  for (const b of beats) { const hi = b.intensity ?? 0.5; let rig = b.rig; if (!rig) { const cand = pal.filter((r) => r !== last && (r !== 'ots' || b.from)); rig = cand[(k++ * 3 + Math.round(hi * 5)) % cand.length]; } last = rig;
    const sz = hi > 0.75 ? ['mcu', 'cu'] : hi > 0.45 ? ['ms', 'mcu'] : ['mws', 'ms']; const az0 = ((k * 53) % 90) - 45, dir = k % 2 ? 1 : -1; const at = typeof b.subject === 'function' ? b.subject : b.subject.headWorld ? T.head(b.subject) : b.subject;
    cine.shot(b.t0, b.t1, { rig, at, from: b.from, size: b.size || sz, az: [az0, az0 + dir * (60 + 90 * hi) * speed], el: rig === 'crane' ? [4, 50] : [6, 12 + 14 * hi], fov: b.fov || [34, 30 - 6 * hi], ease: hi > 0.6 ? 'snap' : 'inOut', shake: shake * (0.6 + hi), fovKick: hi * 6, seed: k * 7 }); }
  return cine;
}
