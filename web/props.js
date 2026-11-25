// props.js v6 : hand-held props WITH grip anchors, so hands wrap around objects instead of sinking into them ("hand in water" bug).
// A prop = { group, grips:{ name:{ p:[x,y,z], dir:[..], pn:[..], curl, thumb } } }  (all in PROP-LOCAL space, designed for the character's RIGHT hand (key 'L'); the LEFT hand mirrors x).
//   p   = where the PALM CENTRE touches the object surface      dir = finger direction (wrist -> fingertips) when open
//   pn  = palm normal (points INTO the object)                  curl = 0 open .. 1 fist (derived from the object's radius)
import * as THREE from 'three';
import * as C from './core.js';
import { M } from './person.js';
const cyl = (r1, r2, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
const bx = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const curlFor = (r) => Math.max(0.3, Math.min(1.0, 1.12 - r * 8.5)); // fat object -> open hand, thin -> closed fist

export function makeCup(o = {}) {
  const g = new THREE.Group(), r = 0.04, h = 0.09; const body = cyl(r * 1.1, r * 0.85, h, M(o.color || '#e8e2d6')); g.add(body);
  const fill = cyl(r * 1.0, r * 1.0, 0.004, M(o.liquid || '#2a1408', { noInk: 1 })); fill.position.y = h / 2 - 0.012; g.add(fill);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0065, 8, 14, Math.PI), M(o.color || '#e8e2d6')); hd.rotation.z = -Math.PI / 2; hd.position.set(r * 1.05, 0.005, 0); g.add(hd);
  return { group: g, size: r, grips: {
    handle: { p: [r * 1.05 + 0.03, 0.005, 0], dir: [0, -1, 0], pn: [-1, 0, 0], curl: 0.75, thumb: 0.15 },
    body: { p: [-0.0, 0.0, r * 0.95], dir: [0, -1, 0], pn: [0, 0, -1], curl: curlFor(r), thumb: 0.3 } } };
}
export function makeLantern(o = {}) {
  const g = new THREE.Group(), dark = M('#1b1a18'), glass = M(o.glow || '#ffcf80', { unlit: 1, emis: 0.6, noInk: 1 });
  const base = cyl(0.06, 0.07, 0.03, dark); base.position.y = -0.1; g.add(base); const gl = cyl(0.05, 0.055, 0.15, glass); gl.position.y = -0.015; g.add(gl); const cap = cyl(0.02, 0.07, 0.04, dark); cap.position.y = 0.09; g.add(cap);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0045, 6, 18, Math.PI), dark); bail.position.y = 0.105; g.add(bail);
  for (const s of [-1, 1]) for (const z of [-1, 1]) { const b = cyl(0.004, 0.004, 0.15, dark, 6); b.position.set(s * 0.052, -0.015, z * 0.052 * 0.0); g.add(b); }
  return { group: g, size: 0.05, grips: { bail: { p: [0, 0.155, 0], dir: [1, 0, 0], pn: [0, -1, 0], curl: 0.85, thumb: 0.2 } }, glowMesh: gl, lightLocal: [0, -0.015, 0] };
}
export function makeBag(o = {}) {   // briefcase / satchel with a top handle
  const g = new THREE.Group(), c = M(o.color || '#4a3424'); const body = bx(0.38, 0.26, 0.1, c); g.add(body);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), M('#1b1410')); hd.position.y = 0.13; g.add(hd); const lk = bx(0.06, 0.03, 0.012, M('#c9a64a', { emis: 0.1 })); lk.position.set(0, 0.07, 0.056); g.add(lk);
  return { group: g, size: 0.01, grips: { handle: { p: [0, 0.19, 0], dir: [1, 0, 0], pn: [0, -1, 0], curl: 0.9, thumb: 0.15 } } };
}
export function makeStick(o = {}) {  // walking stick / staff: grip around the shaft
  const g = new THREE.Group(), L = o.len || 1.3, r = 0.014; const sh = cyl(r, r * 1.1, L, M(o.color || '#4a3220'), 10); sh.position.y = L / 2 - 0.05; g.add(sh);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), M(o.color || '#4a3220')); k.position.y = L - 0.05; g.add(k);
  return { group: g, size: r, grips: { top: { p: [r, L - 0.13, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.95, thumb: 0.9 }, mid: { p: [r, L * 0.55, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.95, thumb: 0.9 } } };
}
export function makeBook(o = {}) {   // held flat in the palm / by the spine
  const g = new THREE.Group(), cover = M(o.color || '#5a2a2a'); g.add(bx(0.15, 0.03, 0.21, cover)); const pg = bx(0.14, 0.024, 0.2, M('#e9e2cf')); pg.position.set(0.004, 0, 0); g.add(pg);
  return { group: g, size: 0.015, grips: { under: { p: [0, -0.015, 0], dir: [0, 0, 1], pn: [0, 1, 0], curl: 0.2, thumb: 0.2 }, side: { p: [-0.077, 0, 0], dir: [0, 0, 1], pn: [1, 0, 0], curl: 0.55, thumb: 0.5 } } };
}
export function makeKey(o = {}) {    // pinch grip
  const g = new THREE.Group(), m = M(o.color || '#c9a64a', { emis: 0.12 }); const sh = cyl(0.004, 0.004, 0.07, m, 8); sh.rotation.z = Math.PI / 2; g.add(sh); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 14), m); hd.position.x = -0.045; g.add(hd); const tt = bx(0.012, 0.014, 0.003, m); tt.position.set(0.03, -0.008, 0); g.add(tt);
  return { group: g, size: 0.004, grips: { pinch: { p: [-0.02, 0.05, 0], dir: [0, -1, 0], pn: [0, 0, -1], curl: 0.55, thumb: 0.85 } } };
}
export function makeBottle(o = {}) {
  const g = new THREE.Group(), c = M(o.color || '#2a4a38'); const b = cyl(0.035, 0.035, 0.16, c); g.add(b); const n = cyl(0.014, 0.025, 0.07, c); n.position.y = 0.11; g.add(n); const cp = cyl(0.015, 0.015, 0.02, M('#c9a64a')); cp.position.y = 0.155; g.add(cp);
  return { group: g, size: 0.035, grips: { body: { p: [0.035, -0.0, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: curlFor(0.035), thumb: 0.9 }, neck: { p: [0.016, 0.11, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.85, thumb: 0.9 } } };
}
export function makeBox(o = {}) {    // two-hand carry: palms on opposite sides
  const w = o.w || 0.3, h = o.h || 0.2, d = o.d || 0.25, g = new THREE.Group(); g.add(bx(w, h, d, M(o.color || '#6a5a3a'))); g.add((() => { const m = bx(w * 1.01, 0.02, d * 0.2, M('#8a7a58')); m.position.y = h / 2; return m; })());
  return { group: g, size: 0.01, grips: { sideR: { p: [-w / 2, 0, 0], dir: [0, 0, 1], pn: [1, 0, 0], curl: 0.2, thumb: 0.4 }, sideL: { p: [w / 2, 0, 0], dir: [0, 0, 1], pn: [-1, 0, 0], curl: 0.2, thumb: 0.4 }, underR: { p: [-w * 0.3, -h / 2, 0], dir: [0, 0, 1], pn: [0, 1, 0], curl: 0.15, thumb: 0.4 } } };
}

// ---- drive a hand from a prop grip (call every frame BEFORE P.update). hand = 'L' (character's right) or 'R'. k = grip weight 0..1 ----
// Use when the PROP's path is keyed first (pick up from a table, put down). Prop must already be positioned/rotated this frame.
export function handOnProp(P, hand, prop, gripName, pose, k = 1) {
  const g = prop.grips[gripName]; const mir = hand === 'R' ? -1 : 1;
  const pLoc = new THREE.Vector3(g.p[0] * mir, g.p[1], g.p[2]), dLoc = new THREE.Vector3(g.dir[0] * mir, g.dir[1], g.dir[2]), nLoc = new THREE.Vector3(g.pn[0] * mir, g.pn[1], g.pn[2]);
  prop.group.updateMatrixWorld(true); const pw = prop.group.localToWorld(pLoc.clone()); const q = new THREE.Quaternion(); prop.group.getWorldQuaternion(q);
  const dW = dLoc.applyQuaternion(q), nW = nLoc.applyQuaternion(q);
  P.torso.updateWorldMatrix(true, false); const inv = new THREE.Matrix4().copy(P.torso.matrixWorld).invert(); const rot = new THREE.Matrix4().extractRotation(inv);
  pose['hand' + hand] = { w: pw, dir: dW.clone().applyMatrix4(rot).toArray(), pn: nW.clone().applyMatrix4(rot).toArray(), k };
  pose['grip' + hand] = { curl: lerp(0.3, g.curl, k), thumb: lerp(0.35, g.thumb, k) };
  return pw;
}
// Use when the HAND path is keyed (carrying): the prop is moved so its grip anchor sits in the palm. Call AFTER P.update(pose).
export function propInHand(P, hand, prop, gripName) {
  const g = prop.grips[gripName], mir = hand === 'R' ? -1 : 1; P.root.updateMatrixWorld(true);
  const hp = P.hand[hand]; hp.updateWorldMatrix(true, false); const pm = P.palmWorld(hand);
  // orientation: prop's pn must equal the palm normal; prop's dir must equal finger direction
  const hq = new THREE.Quaternion(); hp.getWorldQuaternion(hq); const palmN = new THREE.Vector3(0, 0, 1).applyQuaternion(hq), fing = new THREE.Vector3(0, -1, 0).applyQuaternion(hq);
  const A = new THREE.Vector3(g.pn[0] * mir, g.pn[1], g.pn[2]).normalize(), Bv = new THREE.Vector3(g.dir[0] * mir, g.dir[1], g.dir[2]).normalize();
  const mA = new THREE.Matrix4().makeBasis(Bv, A, new THREE.Vector3().crossVectors(Bv, A)), mB = new THREE.Matrix4().makeBasis(fing, palmN, new THREE.Vector3().crossVectors(fing, palmN));
  const q = new THREE.Quaternion().setFromRotationMatrix(mB.multiply(mA.clone().invert())); prop.group.quaternion.copy(q);
  const off = new THREE.Vector3(g.p[0] * mir, g.p[1], g.p[2]).applyQuaternion(q); prop.group.position.copy(pm).sub(off);
}
const lerp = (a, b, t) => a + (b - a) * t;
