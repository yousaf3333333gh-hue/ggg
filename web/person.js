// person.js v6 : 3D toon characters with REAL face geometry (eyeballs+eyelids, brows, nose, lips), per-character face shape + skin tone,
// fingered hands with grips, analytic IK for arms AND legs (feet land ON stairs/slopes), coat/kameez panels that follow the legs.
// API is backward compatible with v5 (pose keys: expr, expr2, mix, blink, head, look, lean, twist, armL, armR, walk, gait, sitK, sitF, sitKn, t).
// New pose keys: hands (handL/handR IK targets + grip), ground(x,z), cyc, crouch, shrug, breath, fx (additive face), footTarget.
import * as THREE from 'three';
import * as C from './core.js';

const rad = (d) => (d * Math.PI) / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mcache = new Map();
export function M(hex, o = {}) { const k = hex + JSON.stringify(o); let m = mcache.get(k); if (!m) { m = C.toon({ color: new THREE.Color(hex), ...o }); mcache.set(k, m); } return m; }
export const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))).toString(16).padStart(2, '0'); return `#${f(16)}${f(8)}${f(0)}`; };
export const mixHex = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const f = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0'); return `#${f(16)}${f(8)}${f(0)}`; };

// ---- skin palette: choose by the story's people. NEVER leave everyone pale. ----
export const SKIN = { fair: '#e6bfa2', ruddy: '#d9a08a', olive: '#c9a074', wheatish: '#c99569', tan: '#b4805a', brown: '#94603f', darkBrown: '#6b4229', deep: '#47291a' };
// ---- face shape presets (face: {...} keys). Use a DIFFERENT preset per character, then tweak numbers. ----
export const FACES = {
  oval: { w: 1.0, jaw: 0.82, chin: 0.02, cheek: 0.3, brow: 0.35, noseL: 1.0, noseW: 1.0, eyeGap: 0.098, eyeSize: 1.0, lipFull: 1.0, mouthW: 1.0, ear: 1.0 },
  square: { w: 1.07, jaw: 1.0, chin: -0.02, cheek: 0.2, brow: 0.7, noseL: 1.05, noseW: 1.15, eyeGap: 0.1, eyeSize: 0.92, lipFull: 0.85, mouthW: 1.12, ear: 1.05 },
  long: { w: 0.92, jaw: 0.78, chin: 0.1, cheek: 0.25, brow: 0.5, noseL: 1.25, noseW: 0.92, eyeGap: 0.094, eyeSize: 0.95, lipFull: 0.9, mouthW: 0.95, ear: 1.1 },
  round: { w: 1.1, jaw: 0.9, chin: -0.06, cheek: 0.55, brow: 0.2, noseL: 0.85, noseW: 1.05, eyeGap: 0.105, eyeSize: 1.05, lipFull: 1.15, mouthW: 0.95, ear: 0.95 },
  narrow: { w: 0.88, jaw: 0.7, chin: 0.06, cheek: 0.15, brow: 0.55, noseL: 1.15, noseW: 0.85, eyeGap: 0.09, eyeSize: 0.9, lipFull: 0.8, mouthW: 0.9, ear: 1.1 },
  heavy: { w: 1.12, jaw: 1.0, chin: -0.04, cheek: 0.5, brow: 0.8, noseL: 1.0, noseW: 1.3, eyeGap: 0.104, eyeSize: 0.88, lipFull: 1.05, mouthW: 1.15, ear: 1.1 },
};

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const sphG = new THREE.SphereGeometry(1, 20, 14), boxG = new THREE.BoxGeometry(1, 1, 1);
const tcache = new Map();
const taperG = (rd, rp) => { const k = rd + '_' + rp; let g = tcache.get(k); if (!g) { g = new THREE.CylinderGeometry(rd, rp, 1, 14, 1); tcache.set(k, g); } return g; }; // top=distal, bottom=proximal
function add(parent, g, mat, sx = 1, sy = 1, sz = 1, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; }
const S_ = (p, mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => add(p, sphG, mat, r * sx, r * sy, r * sz, x, y, z);
const B_ = (p, mat, w, h, d, x = 0, y = 0, z = 0) => add(p, boxG, mat, w, h, d, x, y, z);
function lathe(pts, mat, parent, sz = 0.7, seg = 22) { const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); const m = new THREE.Mesh(g, mat); m.scale.z = sz; m.frustumCulled = false; parent.add(m); return m; }

// forward kinematics (v5): direction of a limb from (forward raise f, outward o, bend b) degrees
function limbDir(f, o, b, side) {
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rad(f));
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * rad(o));
  const q1 = qz.clone().multiply(qx); const d1 = DOWN.clone().applyQuaternion(q1);
  const qb = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rad(b));
  return [d1, DOWN.clone().applyQuaternion(q1.clone().multiply(qb)), q1];
}
// analytic two-bone IK: returns {mid, end(clamped), reach}
export function ik2(S, T, l1, l2, pole) {
  const d = new THREE.Vector3().subVectors(T, S); const raw = d.length() || 1e-4; const dir = d.clone().divideScalar(raw);
  const dist = clamp(raw, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.998);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let pv = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (pv.lengthSq() < 1e-6) pv.set(0, 0, 1); pv.normalize();
  const mid = S.clone().addScaledVector(dir, a).addScaledVector(pv, h);
  return { mid, end: S.clone().addScaledVector(dir, dist), reach: raw / (l1 + l2) };
}

// ---------------- expressions (parameters drive 3D brows / lids / lips) ----------------
const EXP = (o) => ({ tear: 0, sweat: 0, quiver: 0, nosew: 0, wide: 0, small: 0, lid: 0, lidTilt: 0, cheek: 0, brow: 0, browTilt: 0, browArc: 0, browOuter: 0, mw: 0, mouthY: 0, open: 0, smile: 0, smirk: 0, frown: 0, teeth: 0, oround: 0, press: 0, asym: 0, ...o });
export const EXPR = {
  neutral: EXP({ smile: 0.05 }),
  calm: EXP({ lid: 0.12, smile: 0.12, browArc: 0.3 }),
  tired: EXP({ lid: 0.45, brow: -0.15, browTilt: 0.25, smile: -0.05, browOuter: 0.35, frown: 0.2 }),
  smile: EXP({ smile: 0.9, cheek: 0.35, browArc: 0.5, brow: 0.2, mw: 0.3 }),
  warm: EXP({ smile: 0.65, cheek: 0.3, lid: 0.15, browArc: 0.4, browTilt: 0.2 }),
  grin: EXP({ smile: 1, open: 0.4, teeth: 1, cheek: 0.55, brow: 0.25, mw: 0.7 }),
  curious: EXP({ wide: 0.35, brow: 0.5, browTilt: 0.25, browArc: 0.8, smile: 0.05, mouthY: 0.5, smirk: 0.6, asym: 0.6 }),
  worried: EXP({ wide: 0.3, browTilt: 1.0, brow: 0.35, frown: 0.7, mw: -0.1, press: 0.3 }),
  scared: EXP({ wide: 1, brow: 0.9, browTilt: 0.8, open: 0.45, frown: 0.3, small: 1, mw: -0.1 }),
  shock: EXP({ wide: 1, brow: 1, browArc: 1, open: 0.8, oround: 1, small: 1, mw: -0.4 }),
  sad: EXP({ lid: 0.32, browTilt: 1, frown: 1, brow: 0.0, mw: -0.2, lidTilt: -0.4, press: 0.3 }),
  stern: EXP({ lid: 0.28, lidTilt: 0.6, browTilt: -0.9, brow: -0.4, frown: 0.5, press: 0.6 }),
  angry: EXP({ lid: 0.3, lidTilt: 0.9, browTilt: -1.2, brow: -0.6, frown: 0.9, press: 0.5, teeth: 0.0, cheek: 0.3 }),
  pensive: EXP({ lid: 0.2, browTilt: 0.5, smile: 0.0, smirk: 1, mouthY: 0.4, press: 0.4 }),
  relief: EXP({ lid: 0.32, smile: 0.7, browTilt: 0.9, cheek: 0.35, brow: 0.1 }),
  creep: EXP({ lid: 0.25, smile: 0.7, browTilt: -0.2, brow: -0.15, small: 1, mw: 0.5, cheek: 0.2 }),
  gasp: EXP({ wide: 0.8, brow: 0.8, browTilt: 0.5, open: 0.35, oround: 1, small: 1 }),
  gentle: EXP({ lid: 0.22, smile: 0.5, browTilt: 0.65, cheek: 0.2, browArc: 0.4 }),
  suspicious: EXP({ lid: 0.3, lidTilt: 0.3, browTilt: -0.4, brow: -0.1, asym: 1.0, smirk: 0.5, press: 0.5 }),
  determined: EXP({ lid: 0.18, lidTilt: 0.4, browTilt: -0.6, brow: -0.2, press: 0.9, frown: 0.2 }),
  disgust: EXP({ lid: 0.3, lidTilt: 0.4, browTilt: -0.3, brow: -0.2, frown: 0.9, smirk: 0.6, mouthY: 0.8, cheek: 0.5 }),
  grief: EXP({ lid: 0.4, browTilt: 1.2, brow: 0.2, frown: 1, press: 0.6, lidTilt: -0.5, mw: -0.3 }),
  awe: EXP({ wide: 0.7, brow: 0.7, browArc: 0.9, open: 0.2, smile: 0.1, browTilt: 0.2 }),
  blank: EXP({ lid: 0.3, smile: -0.05, press: 0.2 }),
  cry: EXP({ lid: 0.38, browTilt: 1.2, brow: 0.15, frown: 1, open: 0.18, mw: -0.3, tear: 1, quiver: 0.8, lidTilt: -0.4, cheek: 0.2 }),
  sob: EXP({ lid: 0.75, browTilt: 1.3, brow: 0.3, frown: 1, open: 0.45, mw: 0.2, tear: 1, quiver: 1.0, cheek: 0.4, teeth: 0.5 }),
  terrified: EXP({ wide: 1, brow: 1, browTilt: 0.9, open: 0.5, frown: 0.3, small: 1, quiver: 0.8, sweat: 1, mw: -0.2 }),
  nervous: EXP({ wide: 0.25, brow: 0.3, browTilt: 0.7, smile: 0.25, press: 0.4, sweat: 1, smirk: 0.3, quiver: 0.2 }),
  joy: EXP({ smile: 1, open: 0.25, teeth: 1, cheek: 0.8, brow: 0.35, browArc: 0.7, lid: 0.2, mw: 0.6 }),
  laugh: EXP({ smile: 1, open: 0.75, teeth: 1, cheek: 1, lid: 0.65, brow: 0.2, mw: 0.9 }),
  love: EXP({ smile: 0.55, lid: 0.3, browTilt: 0.6, cheek: 0.35, brow: 0.15, mouthY: 0.2 }),
  embarrassed: EXP({ smile: 0.4, smirk: 0.6, brow: 0.5, browTilt: 0.8, sweat: 1, lid: 0.15, press: 0.2 }),
  evil: EXP({ smile: 0.8, smirk: 0.7, lid: 0.3, lidTilt: 0.7, browTilt: -0.9, brow: -0.3, cheek: 0.2, small: 0.6 }),
  proud: EXP({ smile: 0.35, lid: 0.2, brow: 0.3, browArc: 0.5, press: 0.3 }),
  hopeful: EXP({ wide: 0.3, browTilt: 0.9, brow: 0.3, smile: 0.3, cheek: 0.1 }),
  joyTears: EXP({ smile: 1, open: 0.3, teeth: 0.6, cheek: 0.9, tear: 1, quiver: 0.3, browTilt: 0.6, lid: 0.4 }),
  sleepy: EXP({ lid: 0.72, brow: -0.2, smile: 0.0, open: 0.1 }),
  smug: EXP({ smile: 0.5, smirk: 1, lid: 0.3, brow: 0.2, asym: 0.8, browArc: 0.4 }),
  panic: EXP({ wide: 1, brow: 1, browTilt: 1.2, open: 0.7, small: 1, quiver: 1, sweat: 1, mw: -0.4 }),
};
function lerpExp(a, b, t) { const o = {}; for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; }

