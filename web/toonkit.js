// toonkit.js : stick-figure cartoon characters for Story Library (toon head with flat cartoon eyes, thick brows, mouth shapes,
// thin black limbs, exaggerated 'toonify' acting: takes/jolts/loops, '!' and anger marks). Extracted from the 'tree' short, all fixes included.
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph } from './models.js';
import { Person, EXPR, M as PM } from './person.js';
import { EASE, sstep, clamp, lerp } from './motion.js';
import { toTex, mkCanvas } from './tex.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const ctex = (w, h, fn, rep = false) => { const c = mkCanvas(w, h); fn(c.getContext('2d'), w, h); return toTex(c, rep); };
let W = null; export const CAMPOS = V(); export const PEOPLE = [];   // every stick person ever created (for camera guard + QA)
const MOUTHS = ['flat', 'smile', 'grin', 'laugh', 'frown', 'o', 'grit', 'wavy', 'smirk', 'sad'];
function mouthTex(skin, kind, blush) { return ctex(1024, 512, (g, w, h) => { g.fillStyle = skin; g.fillRect(0, 0, w, h); const cx = 256, cy = 300; g.lineCap = 'round'; g.lineJoin = 'round';
  if (blush) { g.fillStyle = 'rgba(255,90,90,0.35)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 88, cy - 38, 30, 16, 0, 0, 7); g.fill(); } }
  const ink = '#1a0e0e', inside = '#5a1418', tongue = '#e0606a', teeth = '#ffffff'; g.strokeStyle = ink; g.lineWidth = 9;
  const shape = (pts, fill) => { g.beginPath(); pts(); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); };
  if (kind === 'flat') { g.beginPath(); g.moveTo(cx - 34, cy); g.lineTo(cx + 34, cy); g.stroke(); }
  if (kind === 'smile') { g.beginPath(); g.moveTo(cx - 52, cy - 12); g.quadraticCurveTo(cx, cy + 40, cx + 52, cy - 12); g.stroke(); }
  if (kind === 'smirk') { g.beginPath(); g.moveTo(cx - 40, cy + 4); g.quadraticCurveTo(cx + 10, cy + 16, cx + 48, cy - 18); g.stroke(); }
  if (kind === 'frown') { g.beginPath(); g.moveTo(cx - 46, cy + 18); g.quadraticCurveTo(cx, cy - 26, cx + 46, cy + 18); g.stroke(); }
  if (kind === 'sad') { shape(() => { g.moveTo(cx - 40, cy + 22); g.quadraticCurveTo(cx, cy - 30, cx + 40, cy + 22); g.quadraticCurveTo(cx, cy + 6, cx - 40, cy + 22); }, inside); }
  if (kind === 'grin') { shape(() => { g.moveTo(cx - 60, cy - 16); g.lineTo(cx + 60, cy - 16); g.quadraticCurveTo(cx + 56, cy + 52, cx, cy + 54); g.quadraticCurveTo(cx - 56, cy + 52, cx - 60, cy - 16); }, inside);
    g.fillStyle = teeth; g.fillRect(cx - 54, cy - 12, 108, 18); g.strokeRect(cx - 54, cy - 12, 108, 18); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 36, 26, 12, 0, 0, 7); g.fill(); }
  if (kind === 'laugh') { shape(() => { g.moveTo(cx - 64, cy - 26); g.quadraticCurveTo(cx, cy - 10, cx + 64, cy - 26); g.quadraticCurveTo(cx + 60, cy + 74, cx, cy + 78); g.quadraticCurveTo(cx - 60, cy + 74, cx - 64, cy - 26); }, inside);
    g.fillStyle = teeth; g.beginPath(); g.moveTo(cx - 58, cy - 20); g.quadraticCurveTo(cx, cy - 6, cx + 58, cy - 20); g.lineTo(cx + 54, cy - 2); g.quadraticCurveTo(cx, cy + 10, cx - 54, cy - 2); g.closePath(); g.fill(); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 56, 34, 16, 0, 0, 7); g.fill(); }
  if (kind === 'o') { shape(() => { g.ellipse(cx, cy + 14, 30, 42, 0, 0, 7); }, inside); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 40, 18, 10, 0, 0, 7); g.fill(); }
  if (kind === 'grit') { shape(() => { g.rect(cx - 56, cy - 18, 112, 40); }, teeth); g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 56, cy + 2); g.lineTo(cx + 56, cy + 2); for (let i = -3; i <= 3; i++) { g.moveTo(cx + i * 16, cy - 18); g.lineTo(cx + i * 16, cy + 22); } g.stroke(); }
  if (kind === 'wavy') { shape(() => { g.moveTo(cx - 56, cy); for (let i = 0; i <= 8; i++) g.lineTo(cx - 56 + i * 14, cy + (i % 2 ? -12 : 10)); g.lineTo(cx + 50, cy + 34); g.quadraticCurveTo(cx, cy + 46, cx - 50, cy + 34); }, inside); }
}); }
class ToonHead {
  constructor(P, o) {
    this.P = P; for (const c of P.head.children) c.visible = false; const G = new THREE.Group(); P.head.add(G); this.G = G; const R = 0.235; this.R = R;
    this.tex = {}; for (const k of MOUTHS) { this.tex[k] = mouthTex(o.skin, k, false); this.tex[k + '+'] = mouthTex(o.skin, k, true); }
    this.skullM = tm(0xffffff, { map: this.tex.flat }); const sk = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), this.skullM); sk.scale.set(1, o.egg ? 1.08 : 1.04, 0.96); G.add(sk); if (o.egg) { G.position.y = 0.12; G.scale.setScalar(1.75); } const HG = new THREE.Group(); HG.position.y = o.egg ? R * 0.06 : 0; G.add(HG);
    const skinM = tm(o.skin); this.skinM = skinM; if (!o.egg) { const nose = sph(0.032, skinM, 0, -0.005, R * 0.97, 14, 10); nose.scale.set(1.1, 0.9, 0.9); G.add(nose);
    for (const sx of [-1, 1]) { const e = sph(0.045, skinM, sx * R * 0.98, -0.01, -0.01, 12, 10); e.scale.set(0.45, 1, 0.8); G.add(e); } }
    const white = tm(0xffffff, { unlit: 0.9, noInk: 1 }), blk = tm(0x111111, { unlit: 1, noInk: 1 }); this.eyes = []; const EW = 0.05, EH = 0.064; this.EW = EW; this.EH = EH;
    const surf = (x, y) => Math.sqrt(Math.max(0, R * R - x * x - (y / 1.08) * (y / 1.08))) * 0.96;
    for (const sx of [-1, 1]) { const x0 = sx * 0.072, y0 = 0.035; const E = new THREE.Group(); E.position.set(x0, y0, surf(x0, y0) + 0.004); E.quaternion.setFromUnitVectors(V(0, 0, 1), V(x0, y0 * 0.6, surf(x0, y0)).normalize()); G.add(E);
      const inner = new THREE.Group(); E.add(inner); const disc = (r, n = 32) => new THREE.CircleGeometry(r, n);
      const ol = new THREE.Mesh(disc(1), blk); ol.scale.set(EW + 0.012, EH + 0.012, 1); inner.add(ol); const wh = new THREE.Mesh(disc(1), white); wh.scale.set(EW, EH, 1); wh.position.z = 0.002; inner.add(wh);
      const pup = new THREE.Mesh(disc(1, 20), blk); pup.scale.set(0.024, 0.028, 1); pup.position.z = 0.004; inner.add(pup); const gl = new THREE.Mesh(disc(1, 12), tm(0xffffff, { unlit: 1, noInk: 1 })); gl.scale.setScalar(0.008); gl.position.z = 0.006; inner.add(gl);
      const lid = new THREE.Group(); E.add(lid); const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 32, 0, Math.PI), skinM); plate.scale.set(EW + 0.016, EH * 1.08, 1); plate.position.z = 0.008; plate.geometry = plate.geometry.clone(); lid.add(plate);
      const edge = box(2 * (EW + 0.014), 0.013, 0.004, blk, 0, 0, 0.0095); lid.add(edge); const arc = new THREE.Mesh(new THREE.TorusGeometry(EW * 0.95, 0.012, 6, 20, Math.PI), blk); arc.position.z = 0.006; E.add(arc);
      const brow = box(0.13, 0.032, 0.014, tm(o.brow || '#1a120c'), 0, 0, 0, 0.006); brow.position.set(sx * 0.08, 0.13, surf(sx * 0.08, 0.13) + 0.02); G.add(brow); this.eyes.push({ sx, E, inner, pup, gl, lid, edge, brow, arc, plate }); }
    if (o.mustache) { for (const sx of [-1, 1]) { const m = box(0.085, 0.03, 0.03, tm(o.mustache), sx * 0.042, -0.048, R * 0.93, 0.013); m.rotation.z = -sx * 0.28; m.rotation.y = sx * 0.3; G.add(m); } }
    if (o.hair) { const c = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 30, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), tm(o.hair)); c.rotation.x = -0.45; HG.add(c); const fr = sph(0.07, tm(o.hair), 0.04, R * 0.82, 0.1, 12, 8); fr.scale.set(1.8, 0.6, 1); HG.add(fr); }
    if (o.hat === 'brim') { HG.position.y = R * 0.2; const hc = tm(o.hatCol); const cr = cyl(R * 0.78, R * 0.92, 0.16, hc, 0, R * 0.86, -0.01, 24); HG.add(cr); const br = cyl(R * 1.55, R * 1.55, 0.02, hc, 0, R * 0.62, 0, 32); HG.add(br); HG.add(cyl(R * 0.93, R * 0.95, 0.04, tm(0x2a1a10), 0, R * 0.68, -0.01, 24)); HG.add(box(0.05, 0.02, R * 1.1, tm(0x5a3a20), 0, R * 0.86 + 0.081, 0)); }
    if (o.hat === 'cap') { const hc = tm(o.hatCol); const d = new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 30, 14, 0, Math.PI * 2, 0, Math.PI * 0.43), hc); d.rotation.x = -0.3; HG.add(d); const v = cyl(R * 0.74, R * 0.74, 0.024, hc, 0, R * 0.66, R * 0.8, 24); v.scale.set(1, 1, 0.75); v.rotation.x = 0.18; HG.add(v); HG.add(sph(0.025, tm(0xffffff), 0, R * 1.03, -0.05, 8, 6)); }
    this.drops = []; for (let i = 0; i < 4; i++) { const d = sph(0.018, tm(0x7ad0ff, { unlit: 0.5 }), 0, 0, 0, 8, 6); d.scale.set(1, 1.5, 1); G.add(d); this.drops.push(d); }
    this.sweat = sph(0.026, tm(0x9ae0ff, { unlit: 0.5 }), R * 0.75, R * 0.55, R * 0.45, 10, 8); this.sweat.scale.set(1, 1.6, 1); G.add(this.sweat);
  }
  update(p, t) {
    const e1 = EXPR[p.expr] || EXPR.neutral, e2 = p.expr2 ? EXPR[p.expr2] || e1 : e1, m = p.mix || 0; const ex = {}; for (const k in e1) ex[k] = e1[k] * (1 - m) + (e2[k] || 0) * m; if (p.fx) for (const k in p.fx) ex[k] = (ex[k] || 0) + p.fx[k];
    const blink = p.blink || 0, wide = clamp(ex.wide, 0, 1.3), lid = clamp(0.1 + ex.lid * 0.85 - wide * 0.15, 0, 1), cl = clamp(lid + blink * (1 - lid), 0, 1); const look = p.look || [0, 0];
    for (const e of this.eyes) { e.E.scale.setScalar(this.eggK || 1); const w = 1 + 0.25 * wide, hap = clamp(ex.cheek, 0, 1) * (ex.smile > 0.5 ? 1 : 0); e.inner.scale.set(w, w * (1 - 0.3 * hap), 1); e.inner.position.y = -0.012 * hap;
      const tilt = clamp(ex.lidTilt, 0, 1.2); let amt = Math.max(cl, tilt * 0.28 + clamp(ex.lid, 0, 1) * 0.3); if (amt > 0.8) amt = 1; const shut = ex.tear > 0.4 || (ex.smile > 0.6 && ex.lid > 0.35); e.arc.visible = shut; e.inner.visible = !shut; if (shut) { amt = 0; e.arc.position.y = -0.012; } e.lid.visible = amt > 0.05; const H = this.EH * w + 0.012;
      e.lid.visible = false; const sq = Math.max(0.1, 1 - amt * 0.95); e.inner.scale.y *= sq; e.inner.position.y += -this.EH * w * (1 - sq) * 0.55; e.inner.rotation.z = e.sx * 0.42 * tilt; const ps = 1 - 0.38 * clamp(ex.small, 0, 1); e.pup.scale.set(0.024 * ps, 0.028 * ps, 1);
      const lx = clamp(look[0], -1, 1) * 0.02, ly = clamp(look[1], -1, 1) * 0.024 + (ex.quiver ? 0.002 * Math.sin(t * 40) : 0); e.pup.position.set(lx, ly, 0.004); e.gl.position.set(lx + 0.008, ly + 0.01, 0.006);
      const bt = clamp(ex.browTilt, -1.5, 1.5); e.brow.position.y = Math.min(this.browMax || 9, 0.13 + 0.03 * ex.brow + 0.02 * wide + 0.012 * clamp(ex.browArc, 0, 1) - 0.01 * Math.max(0, -bt) + 0.006 * Math.max(0, bt) + (ex.asym ? e.sx * 0.012 * ex.asym : 0)); if (this.browMax) { e.brow.rotation.set(0, e.sx * 0.35, -e.sx * 0.42 * clamp(bt, -1.5, 0.6)); continue; }
      e.brow.rotation.set(0, e.sx * 0.35, -e.sx * 0.42 * bt); }
    // mouth shape from the expression numbers
    let k = 'flat'; const o = ex.open, sm = ex.smile, fr = ex.frown;
    if (ex.quiver > 0.75 && o > 0.3) k = 'wavy'; else if (ex.oround > 0.5 && o > 0.3) k = 'o'; else if (sm > 0.8 && o > 0.55) k = 'laugh'; else if (sm > 0.7 && ex.teeth > 0.5) k = 'grin';
    else if (bt_(ex) < -0.85 && fr > 0.6) k = 'grit'; else if (fr > 0.6 && o > 0.12) k = 'sad'; else if (fr > 0.45) k = 'frown'; else if (ex.smirk > 0.55 && sm < 0.6) k = 'smirk'; else if (sm > 0.3) k = 'smile';
    const blush = ex.cheek > 0.45 && sm > 0.5; this.skullM.uniforms.uMap.value = this.tex[k + (blush ? '+' : '')];
    const red = clamp(-ex.browTilt - 0.6, 0, 1) * clamp(ex.frown, 0, 1) * (this.P.userData.rage ? 1 : 0.55); this.skullM.uniforms.uColor.value.setRGB(1, 1 - 0.38 * red, 1 - 0.42 * red); this.skinM.uniforms.uColor.value.copy(new THREE.Color(this.skinHex || 0xffffff)).multiply(this.skullM.uniforms.uColor.value);
    const tear = ex.tear > 0.4; this.drops.forEach((d, i) => { d.visible = tear; if (!tear) return; const u = (t * 0.9 + i * 0.5) % 1; const sx = i % 2 ? 1 : -1; d.position.set(sx * 0.09, -0.02 - u * 0.13, this.R * 0.9 - u * 0.03); });
    this.sweat.visible = ex.sweat > 0.4; if (this.sweat.visible) this.sweat.position.y = this.R * 0.55 - ((t * 0.5) % 1) * 0.12;
  }
}
const bt_ = (ex) => ex.browTilt;
const STICK = PM('#141414');
function stickify(P) { const skinMat = PM(P.skinHex, { unlit: P.sp.skinUnlit ?? 0.1 });
  P.root.traverse((m) => { if (!m.isMesh) return; let n = m, inHead = false; while (n) { if (n === P.head) { inHead = true; break; } n = n.parent; } if (inHead) return; if (m.material === skinMat) m.material = STICK; });
  for (const k of ['aL', 'aR', 'fL', 'fR', 'tL', 'tR', 'sL', 'sR', 'kL', 'kR']) if (P.limb[k]) P.limb[k].material = STICK; for (const k in P.jt) P.jt[k].material = STICK;
  for (const s of ['L', 'R']) if (P.hand && P.hand[s]) P.hand[s].traverse((m) => { if (m.isMesh) m.material = STICK; }); }
