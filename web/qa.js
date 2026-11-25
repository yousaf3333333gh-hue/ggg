// qa.js v6 : automatic mistake detector. Run BEFORE the long render:  node tools/qa.cjs <app> <step_frames>
// Finds: feet sunk into steps/floor or floating, bodies overlapping each other or walls, arms over-stretched (target out of reach),
// hands not touching the prop they should hold, camera inside solids or too close to a body, key actors out of frame.
import * as THREE from 'three';
import * as C from './core.js';
export function createQA(env) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    check(f) {
      const out = [], t = f / C.FPS, A = env.actors || [], add = (type, who, msg) => out.push({ f, t: +t.toFixed(2), type, who, msg });
      for (const a of A) {
        const P = a.P; P.root.updateMatrixWorld(true);
        for (let i = 0; i < 2; i++) { const w = P.footWorld(i); const sole = w.y - 0.078 * P.height; const g = env.terrain ? env.terrain.at(w.x, w.z) : 0;
          if (sole < g - 0.02) add('FOOT_SUNK', a.name, `foot ${i ? 'R' : 'L'} ${(g - sole).toFixed(3)} m below the ground/step`);
          if (a.grounded !== false && sole > g + 0.12 && !(P.lastPose && P.lastPose.walk != null)) add('FOOT_FLOAT', a.name, `foot ${i ? 'R' : 'L'} ${(sole - g).toFixed(2)} m above ground`);
          if (env.colliders && env.colliders.inside(w.x, sole + 0.05, w.z, 0.0)) add('FOOT_IN_SOLID', a.name, `foot ${i ? 'R' : 'L'} inside a collider`); }
        for (const s of ['L', 'R']) { const d = P.dbg.hands && P.dbg.hands[s]; if (d && d.reach > 0.995 && d.k > 0.9) add('ARM_OVERSTRETCH', a.name, `hand ${s} target out of reach (${d.reach.toFixed(2)}) - move character closer / lean`); }
        if (env.colliders) { const p = P.root.position; if (env.colliders.inside(p.x, p.y + 0.5, p.z, 0.05)) add('BODY_IN_WALL', a.name, 'body centre inside a collider'); }
      }

      // ---- full-body penetration: samples along the whole body vs every collider (furniture, walls, props) ----
      if (env.colliders) for (const a of A) { const P = a.P, sc = P.height, tol = env.penTol ?? 0.035; P.root.updateMatrixWorld(true);
        const pw = (o, l) => o.localToWorld(l.clone()), pts = [];
        const hipW = (s) => pw(P.pelvis, V(s * 0.085, -0.05, 0));
        pts.push(['pelvis', pw(P.pelvis, V(0, -0.02, 0)), 0.105], ['belly', pw(P.torso, V(0, 0.12, 0.03)), 0.12], ['chest', pw(P.torso, V(0, 0.38, 0.02)), 0.13], ['head', pw(P.head, V(0, 0.02, 0.03)), 0.14]);
        for (const s of ['L', 'R']) { const hw = hipW(s === 'L' ? -1 : 1), kn = pw(P.pelvis, P.jt['kn' + s].position), sh = P.shoes[s === 'L' ? 0 : 1], an = pw(P.pelvis, sh.position);
          pts.push([`thigh${s}`, hw.clone().lerp(kn, 0.55), 0.07], [`knee${s}`, kn, 0.06], [`shin${s}`, kn.clone().lerp(an, 0.5), 0.05], [`foot${s}`, an.clone().add(V(0, -0.03 * sc, 0)), 0.045]);
          const sho = pw(P.torso, P.jt['sh' + s].position), el = pw(P.torso, P.jt['el' + s].position), pa = P.palmWorld(s);
          pts.push([`upperArm${s}`, sho.clone().lerp(el, 0.55), 0.04], [`elbow${s}`, el, 0.04], [`foreArm${s}`, el.clone().lerp(pa, 0.5), 0.035], [`hand${s}`, pa, 0.028]); }
        for (const [name, p, r] of pts) { const rr = r * sc; const d = env.colliders.penetration(p.x, p.y, p.z, rr); if (d.depth > tol) add('BODY_IN_OBJECT', a.name, `${name} is ${(d.depth * 100).toFixed(0)} cm inside a solid (furniture/wall/prop) at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`); } }
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const a = A[i].P.root.position, b = A[j].P.root.position; const dy = Math.abs(a.y - b.y); if (dy < 1.2) { const d = Math.hypot(a.x - b.x, a.z - b.z), m = (A[i].r || 0.26) + (A[j].r || 0.26) - 0.04; if (d < m) add('BODIES_OVERLAP', A[i].name + '/' + A[j].name, `distance ${d.toFixed(2)} < ${m.toFixed(2)} (walking through each other)`); } }
      for (const g of env.grips || []) { const pa = g.P.palmWorld(g.hand); const gr = g.prop.grips[g.grip], mir = g.hand === 'R' ? -1 : 1; g.prop.group.updateMatrixWorld(true); const pw = g.prop.group.localToWorld(V(gr.p[0] * mir, gr.p[1], gr.p[2])); if (g.active && !g.active(t)) continue; const e = pa.distanceTo(pw); if (e > 0.035) add('HAND_OFF_PROP', g.P.sp.name || g.hand, `palm ${e.toFixed(3)} m from the grip point of the prop (hand floating / sunk)`); }
      const cam = C.stage.cam; cam.updateMatrixWorld(true); const cp = cam.position;
      if (env.colliders && env.colliders.inside(cp.x, cp.y, cp.z, 0.12)) add('CAMERA_IN_SOLID', 'camera', `camera at ${cp.toArray().map(v => v.toFixed(2))} is inside/too close to a wall or prop`);
      for (const a of A) { const h = a.P.headWorld(); const d = cp.distanceTo(h); if (d < 0.32) add('CAMERA_TOO_CLOSE', a.name, `camera ${d.toFixed(2)} m from head (clipping)`);
        if (a.inFrame) { const v = h.clone().project(cam); if (Math.abs(v.x) > 1.0 || v.y > 1.0 || v.y < -1.0 || v.z > 1) add('ACTOR_OUT_OF_FRAME', a.name, `head off-screen (${v.x.toFixed(2)}, ${v.y.toFixed(2)})`); } }
      // must-see: story-critical things have to be on screen (stops "10% of the scene is visible" shots)
      for (const m of env.mustSee || []) { if (t < m.t0 || t > m.t1) continue; for (const tg of m.targets) { const w = tg(t); if (!w) continue; const v = w.clone().project(cam), mg = m.margin ?? 0.92; if (Math.abs(v.x) > mg || Math.abs(v.y) > mg || v.z > 1 || v.z < -1) add('MUST_SEE_MISSING', m.name || 'target', `required subject is off-screen (ndc ${v.x.toFixed(2)}, ${v.y.toFixed(2)})`); } }
      return out;
    },
  };
}
