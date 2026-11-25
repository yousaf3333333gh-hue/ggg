// looks.js : cinematic LOOK presets (v6). One call per frame: applyLook(LOOKS.nightStreet) or applyLook(mixLook(A, B, k)).
// A look controls: key light (sun) direction/colour, shadow colour, hemispheric ambient, rim light, fog, sky, and the final grade.
// Dark-story rule of thumb: LOW key light, cool shadows, ONE warm practical (lamp/candle/fire), strong rim, heavy vignette, a little grain.
import * as THREE from 'three';
import * as C from './core.js';
const { shared, skyU, dofU, inkU } = C;
const v3 = (a) => new THREE.Vector3(...a), c3 = (a) => new THREE.Color(...a);

export const LOOKS = {
  // cold moonlight street / alley, warm lamp pools
  nightStreet: { sun: [-0.45, 0.62, 0.55], lit: [0.74, 0.76, 0.86], shade: [0.13, 0.14, 0.22], ambSky: [0.95, 1.0, 1.15], ambGnd: [0.8, 0.72, 0.68], rim: [0.3, 0.5, 0.9], rimDir: [0.5, 0.25, -0.8], rimPow: 2.2,
    fog: [0.035, 0.05, 0.1], fogR: [10, 70], sky: { top: [0.01, 0.015, 0.04], mid: [0.03, 0.05, 0.1], hor: [0.08, 0.1, 0.17], below: [0.02, 0.025, 0.04] }, sat: 0.95,
    grade: { lo: [0.86, 0.95, 1.12], hi: [1.12, 1.0, 0.86], contrast: 1.16, vig: 0.62, vigCol: [0.0, 0.0, 0.02], glow: 0.55, grain: 0.035, desat: 0.08, exposure: 1.0 }, shadowStr: 1 },
  // dim room lit by candle / oil lamp
  candleRoom: { sun: [0.3, 0.55, 0.78], lit: [0.55, 0.36, 0.2], shade: [0.05, 0.045, 0.07], ambSky: [1.0, 0.9, 0.85], ambGnd: [0.8, 0.6, 0.5], rim: [0.8, 0.45, 0.2], rimDir: [-0.4, 0.2, -0.9], rimPow: 2.0,
    fog: [0.03, 0.02, 0.025], fogR: [6, 40], sky: { top: [0.01, 0.01, 0.015], mid: [0.015, 0.012, 0.02], hor: [0.03, 0.02, 0.03], below: [0.01, 0.01, 0.01] }, sat: 1.0,
    grade: { lo: [0.9, 0.95, 1.1], hi: [1.15, 1.0, 0.8], contrast: 1.2, vig: 0.75, vigCol: [0.0, 0.0, 0.0], glow: 0.7, grain: 0.04, desat: 0.05, exposure: 1.0 }, shadowStr: 1 },
  // storm dusk: bruised purple sky, cold hard key
  stormDusk: { sun: [-0.6, 0.35, 0.6], lit: [0.62, 0.55, 0.7], shade: [0.1, 0.1, 0.2], ambSky: [0.95, 0.95, 1.15], ambGnd: [0.7, 0.65, 0.65], rim: [0.9, 0.6, 0.45], rimDir: [0.6, 0.2, -0.7], rimPow: 2.4,
    fog: [0.18, 0.15, 0.22], fogR: [14, 90], sky: { top: [0.07, 0.08, 0.17], mid: [0.2, 0.17, 0.28], hor: [0.55, 0.36, 0.34], below: [0.08, 0.07, 0.1] }, sat: 0.95,
    grade: { lo: [0.9, 0.95, 1.1], hi: [1.12, 1.0, 0.88], contrast: 1.15, vig: 0.55, vigCol: [0.0, 0.0, 0.03], glow: 0.4, grain: 0.03, desat: 0.1, exposure: 1.0 }, shadowStr: 1 },
  // cold blue dawn, lonely
  coldDawn: { sun: [0.7, 0.28, 0.4], lit: [1.0, 0.78, 0.62], shade: [0.16, 0.2, 0.32], ambSky: [0.9, 1.0, 1.2], ambGnd: [0.75, 0.7, 0.7], rim: [1.0, 0.7, 0.45], rimDir: [0.7, 0.3, -0.4], rimPow: 2.3,
    fog: [0.35, 0.4, 0.5], fogR: [12, 110], sky: { top: [0.12, 0.2, 0.38], mid: [0.4, 0.4, 0.55], hor: [0.95, 0.6, 0.4], below: [0.2, 0.2, 0.28] }, sat: 1.0,
    grade: { lo: [0.88, 0.96, 1.1], hi: [1.12, 1.0, 0.85], contrast: 1.1, vig: 0.45, vigCol: [0.0, 0.0, 0.03], glow: 0.35, grain: 0.025, desat: 0.05, exposure: 1.0 }, shadowStr: 1 },
  // noir interior: single hard window light, deep black shadows
  noirInterior: { sun: [0.55, 0.45, 0.7], lit: [0.85, 0.82, 0.74], shade: [0.03, 0.03, 0.045], ambSky: [0.8, 0.85, 1.0], ambGnd: [0.6, 0.55, 0.55], rim: [0.55, 0.65, 0.9], rimDir: [-0.6, 0.2, -0.7], rimPow: 2.0,
    fog: [0.02, 0.02, 0.03], fogR: [8, 50], sky: { top: [0.02, 0.02, 0.03], mid: [0.03, 0.03, 0.04], hor: [0.05, 0.05, 0.07], below: [0.01, 0.01, 0.015] }, sat: 0.8,
    grade: { lo: [0.95, 0.98, 1.05], hi: [1.08, 1.02, 0.92], contrast: 1.25, vig: 0.7, vigCol: [0.0, 0.0, 0.0], glow: 0.35, grain: 0.045, desat: 0.25, exposure: 1.0 }, shadowStr: 1 },
  // desert / harsh dusk: orange key, teal shadow (still dark mood)
  duskOrange: { sun: [-0.75, 0.3, 0.45], lit: [1.1, 0.62, 0.32], shade: [0.1, 0.16, 0.26], ambSky: [0.85, 1.0, 1.2], ambGnd: [1.0, 0.7, 0.55], rim: [0.5, 0.8, 1.0], rimDir: [0.6, 0.25, -0.7], rimPow: 2.4,
    fog: [0.5, 0.3, 0.25], fogR: [20, 160], sky: { top: [0.1, 0.16, 0.32], mid: [0.45, 0.3, 0.38], hor: [1.0, 0.5, 0.25], below: [0.3, 0.18, 0.15] }, sat: 1.05,
    grade: { lo: [0.85, 0.97, 1.12], hi: [1.15, 0.98, 0.82], contrast: 1.14, vig: 0.5, vigCol: [0.0, 0.0, 0.02], glow: 0.5, grain: 0.03, desat: 0.0, exposure: 1.0 }, shadowStr: 1 },
};