function stickPose(P) { for (const k of ['aL', 'aR', 'fL', 'fR']) if (P.limb[k]) { P.limb[k].scale.x = 0.58; P.limb[k].scale.z = 0.58; } for (const k of ['tL', 'tR', 'sL', 'sR', 'kL', 'kR']) if (P.limb[k]) { P.limb[k].scale.x = 0.3; P.limb[k].scale.z = 0.3; }
  for (const k in P.jt) { const j = P.jt[k]; if (j.userData.s0 === undefined) j.userData.s0 = j.scale.clone(); j.scale.copy(j.userData.s0).multiplyScalar(k.startsWith('sh') ? 0.6 : 0.36); } for (const s of ['L', 'R']) if (P.hand && P.hand[s]) { const h = P.hand[s]; if (h.userData.s0 === undefined) h.userData.s0 = h.scale.clone(); h.scale.copy(h.userData.s0).multiplyScalar(1.25); } }
const BOOST = ['brow', 'browTilt', 'browArc', 'open', 'smile', 'frown', 'cheek', 'lidTilt', 'press', 'teeth', 'oround', 'smirk', 'mw', 'quiver'];
export function toonify(pose, P, t) {
  const e1 = EXPR[pose.expr] || EXPR.neutral, e2 = pose.expr2 ? EXPR[pose.expr2] || e1 : e1, m = pose.mix || 0; const fx = { ...(pose.fx || {}) };
  for (const k of BOOST) fx[k] = (fx[k] || 0) + 0.75 * ((e1[k] || 0) * (1 - m) + (e2[k] || 0) * m);
  pose.fx = fx; let hp = 0, hy = 0, hr = 0, ln = 0, sh = 0; const U = P.userData;
  for (const [ht, k, s] of U.hits) { const a = t - ht; if (a < -0.14 || a > 1.4) continue;
    if (a < 0) { ln -= 5 * s * Math.sin(((a + 0.14) / 0.14) * Math.PI); sh -= 0.4 * s * Math.sin(((a + 0.14) / 0.14) * Math.PI); continue; }   // anticipation
    const d = Math.exp(-a * 6), osc = Math.cos(a * 22);
    if (k === 'take') { hp -= 20 * s * d * osc; sh += 1.6 * s * d; ln -= 12 * s * d; }
    if (k === 'jolt') { hp += 28 * s * d * osc; ln += 26 * s * d * osc; hr += 8 * s * d * Math.sin(a * 30); }
    if (k === 'shake') { hy += 26 * s * Math.exp(-a * 2.2) * Math.sin(a * 28); }
    if (k === 'double') { hy += 32 * s * (sstep(0, 0.1, a) - sstep(0.22, 0.32, a)) + 42 * s * sstep(0.42, 0.52, a) * Math.exp(-Math.max(0, a - 0.6) * 1.5); hp -= 14 * s * sstep(0.42, 0.52, a) * Math.exp(-Math.max(0, a - 0.6) * 2); sh += 1.4 * s * sstep(0.42, 0.5, a) * Math.exp(-Math.max(0, a - 0.5) * 3); } }
  for (const [a0, a1, k] of U.loops) { if (t < a0 || t >= a1) continue; const env = sstep(a0, a0 + 0.15, t) * (1 - sstep(a1 - 0.15, a1, t));
    if (k === 'laugh') { sh += 1.1 * env * Math.abs(Math.sin(t * 15)); hp += 9 * env * Math.sin(t * 15); ln -= 6 * env; }
    if (k === 'rage') { hr += 5 * env * Math.sin(t * 47); ln += 6 * env + 3 * env * Math.sin(t * 39); sh += 0.9 * env; hp += 6 * env; }
    if (k === 'bob') { hy += 14 * env * Math.sin(t * 4.2); hp += 5 * env * Math.sin(t * 8.4); hr += 5 * env * Math.sin(t * 4.2); }
    if (k === 'sob') { sh += 1.0 * env * Math.abs(Math.sin(t * 11)); hp += 12 * env + 4 * env * Math.sin(t * 11); }
    if (k === 'dizzy') { hr += 12 * env * Math.sin(t * 9); hy += 10 * env * Math.cos(t * 9); }
    if (k === 'nod') { const c = (t * 0.9) % 1; hp += 22 * env * sstep(0.2, 0.7, c) * (1 - sstep(0.75, 0.82, c)); } }
  const h = pose.head || { yaw: 0, pitch: 0, roll: 0 }; pose.head = { yaw: (h.yaw || 0) + hy, pitch: (h.pitch || 0) + hp, roll: (h.roll || 0) + hr };
  pose.lean = (pose.lean || 0) + ln; pose.shrug = (pose.shrug || 0) + sh;
  // stick arms must stay OUTSIDE the body: minimum outward angle; walking arms swing outside too
  if (pose.walk != null) { const ph = pose.walk * Math.PI * 2, g = pose.gait ?? 1; if (!pose.armL && !pose.handL) pose.armL = { f: Math.sin(ph + Math.PI) * 30 * g, o: 18, b: 18 }; if (!pose.armR && !pose.handR) pose.armR = { f: Math.sin(ph) * 30 * g, o: 18, b: 18 }; }
  for (const k of ['armL', 'armR']) if (!pose[k] && !pose['hand' + k.slice(3)]) pose[k] = { f: 4, o: 16, b: 12 };
  for (const k of ['armL', 'armR']) if (pose[k] && !pose['hand' + k.slice(3)]) pose[k] = { ...pose[k], o: Math.max(pose[k].o ?? 0, 16) };
  return pose;
}
// cartoon marks over heads
const markM = tm(0xff2a2a, { unlit: 1 }), markY = tm(0xffe23a, { unlit: 1 });
function makeMark(kind) { const g = new THREE.Group(); if (kind === '!') { g.add(box(0.075, 0.24, 0.075, markM, 0, 0.17, 0)); g.add(sph(0.05, markM, 0, -0.02, 0, 10, 8)); }
  else for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const b = box(0.04, 0.13, 0.04, markM, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0); b.rotation.z = a + Math.PI / 2; g.add(b); } W.add(g); return g; }