// ---------------- eye texture (equirect on the eyeball: iris faces +z at u=0.25) ----------------
const eyeTexCache = new Map();
function eyeTex(iris, sclera) {
  const k = iris + sclera; if (eyeTexCache.has(k)) return eyeTexCache.get(k);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = sclera; g.fillRect(0, 0, 256, 128);
  const cx = 64, cy = 64, r = 25;
  g.fillStyle = shade(iris, 0.35); g.beginPath(); g.arc(cx, cy, r + 2.5, 0, 7); g.fill();            // limbal ring
  const gr = g.createRadialGradient(cx, cy + 4, 4, cx, cy, r); gr.addColorStop(0, shade(iris, 1.35)); gr.addColorStop(0.7, iris); gr.addColorStop(1, shade(iris, 0.6));
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.fillStyle = '#0a0709'; g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; eyeTexCache.set(k, t); return t;
}

// ---------------- head geometry with per-character face shape ----------------
const HRX = 0.17, HRY = 0.19, HRZ = 0.172;
function headGeometry(F) {
  const g = new THREE.SphereGeometry(1, 72, 52), p = g.attributes.position; const gau = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));
  const ex = F.eyeGap / (HRX * F.w), ey = 0.1;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const front = sstep(-0.1, 0.6, z);
    const jy = sstep(-0.05, -0.95, y);
    x *= 1 - (1 - F.jaw) * jy; z *= 1 - 0.1 * jy;
    if (y < 0) y *= 1 + F.chin * sstep(0, -1, y) * 1.5;
    if (y < -0.55) { const k = sstep(-0.55, -1, y); x *= 1 - 0.18 * k; z += 0.05 * k * front; } // chin point
    x += Math.sign(x) * F.cheek * 0.07 * gau(y, -0.18, 0.28) * (0.3 + 0.7 * front);               // cheekbones
    z += F.brow * 0.06 * gau(y, 0.33, 0.14) * front;                                              // brow ridge
    for (const s of [-1, 1]) z -= 0.05 * gau(x, s * ex, 0.24) * gau(y, ey, 0.17) * front;           // eye sockets
    z += 0.025 * gau(y, 0.7, 0.2) * front;                                                         // forehead
    if (z < 0) z *= 0.95;
    p.setXYZ(i, x * HRX * F.w, y * HRY, z * HRZ);
  }
  g.computeVertexNormals(); return g;
}
// surface lookup table (front of the head) so features sit exactly on the skin
function surfTable(mesh) {
  const rc = new THREE.Raycaster(); const NX = 33, NY = 33, X0 = -0.2, X1 = 0.2, Y0 = -0.25, Y1 = 0.22; const tab = new Float32Array(NX * NY);
  const tmp = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); const old = mesh.material; mesh.material = tmp; mesh.updateMatrixWorld(true);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { rc.set(new THREE.Vector3(lerp(X0, X1, i / (NX - 1)), lerp(Y0, Y1, j / (NY - 1)), 0.6), new THREE.Vector3(0, 0, -1)); const h = rc.intersectObject(mesh, false); tab[j * NX + i] = h.length ? h[0].point.z : 0.05; }
  mesh.material = old;
  return (x, y) => { const u = clamp((x - X0) / (X1 - X0), 0, 1) * (NX - 1), v = clamp((y - Y0) / (Y1 - Y0), 0, 1) * (NY - 1); const i = Math.min(NX - 2, Math.floor(u)), j = Math.min(NY - 2, Math.floor(v)), fu = u - i, fv = v - j;
    return lerp(lerp(tab[j * NX + i], tab[j * NX + i + 1], fu), lerp(tab[(j + 1) * NX + i], tab[(j + 1) * NX + i + 1], fu), fv); };
}


// smooth lofted tube along a polyline (used for brows and lips; rebuilt every frame)
class Strip {
  constructor(parent, mat, n, sides = 8) {
    this.n = n; this.sides = sides; const vc = n * sides + 2; this.pos = new Float32Array(vc * 3); const idx = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) { const a = i * sides + j, b = i * sides + (j + 1) % sides, c = (i + 1) * sides + j, d = (i + 1) * sides + (j + 1) % sides; idx.push(a, c, b, b, c, d); }
    const e0 = n * sides, e1 = n * sides + 1; for (let j = 0; j < sides; j++) { idx.push(e0, j, (j + 1) % sides); idx.push(e1, (n - 1) * sides + (j + 1) % sides, (n - 1) * sides + j); }
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat); this.mesh.frustumCulled = false; parent.add(this.mesh);
  }
  // pts: [[x,y,z]...], ry/rz: radii per point
  set(pts, ry, rz) {
    const n = this.n, S = this.sides, P = this.pos;
    for (let i = 0; i < n; i++) { const [x, y, z] = pts[i]; for (let j = 0; j < S; j++) { const a = (j / S) * Math.PI * 2, o = (i * S + j) * 3; P[o] = x; P[o + 1] = y + Math.sin(a) * ry[i]; P[o + 2] = z + Math.cos(a) * rz[i]; } }
    const e0 = n * S * 3, e1 = (n * S + 1) * 3; P[e0] = pts[0][0] - (pts[1][0] - pts[0][0]) * 0.35; P[e0 + 1] = pts[0][1]; P[e0 + 2] = pts[0][2]; P[e1] = pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]) * 0.35; P[e1 + 1] = pts[n - 1][1]; P[e1 + 2] = pts[n - 1][2];
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
  }
  set visible(v) { this.mesh.visible = v; }
}

