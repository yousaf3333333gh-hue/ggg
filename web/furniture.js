// furniture.js v6.1 : furniture whose GEOMETRY, COLLIDERS and SIT ANCHORS come from one definition, so people can never be half inside a chair/table
// and nobody walks through it.   const F = new Furniture(world, colliders);   const ch = F.add('chair', {x:1, z:2, yaw:Math.PI});
// Seat data:  ch.seats[0] = {x, z, yaw, top (world y of the seat surface), back (distance seat-centre -> backrest face, or 0), arm (armrest top y or 0), kind}
// Make a person sit:  sitOn(P, ch.seats[0])  -> returns pose fields to merge into P.update({...}).  Put hands on the table with gest('lap'|'tableEdge').
import * as THREE from 'three';
import * as C from './core.js';
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const bx = (g, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
const cy = (g, rt, rb, h, x, y, z, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
// local-frame definitions: origin = floor centre, +z = direction the sitter faces. boxes: [cx, cy, cz, w, h, d]
const DEFS = {
  chair: (o) => { const c = tm(o.color || '#5a3f2a'), c2 = tm(o.cushion || o.color || '#6a4a30'), h = o.h || 0.45; const g = new THREE.Group(), cols = [];
    for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) bx(g, 0.04, h - 0.03, 0.04, x, (h - 0.03) / 2, z, c);
    bx(g, 0.46, 0.04, 0.44, 0, h - 0.02, 0, c2); bx(g, 0.42, 0.5, 0.035, 0, h + 0.27, -0.205, c); bx(g, 0.4, 0.04, 0.03, 0, h + 0.02, -0.205, c);
    cols.push([0, h - 0.02, 0, 0.46, 0.04, 0.44], [0, h + 0.27, -0.205, 0.44, 0.52, 0.04]);
    for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) cols.push([x, (h - 0.03) / 2, z, 0.05, h - 0.03, 0.05]);
    return { g, cols, seats: [{ x: 0, z: 0, top: h, back: 0.185, arm: 0, kind: 'chair', front: 0.22 }], size: [0.5, 0.5] }; },
  stool: (o) => { const c = tm(o.color || '#6a5036'), h = o.h || 0.5; const g = new THREE.Group(); cy(g, 0.2, 0.2, 0.045, 0, h - 0.0225, 0, c, 20);
    for (const a of [0.8, 2.4, 4.0, 5.5]) cy(g, 0.016, 0.02, h - 0.04, Math.cos(a) * 0.14, (h - 0.04) / 2, Math.sin(a) * 0.14, c, 8);
    return { g, cols: [[0, h - 0.0225, 0, 0.4, 0.045, 0.4], [0, (h - 0.04) / 2, 0, 0.3, h - 0.04, 0.3]], seats: [{ x: 0, z: 0, top: h, back: 0, arm: 0, kind: 'stool', front: 0.2 }], size: [0.42, 0.42] }; },
  armchair: (o) => { const c = tm(o.color || '#6b3a3a'), c2 = tm(o.cushion || '#7a4646'); const g = new THREE.Group(), h = 0.42;
    bx(g, 0.78, 0.2, 0.74, 0, 0.1, 0, c); bx(g, 0.5, 0.16, 0.56, 0, h - 0.08, 0.04, c2); bx(g, 0.78, 0.62, 0.16, 0, 0.62, -0.29, c);
    for (const s of [-1, 1]) bx(g, 0.14, 0.3, 0.7, s * 0.32, 0.38, 0, c);
    return { g, cols: [[0, 0.1, 0, 0.78, 0.2, 0.74], [0, 0.31 + 0.1, -0.29, 0.78, 0.82, 0.16], [-0.32, 0.38, 0, 0.14, 0.3, 0.7], [0.32, 0.38, 0, 0.14, 0.3, 0.7], [0, h - 0.08, 0.04, 0.5, 0.16, 0.56]], seats: [{ x: 0, z: 0.04, top: h, back: 0.19, arm: 0.54, kind: 'armchair', front: 0.3 }], size: [0.8, 0.76] }; },
  sofa: (o) => { const c = tm(o.color || '#4a5a6a'), c2 = tm(o.cushion || '#566878'); const g = new THREE.Group(), w = o.w || 1.7, h = 0.43;
    bx(g, w, 0.22, 0.82, 0, 0.11, 0, c); for (const s of [-1, 1]) bx(g, 0.16, 0.34, 0.82, s * (w / 2 - 0.08), 0.39, 0, c);
    const n = Math.max(2, Math.round((w - 0.32) / 0.55)), cw = (w - 0.32) / n; const seats = [], cols = [[0, 0.11, 0, w, 0.22, 0.82], [0, 0.55, -0.34, w, 0.66, 0.16]];
    bx(g, w, 0.66, 0.16, 0, 0.55, -0.34, c); for (const s of [-1, 1]) cols.push([s * (w / 2 - 0.08), 0.39, 0, 0.16, 0.34, 0.82]);
    for (let i = 0; i < n; i++) { const x = -(w - 0.32) / 2 + cw * (i + 0.5); bx(g, cw - 0.02, 0.2, 0.62, x, h - 0.1, 0.07, c2); cols.push([x, h - 0.1, 0.07, cw, 0.2, 0.62]); seats.push({ x, z: 0.07, top: h, back: 0.26, arm: 0.56, kind: 'sofa', front: 0.3 }); }
    return { g, cols, seats, size: [w, 0.84] }; },
  bench: (o) => { const c = tm(o.color || '#5a4632'), w = o.w || 1.5, h = 0.45; const g = new THREE.Group();
    bx(g, w, 0.05, 0.38, 0, h - 0.025, 0, c); for (const s of [-1, 1]) bx(g, 0.05, h - 0.05, 0.34, s * (w / 2 - 0.1), (h - 0.05) / 2, 0, c);
    const n = Math.max(1, Math.floor(w / 0.6)); const seats = []; for (let i = 0; i < n; i++) seats.push({ x: -w / 2 + (w / n) * (i + 0.5), z: 0, top: h, back: 0, arm: 0, kind: 'bench', front: 0.19 });
    return { g, cols: [[0, h - 0.025, 0, w, 0.05, 0.38], ...[-1, 1].map(s => [s * (w / 2 - 0.1), (h - 0.05) / 2, 0, 0.05, h - 0.05, 0.34])], seats, size: [w, 0.4] }; },
  table: (o) => { const c = tm(o.color || '#4a3424'), w = o.w || 1.2, d = o.d || 0.7, h = o.h || 0.76; const g = new THREE.Group();
    bx(g, w, 0.05, d, 0, h - 0.025, 0, c); const cols = [[0, h - 0.025, 0, w, 0.05, d]];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { bx(g, 0.06, h - 0.05, 0.06, sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06), c); cols.push([sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06), 0.07, h - 0.05, 0.07]); }
    return { g, cols, seats: [], size: [w, d], top: h }; },
  bed: (o) => { const c = tm(o.color || '#4a3828'), sh = tm(o.sheet || '#cfc8b8'), bl = tm(o.blanket || '#6a4a4a'); const g = new THREE.Group(), w = 1.0, l = 2.0, h = 0.48;
    bx(g, w, 0.28, l, 0, 0.14, 0, c); bx(g, w - 0.06, 0.16, l - 0.08, 0, 0.36, 0, sh); bx(g, w - 0.04, 0.05, 1.2, 0, 0.45, 0.35, bl); bx(g, w, 0.7, 0.06, 0, 0.55, -l / 2, c); bx(g, 0.5, 0.1, 0.3, 0, 0.5, -l / 2 + 0.25, tm('#e6e0d2'));
    return { g, cols: [[0, 0.14, 0, w, 0.28, l], [0, 0.36, 0, w - 0.06, 0.16, l - 0.08], [0, 0.55, -l / 2, w, 0.7, 0.06]], seats: [{ x: 0.0, z: 0.55, top: h - 0.02, back: 0, arm: 0, kind: 'bedEdge', front: 0.3, yawOff: Math.PI / 2 }], size: [w, l], top: h }; },
  shelf: (o) => { const c = tm(o.color || '#3e2e22'), w = o.w || 1.0, h = o.h || 1.9, d = 0.32; const g = new THREE.Group(); bx(g, w, h, 0.03, 0, h / 2, -d / 2, c); for (const s of [-1, 1]) bx(g, 0.03, h, d, s * w / 2, h / 2, 0, c); for (let i = 0; i <= 5; i++) bx(g, w, 0.03, d, 0, 0.02 + i * (h - 0.04) / 5, 0, c);
    return { g, cols: [[0, h / 2, 0, w, h, d]], seats: [], size: [w, d] }; },
  crate: (o) => { const s = o.s || 0.5; const g = new THREE.Group(); bx(g, s, s, s, 0, s / 2, 0, tm(o.color || '#6a5532')); return { g, cols: [[0, s / 2, 0, s, s, s]], seats: [{ x: 0, z: 0, top: s, back: 0, arm: 0, kind: 'stool', front: s / 2 }], size: [s, s], top: s }; },
  barrel: (o) => { const g = new THREE.Group(); cy(g, 0.28, 0.3, 0.85, 0, 0.425, 0, tm(o.color || '#5a4026'), 16); return { g, cols: [[0, 0.425, 0, 0.58, 0.85, 0.58]], seats: [], size: [0.6, 0.6], top: 0.85 }; },
  counter: (o) => { const w = o.w || 2.2, h = 0.95, d = 0.65; const g = new THREE.Group(); bx(g, w, h - 0.04, d, 0, (h - 0.04) / 2, 0, tm(o.color || '#4a4038')); bx(g, w + 0.06, 0.05, d + 0.06, 0, h - 0.015, 0, tm(o.top || '#8a8478')); return { g, cols: [[0, h / 2, 0, w, h, d]], seats: [], size: [w, d], top: h }; },
};
export class Furniture {
  constructor(world, colliders) { this.world = world; this.col = colliders; this.items = []; }
  add(kind, o = {}) {
    const d = DEFS[kind](o); const yaw = o.yaw || 0, x = o.x || 0, z = o.z || 0, y = o.y || 0; d.g.position.set(x, y, z); d.g.rotation.y = yaw; this.world.add(d.g);
    const c = Math.cos(yaw), s = Math.sin(yaw), W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];     // local -> world (three.js rotation.y convention)
    for (const [cx, cyy, cz, w, h, dd] of d.cols) { const [wx, wz] = W(cx, cz); this.col.box(wx, wz, w, dd, yaw, y + cyy + h / 2, y + cyy - h / 2); }
    const seats = d.seats.map((st) => { const [sx, sz] = W(st.x, st.z); return { x: sx, z: sz, yaw: yaw + (st.yawOff || 0), top: y + st.top, back: st.back, arm: st.arm ? y + st.arm : 0, kind: st.kind, front: st.front || 0.22, floor: y, parent: kind }; });
    const item = { kind, group: d.g, seats, top: d.top !== undefined ? y + d.top : null, x, z, yaw, size: d.size }; this.items.push(item); return item;
  }
}
// ---- sit a Person on a seat. Returns pose fields. P.root is placed here. ----
// opts.lean (deg; default -4 with backrest, +8 without), opts.footZ (how far in front the feet rest, local m), opts.hands:'lap'|'none'
export function sitOn(P, seat, opts = {}) {
  const back = seat.back || 0, off = back ? -0.03 : 0.0;                          // pelvis sits slightly behind seat centre when there is a backrest
  const c = Math.cos(seat.yaw), s = Math.sin(seat.yaw);
  P.root.position.set(seat.x + off * s, seat.floor ?? 0, seat.z + off * c); P.root.rotation.set(0, seat.yaw, 0);
  return { sit: { h: seat.top, k: opts.k ?? 1, footZ: opts.footZ ?? 0.43, kneeX: opts.kneeX ?? 0.115, front: seat.front ?? 0.22 }, lean: opts.lean ?? (back ? -4 : 8), hipZ: 0 };
}
export const SIT_CLEARANCE = 0.14;   // pelvis origin sits this far (local units) above the seat surface so thighs + buttocks rest ON it
