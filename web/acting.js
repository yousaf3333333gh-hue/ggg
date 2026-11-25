// acting.js v6 : makes characters ALIVE. Silent characters act with eyes, brows, lips-shape, breathing, weight, head and hands.
//   const a = new Actor(seed, {mood:'tense'});   per frame:  const life = a.life(t);   pose = {...life, expr, ...}
//   face(track, t)  : expression timeline with FAST transitions    gest(name, hand, k) : hand-target library (IK, torso space)
import { clamp, lerp, sstep, noise1, hash, EASE } from './motion.js';

// ---- moods: baseline body language (applied on top of the expression) ----
export const MOODS = {
  calm:   { breath: 1.0, rate: 1.4, shrug: 0.0, lean: 0, hp: 0, blink: 3.6, jit: 0.5, tremble: 0, fid: 0.4 },
  tense:  { breath: 1.2, rate: 2.2, shrug: 0.5, lean: 2, hp: -2, blink: 2.6, jit: 1.0, tremble: 0.2, fid: 0.8 },
  afraid: { breath: 1.9, rate: 3.6, shrug: 0.9, lean: -3, hp: -4, blink: 1.8, jit: 1.8, tremble: 0.7, fid: 1.0 },
  sad:    { breath: 0.9, rate: 1.0, shrug: -0.2, lean: 5, hp: 10, blink: 4.5, jit: 0.25, tremble: 0.05, fid: 0.15 },
  tired:  { breath: 1.1, rate: 1.0, shrug: -0.3, lean: 6, hp: 8, blink: 3.0, jit: 0.3, tremble: 0, fid: 0.2 },
  angry:  { breath: 1.5, rate: 2.4, shrug: 0.7, lean: 4, hp: -3, blink: 5.0, jit: 0.4, tremble: 0.25, fid: 0.5 },
  alert:  { breath: 1.2, rate: 2.0, shrug: 0.3, lean: 1, hp: -1, blink: 3.2, jit: 1.5, tremble: 0.05, fid: 0.5 },
  sneaky: { breath: 0.8, rate: 1.2, shrug: 0.3, lean: 6, hp: 4, blink: 4.0, jit: 1.6, tremble: 0, fid: 0.3 },
};
export class Actor {
  constructor(seed = 1, o = {}) { this.seed = seed; this.mood = MOODS[o.mood || 'calm']; this.o = o; this._ev = null; }
  setMood(name) { this.mood = MOODS[name] || this.mood; }
  // eye saccades + blinks are event lists built once (deterministic)
  _build() {
    const g = [], b = []; let t = 0, i = 0; const sd = this.seed * 13.7;
    while (t < 400) { const dur = 0.5 + hash(i * 3.1 + sd) * 1.9; const near = hash(i * 7.3 + sd) < 0.55; g.push({ t, x: (hash(i * 1.9 + sd) - 0.5) * (near ? 0.5 : 1.4), y: (hash(i * 5.3 + sd) - 0.5) * (near ? 0.3 : 0.7) }); t += dur; i++; }
    t = 0.8; i = 0; while (t < 400) { b.push(t); if (hash(i * 4.7 + sd) < 0.14) b.push(t + 0.26); t += (this.mood.blink || 3.4) * (0.6 + hash(i * 2.9 + sd) * 0.9); i++; }
    this._ev = { g, b };
  }
  // returns pose fragments: look, blink, head offsets, lean/twist idle, shrug, breath, fx (micro brow/mouth), grips
  life(t, gazeTarget = null) {
    if (!this._ev) this._build(); const m = this.mood, s = this.seed;
    let k = 0; const G = this._ev.g; // binary-ish search
    let lo = 0, hi = G.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (G[mid].t <= t) lo = mid; else hi = mid - 1; } k = lo;
    const e = G[k], tt = t - e.t, sac = 1 - Math.exp(-tt * 28); const prev = G[Math.max(0, k - 1)];
    let lx = lerp(prev.x, e.x, sac) * m.jit, ly = lerp(prev.y, e.y, sac) * m.jit;
    if (gazeTarget) { lx = lerp(lx * 0.25, gazeTarget[0], 0.85); ly = lerp(ly * 0.25, gazeTarget[1], 0.85); }
    // blink: eyelids close fast, open slower
    let blink = 0; for (const bt of this._ev.b) { const d = t - bt; if (d > -0.01 && d < 0.2) { blink = Math.max(blink, d < 0.07 ? sstep(0, 0.07, d) : 1 - sstep(0.07, 0.2, d)); } if (bt > t + 1) break; }
    const trm = m.tremble;
    return {
      look: [clamp(lx, -1, 1), clamp(ly, -1, 1)], blink,
      head: { yaw: 3 * noise1(t * 0.35, s) + 1.2 * trm * Math.sin(t * 31 + s), pitch: m.hp + 2.2 * noise1(t * 0.4 + 9, s) + 0.8 * trm * Math.sin(t * 27), roll: 1.5 * noise1(t * 0.3 + 21, s) },
      lean: m.lean + 0.9 * noise1(t * 0.25 + 4, s), twist: 1.6 * noise1(t * 0.22 + 14, s), sway: 1.0 * noise1(t * 0.2 + 33, s),
      shrug: m.shrug + 0.08 * noise1(t * 0.5, s), breath: m.breath, breathRate: m.rate + 0.12 * noise1(t * 0.1, s),
      fx: { brow: 0.08 * noise1(t * 0.6 + 5, s) + (blink > 0.5 ? -0.05 : 0), smile: 0.03 * noise1(t * 0.4 + 17, s), press: 0.05 * Math.max(0, noise1(t * 0.5 + 3, s)), browTilt: 0.05 * noise1(t * 0.45 + 8, s) },
    };
  }
}
// face(track, t, trans): track = [[t, 'expr'], ...]; transitions take `trans` seconds (default 0.35 = natural, not slow).
export function face(track, t, trans = 0.35) {
  let i = 0; while (i < track.length - 1 && t >= track[i + 1][0]) i++; const a = track[i], b = track[Math.min(i + 1, track.length - 1)];
  const lead = b[3] ?? trans; const k = b === a ? 0 : EASE.inOut(clamp((t - (b[0] - lead)) / lead, 0, 1));
  return k > 0 ? { expr: a[1], expr2: b[1], mix: k } : { expr: a[1], mix: 0 };
}
// ---- hand-target library (TORSO-LOCAL metres; shoulders at x=+-0.2,y=0.55). hand 'L' = character's right hand (x<0). ----
// Returns {l:[x,y,z], k, grip:{curl,thumb}, pn?}. Blend weight k (0..1) fades FK arm -> IK target.
const SX = (h) => (h === 'L' ? -1 : 1);
const G = {
  chin: (s) => ({ l: [s * 0.045, 0.80, 0.20], grip: { curl: 0.55, thumb: 0.3 }, pn: [-s * 0.3, 0.3, 0.9] }),
  mouth: (s) => ({ l: [s * 0.02, 0.775, 0.215], grip: { curl: 0.7, thumb: 0.4 }, pn: [-s * 0.2, 0, 0.95] }),
  brow: (s) => ({ l: [s * 0.07, 0.99, 0.19], grip: { curl: 0.2, thumb: 0.2 }, pn: [-s * 0.2, -0.4, 0.9] }),
  eyes: (s) => ({ l: [s * 0.045, 0.93, 0.205], grip: { curl: 0.45, thumb: 0.3 }, pn: [-s * 0.2, 0, 0.9] }),
  chest: (s) => ({ l: [s * 0.07, 0.40, 0.19], grip: { curl: 0.35, thumb: 0.3 }, pn: [-s * 0.4, 0, 0.9] }),
  heart: (s) => ({ l: [s * 0.085, 0.45, 0.19], grip: { curl: 0.15, thumb: 0.3 }, pn: [-s * 0.3, 0, 0.95] }),
  hips: (s) => ({ l: [s * 0.265, 0.14, 0.03], grip: { curl: 0.5, thumb: 0.3 }, pn: [-s * 0.5, 0, -0.5] }),
  clasp: (s) => ({ l: [s * 0.03, 0.33, 0.25], grip: { curl: 0.8, thumb: 0.5 }, pn: [-s * 0.9, 0.2, 0.2] }),
  cross: (s) => ({ l: [-s * 0.16, 0.38, 0.2], grip: { curl: 0.35, thumb: 0.3 }, pn: [0, 0, 1] }),
  point: (s) => ({ l: [s * 0.1, 0.58, 0.58], grip: { curl: 0.1, thumb: 0.5 }, pn: [-s * 0.5, -0.5, 0.2], dir: [0, 0.05, 1] }),
  shield: (s) => ({ l: [s * 0.1, 0.84, 0.3], grip: { curl: 0.1, thumb: 0.2, spread: 0.7 }, pn: [-s * 0.1, 0, -1], dir: [0, 0.6, 0.8] }),
  reach: (s) => ({ l: [s * 0.12, 0.52, 0.52], grip: { curl: 0.2, thumb: 0.25 }, pn: [-s * 0.7, -0.5, 0.2] }),
  neckBack: (s) => ({ l: [s * 0.07, 0.78, -0.09], grip: { curl: 0.35, thumb: 0.3 }, pn: [-s * 0.2, 0, -1], dir: [0, 0.5, -0.5] }),
  pocket: (s) => ({ l: [s * 0.2, 0.06, 0.1], grip: { curl: 0.15, thumb: 0.2 }, pn: [-s, 0, 0] }),
  fist: (s) => ({ l: [s * 0.16, 0.36, 0.32], grip: { curl: 1.0, thumb: 0.9 }, pn: [-s * 0.8, 0, 0.3] }),
  open: (s) => ({ l: [s * 0.2, 0.42, 0.36], grip: { curl: 0.12, thumb: 0.15, spread: 0.6 }, pn: [0, 0.9, 0.3] }),
  lap: (s) => ({ l: [s * 0.12, 0.075, 0.27], grip: { curl: 0.3, thumb: 0.3 }, pn: [0, -1, 0], dir: [0, 0, 1] }),
  armrest: (s) => ({ l: [s * 0.3, 0.2, 0.18], grip: { curl: 0.35, thumb: 0.3 }, pn: [0, -1, 0], dir: [0, 0, 1] }),
  tremble: (s) => ({ l: [s * 0.17, 0.34, 0.26], grip: { curl: 0.55, thumb: 0.5 }, pn: [-s * 0.7, 0, 0.5] }),
};
export const GESTURES = Object.keys(G);
// gest('chin','L',0.8, t, trembleAmt) -> value for pose.handL ; add grip via gripOf
export function gest(name, hand, k = 1, t = 0, trem = 0) {
  const g = G[name](SX(hand)); const l = g.l.slice(); if (trem) { l[0] += 0.006 * trem * Math.sin(t * 33); l[1] += 0.006 * trem * Math.sin(t * 29 + 1); }
  const o = { l, k, pn: g.pn }; if (g.dir) o.dir = g.dir; return o;
}
export function gripOf(name, hand) { return G[name](SX(hand)).grip; }
// apply a gesture to a pose in one call
export function applyGest(pose, name, hand, k, t = 0, trem = 0) { if (k <= 0.001) return pose; pose['hand' + hand] = gest(name, hand, k, t, trem); const g = gripOf(name, hand); const base = pose['grip' + hand] || { curl: 0.3, thumb: 0.35 }; pose['grip' + hand] = { curl: lerp(base.curl, g.curl, k), thumb: lerp(base.thumb, g.thumb, k), spread: g.spread }; return pose; }
// gesture timeline: keys [[t0, name, hand, durIn, hold, durOut]] -> weight for each; call applyTimeline(pose, keys, t, time)
export function applyTimeline(pose, keys, t, trem = 0) {
  for (const [t0, name, hand, din, hold, dout] of keys) { const e = t0 + din + hold + dout; if (t < t0 || t > e) continue; const k = t < t0 + din ? EASE.outCubic((t - t0) / din) : t < t0 + din + hold ? 1 : 1 - EASE.inOut((t - t0 - din - hold) / dout); applyGest(pose, name, hand, k, t, trem); }
  return pose;
}

// hand flat on a surface at WORLD position (table top, wall, door...). Palm faces down by default (pn in torso space). Merge: pose.handL = onSurface(...)
export function onSurface(worldPos, k = 1, o = {}) { return { w: worldPos.clone ? worldPos.clone() : worldPos, dir: o.dir || [0, 0, 1], pn: o.pn || [0, -1, 0], k }; }