function placeMarks(P, t) { P.userData.marks.forEach(([k, a, b], i) => { const g = P.userData.markMesh[i]; g.visible = P.root.visible && t >= a && t < b; if (!g.visible) return;
  const hw = P.headWorld(), u = t - a; const pop = EASE.outBack ? EASE.outBack(clamp(u / 0.18, 0, 1)) : sstep(0, 0.18, u); const s = Math.max(0.01, pop * (1 + 0.12 * Math.sin(u * 18)));
  g.scale.setScalar(s * 1.3); if (k === '!') g.position.set(hw.x, hw.y + 0.5, hw.z); else { const r = P.root.rotation.y; g.position.set(hw.x + Math.cos(r) * 0.28, hw.y + 0.32 + 0.03 * Math.sin(u * 20), hw.z - Math.sin(r) * 0.28); }
  g.lookAt(CAMPOS); }); }
// one call = one finished stick character. spec: Person spec (top colour etc.), head: ToonHead options, act: {hits, loops, marks}
export function makeStickPerson(world, spec, head = {}, act = {}) {
  W = world; const P = new Person({ skin: '#f6f4ee', hair: '#141414', hairStyle: 'crop', shoe: '#141414', bottom: spec.top, sleeve: spec.top, build: { w: 1.22, belly: 0, arm: 1 }, height: 0.62, headScale: 1.24, ...spec });
  world.add(P.root); const h = new ToonHead(P, { skin: '#f6f4ee', egg: true, ...head }); h.skinHex = 0xf6f4ee; h.eggK = head.eggK ?? 0.95; if (head.browMax) h.browMax = head.browMax;
  stickify(P); const up = P.update.bind(P);
  // HAND-IN-FACE GUARD: the toon head is big, so after every update check both palms; a palm inside the head is moved to just outside the head surface and the arm is re-solved
  const headR = () => 0.235 * 1.75 * 1.08 * (P.height || 0.62);
  P.update = (pose) => { up(pose); let fix = false; const hw = P.headWorld(), R = headR();
    for (const s of ['L', 'R']) { const pw = P.palmWorld(s); const d = pw.distanceTo(hw); if (d < R * 1.18) { const dir = pw.clone().sub(hw); if (dir.lengthSq() < 1e-6) dir.set(s === 'L' ? -1 : 1, 0, 0); dir.normalize(); pose['hand' + s] = { w: hw.clone().addScaledVector(dir, R * 1.28), k: 1 }; fix = true; } }
    if (fix) { pose.reachAssist = false; up(pose); } stickPose(P); h.update(pose, pose.t || 0); };
  P.userData = { hits: act.hits || [], loops: act.loops || [], marks: act.marks || [] }; P.userData.markMesh = P.userData.marks.map(([k]) => makeMark(k)); P.toonHead = h; P.headR = () => 0.235 * 1.75 * 1.08 * (P.height || 0.62); PEOPLE.push(P); return P;
}
export { placeMarks, EXPR };
