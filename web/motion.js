// motion.js v6 : terrain + stairs (feet land ON steps), colliders (nobody walks through walls/props), speed-based paths (natural pace),
// crowd avoidance (two people pass SIDEWAYS, never through each other), easing/keyframe helpers.
import * as THREE from 'three';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const sm5 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
// easing: u in 0..1 -> 0..1.  outBack = anticipation/overshoot feel (snappy, alive), outCubic = quick start soft stop.
export const EASE = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), outCubic: (u) => 1 - Math.pow(1 - u, 3), inOut: (u) => u * u * (3 - 2 * u), inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outBack: (u) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }, snap: (u) => 1 - Math.pow(1 - u, 4) };
// keyed(keys, t, ease): keys [[t, value]] where value is number or array. Holds before first / after last.
export function keyed(keys, t, ease = 'inOut') {
  if (t <= keys[0][0]) return keys[0][1]; const L = keys[keys.length - 1]; if (t >= L[0]) return L[1];
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; const u = EASE[ease]((t - a[0]) / (b[0] - a[0]));
  return Array.isArray(a[1]) ? a[1].map((x, k) => lerp(x, b[1][k], u)) : lerp(a[1], b[1], u);
}
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const noise1 = (t, seed = 0) => { const i = Math.floor(t), f = t - i, a = hash(i + seed * 17.3), b = hash(i + 1 + seed * 17.3); return lerp(a, b, f * f * (3 - 2 * f)) * 2 - 1; };

