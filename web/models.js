// Low-poly toon props and the jet. Units are metres. Plane nose points +X, up is +Y, wings along Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { toon, rng } from './core.js';
import { painted, canvasTex, toTex, mkCanvas } from './tex.js';

export const mat = (c, o = {}) => toon({ color: c, ...o });
const _m = new Map();
export const cmat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!_m.has(k)) _m.set(k, mat(c, o)); return _m.get(k); };

export function at(m, x = 0, y = 0, z = 0, ry = 0) { m.position.set(x, y, z); m.rotation.y = ry; return m; }
export const mesh = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); return me; };
export const box = (w, h, d, m, x = 0, y = 0, z = 0, r = 0.0) => mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2.1)) : new THREE.BoxGeometry(w, h, d), m, x, y, z);
export const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
export const sph = (r, m, x = 0, y = 0, z = 0, ws = 24, hs = 16) => mesh(new THREE.SphereGeometry(r, ws, hs), m, x, y, z);
export const grp = (...ch) => { const g = new THREE.Group(); ch.forEach(c => c && g.add(c)); return g; };

function shapeMesh(pts, depth, m, bevel = 0.05) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return new THREE.Mesh(g, m);
}

// ---------------- the jet ----------------
export function makeJet(o = {}) {
  const white = mat(0xfafaff, { map: painted('plane', { size: 512 }), repeat: [10, 2] });
  const belly = mat(0xc9ccd8, { map: painted('plane', { size: 512, base: [210, 214, 226] }), repeat: [10, 2] });
  const red = mat(o.stripe ?? 0xd8282f), dark = mat(0x2a3050), glass = mat(0x24385a, { unlit: 0.0, emis: 0.05 });
  const metal = mat(0x8a90a0), engineM = mat(0xe8eaf2, { map: painted('plane', { size: 256 }), repeat: [3, 1] });
  const G = new THREE.Group(); const pivot = new THREE.Group(); const root = new THREE.Group(); G.add(pivot); pivot.add(root); pivot.position.set(0, 0, 0); root.position.set(0, 0, 0);
  // fuselage via lathe: x from tail (0) to nose (48)
  const L = 48, Rm = 2.75; const prof = [];
  const rAt = (x) => {
    if (x < 14) { const t = x / 14; return 0.25 + (Rm - 0.25) * Math.sin(t * Math.PI / 2) ** 0.8; }
    if (x > 40) { const t = (x - 40) / 8; return Rm * Math.sqrt(Math.max(0, 1 - t * t)) * 0.98 + 0.001; }
    return Rm;
  };
  for (let i = 0; i <= 56; i++) { const x = (i / 56) * L; prof.push(new THREE.Vector2(rAt(x), x)); }
  const fg = new THREE.LatheGeometry(prof, 36); fg.rotateZ(-Math.PI / 2);
  const fus = new THREE.Mesh(fg, white); fus.position.x = -L / 2 + 6; root.add(fus);
  // belly band (grey lower half) slightly bigger, y<-0.9
  const bg = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p.x * 1.004, p.y)), 36, Math.PI * 1.55, Math.PI * 0.9); bg.rotateZ(-Math.PI / 2);
  const bel = new THREE.Mesh(bg, belly); bel.position.x = -L / 2 + 6; root.add(bel);
  // tail cone upsweep: shift tail part up by deforming? keep simple: horizontal.
  // cheatline stripes (both sides)
  for (const s of [-1, 1]) {
    const st = box(34, 0.55, 0.12, red, 4 + 0, 0.15, s * (Rm + 0.02)); st.position.x = 4.5; root.add(st);
    const st2 = box(30, 0.22, 0.1, dark, 4.5, -0.3, s * (Rm + 0.02)); root.add(st2);
  }
  // windows
  const wg = []; const wgeo = new RoundedBoxGeometry(0.55, 0.75, 0.2, 2, 0.1);
  for (const s of [-1, 1]) for (let i = 0; i < 32; i++) { const g = wgeo.clone(); g.translate(-12 + i * 1.05 + (i > 14 ? 1.2 : 0), 0.95, s * (Rm - 0.02)); wg.push(g); }
  root.add(new THREE.Mesh(mergeGeometries(wg), glass));
  // doors
  for (const s of [-1, 1]) { root.add(box(1.4, 2.4, 0.15, mat(0xe8eaf4), 15.5, 0.4, s * (Rm - 0.01), 0.1)); root.add(box(1.4, 2.4, 0.15, mat(0xe8eaf4), -12.5, 0.3, s * (Rm - 0.01), 0.1)); }
  // cockpit windscreen
  for (const s of [-1, 1]) {
    const w1 = box(0.5, 0.9, 1.0, glass, 20.6, 1.25, s * 1.02, 0.2); w1.rotation.y = s * 0.55; root.add(w1);
    const w2 = box(0.5, 0.9, 1.0, glass, 21.0, 1.25, s * 2.0, 0.2); w2.rotation.y = s * 1.05; root.add(w2);
  }
  const nose = box(0.3, 0.7, 2.2, glass, 21.5, 1.3, 0, 0.12); root.add(nose);
  // wings
  const wingPts = [[0, 0], [4.2, 0], [5.2, 22.5], [2.4, 22.5], [-3.2, 0 + 4.5]]; // x,z planform (x fwd? we'll orient)
  const wingS = [[-1.2, 0.4], [7.0, 0.4], [3.0, 22], [0.9, 22], [-4.0, 4.0]]; // (x along nose axis, z span)
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); wingS.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
    g.rotateX(Math.PI / 2); // shape (x,z)->(x, -y?, z)
    const w = new THREE.Mesh(g, white); w.scale.z = s; if (s < 0) { w.material = white; }
    w.position.set(1, -1.55, 0); w.rotation.x = s * 0.0; root.add(w);
    // wing tip red
    const tip = box(2.6, 0.55, 0.8, red, 1.8, -1.2, s * 22, 0.1); tip.rotation.z = 0.0; root.add(tip);
  }
  // engines
  const fans = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(9.5, -2.55, s * 8.4);
    const cow = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(1.32, -2.3), new THREE.Vector2(1.5, -1.6), new THREE.Vector2(1.55, 0), new THREE.Vector2(1.48, 1.8), new THREE.Vector2(1.0, 2.5), new THREE.Vector2(0.55, 2.7)], 28), engineM);
    cow.rotation.z = Math.PI / 2; // axis -> x ... (lathe y = axis)
    e.add(cow);
    // intake lip
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.18, 8, 28), metal); lip.rotation.y = Math.PI / 2; lip.position.x = 2.3; lip.rotation.y = Math.PI / 2; e.add(lip);
    const fan = new THREE.Group(); fan.position.x = 2.1;
    const hub = cyl(0.3, 0.2, 0.5, mat(0x30364a), 0.2, 0, 0, 16); hub.rotation.z = Math.PI / 2; fan.add(hub);
    for (let b = 0; b < 12; b++) { const bl = box(0.06, 1.15, 0.38, mat(0x3a4058)); bl.position.set(0.2, 0.7, 0); const pv = new THREE.Group(); pv.rotation.x = (b / 12) * Math.PI * 2; pv.add(bl); bl.rotation.x = 0.35; fan.add(pv); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), mat(0x1c2036)); disc.rotation.y = Math.PI / 2; disc.position.x = 1.9; e.add(disc);
    e.add(fan); fans.push(fan);
    e.add(box(5, 2.2, 0.4, white, -0.5, 1.6, 0, 0.1)); // pylon
    root.add(e);
  }
  // tail
  const fin = shapeMesh([[0, 0], [8.5, 0], [4.8, 9.6], [2.6, 9.6]], 0.45, white); fin.position.set(-17.3, 2.0, 0); fin.rotation.set(0, 0, 0); root.add(fin);
  const finTip = shapeMesh([[3.0, 8.6], [4.9, 8.6], [4.8, 9.6], [2.6, 9.6]], 0.5, red, 0.02); finTip.position.copy(fin.position); root.add(finTip);
  const finBand = shapeMesh([[1.5, 4.0], [6.0, 4.0], [5.4, 5.4], [2.0, 5.4]], 0.5, red, 0.02); finBand.position.copy(fin.position); root.add(finBand);
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); [[-1.2, 0.3], [3.2, 0.3], [0.8, 8.2], [-0.8, 8.2], [-2.6, 2.0]].forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 }); g.rotateX(Math.PI / 2);
    const st = new THREE.Mesh(g, white); st.scale.z = s; st.position.set(-16.8, 0.3, 0); root.add(st);
  }
  // landing gear
  const gear = new THREE.Group(); const tyre = mat(0x23232e), hubM = mat(0xb6bac8);
  const wheelAt = (x, z, r = 0.75, w = 0.55) => { const wh = cyl(r, r, w, tyre, x, -4.1 + r - 0.2, z, 18); wh.rotation.x = Math.PI / 2; const hb = cyl(r * 0.5, r * 0.5, w + 0.04, hubM, x, -4.1 + r - 0.2, z, 12); hb.rotation.x = Math.PI / 2; return [wh, hb]; };
  for (const s of [-1, 1]) { const strut = cyl(0.2, 0.2, 2.6, metal, 1.5, -3.0, s * 4.2); gear.add(strut); for (const dx of [0, 1.7]) for (const dz of [-0.55, 0.55]) wheelAt(1.2 + dx - 0.3, s * 4.2 + dz).forEach(w => gear.add(w)); gear.add(box(3.4, 0.25, 0.3, metal, 2.0, -3.9, s * 4.2)); }
  const noseGear = new THREE.Group(); noseGear.position.set(18.4, -2.0, 0);
  noseGear.add(cyl(0.16, 0.16, 1.9, metal, 0, -0.8, 0)); const nw = []; for (const dz of [-0.4, 0.4]) { const w = cyl(0.62, 0.62, 0.42, tyre, 0, -1.7, dz, 16); w.rotation.x = Math.PI / 2; noseGear.add(w); }
  noseGear.add(box(0.25, 0.25, 0.9, metal, 0, -1.7, 0));
  root.add(gear); root.add(noseGear);
  // optional glider decal (finale)
  const dec = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#1c2b57'; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(14, 70); g.quadraticCurveTo(80, 52, 244, 62); g.quadraticCurveTo(100, 82, 14, 70); g.closePath(); g.fillStyle = '#ffd23a'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(96, 62); g.lineTo(150, 10); g.lineTo(168, 12); g.lineTo(150, 64); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(196, 62); g.lineTo(226, 36); g.lineTo(240, 38); g.lineTo(228, 62); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.stroke();
  });
  const decals = new THREE.Group(); decals.visible = false;
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), toon({ map: dec, unlit: 1, cut: 0.5, offset: 2, side: THREE.DoubleSide })); d.position.set(13.5, 0.05, s * (Rm + 0.07)); if (s < 0) d.rotation.y = Math.PI; decals.add(d); }
  root.add(decals);
  const api = { group: G, pivot, root, fans, gear, noseGear, decals, setSpin(a) { fans.forEach(f => { f.rotation.x = a; }); } };
  return api;
}