// ---- compact look builder: hex colours, sensible defaults. Bright/happy looks: high exposure, light coloured shadows, NO vignette, no grain. Dark looks: low key, vignette, grain. ----
const hx = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export function mkLook(o) {
  const k = o.litK ?? 1, lit = hx(o.lit).map((v) => v * k);
  return { sun: o.sun, lit, shade: hx(o.shade), ambSky: hx(o.ambSky || '#ffffff'), ambGnd: hx(o.ambGnd || '#ffffff'), rim: hx(o.rim || '#000000'), rimDir: o.rimDir || [-0.5, 0.3, -0.8], rimPow: o.rimPow || 2.4,
    fog: hx(o.fog), fogR: o.fogR || [12, 90], sky: { top: hx(o.sky[0]), mid: hx(o.sky[1]), hor: hx(o.sky[2]), below: hx(o.sky[3] || o.sky[2]) }, sat: o.sat ?? 1,
    grade: { lo: hx(o.lo || '#ffffff'), hi: hx(o.hi || '#ffffff'), contrast: o.contrast ?? 1.1, vig: o.vig ?? 0.3, vigCol: hx(o.vigCol || '#000000'), glow: o.glow ?? 0.3, grain: o.grain ?? 0, desat: o.desat ?? 0, exposure: o.exposure ?? 1 }, shadowStr: o.shadow ?? 1 };
}
const lerp = (a, b, t) => a + (b - a) * t, la = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
export function mixLook(A, B, k) {
  const o = {}; for (const key in A) { const a = A[key], b = B[key]; if (Array.isArray(a)) o[key] = la(a, b, k); else if (typeof a === 'number') o[key] = lerp(a, b, k); else if (a && typeof a === 'object') o[key] = mixLook(a, b, k); else o[key] = a; }
  return o;
}
// optional extras: { pl: [{pos:[x,y,z], col:[r,g,b], range}], shadowCenter:[x,y,z], shadowSize }
export function applyLook(L, extra = {}) {
  const sun = v3(L.sun).normalize();
  shared.uSun.value.copy(sun); shared.uLit.value.copy(c3(L.lit)); shared.uShade.value.copy(c3(L.shade));
  shared.uAmbSky.value.copy(c3(L.ambSky || [1, 1, 1])); shared.uAmbGnd.value.copy(c3(L.ambGnd || [1, 1, 1]));
  shared.uRimCol.value.copy(c3(L.rim || [0, 0, 0])); shared.uRimDir.value.copy(v3(L.rimDir || [-0.5, 0.3, -0.8]).normalize()); shared.uRimPow.value = L.rimPow || 2.5;
  shared.uFogC.value.copy(c3(L.fog)); shared.uFog.value.set(L.fogR[0], L.fogR[1]); shared.uSat.value = L.sat ?? 1;
  skyU.uTop.value.copy(c3(L.sky.top)); skyU.uMid.value.copy(c3(L.sky.mid)); skyU.uHor.value.copy(c3(L.sky.hor)); skyU.uBelow.value.copy(c3(L.sky.below));
  skyU.uSunDir.value.copy(sun); skyU.uGlow.value = 0.05; skyU.uSunSize.value = 0.0;
  const g = L.grade; dofU.uTintLo.value.copy(c3(g.lo)); dofU.uTintHi.value.copy(c3(g.hi)); dofU.uContrast.value = g.contrast; dofU.uVig.value = g.vig; dofU.uVigCol.value.copy(c3(g.vigCol));
  dofU.uGlow.value = g.glow; dofU.uGrain.value = g.grain; dofU.uDesat.value = g.desat; dofU.uExposure.value = g.exposure ?? 1; dofU.uSat.value = 1.0;
  inkU.uInk.value.set(0.015, 0.012, 0.02);
  shared.uShadowOn.value = 1; shared.uShadowStr.value = L.shadowStr ?? 1;
  if (extra.shadowCenter) C.shadow.center.set(...extra.shadowCenter); if (extra.shadowSize) C.shadow.size = extra.shadowSize;
  const pl = extra.pl || [];
  for (let i = 0; i < 4; i++) { const p = pl[i]; if (p) { shared.uPL.value[i].set(p.pos[0], p.pos[1], p.pos[2], p.range || 6); shared.uPLc.value[i].setRGB(p.col[0], p.col[1], p.col[2]); } else { shared.uPL.value[i].set(0, -999, 0, 1); shared.uPLc.value[i].setRGB(0, 0, 0); } }
}
// flicker helper for candles / fire / failing lamps: returns a multiplier ~1 (deterministic in t)
export const flicker = (t, seed = 0, amt = 0.18) => 1 + amt * (Math.sin(t * 17.3 + seed) * 0.5 + Math.sin(t * 29.1 + seed * 2.3) * 0.3 + Math.sin(t * 7.7 + seed * 5.1) * 0.2);