const HAND_SIDES = { L: -1, R: 1 };
export class Person {
  constructor(spec) {
    this.sp = spec; const sp = spec; const hs = sp.headScale || 1;
    this.F = { ...FACES.oval, age: 0, eyeY: 0.02, noseUp: 0, ...(typeof sp.face === 'string' ? FACES[sp.face] : sp.face) };
    const F = this.F, bd = { w: 1, d: 1, shoulder: 1, belly: 0, arm: 1, leg: 1, ...(sp.build || {}) };
    this.bd = bd; this.height = sp.height ?? 0.9; this.cycLen = 1.3 * this.height;
    this.root = new THREE.Group(); this.root.scale.setScalar(this.height);
    this.pelvis = new THREE.Group(); this.root.add(this.pelvis); this.torso = new THREE.Group(); this.pelvis.add(this.torso);
    const skinHex = sp.skin || SKIN.wheatish; this.skinHex = skinHex;
    const skin = M(skinHex, { unlit: sp.skinUnlit ?? 0.1 }), bot = M(sp.bottom || '#3a3836'), top = M(sp.top || '#8a8a8a'), shoe = M(sp.shoe || '#2a2420');
    const kameez = sp.kameez ? (typeof sp.kameez === 'object' ? sp.kameez : {}) : null;
    const coat = sp.coat ? M(sp.coat) : null; const upper = coat || (kameez ? M(kameez.color || sp.top || '#8a8a8a') : top);
    this.upperMat = upper;
    // ---- torso ----
    const tp = [[0.001, -0.06], [0.15, -0.05], [0.17, 0.05], [0.15, 0.2], [0.162, 0.34], [0.185, 0.48], [0.18, 0.56], [0.12, 0.61], [0.055, 0.63], [0.001, 0.64]];
    this.tm = lathe(tp, upper, this.torso, 0.68 * bd.d, 28); this.tm.scale.x = bd.w;
    if (bd.belly) S_(this.torso, upper, 0.16, 0, 0.13, 0.015, bd.w * 1.02, 0.85, 0.72 + bd.belly * 1.1);
    // pelvis block + belt so legs never emerge from nowhere
    S_(this.pelvis, bot, 0.16, 0, -0.02, 0, bd.w * 1.05, 0.7, 0.72);
    if (sp.belt !== false && !coat && !kameez) B_(this.torso, M(sp.beltColor || '#1b1714'), 0.33 * bd.w, 0.035, 0.235 * bd.d, 0, 0.0, 0);
    // coat / kameez: panels attached to each thigh
    this.panels = [];
    const upLen = coat ? (sp.straightCoat ? 0.5 : sp.longCoat ? 0.76 : sp.coatLen ? 0.3 : 0.66) : kameez ? (kameez.len || 0.62) : 0;
    const flare = kameez ? 0.06 : sp.straightCoat ? 0.1 : sp.longCoat ? 0.17 : sp.coatLen ? 0.1 : 0.15;
    if (upLen) for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * bd.w, 0.12 * bd.w + flare * 0.7, 1, 18, 1, true), upper); m.material = M(sp.coat || kameez.color || sp.top, { side: THREE.DoubleSide }); m.frustumCulled = false; this.pelvis.add(m); m.userData.len = upLen; this.panels.push({ m, s }); }
    if (coat) {
      if (!sp.coatLen) B_(this.torso, M(shade(sp.coat, 0.8)), 0.36 * bd.w, 0.05, 0.26, 0, 0.2, 0);
      for (const s of [-1, 1]) { const c = B_(this.torso, M(shade(sp.coat, 0.9)), 0.1, 0.18, 0.05, s * 0.085, 0.56, 0.1); c.rotation.z = -s * 0.5; c.rotation.x = -0.2; }
      { const sh = new THREE.Shape(); sh.moveTo(-0.055, 0); sh.lineTo(0.055, 0); sh.lineTo(0, -0.2); sh.closePath(); const vm = new THREE.Mesh(new THREE.ShapeGeometry(sh), M(sp.shirt || '#a9a493', { side: THREE.DoubleSide })); vm.position.set(0, 0.62, 0.128); vm.rotation.x = -0.12; this.torso.add(vm); }
      if (!sp.noTie) B_(this.torso, M(sp.tie || '#6b2a2f'), 0.03, 0.17, 0.012, 0, 0.5, 0.134);
      if (sp.lanyard) { for (const s of [-1, 1]) { const l = B_(this.torso, M(sp.lanyard), 0.014, 0.3, 0.012, s * 0.05, 0.5, 0.14); l.rotation.z = s * 0.18; } B_(this.torso, M('#f2f0ea', { noInk: 1 }), 0.075, 0.1, 0.012, 0, 0.3, 0.158); }
      if (sp.bag) { const bg = B_(this.torso, M(sp.bag), 0.2, 0.15, 0.07, -0.19, 0.12, 0.04); bg.rotation.z = 0.1; const st = B_(this.torso, M(sp.bag), 0.02, 0.62, 0.014, -0.06, 0.34, 0.13); st.rotation.z = -0.5; }
    } else {
      { const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.118, 0.05, 20, 1, true), M(sp.collar || shade(sp.top || '#8a8a8a', 1.12), { side: THREE.DoubleSide })); cl.position.set(0, 0.62, 0.005); cl.scale.z = 0.85; this.torso.add(cl); }
      if (kameez) { B_(this.torso, M(shade(kameez.color || sp.top, 0.82)), 0.012, 0.2, 0.01, 0, 0.5, 0.125); for (const i of [0, 1, 2]) S_(this.torso, M(shade(kameez.color || sp.top, 0.6)), 0.007, 0, 0.58 - i * 0.07, 0.123); }
      if (sp.apron) { const ap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.26, 0.58, 20, 1, true, -1.0, 2.0), M(sp.apron, { side: THREE.DoubleSide })); ap.scale.z = 0.72; ap.position.set(0, 0.28, 0.01); this.torso.add(ap); B_(this.torso, M(sp.apron), 0.19, 0.2, 0.03, 0, 0.5, 0.125); }
      if (sp.waistcoat) { B_(this.torso, M(sp.waistcoat), 0.3 * bd.w, 0.36, 0.22 * bd.d, 0, 0.38, 0.015); }
    }
    this.LS = 0.2 * bd.shoulder * bd.w; this.SY = 0.55;
    this.trap = []; for (const s of [-1, 1]) { const tr = S_(this.torso, upper, 0.09, s * 0.1 * bd.w, 0.6, 0, 1.3, 0.55, 0.9); tr.rotation.z = -s * 0.35; this.trap.push(tr); }
    // ---- neck ----
    { const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.086, 0.3, 14), skin); nk.position.set(0, 0.72, 0.005); this.torso.add(nk); S_(this.torso, skin, 0.1, 0, 0.62, 0, 1.2, 0.6, 1.0); }
    // ---- head ----
    this.head = new THREE.Group(); this.head.position.set(0, 0.9, 0.01); this.torso.add(this.head);
    this.faceRoot = new THREE.Group(); this.faceRoot.scale.setScalar(hs); this.head.add(this.faceRoot);
    const hmesh = new THREE.Mesh(headGeometry(F), skin); hmesh.frustumCulled = false; this.faceRoot.add(hmesh); this.headMesh = hmesh;
    const surf = surfTable(hmesh); this.surf = surf;
    this._buildFace(sp, F, skin, skinHex, surf);
    this._buildHair(sp, hs);
    // ---- limbs ----
    this.limb = {}; const mk = (n, mat, rd, rp, parent) => { const m = new THREE.Mesh(taperG(rd, rp), mat); m.userData.r = 1; m.frustumCulled = false; parent.add(m); this.limb[n] = m; };
    const sleeveMat = coat || (sp.sleeve ? M(sp.sleeve) : upper); const foreMat = (coat || sp.longSleeve || kameez) ? sleeveMat : skin; const A = bd.arm;
    mk('aL', sleeveMat, 0.048 * A, 0.058 * A, this.torso); mk('aR', sleeveMat, 0.048 * A, 0.058 * A, this.torso); mk('fL', foreMat, 0.034 * A, 0.046 * A, this.torso); mk('fR', foreMat, 0.034 * A, 0.046 * A, this.torso);
    const baggy = sp.baggy ? 1.28 : 1, legMat = sp.skirt ? M(sp.legs || '#e8ddd0') : bot, shinMat = sp.shin ? M(sp.shin) : legMat, Lg = bd.leg;
    mk('tL', legMat, 0.068 * Lg * baggy, 0.088 * Lg * baggy, this.pelvis); mk('tR', legMat, 0.068 * Lg * baggy, 0.088 * Lg * baggy, this.pelvis);
    mk('sL', shinMat, 0.052 * Lg * (sp.baggy ? 1.1 : 1), 0.066 * Lg * baggy, this.pelvis); mk('sR', shinMat, 0.052 * Lg * (sp.baggy ? 1.1 : 1), 0.066 * Lg * baggy, this.pelvis);
    if (sp.sock) { mk('kL', M(sp.sock), 0.043, 0.052, this.pelvis); mk('kR', M(sp.sock), 0.043, 0.052, this.pelvis); } else if (!sp.noAnkleSkin) { mk('kL', skin, 0.043, 0.05, this.pelvis); mk('kR', skin, 0.043, 0.05, this.pelvis); }
    this.jt = {}; for (const s of ['L', 'R']) { this.jt['sh' + s] = S_(this.torso, sleeveMat, 0.06 * A); this.jt['el' + s] = S_(this.torso, foreMat, 0.047 * A); this.jt['kn' + s] = S_(this.pelvis, legMat, 0.07 * Lg * baggy); this.jt['hp' + s] = S_(this.pelvis, legMat, 0.088 * Lg * baggy); }
    // hands with fingers
    this.hand = {}; this.fingers = {}; for (const s of ['L', 'R']) this._buildHand(s, skin);
    // shoes: sole + upper + toe cap + heel
    this.shoes = []; const sole = M(sp.sole || '#14110f');
    for (let i = 0; i < 2; i++) { const g = new THREE.Group(); this.pelvis.add(g);
      B_(g, sole, 0.105, 0.03, 0.27, 0, -0.062, 0.055);
      const up = S_(g, shoe, 0.06, 0, -0.035, 0.07, 1.0, 0.75, 1.9); S_(g, shoe, 0.052, 0, -0.04, 0.17, 1.05, 0.62, 1.1); S_(g, shoe, 0.048, 0, 0.0, -0.01, 1.0, 0.8, 1.0);
      this.shoes.push(g); }
    this.props = new THREE.Group(); this.torso.add(this.props); this.handPos = {}; this.dbg = {};
    this.seed = sp.seed || 0;
  }
  // ---------- face ----------
  _buildFace(sp, F, skin, skinHex, surf) {
    const fr = this.faceRoot, eg = F.eyeGap, ey = F.eyeY, es = F.eyeSize, ER = 0.0215 * es;
    this.eyes = []; const sclera = sp.sclera || '#ece4da'; const etex = eyeTex(sp.eyeColor || '#4a3020', sclera);
    const ballMat = C.toon({ color: new THREE.Color(0xffffff), map: etex, unlit: 0.45, noInk: 1 });
    const lidMat = M(shade(skinHex, 0.97), { unlit: 0.1 }), lash = M(sp.lashColor || '#120d0d', { noInk: 1 });
    for (const s of [-1, 1]) {
      const eg_ = new THREE.Group(); const z = surf(s * eg, ey) - ER * 0.52; eg_.position.set(s * eg, ey, z); fr.add(eg_);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 28, 20), ballMat); ball.frustumCulled = false; eg_.add(ball);
      const glint = S_(eg_, M('#ffffff', { unlit: 1, noInk: 1 }), ER * 0.17, -ER * 0.3, ER * 0.34, ER * 0.93); glint.scale.setScalar(ER * 0.17);
      const up = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.13, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidMat); up.material = M(shade(skinHex, 0.97), { side: THREE.DoubleSide, unlit: 0.1 }); up.frustumCulled = false; eg_.add(up);
      const lo = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.11, 26, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), up.material); lo.frustumCulled = false; eg_.add(lo);
      const ln = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.13, ER * 0.085, 6, 24, Math.PI), lash); ln.rotation.x = Math.PI / 2; ln.frustumCulled = false; up.add(ln);
      const ln2 = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.11, ER * 0.045, 6, 24, Math.PI), lash); ln2.rotation.x = Math.PI / 2; ln2.frustumCulled = false; lo.add(ln2);
      let bag = null; if (sp.bags) { bag = S_(fr, M(sp.bagColor || shade(skinHex, 0.9), { noInk: 1 }), ER * 1.1, s * eg, ey - ER * 1.35, surf(s * eg, ey - ER * 1.35) - 0.001, 1.5, 0.3, 0.3); }
      this.eyes.push({ s, g: eg_, ball, up, lo, ER, bag });
    }
    // brows: smooth strips on the forehead
    this.browMat = M(sp.browColor || sp.hair || '#241a14', { noInk: 0.6 }); this.browN = 9; this.brows = [];
    for (const s of [-1, 1]) this.brows.push({ s, st: new Strip(fr, this.browMat, this.browN, 8) });
    this.browTh = (sp.browW || 24) * 0.00038;
    // nose
    const nz = (y) => surf(0, y), nm = M(shade(skinHex, 0.99), { unlit: 0.1 }); const nL = F.noseL, nW = F.noseW;
    S_(fr, nm, 0.0142 * nW, 0, -0.03, nz(-0.03) + 0.015 * nL, 1.0, 1.15, 1.1 + 0.15 * nL);          // tip
    for (const s of [-1, 1]) S_(fr, nm, 0.0072 * nW, s * 0.0135 * nW, -0.04, nz(-0.04) + 0.0008, 1.0, 0.85, 0.8);
    for (const s of [-1, 1]) S_(fr, M('#1c0f10', { noInk: 1 }), 0.0032, s * 0.008 * nW, -0.05, nz(-0.05) + 0.0135 * nL, 1.0, 0.7, 0.4);
    this.noseParts = []; for (const m of fr.children.slice(-5)) if (m.isMesh) this.noseParts.push([m, m.position.y]);
    const tearMat = M('#cfe6ff', { unlit: 0.8, noInk: 1 }); this.tears = []; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const m = S_(fr, tearMat, 0.0045, 0, 0, 0, 0.9, 1.4, 0.9); m.visible = false; this.tears.push({ m, s, i }); }
    this.sweatD = S_(fr, tearMat, 0.005, 0.11, 0.09, 0, 0.9, 1.5, 0.9); this.sweatD.visible = false;
    // lips
    this.lipMat = M(sp.lip || mixHex(skinHex, '#6a2328', 0.42), { unlit: 0.1, noInk: 0.5 }); this.lipN = 13;
    const mlMat = M(shade(sp.lip || mixHex(skinHex, '#6a2328', 0.42), 0.35), { noInk: 1 });
    this.upS = new Strip(fr, this.lipMat, this.lipN, 8); this.loS = new Strip(fr, this.lipMat, this.lipN, 8); this.mlS = new Strip(fr, mlMat, this.lipN, 4);
    this.mouthIn = S_(fr, M('#25090d', { noInk: 1 }), 0.02, 0, -0.1, 0, 1, 1, 0.5); this.mouthIn.visible = false;
    this.teeth = S_(fr, M('#f0ebe0', { unlit: 0.5, noInk: 1 }), 0.02, 0, -0.1, 0, 1, 0.3, 0.4); this.teeth.visible = false;
    this.mouthY0 = F.mouthY ?? -0.098;
    // ears
    for (const s of [-1, 1]) { const x = s * HRX * F.w * 0.97; S_(fr, skin, 0.034 * F.ear, x, -0.012, -0.008, 0.5, 1.15, 0.85); S_(fr, M(shade(skinHex, 0.8)), 0.017 * F.ear, x + s * 0.004, -0.012, -0.002, 0.4, 0.9, 0.7); }
    // age lines
    if (F.age > 0.25 || sp.wrinkles) { const w = M(shade(skinHex, 0.68), { noInk: 1 }); const a = Math.max(F.age, sp.wrinkles || 0);
      for (let i = 0; i < 3; i++) for (const sx of [-0.5, 0.5]) { const y = 0.115 + i * 0.016; const b = B_(fr, w, 0.07, 0.0016, 0.002, sx * 0.1, y, surf(sx * 0.1, y) + 0.001); b.rotation.z = sx * 0.05; b.visible = a > 0.3 + i * 0.15; }
      for (const s of [-1, 1]) { const b = B_(fr, w, 0.002, 0.045, 0.002, s * 0.055, -0.07, surf(s * 0.055, -0.07) + 0.001); b.rotation.z = s * 0.35; b.visible = a > 0.35; } }
  }
  _buildHair(sp, hs) {
    const hair = M(sp.hair || '#2a1e18'), H = this.head;
    const cap = (th, sy, tilt, sz) => { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * th), hair); c.scale.set(0.178 * hs, sy * hs, sz * hs); c.position.set(0, 0.004, -0.014); c.rotation.x = tilt; c.frustumCulled = false; H.add(c); return c; };
    const back = (a = 0.72) => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, Math.PI / 2 + 1.22, Math.PI * 2 - 2.44, 0, Math.PI * a), hair); b.scale.set(0.18 * hs, 0.205 * hs, 0.18 * hs); b.position.set(0, 0, -0.004); b.frustumCulled = false; H.add(b); };
    const st = sp.hairStyle;
    if (st === 'bun') { cap(0.40, 0.206, -0.28, 0.19); S_(H, hair, 0.075, 0, 0.215 * hs, -0.07); for (const s of [-1, 1]) S_(H, hair, 0.05, s * 0.158 * hs, -0.02, -0.04, 0.8, 2.2, 1.6); back(); }
    if (st === 'bob') { cap(0.42, 0.2, -0.34, 0.184); back(); S_(H, hair, 0.15, 0, -0.17, -0.075, 1.12, 1.15, 0.7); for (const s of [-1, 1]) S_(H, hair, 0.05, s * 0.163 * hs, -0.07, -0.03, 0.8, 3.2, 1.7); }
    if (st === 'short') { cap(0.42, 0.2, -0.34, 0.184); back(); const bk = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hair); bk.scale.set(0.172 * hs, 0.19 * hs, 0.15 * hs); bk.position.set(0, 0, -0.06); H.add(bk); for (const s of [-1, 1]) S_(H, hair, 0.045, s * 0.16 * hs, 0.02, -0.03, 0.8, 1.8, 1.5); }
    if (st === 'crop') { cap(0.38, 0.198, -0.3, 0.182); back(0.64); for (const s of [-1, 1]) S_(H, hair, 0.04, s * 0.158 * hs, 0.03, -0.03, 0.7, 1.4, 1.4); }
    if (st === 'side') { cap(0.43, 0.2, -0.38, 0.186); back(); S_(H, hair, 0.07, 0.05 * hs, 0.165 * hs, 0.05 * hs, 1.5, 0.5, 1.1); for (const s of [-1, 1]) S_(H, hair, 0.045, s * 0.16 * hs, 0.02, -0.03, 0.8, 1.8, 1.5); }
    if (st === 'curly') { cap(0.4, 0.2, -0.32, 0.186); back(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = 0.16 * hs; S_(H, hair, 0.05, Math.sin(a) * r, 0.1 + 0.07 * Math.cos(i * 2.1), Math.cos(a) * r * 0.9 - 0.02); } for (let i = 0; i < 6; i++) S_(H, hair, 0.06, (i - 2.5) * 0.06 * hs, 0.19 * hs, -0.01 + (i % 2) * 0.03); }
    if (st === 'gray') { back(0.66); }
    if (sp.beard) this._beard(sp.beard, sp.beardFull ?? 1);
    if (sp.stubble) this._beard(mixHex(this.skinHex, sp.stubble, 0.55), 0.28);
    if (sp.mustache) this._mustache(sp.mustache);
    if (sp.hat && sp.hatStyle === 'sou') {
      const hc = M(sp.hat); const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hc); dome.scale.set(0.205 * hs, 0.2 * hs, 0.215 * hs); dome.position.set(0, 0.03 * hs, -0.01); dome.rotation.x = -0.12; H.add(dome);
      const fb = B_(H, hc, 0.4 * hs, 0.02, 0.17, 0, 0.135 * hs, 0.17 * hs); fb.rotation.x = 0.12; B_(H, M(sp.hatBand || shade(sp.hat, 0.6)), 0.37 * hs, 0.03, 0.37 * hs, 0, 0.115 * hs, 0);
    } else if (sp.hat && sp.hatStyle === 'topi') {   // prayer cap
      const hc = M(sp.hat); const d = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), hc); d.scale.set(0.178 * hs, 0.2 * hs, 0.184 * hs); d.position.set(0, 0.03, -0.01); d.rotation.x = -0.1; H.add(d); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.162 * hs, 0.166 * hs, 0.05, 24, 1, true), M(sp.hat, { side: THREE.DoubleSide })); r.position.set(0, 0.108 * hs, -0.008); r.rotation.x = -0.1; H.add(r);
    } else if (sp.hat) {
      const hc = M(sp.hat); const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.17, 0.15, 20), hc); crown.position.set(0, 0.2 * hs, -0.002); H.add(crown); B_(H, M(shade(sp.hat, 0.8)), 0.04, 0.02, 0.22, 0, 0.275 * hs, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.016, 28), hc); brim.position.set(0, 0.128 * hs, 0); H.add(brim); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.176, 0.036, 20), M(sp.hatBand || '#1d1a1c')); band.position.set(0, 0.147 * hs, -0.002); H.add(band);
    }
  }
  // beard = jaw strip (ear to ear under the chin) + chin tuft + optional mustache; lips stay visible. full 0..1 thickness
  _beard(color, full = 1) {
    const fr = this.faceRoot, F = this.F, surf = this.surf, m = M(color, { noInk: 0.5 }); const N = 15, W = HRX * F.w;
    const jaw = new Strip(fr, m, N, 8), pts = [], ry = [], rz = [];
    for (let i = 0; i < N; i++) { const u = (i / (N - 1)) * 2 - 1, x = u * W * 0.93, y = -0.03 - 0.125 * (1 - u * u) - 0.02 * (1 - Math.abs(u)) * 0; const th = (0.014 + 0.016 * (1 - Math.abs(u))) * full + 0.004; const z = Math.max(surf(x, Math.max(y, -0.24)) - 0.002, -0.02) + (Math.abs(u) > 0.8 ? -0.012 : 0.0) + th * 0.2; pts.push([x, y, z]); ry.push(th * 1.1); rz.push(th); }
    jaw.set(pts, ry, rz);
    if (full > 0.6) { const my = this.mouthY0 - 0.036, chin = new Strip(fr, m, 7, 6); const cp = [], cy = [], cz = []; for (let i = 0; i < 7; i++) { const u = (i / 6) * 2 - 1, x = u * 0.034, y = my - 0.01 * (1 - u * u); cp.push([x, y, surf(x, y) + 0.008]); cy.push(0.011 * full); cz.push(0.009 * full); } chin.set(cp, cy, cz); this._mustache(color, 1.0); }
  }
  _mustache(color, k = 1) {
    const fr = this.faceRoot, F = this.F, surf = this.surf, m = M(color, { noInk: 0.5 }); const N = 11, st = new Strip(fr, m, N, 6), pts = [], ry = [], rz = []; const w = 0.046 * F.mouthW;
    for (let i = 0; i < N; i++) { const u = (i / (N - 1)) * 2 - 1, x = u * w, y = this.mouthY0 + 0.021 - 0.009 * Math.abs(u) * Math.abs(u) * 1.2 + 0.004 * (1 - Math.abs(u)); const th = 0.0075 * (1 - 0.4 * Math.abs(u)) * k; pts.push([x, y, surf(x, y) + th * 0.9]); ry.push(th * 0.9); rz.push(th); }
    st.set(pts, ry, rz);
  }
  // ---------- hands ----------
  _buildHand(s, skin) {
    const g = new THREE.Group(); this.torso.add(g); const side = HAND_SIDES[s]; const th = s === 'L' ? -1 : 1; // thumb at local -x for the right hand (key L)
    S_(g, skin, 0.034, 0, -0.012, 0, 1.0, 0.7, 0.75);                                  // wrist
    S_(g, skin, 0.047, 0, -0.056, 0, 1.0, 1.0, 0.5);                                   // palm
    S_(g, skin, 0.03, th * -0.022, -0.075, -0.004, 1.0, 0.9, 0.45);                    // pinky-side heel
    const fingers = []; const XS = [-0.031, -0.0105, 0.0105, 0.031], LEN = [0.043, 0.048, 0.045, 0.036], R_ = [0.0098, 0.0104, 0.0102, 0.0088];
    for (let i = 0; i < 4; i++) {
      const root = new THREE.Group(); root.position.set(XS[i] * th * -1, -0.098, 0); g.add(root); const seg = [];
      let parent = root; const parts = [0.5, 0.3, 0.2];
      for (let j = 0; j < 3; j++) { const L = LEN[i] * parts[j] / 0.5 * 0.5 * 1.0; const l = LEN[i] * [0.5, 0.3, 0.22][j] * 1.7 / 1.7; const grp = new THREE.Group(); grp.position.y = j === 0 ? 0 : -(LEN[i] * [0.5, 0.3, 0.22][j - 1]); parent.add(grp);
        const rr = R_[i] * (1 - j * 0.1); add(grp, sphG, skin, rr, l / 2 + rr * 0.5, rr * 0.92, 0, -l / 2, 0); seg.push(grp); parent = grp; }
      fingers.push(seg);
    }
    const tb = new THREE.Group(); tb.position.set(th * 0.034, -0.05, 0.004); g.add(tb); const tseg = [];
    let tp = tb; for (let j = 0; j < 2; j++) { const l = [0.04, 0.034][j]; const gr = new THREE.Group(); gr.position.y = j ? -0.04 : 0; tp.add(gr); add(gr, sphG, skin, 0.0115 - j * 0.0012, l / 2 + 0.006, 0.0105, 0, -l / 2, 0); tseg.push(gr); tp = gr; }
    this.hand[s] = g; this.fingers[s] = { fingers, thumb: tb, tseg, th };
  }
  _poseHand(s, grip, t) {
    const F = this.fingers[s]; const c = grip.curl ?? 0.3, spread = grip.spread ?? 0, thumb = grip.thumb ?? 0.4;
    F.fingers.forEach((seg, i) => { const k = clamp(c * (1 + (i - 1.5) * 0.06) + 0.02 * Math.sin(t * 0.9 + i + (s === 'L' ? 0 : 2)) * (1 - c), 0, 1.1);
      seg[0].rotation.x = -k * 1.35; seg[1].rotation.x = -k * 1.5; seg[2].rotation.x = -k * 0.95; seg[0].rotation.z = F.th * -1 * spread * (i - 1.5) * 0.1; });
    if (grip.tap) F.fingers[0][0].rotation.x -= grip.tap * 0.45 * Math.max(0, Math.sin(t * 11)); if (grip.wiggle) F.fingers.forEach((sg, i) => { sg[0].rotation.x -= grip.wiggle * 0.25 * (0.5 + 0.5 * Math.sin(t * 7 + i * 1.3)); });
    const tk = thumb; F.thumb.rotation.set(-tk * 0.35, 0, F.th * (0.55 - 0.45 * tk)); F.tseg[0].rotation.x = -tk * 0.5; F.tseg[1].rotation.x = -tk * 0.7;
    F.thumb.rotation.y = F.th * -(0.15 + tk * 0.7);
  }
  seg(m, a, b, rmul = 1) { const d = new THREE.Vector3().subVectors(b, a); const len = d.length() || 1e-4; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(rmul, len, rmul); }
  // ---------- per-frame update ----------
  update(p) {
    this.lastPose = p; const sp = this.sp, sc = this.height, T = p.t || 0, bd = this.bd; const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const walking = p.walk != null, ph = (p.walk || 0), phr = ph * Math.PI * 2;
    const sk = p.sit ? (p.sit.k ?? 1) : (p.sitK != null ? p.sitK : 0), gaitK = (p.gait ?? 1) * (p.walkK ?? 1);
    this.root.updateMatrixWorld(true); const rootY = this.root.position.y;
    const gl = (xl, zl) => { if (!p.ground) return 0; const w = V(xl, 0, zl); this.root.localToWorld(w); return (p.ground(w.x, w.z) - rootY) / sc; };
    // ---- feet targets (root-local), IK later ----
    const L1 = 0.44, L2 = 0.44, LEG = 0.872, HIP = 0.085, ANK = 0.078;
    const feet = [];
    const cyc = (p.cyc ?? this.cycLen) / sc, duty = p.duty ?? 0.6, S = duty * cyc / 2, wk = walking ? (p.walkK ?? 1) : 0;
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1, fx = side * 0.1; let z = 0, y, pitch = 0, yaw = side * 0.06;
      if (p.footTarget && p.footTarget[i ? 'R' : 'L']) { const ft = p.footTarget[i ? 'R' : 'L']; const w = ft.w.clone(); this.root.worldToLocal(w); feet.push({ x: w.x, y: w.y, z: w.z, pitch: ft.pitch || 0, yaw: ft.yaw ?? yaw, ex: true }); continue; }
      if (walking) {
        const u = (((ph + (i ? 0.5 : 0)) % 1) + 1) % 1;
        if (u < duty) { const v = u / duty; z = S - 2 * S * v; y = Math.max(gl(fx, z - 0.04), gl(fx, z + 0.12)); pitch = lerp(0.2, 0, sstep(0, 0.22, v)) - 0.5 * sstep(0.72, 1, v); }
        else { const v = (u - duty) / (1 - duty), e = sstep(0, 1, v); z = -S + 2 * S * e; const trav = (1 - duty) * cyc;
          const gS = gl(fx, -S - v * trav), gE = gl(fx, S + (1 - v) * trav); const yb = lerp(gS, gE, sstep(0.15, 0.7, v)); const arc = (0.05 + 0.05 * gaitK + 0.6 * Math.max(0, gE - gS)) * Math.sin(Math.PI * v);
          y = Math.max(yb + arc, gl(fx, z + 0.14) + 0.028 * Math.sin(Math.PI * v), gl(fx, z - 0.05) + 0.02 * Math.sin(Math.PI * v)); pitch = lerp(-0.5, 0.25, sstep(0, 0.65, v)); }
      } else { z = (p.stanceZ ? p.stanceZ[i] : 0); y = Math.max(gl(fx, z - 0.05), gl(fx, z + 0.14)); yaw = side * (p.toeOut ?? 0.12); }
      if (walking && wk < 1) { const sz0 = p.stanceZ ? p.stanceZ[i] : 0, sy0 = Math.max(gl(fx, sz0 - 0.05), gl(fx, sz0 + 0.14)); z = lerp(sz0, z, wk); y = lerp(sy0, y, wk); pitch *= wk; yaw = lerp(side * (p.toeOut ?? 0.12), yaw, wk); }
      feet.push({ x: fx, y, z, pitch, yaw });
    }
    if (p.sit) { const sit = p.sit; for (let i = 0; i < 2; i++) { const f = feet[i]; if (f.ex) continue; const side = i ? 1 : -1; const nx = lerp(f.x, side * (sit.kneeX ?? 0.115), sk), nz = lerp(f.z, sit.footZ ?? 0.43, sk); const ny = lerp(f.y, Math.max(gl(nx, nz - 0.05), gl(nx, nz + 0.14)), sk); f.x = nx; f.z = nz; f.y = ny; f.pitch = lerp(f.pitch, 0.05, sk); f.yaw = lerp(f.yaw, side * 0.05, sk); } }
    // pelvis height from the leg that is most extended (never over-reaches, bobs naturally)
    let pelY = 1e9; const crouch = (p.crouch || 0);
    for (const f of feet) { if (f.ex) continue; const dx = f.x - Math.sign(f.x) * HIP, dz = f.z; const v = Math.sqrt(Math.max(0.05, (LEG - 0.012 - crouch * 0.4) ** 2 - dx * dx - dz * dz)); pelY = Math.min(pelY, f.y + ANK + v + 0.05); }
    if (pelY > 1e8) pelY = (feet[0].y + feet[1].y) / 2 + 0.93;
    if (walking) pelY += (0.012 * gaitK) * Math.sin(phr * 2 + 1.2) * 0; // bob comes from the geometry
    pelY -= (p.pelDrop || 0);
    let seatY = p.seatY ?? (feet[0].y + 0.57);
    if (p.sit) { const sl = (p.sit.h - rootY) / sc, front = p.sit.front ?? 0.22; let py = sl + 0.14; const f0 = feet[0];
      for (let it = 0; it < 3; it++) { const r = ik2(V(-HIP, py - 0.05, 0), V(f0.x, f0.y + ANK, f0.z), L1, L2, V(0, 0.05, 1)); const slope = Math.max(0, (py - 0.05 - r.mid.y) / Math.max(0.05, r.mid.z)); py = sl + 0.142 + slope * front; }   // thigh must clear the seat edge even when the knee hangs lower than the hip
      seatY = py; }
    pelY = lerp(pelY, seatY, sk);
    let assistLean = 0;
    if (p.reachAssist !== false) { const tg = [p.handL, p.handR].filter(h => h && h.w && (h.k ?? 1) > 0.3); if (tg.length) {
      const rp = this.root.position, yaw = this.root.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw); let worst = null;
      const shoulderAt = (al, drop, sgn) => { const ly = 0.55 * Math.cos(al), lz = 0.55 * Math.sin(al); const x = sgn * this.LS, y = pelY - drop + ly, z = (p.hipZ || 0) + lz; return V(rp.x + (x * cy + z * sy) * sc, rp.y + y * sc, rp.z + (-x * sy + z * cy) * sc); };
      const dist = (al, drop) => { let m = 0; for (const h of tg) { const sgn = h === p.handL ? -1 : 1; const d = shoulderAt(al, drop, sgn).distanceTo(h.w) / sc; m = Math.max(m, d - (h.dir ? 0 : 0)); } return m; };
      const LIM = 0.54; // comfortable palm reach in local units (arm 0.56 + palm 0.066, minus slack)
      let al = 0, drop = 0; if (dist(0, 0) > LIM) { let lo = 0, hi = 0.95; for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (dist(mid, 0) > LIM) lo = mid; else hi = mid; } al = hi; if (dist(al, 0) > LIM) { let l2 = 0, h2 = 0.32; for (let i = 0; i < 12; i++) { const mid = (l2 + h2) / 2; if (dist(al, mid) > LIM) l2 = mid; else h2 = mid; } drop = h2; } }
      if (al > 0.5) { /* prefer crouching over folding in half */ let l2 = 0, h2 = 0.32; for (let i = 0; i < 12; i++) { const mid = (l2 + h2) / 2; if (dist(0.5, mid) > LIM) l2 = mid; else h2 = mid; } if (dist(0.5, h2) <= LIM + 0.02) { al = 0.5; drop = h2; } }
      const kk = Math.max(...tg.map(h => h.k ?? 1)); assistLean = al * (180 / Math.PI) * kk; pelY -= drop * kk; this.dbg.assist = { lean: assistLean, drop }; } }
    const swayX = walking ? 0.014 * Math.sin(phr) : 0.014 * Math.sin(T * 0.55 + this.seed);
    this.pelvis.position.set(p.hipX ?? swayX, pelY, p.hipZ || 0);
    const hipYaw = rad(p.hipYaw || 0) + (walking ? 0.07 * gaitK * Math.sin(phr) : 0.012 * Math.sin(T * 0.4 + this.seed));
    this.pelvis.rotation.set(0, hipYaw, walking ? 0.035 * Math.sin(phr) : 0.01 * Math.sin(T * 0.55 + this.seed));
    const breath = (p.breath ?? 1) * (0.5 + 0.5 * Math.sin(T * (p.breathRate || 1.5) + this.seed));
    this.torso.rotation.set(rad((p.lean || 0) + assistLean) + (walking ? rad(3 * gaitK) : 0) + 0.006 * Math.sin(T * 1.7), rad(p.twist || 0) - (walking ? 0.1 * gaitK * Math.sin(phr) : -0.01 * Math.sin(T * 0.8)), rad(p.sway || 0) + (walking ? -0.03 * Math.sin(phr) : 0.012 * Math.sin(T * 0.9)));
    this.torso.position.y = 0;
    this.tm.scale.set(bd.w * (1 + 0.012 * breath), 1 + 0.006 * breath, 0.68 * bd.d * (1 + 0.02 * breath));
    const shr = (p.shrug || 0) * 0.035 + 0.004 * breath, SY = 0.55 + shr;
    this.pelvis.updateMatrix(); this.torso.updateMatrix(); this.root.updateMatrixWorld(true);
    // ---- legs IK ----
    const pelInv = new THREE.Matrix4().copy(this.pelvis.matrix).invert();
    for (let i = 0; i < 2; i++) {
      const s = i ? 'R' : 'L', side = i ? 1 : -1, f = feet[i]; const hip = V(side * HIP, -0.05, 0);
      let ank = V(f.x, f.y + ANK, f.z); if (!f.ex) ank.y += Math.max(0, -f.pitch) * 0.12 + Math.max(0, f.pitch) * 0.07; ank.applyMatrix4(pelInv);
      if (sk > 0.001 && !p.sit) { const fT = p.sitF ?? 88, kT = p.sitKn ?? 88; const [d1] = limbDir(fT, 3, 0, side); const [, d2] = limbDir(fT, 3, -kT, side); const kn = hip.clone().addScaledVector(d1, L1); const fk = kn.clone().addScaledVector(d2, L2); ank.lerp(fk, sk); }
      const r = ik2(hip, ank, L1, L2, V(side * 0.12, 0.05, 1)); const kneeP = r.mid, ankE = r.end;
      this.seg(this.limb['t' + s], hip, kneeP); this.jt['kn' + s].position.copy(kneeP); this.jt['hp' + s].position.copy(hip);
      if (this.limb['k' + s]) { const hem = kneeP.clone().lerp(ankE, sp.baggy ? 0.8 : 0.77); this.seg(this.limb['s' + s], kneeP, hem); this.seg(this.limb['k' + s], hem, ankE); } else this.seg(this.limb['s' + s], kneeP, ankE);
      const sh = this.shoes[i]; sh.position.copy(ankE); const shin = ankE.clone().sub(kneeP).normalize();
      const pitch = sk > 0.5 ? 0.15 : f.pitch; sh.quaternion.setFromEuler(new THREE.Euler(pitch, f.yaw - hipYaw * 0, 0, 'YXZ')); // yaw in pelvis space
      this.dbg['foot' + s] = { y: f.y, reach: r.reach };
      // coat / kameez panels follow the thigh but hang (gravity)
    }
    for (const pn of this.panels) { const i = pn.s < 0 ? 0 : 1; const hip = V(pn.s * HIP * 0.9, -0.03, 0); const t = this.limb[i ? 'tR' : 'tL'];
      const thighDir = V(0, 1, 0).applyQuaternion(t.quaternion).normalize(); const d = thighDir.multiplyScalar(0.38).add(V(0, -0.62, 0)).normalize(); const len = pn.m.userData.len;
      pn.m.position.copy(hip).addScaledVector(d, len / 2); pn.m.quaternion.setFromUnitVectors(UP, d.clone().negate()); pn.m.scale.set(1, len, 0.9); }
    // ---- arms (FK default, IK when hand targets are given) ----
    this.handPos = {}; this.dbg.hands = {};
    const reachAssist = [];
    for (const s of ['L', 'R']) {
      const side = s === 'L' ? -1 : 1; let a = p['arm' + s]; const tg = p['hand' + s];
      if (!a) a = walking ? { f: Math.sin(phr + (s === 'L' ? Math.PI : 0)) * 26 * gaitK, o: 6, b: 14 + 8 * gaitK } : { f: 2 + 1.5 * Math.sin(T * 0.7 + this.seed), o: 7, b: 8 + 2 * breath };
      const Sp = V(side * this.LS, SY, 0); const [d1, d2] = limbDir(a.f, a.o, a.b, side);
      let E = Sp.clone().addScaledVector(d1, 0.29), Wr = E.clone().addScaledVector(d2, 0.27); let fd = d2.clone(); let pn = V(-side, 0, 0);
      let k = 0; let tl = null;
      if (tg) { k = tg.k ?? 1; if (tg.w) { tl = tg.w.clone(); this.torso.updateWorldMatrix(true, false); this.torso.worldToLocal(tl); } else if (tg.l) tl = V(...tg.l); if (tg.k === 0) tl = null; }
      let reach = 0;
      if (tl) {
        // wrist from palm target: palm centre is 0.066 beyond the wrist along the finger direction
        let dir = tg.dir ? V(...tg.dir).normalize() : null; if (dir && tg.dirW) { dir = tg.dirW.clone(); }
        let wr = tl.clone(); let r = null;
        for (let it = 0; it < 3; it++) { r = ik2(Sp, wr, 0.29, 0.27, V(side * 0.5, -0.8, -0.35)); const dd = dir || tl.clone().sub(r.mid).normalize(); wr = tl.clone().addScaledVector(dd, -0.066); fd = dd.clone(); }
        r = ik2(Sp, wr, 0.29, 0.27, V(side * 0.5, -0.8, -0.35)); reach = r.reach; const E2 = r.mid, W2 = r.end;
        E = E.lerp(E2, k); Wr = Wr.lerp(W2, k); fd = d2.clone().lerp(fd, k).normalize();
        if (tg.pn) pn = V(...tg.pn).lerp(pn, 1 - k).normalize();
      }
      this.seg(this.limb['a' + s], Sp, E); this.seg(this.limb['f' + s], E, Wr); this.jt['sh' + s].position.copy(Sp); this.jt['el' + s].position.copy(E);
      const hnd = this.hand[s]; hnd.position.copy(Wr);
      const Y = fd.clone().negate(); let Z = pn.clone().addScaledVector(Y, -pn.dot(Y)); if (Z.lengthSq() < 1e-5) Z.set(0, 0, 1); Z.normalize(); const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
      hnd.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
      this.handPos[s] = Wr.clone().addScaledVector(fd, 0.066);
      const grip = (p['grip' + s]) || { curl: 0.28 + 0.04 * Math.sin(T * 0.8 + side), thumb: 0.35 };
      this._poseHand(s, { curl: grip.curl, thumb: grip.thumb, spread: grip.spread, tap: grip.tap, wiggle: grip.wiggle }, T);
      this.dbg.hands[s] = { reach, k: tg ? (tg.k ?? 1) : 0, palmLocal: this.handPos[s].clone() };
    }
    // ---- head & face ----
    const h = p.head || {}; this.head.rotation.set(rad(h.pitch || 0) + 0.004 * Math.sin(T * 1.1 + this.seed), rad(h.yaw || 0), rad(h.roll || 0));
    this._updateFace(p, T);
    this.updateProp(p);
  }
  _updateFace(p, T) {
    const e1 = EXPR[p.expr || 'neutral'] || EXPR.neutral, e2 = p.expr2 ? EXPR[p.expr2] : null; const ex = e2 ? lerpExp(e1, e2, p.mix || 0) : { ...e1 };
    if (p.fx) for (const k in p.fx) ex[k] = (ex[k] || 0) + p.fx[k];
    const F = this.F, surf = this.surf, lk = p.look || [0, 0]; const blink = clamp(p.blink || 0, 0, 1);
    for (const E of this.eyes) {
      const s = E.s; const lid = clamp(ex.lid + blink * (1 - ex.lid), 0, 1), wide = clamp(ex.wide, 0, 1);
      E.ball.rotation.set(lk[1] * 0.38, lk[0] * 0.5, 0, 'YXZ');
      const upOpen = -0.66 - 0.4 * wide, upClosed = 0.5; E.up.rotation.set(lerp(upOpen, upClosed, lid), 0, -ex.lidTilt * s * 0.3 * (1 - blink));
      const loOpen = 0.9 - 0.18 * wide; E.lo.rotation.set(lerp(loOpen, 0.5, blink) - ex.cheek * 0.34 - lid * 0.1, 0, 0);
      if (E.bag) E.bag.scale.set(E.ER * 1.1 * 1.5, E.ER * 1.1 * (0.28 + 0.2 * ex.lid), E.ER * 0.3);
    }
    const Tt = p.t || 0;
    for (const td of this.tears) { const on = ex.tear > 0.05, ph = (((Tt * 0.33 + td.i * 0.5 + (td.s > 0 ? 0.13 : 0)) % 1) + 1) % 1; td.m.visible = on && ph > 0.03; if (td.m.visible) { const y = F.eyeY - 0.03 - 0.062 * Math.pow(ph, 1.5), x = td.s * (F.eyeGap * 1.0 + 0.012 * ph); td.m.position.set(x, y, surf(x, y) + 0.0035); const k = ex.tear * (0.7 + 0.5 * Math.sin(Math.PI * Math.min(1, ph * 1.3))); td.m.scale.set(0.0042 * k, 0.0066 * k * (0.7 + ph), 0.0042 * k); } }
    { const on = ex.sweat > 0.05, ph = ((Tt * 0.45) % 1); this.sweatD.visible = on; if (on) { const y = 0.1 - 0.13 * Math.pow(ph, 1.3), x = 0.105 + 0.012 * ph; this.sweatD.position.set(x, y, surf(x, y) + 0.004); const k = ex.sweat * (0.6 + 0.6 * ph); this.sweatD.scale.set(0.0045 * k, 0.0075 * k, 0.0045 * k); } }
    for (const [m, y0] of this.noseParts) m.position.y = y0 + 0.0035 * ex.nosew;
    // brows (smooth strips)
    const eg = F.eyeGap, by0 = F.eyeY + 0.062, th = this.browTh, NB = this.browN;
    for (const B of this.brows) { const s = B.s, asy = ex.asym * (s > 0 ? 0.9 : -0.1), pts = [], ry = [], rz = [];
      for (let i = 0; i < NB; i++) { const u = i / (NB - 1);
        const xi = eg * (0.38 - 0.14 * Math.max(0, -ex.browTilt)), xo = eg * 1.5, x = s * lerp(xi, xo, u);
        const y = by0 + 0.002 * ex.quiver * Math.sin(Tt * 41 + i) + 0.021 * ex.brow + 0.015 * asy + 0.016 * ex.browTilt * (1 - u) - 0.008 * ex.browTilt * u + 0.011 * (ex.browArc + 0.25) * Math.sin(Math.PI * u) - 0.011 * ex.browOuter * u * u + (ex.browTilt < 0 ? ex.browTilt * 0.012 * (1 - u) : 0) + 0.006 * ex.wide;
        const r = th * (1.0 - 0.5 * u * u) * (0.88 + 0.25 * Math.sin(Math.PI * Math.min(1, u * 1.2)));
        pts.push([x, y, surf(x, y) + r * 0.45]); ry.push(r); rz.push(r * 0.8); }
      B.st.set(pts, ry, rz); }
    // lips (smooth strips)
    const n = this.lipN, my = this.mouthY0 - 0.004 * ex.mouthY, w0 = 0.043 * F.mouthW * (1 + ex.mw * 0.3) * (1 - 0.42 * ex.oround) * (1 - 0.1 * ex.press);
    const open = clamp(ex.open, 0, 1) * 0.026 + (p.jaw || 0) * 0.02, smileLift = 0.0135 * ex.smile - 0.0125 * ex.frown;
    const thick = 0.0078 * F.lipFull * (1 - 0.4 * ex.press) * (1 - 0.3 * Math.abs(ex.smile)) * (1 + 0.5 * ex.oround);
    const up = [], uy = [], uz = [], lo = [], ly = [], lz = [], ml = [], my2 = [], mz = [];
    for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * 2 - 1, x = u * w0, corner = u * u;
      const yl = my + 0.0013 * ex.quiver * Math.sin(Tt * 47 + u * 7) + 0.004 * ex.nosew * (1 - corner) + smileLift * corner - 0.0035 * ex.smile * (1 - corner) + 0.004 * ex.frown * (1 - corner) + ex.smirk * 0.006 * u + ex.mouthY * 0.0025 * u;
      const tp = (1 - 0.7 * corner) * thick + 0.0008, gap = open * (1 - corner * 0.9);
      const yu = yl + gap * 0.25 + tp * 0.4, yw = yl - gap * 0.75 - tp * 0.5;
      up.push([x, yu, surf(x, yu) + tp * 0.7]); uy.push(tp * 0.85); uz.push(tp * 0.9);
      lo.push([x, yw, surf(x, yw) + tp * 0.8]); ly.push(tp * 1.05); lz.push(tp);
      ml.push([x, yl - gap * 0.25, surf(x, yl) + tp * 0.5]); my2.push(0.0009 + gap * 0.28); mz.push(tp * 0.6); }
    this.upS.set(up, uy, uz); this.loS.set(lo, ly, lz); this.mlS.set(ml, my2, mz); this.mlS.visible = open < 0.004;
    const mi = this.mouthIn; mi.visible = open > 0.006 || ex.teeth > 0.3; if (mi.visible) { mi.position.set(0, my - open * 0.25, surf(0, my) - 0.001); mi.scale.set(w0 * 0.82, Math.max(0.003, open * 0.75 + 0.002), 0.006); }
    const te = this.teeth; te.visible = ex.teeth > 0.3 && open > 0.01; if (te.visible) { te.position.set(0, my + open * 0.18, surf(0, my) + 0.002); te.scale.set(w0 * 0.78, Math.max(0.002, open * 0.32), 0.004); }
  }
  updateProp(p) {
    const pr = p.prop; const g = this.props; while (g.children.length) g.remove(g.children[0]);
    if (!pr) return; const list = Array.isArray(pr) ? pr : [pr];
    for (const q of list) { const H = this.handPos[q.hand || 'R']; if (!H) continue; const grp = new THREE.Group(); grp.position.copy(H); g.add(grp); if (q.rot) grp.rotation.set(...q.rot);
      const white = M('#f3efe6'), dark = M('#1b1a1e');
      switch (q.k) { case 'cup': { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.07, 16), white); c.position.set(0, -0.0, 0.0); grp.add(c); break; } case 'coin': { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 14), M('#d8b24a', { emis: 0.1 })); c.rotation.x = Math.PI / 2; grp.add(c); break; } } }
  }
  // world position of a hand (palm centre) and a body point, for QA / grip logic
  palmWorld(s) { const v = this.handPos[s].clone(); this.torso.updateWorldMatrix(true, false); return this.torso.localToWorld(v); }
  shoulderWorld(s) { const v = new THREE.Vector3((s === 'L' ? -1 : 1) * this.LS, 0.55, 0); this.torso.updateWorldMatrix(true, false); return this.torso.localToWorld(v); }
  headWorld() { const v = new THREE.Vector3(0, 0, 0); this.head.updateWorldMatrix(true, false); return this.head.localToWorld(v); }
  footWorld(i) { const v = this.shoes[i].position.clone(); this.pelvis.updateWorldMatrix(true, false); return this.pelvis.localToWorld(v); }
}

// deterministic random face so crowds / extras never share one face. randomFace(7) -> face params (pass as {face: randomFace(7)})
export function randomFace(seed = 1) {
  const r = (i, a, b) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return a + (x - Math.floor(x)) * (b - a); };
  const base = Object.values(FACES)[Math.floor(r(0, 0, 6)) % 6];
  return { ...base, w: base.w * r(1, 0.94, 1.06), jaw: clamp(base.jaw + r(2, -0.08, 0.08), 0.65, 1.05), chin: base.chin + r(3, -0.04, 0.05), cheek: clamp(base.cheek + r(4, -0.15, 0.15), 0, 0.7), brow: clamp(base.brow + r(5, -0.2, 0.2), 0, 1), noseL: base.noseL * r(6, 0.9, 1.1), noseW: base.noseW * r(7, 0.9, 1.1), eyeGap: base.eyeGap + r(8, -0.006, 0.006), eyeSize: base.eyeSize * r(9, 0.92, 1.08), lipFull: base.lipFull * r(10, 0.85, 1.15), mouthW: base.mouthW * r(11, 0.92, 1.08), ear: base.ear * r(12, 0.9, 1.1), age: 0 };
}