// ---------------- clouds ----------------
export function makeCloud(seed, s = 1, tint = 0) {
  const R = rng(seed); const g = new THREE.Group();
  const m = mat(0xffffff, { band: 0.25 });
  const n = 6 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const r = (3.5 + R() * 4.5) * s; const x = (i - n / 2) * 4.2 * s + (R() - .5) * 3 * s; const y = (R() * 2.2 - 0.4) * s * (i === 0 || i === n - 1 ? 0.2 : 1);
    const sp = sph(r, m, x, y + r * 0.35, (R() - .5) * 4 * s, 14, 10); sp.scale.y = 0.78; g.add(sp);
  }
  g.add(box(n * 4.6 * s, 0.1, 5 * s, m, 0, 0, 0)); g.children[g.children.length - 1].visible = false;
  return g;
}

// ---------------- ground props ----------------
export function makeTree(seed, s = 1) {
  const R = rng(seed); const g = new THREE.Group(); const gm = [0x4f9a46, 0x5aa850, 0x3f8a46][seed % 3];
  g.add(cyl(0.22 * s, 0.32 * s, 2.2 * s, cmat(0x8a5a3a), 0, 1.1 * s, 0, 8));
  for (let i = 0; i < 3; i++) g.add(sph((1.5 - i * 0.2) * s, cmat(gm + i * 0x080a05, { band: 0.12 }), (R() - .5) * 0.5 * s, (2.6 + i * 1.0) * s, (R() - .5) * 0.5 * s, 12, 8));
  return g;
}
export function makePine(seed, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.2 * s, 0.28 * s, 1.6 * s, cmat(0x7a5236), 0, 0.8 * s, 0, 8));
  for (let i = 0; i < 3; i++) g.add(cyl(0.0, (1.7 - i * 0.4) * s, 2.2 * s, cmat(0x2f7a4a + i * 0x0a0a04, { band: 0.1 }), 0, (2.4 + i * 1.3) * s, 0, 10));
  return g;
}
export function makeCar(color, o = {}) {
  const g = new THREE.Group(); const body = cmat(color), dark = cmat(0x23232e), white = cmat(0xf4f4f0);
  g.add(box(3.4, 0.55, 1.5, body, 0, 0.55, 0, 0.18));
  g.add(box(1.5, 0.5, 1.15, body, -0.2, 0.98, 0, 0.18));
  g.add(box(0.9, 0.38, 0.9, cmat(0x24385a), 0.0, 1.0, 0, 0.12));
  g.add(box(0.12, 0.38, 1.6, white, 0.1, 0.84, 0, 0.0)); // stripe across
  g.add(box(0.9, 0.12, 1.9, dark, -1.75, 1.15, 0, 0.04)); // spoiler
  g.add(box(0.14, 0.4, 0.14, dark, -1.65, 0.9, 0.5)); g.add(box(0.14, 0.4, 0.14, dark, -1.65, 0.9, -0.5));
  for (const x of [-1.05, 1.1]) for (const z of [-0.8, 0.8]) { const w = cyl(0.34, 0.34, 0.34, dark, x, 0.34, z, 14); w.rotation.x = Math.PI / 2; g.add(w); const h = cyl(0.17, 0.17, 0.36, cmat(0xdcdce6), x, 0.34, z, 10); h.rotation.x = Math.PI / 2; g.add(h); }
  const nm = cyl(0.001, 0.2, 0.0, body, 0, 0, 0); // placeholder
  return g;
}
export function makeKart(color) {
  const g = new THREE.Group(); const body = cmat(color), dark = cmat(0x23232e);
  g.add(box(1.7, 0.22, 0.95, body, 0, 0.3, 0, 0.1)); g.add(box(0.5, 0.4, 0.6, body, 0.6, 0.5, 0, 0.1)); g.add(box(0.12, 0.5, 0.6, dark, -0.4, 0.6, 0));
  for (const x of [-0.6, 0.65]) for (const z of [-0.5, 0.5]) { const w = cyl(0.2, 0.2, 0.2, dark, x, 0.2, z, 12); w.rotation.x = Math.PI / 2; g.add(w); }
  return g;
}
export function makeTent(c1, c2) {
  const g = new THREE.Group(); const tx = painted('stripes', { n: 8, a: '#' + c1.toString(16).padStart(6, '0'), b: '#' + c2.toString(16).padStart(6, '0'), size: 256 });
  const roof = cyl(0.0, 3.4, 1.7, mat(0xffffff, { map: tx, repeat: [2, 1] }), 0, 3.0, 0, 8); roof.rotation.y = 0.4; g.add(roof);
  const skirt = cyl(3.4, 3.4, 0.5, mat(0xffffff, { map: tx, repeat: [2, 1] }), 0, 2.0, 0, 8); skirt.rotation.y = 0.4; g.add(skirt);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4 + Math.PI / 4; g.add(cyl(0.07, 0.07, 2.0, cmat(0xe8e8f0), Math.cos(a) * 3.0, 1.0, Math.sin(a) * 3.0, 6)); }
  return g;
}
export function makeBunting(len, seed = 1, h = 0.5) {
  const R = rng(seed); const cols = [0xe5453a, 0xffd23a, 0x2f6ad9, 0x2fa85a, 0xffffff]; const parts = []; const n = Math.floor(len / 0.7);
  const gs = {};
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const x = (i / n) * len, sag = Math.sin((i / n) * Math.PI) * -0.9; const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.5, 0, 0, 0.25, -h, 0], 3)); t.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); t.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2));
    const m = new THREE.Mesh(t, cmat(cols[i % 5], { side: THREE.DoubleSide })); m.position.set(x, sag, 0); g.add(m); }
  return g;
}
export function makeFlagCanada() {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.07, 9, cmat(0xdcdce6), 0, 4.5, 0, 8)); g.add(sph(0.14, cmat(0xe8c04a), 0, 9.05, 0, 8, 6));
  const t = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#e12b34'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(64, 0, 128, h);
    c.fillStyle = '#e12b34'; c.beginPath(); const cx = 128, cy = 66; const P = [[0, -48], [10, -26], [26, -32], [20, -6], [40, -14], [36, 6], [48, 12], [14, 28], [16, 40], [3, 38], [3, 56], [-3, 56], [-3, 38], [-16, 40], [-14, 28], [-48, 12], [-36, 6], [-40, -14], [-20, -6], [-26, -32], [-10, -26]];
    P.forEach((p, i) => (i ? c.lineTo(cx + p[0] * 0.8, cy + p[1] * 0.8) : c.moveTo(cx + p[0] * 0.8, cy + p[1] * 0.8))); c.closePath(); c.fill();
  });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6, 12, 4), toon({ map: t, unlit: 0.0, side: THREE.DoubleSide })); fl.position.set(1.7, 8.0, 0); g.add(fl); g.userData.flag = fl;
  return g;
}
export function waveFlag(fl, t, amp = 0.18) {
  const p = fl.geometry.attributes.position; if (!fl.userData.base) fl.userData.base = p.array.slice();
  const b = fl.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], u = (x + 1.6) / 3.2; p.array[i * 3 + 2] = Math.sin(u * 6 - t * 6) * amp * u; }
  p.needsUpdate = true;
}
export function makeCone() { const g = new THREE.Group(); g.add(cyl(0.02, 0.22, 0.55, cmat(0xff6a1e), 0, 0.3, 0, 12)); g.add(cyl(0.12, 0.14, 0.12, cmat(0xffffff), 0, 0.28, 0, 12)); g.add(box(0.5, 0.05, 0.5, cmat(0xff6a1e), 0, 0.03, 0)); return g; }
export function makeTyres(n = 3) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.2, 8, 16), cmat(i % 2 ? 0xffffff : 0x23232e)); t.rotation.x = Math.PI / 2; t.position.y = 0.2 + i * 0.4; g.add(t); } return g; }
export function makeBarrier(len = 4) { const t = painted('stripes', { n: 6, a: '#e5453a', b: '#ffffff', size: 256 }); return box(len, 0.9, 0.3, mat(0xffffff, { map: t, repeat: [len / 1.5, 1] }), 0, 0.45, 0, 0.04); }
export function makeHouse(c = 0xf0d6a0, roof = 0xc0543e, w = 6, d = 5, h = 3.4) {
  const g = new THREE.Group();
  g.add(box(w, h, d, mat(c, { map: painted('stucco', { base: [255, 255, 255] }), repeat: [2, 1] }), 0, h / 2, 0, 0.06));
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), mat(roof, { map: painted('roof', { base: [255, 255, 255] }), repeat: [3, 2] })); rf.rotation.y = Math.PI / 4; rf.scale.set(w * 0.78, 2.0, d * 0.98); rf.position.y = h + 0.95; g.add(rf);
  g.add(box(0.9, 1.7, 0.08, cmat(0x7a4a2e), 0, 0.85, d / 2 + 0.03)); for (const x of [-w * .3, w * .3]) g.add(box(1.0, 1.0, 0.08, cmat(0x7ab4e6, { emis: 0.1 }), x, 2.1, d / 2 + 0.03));
  g.add(box(0.6, 1.4, 0.6, cmat(0x9a5a46), w * 0.25, h + 1.5, 0));
  return g;
}
export function makeHangar() {
  const g = new THREE.Group(); const wall = mat(0xb9c2d4, { map: painted('concrete', { base: [255, 255, 255] }), repeat: [4, 1] });
  g.add(box(28, 9, 20, wall, 0, 4.5, 0, 0.1)); const rf = cyl(10.5, 10.5, 28, mat(0xe8eaf2), 0, 8.2, 0, 20); rf.rotation.z = Math.PI / 2; rf.scale.set(0.55, 1, 1); rf.rotation.x = 0; g.add(rf);
  g.add(box(18, 7, 0.4, cmat(0x30405c), 0, 3.5, 10.1)); g.add(box(0.3, 7, 0.45, cmat(0xaab4c8), 0, 3.5, 10.15)); return g;
}
export function makeTower() {
  const g = new THREE.Group(); g.add(box(3.2, 12, 3.2, mat(0xe8e2d4), 0, 6, 0, 0.1)); g.add(box(5.4, 2.4, 5.4, cmat(0x7ab8e8, { emis: 0.1 }), 0, 13.2, 0, 0.3)); g.add(box(6.2, 0.4, 6.2, cmat(0xe5453a), 0, 14.6, 0, 0.1)); g.add(cyl(0.05, 0.05, 3, cmat(0xdcdce6), 0, 16, 0, 6)); return g;
}
export function makeFuelTruck() {
  const g = new THREE.Group(); const body = mat(0xe8e8ee, { map: painted('plane', { size: 256 }), repeat: [3, 1] });
  const tank = cyl(1.35, 1.35, 6.4, body, -1.4, 2.2, 0, 24); tank.rotation.z = Math.PI / 2; g.add(tank);
  for (const s of [-1, 1]) { const cap = sph(1.35, body, s * 3.2 - 1.4, 2.2, 0, 16, 10); cap.scale.set(0.3, 1, 1); g.add(cap); }
  g.add(box(8.2, 0.4, 2.2, cmat(0x23283c), -1.2, 0.85, 0, 0.1));
  g.add(box(2.0, 1.8, 2.2, cmat(0xe5453a), 3.6, 1.9, 0, 0.25)); g.add(box(0.1, 0.9, 1.7, cmat(0x7ab8e8, { emis: 0.1 }), 4.6, 2.2, 0));
  g.add(box(6.5, 0.45, 0.1, cmat(0xe5453a), -1.4, 2.2, 1.38)); g.add(box(6.5, 0.45, 0.1, cmat(0xe5453a), -1.4, 2.2, -1.38));
  for (const x of [-4.2, -2.6, 3.3]) for (const z of [-1.05, 1.05]) { const w = cyl(0.55, 0.55, 0.45, cmat(0x23232e), x, 0.55, z, 16); w.rotation.x = Math.PI / 2; g.add(w); }
  return g;
}
export function makeTerminal() {
  const g = new THREE.Group(); const wall = mat(0xd9dfec, { map: painted('concrete', { base: [255, 255, 255] }), repeat: [6, 1] });
  g.add(box(70, 8, 14, wall, 0, 4, 0, 0.2));
  const glass = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#6aa8e0'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(i * 32 + 6, 0); c.lineTo(i * 32 + 22, 0); c.lineTo(i * 32 + 6, h); c.lineTo(i * 32 - 10, h); c.fill(); } c.strokeStyle = '#1c2236'; c.lineWidth = 6; for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); } c.strokeRect(0, 0, w, h); });
  g.add(box(64, 3.4, 0.3, mat(0xffffff, { map: glass, emis: 0.12 }), 0, 3.6, 7.1)); g.add(box(72, 0.7, 15.5, cmat(0xe5453a), 0, 8.2, 0, 0.1)); g.add(box(30, 3, 3, cmat(0xe9eef8), 0, 10, -3, 0.2));
  return g;
}
export function makeSkySun(scene) { return null; }