// ================= Terrain: ground height under any (x,z) =================
export class Terrain {
  constructor(base = 0) { this.base = base; this.items = []; }
  // stairs: bottom edge of step 1 at (x,z); dir = unit vector of travel; width across; n steps; rise/run per step; start height h0
  stairs(o) { const it = { type: 'stairs', x: o.x, z: o.z, dx: o.dir[0], dz: o.dir[1], w: o.width, n: o.n, rise: o.rise ?? 0.18, run: o.run ?? 0.28, h0: o.h0 ?? 0 }; this.items.push(it); return it; }
  platform(o) { const it = { type: 'plat', x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2, rot: o.rot || 0, h: o.h }; this.items.push(it); return it; }
  ramp(o) { const it = { type: 'ramp', x: o.x, z: o.z, dx: o.dir[0], dz: o.dir[1], w: o.width, len: o.len, h0: o.h0 ?? 0, h1: o.h1 }; this.items.push(it); return it; }
  at(x, z) {
    let y = this.base;
    for (const it of this.items) {
      if (it.type === 'stairs') { const ax = (x - it.x) * it.dx + (z - it.z) * it.dz, ac = -(x - it.x) * it.dz + (z - it.z) * it.dx; if (Math.abs(ac) <= it.w / 2 && ax >= 0 && ax < it.n * it.run) y = Math.max(y, it.h0 + (Math.floor(ax / it.run) + 1) * it.rise); }
      else if (it.type === 'plat') { const c = Math.cos(it.rot), s = Math.sin(it.rot), lx = (x - it.x) * c - (z - it.z) * s, lz = (x - it.x) * s + (z - it.z) * c; if (Math.abs(lx) <= it.hw && Math.abs(lz) <= it.hd) y = Math.max(y, it.h); }
      else if (it.type === 'ramp') { const ax = (x - it.x) * it.dx + (z - it.z) * it.dz, ac = -(x - it.x) * it.dz + (z - it.z) * it.dx; if (Math.abs(ac) <= it.w / 2 && ax >= 0 && ax <= it.len) y = Math.max(y, lerp(it.h0, it.h1, ax / it.len)); }
    }
    return y;
  }
  // which stairs (if any) is (x,z) on? -> {it, a: distance along the stair axis}
  stairAt(x, z, pad = 0.15) { for (const it of this.items) if (it.type === 'stairs') { const ax = (x - it.x) * it.dx + (z - it.z) * it.dz, ac = -(x - it.x) * it.dz + (z - it.z) * it.dx; if (Math.abs(ac) <= it.w / 2 + pad && ax >= -pad && ax < it.n * it.run + pad) return { it, a: ax }; } return null; }
  // geometry that matches the ground function exactly (so feet can never sink into / float above visible steps)
  buildMeshes(mk /* (w,h,d,mat,x,y,z)=>Mesh */, mat, mat2 = mat) {
    const g = new THREE.Group();
    for (const it of this.items) {
      if (it.type === 'stairs') { for (let i = 0; i < it.n; i++) { const h = it.h0 + (i + 1) * it.rise, ax = (i + 0.5) * it.run; const cx = it.x + it.dx * ax, cz = it.z + it.dz * ax; const m = mk(it.run, h, it.w, i % 2 ? mat2 : mat, 0, h / 2, 0); m.position.set(cx, h / 2, cz); m.rotation.y = Math.atan2(-it.dz, it.dx); g.add(m); } }
      else if (it.type === 'plat') { const m = mk(it.hw * 2, it.h, it.hd * 2, mat, 0, it.h / 2, 0); m.position.set(it.x, it.h / 2, it.z); m.rotation.y = it.rot; g.add(m); }
    }
    return g;
  }
}
// ================= Colliders: static obstacles (walls, furniture, pillars) =================
export class Colliders {
  constructor() { this.boxes = []; this.cyls = []; }
  box(cx, cz, w, d, rot = 0, ymax = 99, ymin = -99) { this.boxes.push({ cx, cz, hw: w / 2, hd: d / 2, rot, ymax, ymin }); }
  cyl(x, z, r, ymax = 99) { this.cyls.push({ x, z, r, ymax }); }
  // returns corrected [x,z] for a circle of radius r at (x,z)
  pushOut(x, z, r, y = 0) {
    for (let it = 0; it < 3; it++) {
      for (const b of this.boxes) { if (y > b.ymax - 0.05 || y < b.ymin) continue; const c = Math.cos(b.rot), s = Math.sin(b.rot); const dx = x - b.cx, dz = z - b.cz; const lx = dx * c - dz * s, lz = dx * s + dz * c;
        const qx = clamp(lx, -b.hw, b.hw), qz = clamp(lz, -b.hd, b.hd); let ex = lx - qx, ez = lz - qz; const d = Math.hypot(ex, ez);
        if (d < r) { let nx, nz, pen; if (d > 1e-5) { nx = ex / d; nz = ez / d; pen = r - d; } else { const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz); if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + r; } }
          const wx = nx * c + nz * s, wz = -nx * s + nz * c; x += wx * pen; z += wz * pen; } }
      for (const q of this.cyls) { if (y > q.ymax - 0.05) continue; const dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz); if (d < r + q.r) { const k = (r + q.r - d) / (d || 1); x += (d ? dx : 1) * k; z += (d ? dz : 0) * k; } }
    }
    return [x, z];
  }
  // how deep (metres) is a sphere (centre x,y,z; radius r) inside any solid? returns {depth, who} (depth<=0 means clear)
  penetration(x, y, z, r) {
    let best = { depth: -1, who: null };
    for (const b of this.boxes) { const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.cx, dz = z - b.cz, lx = dx * c - dz * s, lz = dx * s + dz * c; const y0 = b.ymin, y1 = b.ymax;
      const qx = clamp(lx, -b.hw, b.hw), qy = clamp(y, y0, y1), qz = clamp(lz, -b.hd, b.hd); const ex = lx - qx, ey = y - qy, ez = lz - qz; const d = Math.hypot(ex, ey, ez);
      let depth; if (d > 1e-6) depth = r - d; else depth = r + Math.min(b.hw - Math.abs(lx), b.hd - Math.abs(lz), y1 - y, y - y0);
      if (depth > best.depth) best = { depth, who: b }; }
    for (const q of this.cyls) { const dxz = Math.hypot(x - q.x, z - q.z); const dy = y > q.ymax ? y - q.ymax : 0; const d = Math.hypot(dxz, dy); const depth = r + q.r - (dy > 0 ? Math.hypot(dxz, dy) + q.r - q.r : dxz); if (dy <= 0 && depth > best.depth) best = { depth: r + q.r - dxz, who: q }; }
    return best;
  }
  // is a 3D point inside any solid? (for camera checks)
  inside(x, y, z, pad = 0) { for (const b of this.boxes) { const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.cx, dz = z - b.cz, lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < b.hw + pad && Math.abs(lz) < b.hd + pad && y < b.ymax && y > b.ymin) return true; } for (const q of this.cyls) if (Math.hypot(x - q.x, z - q.z) < q.r + pad && y < q.ymax) return true; return false; }
}
// ================= Path: natural pacing =================
export const SPEED = { stroll: 0.9, walk: 1.4, brisk: 1.9, hurry: 2.5, run: 4.2 };
// pts: [{p:[x,z], v:speed m/s to reach it (default walk), wait: seconds standing there, face: yaw (rad) while waiting}], starting at time t0.
// Heavy speed easing is deliberately NOT used: people reach pace in ~0.35 s (slow ramps made earlier characters look sluggish).
export class Path {
  constructor(t0, pts, dur = 120, cycLen = 1.17, terrain = null, duty = 0.6) {
    this.t0 = t0; this.cyc = cycLen; const N = Math.ceil(dur * 60) + 2; this.N = N; const keys = []; let t = t0; keys.push([t, pts[0].p[0], pts[0].p[1], pts[0].face]);
    if (pts[0].wait) { t += pts[0].wait; keys.push([t, pts[0].p[0], pts[0].p[1], pts[0].face]); }
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1].p, b = pts[i].p, d = Math.hypot(b[0] - a[0], b[1] - a[1]); const v = pts[i].v ?? SPEED.walk; t += Math.max(0.05, d / v); keys.push([t, b[0], b[1], pts[i].face]); if (pts[i].wait) { t += pts[i].wait; keys.push([t, b[0], b[1], pts[i].face]); } }
    this.tEnd = t; const raw = []; for (let i = 0; i < N; i++) { const tt = i / 60; let k = 0; while (k < keys.length - 2 && tt >= keys[k + 1][0]) k++; const A = keys[k], B = keys[Math.min(k + 1, keys.length - 1)]; const u = B[0] > A[0] ? clamp((tt - A[0]) / (B[0] - A[0]), 0, 1) : 1; raw.push([lerp(A[1], B[1], u), lerp(A[2], B[2], u)]); }
    // smooth velocity corners with a 0.3 s box filter (keeps pace natural, removes robotic stops/starts)
    const W = 9; this.pos = raw.map((_, i) => { let x = 0, z = 0, c = 0; for (let j = -W; j <= W; j++) { const q = raw[clamp(i + j, 0, N - 1)]; x += q[0]; z += q[1]; c++; } return [x / c, z / c]; });
    this.dist = [0]; for (let i = 1; i < N; i++) this.dist.push(this.dist[i - 1] + Math.hypot(this.pos[i][0] - this.pos[i - 1][0], this.pos[i][1] - this.pos[i - 1][1]));
    this.speed = this.pos.map((p, i) => { const a = this.pos[Math.max(0, i - 6)], b = this.pos[Math.min(N - 1, i + 6)]; return Math.hypot(b[0] - a[0], b[1] - a[1]) / (Math.min(N - 1, i + 6) - Math.max(0, i - 6)) * 60; });
    // ---- walking phase. On stairs ONE step per tread (cycle = 2 treads) and the phase is aligned so every foot lands mid-tread ----
    this.phase = [0]; this.cycs = []; const sinfo = this.pos.map((p) => (terrain ? terrain.stairAt(p[0], p[1], 0.05) : null));
    for (let i = 0; i < N; i++) this.cycs.push(sinfo[i] ? 2 * sinfo[i].it.run : cycLen);
    for (let i = 1; i < N; i++) this.phase.push(this.phase[i - 1] + (this.dist[i] - this.dist[i - 1]) / this.cycs[i]);
    if (terrain) { let i = 0; const S = duty * 0.5; // S in cycles: half the stance travel measured in cycle units
      while (i < N) { if (!sinfo[i]) { i++; continue; } let e = i; while (e < N && sinfo[e]) e++; const it = sinfo[i].it, run = it.run, cyc = 2 * run;
        const v = [this.pos[Math.min(N - 1, i + 5)][0] - this.pos[i][0], this.pos[Math.min(N - 1, i + 5)][1] - this.pos[i][1]]; const dirSign = Math.sign(v[0] * it.dx + v[1] * it.dz) || 1; const Sw = duty * cyc / 2;
        const a0 = 0.5 * run - dirSign * Sw; const target = dirSign * (sinfo[i].a - a0) / cyc; let d = target - this.phase[i]; d -= Math.round(d);
        const ramp = 2.0; for (let k = 0; k < N; k++) { if (k >= i) this.phase[k] += d; else { const back = this.dist[i] - this.dist[k]; if (back < ramp) this.phase[k] += d * (1 - back / ramp); } }
        // when the stairs end, hold the (shifted) phase continuous; rest of path keeps integrating from there
        i = e; } }
    this.yaw = []; let y = pts[0].face ?? 0; const faceAt = (tt) => { let k = 0; while (k < keys.length - 2 && tt >= keys[k + 1][0]) k++; return keys[k][3]; };
    for (let i = 0; i < N; i++) { const a = this.pos[Math.max(0, i - 4)], b = this.pos[Math.min(N - 1, i + 4)]; const dx = b[0] - a[0], dz = b[1] - a[1]; const sp = this.speed[i]; let target = y; if (sp > 0.2) target = Math.atan2(dx, dz); else { const f = faceAt(i / 60); if (f !== undefined) target = f; } y = angLerp(y, target, 1 - Math.exp(-(sp > 0.2 ? 14 : 5) / 60)); this.yaw.push(y); }
  }
  at(t) { const i = clamp(Math.round(t * 60), 0, this.N - 1); const sp = this.speed[i]; return { x: this.pos[i][0], z: this.pos[i][1], yaw: this.yaw[i], speed: sp, phase: this.phase[i], cyc: this.cycs[i], walkK: sstep(0.06, 0.55, sp), gait: clamp(sp / 1.4, 0.45, 1.35), run: sp > 3.0 }; }
}
// ================= Crowd: nobody ghosts through anybody =================
// actors: [{id, x, z, vx, vz, r, fixed?}]; returns {id: {dx, dz, twist, glance, close}} offsets to ADD to each raw path position.
export function separate(actors, margin = 0.2, look = 1.3) {
  const out = {}; for (const a of actors) out[a.id] = { dx: 0, dz: 0, twist: 0, glance: 0, close: 0 };
  for (const a of actors) { if (a.fixed) continue; const sp = Math.hypot(a.vx, a.vz); const hx = sp > 0.15 ? a.vx / sp : 0, hz = sp > 0.15 ? a.vz / sp : 0; const nx = hz, nz = -hx; // right-hand perpendicular of heading
    for (const b of actors) { if (b === a) continue; const sx = b.x - a.x, sz = b.z - a.z, d = Math.hypot(sx, sz) || 1e-4; const R = a.r + b.r + margin, D0 = R + look; if (d > D0) continue;
      if (sp > 0.15) {
        const sl = sx * hx + sz * hz; const infl = 1 - sstep(0.2, 1.9, -sl);              // after passing, ease back to the lane over ~1.9 m (no pop)
        const side = sx * nx + sz * nz; const t = Math.tanh(side / 0.22); const w = -t * Math.abs(t) + (1 - Math.abs(t)) * 1.0; // away from them; head-on -> own right
        const L = Math.max(0, (R - Math.abs(side)) * (b.fixed ? 1.0 : 0.5) + 0.02) * sstep(D0, R * 0.62, d) * infl;  // shift only as much as needed to clear R
        out[a.id].dx += nx * w * L; out[a.id].dz += nz * w * L; const c = sstep(D0, R, d) * infl; if (c > out[a.id].close) { out[a.id].close = c; out[a.id].twist = -Math.sign(side || 1) * 26 * c; out[a.id].glance = -Math.sign(side || 1) * 30 * c; }
      } else if (!b.fixed || true) { const pen = R * 0.78 - d; if (pen > 0) { out[a.id].dx -= (sx / d) * pen * 0.5; out[a.id].dz -= (sz / d) * pen * 0.5; } }
    } }
  // hard guarantee: adjusted bodies never overlap
  for (let it = 0; it < 3; it++) for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) { const A = actors[i], B = actors[j]; const ax = A.x + out[A.id].dx, az = A.z + out[A.id].dz, bx = B.x + out[B.id].dx, bz = B.z + out[B.id].dz; const d = Math.hypot(bx - ax, bz - az), m = A.r + B.r + 0.02; if (d < m) { const k = (m - d) / (d || 1); const wa = A.fixed ? 0 : (B.fixed ? 1 : 0.5), wb = B.fixed ? 0 : (A.fixed ? 1 : 0.5); out[A.id].dx -= (bx - ax || 1) * k * wa; out[A.id].dz -= (bz - az) * k * wa; out[B.id].dx += (bx - ax || 1) * k * wb; out[B.id].dz += (bz - az) * k * wb; } }
  return out;
}
// ================= place a Person using Path + Terrain + Colliders + Crowd offset =================
export function place(P, path, t, env = {}, crowd = null) {
  const s = path.at(t); let x = s.x, z = s.z; if (crowd) { x += crowd.dx; z += crowd.dz; }
  if (env.colliders) [x, z] = env.colliders.pushOut(x, z, env.r ?? 0.26, env.terrain ? env.terrain.at(x, z) : 0);
  const y = env.terrain ? env.terrain.at(x, z) : 0; P.root.position.set(x, y, z); P.root.rotation.set(0, s.yaw, 0);
  const pose = { walk: s.speed > 0.03 || s.walkK > 0 ? s.phase : null, walkK: s.walkK, gait: s.gait, cyc: s.cyc, duty: s.run ? 0.38 : 0.6, ground: env.terrain ? (px, pz) => env.terrain.at(px, pz) : null };
  if (s.run) pose.lean = 12;
  return { pose, x, z, y, yaw: s.yaw, speed: s.speed };
}
