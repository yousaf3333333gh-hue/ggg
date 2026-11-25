// safety.js : nothing may pass through anything.
//  1) guardCam(cam)      -> call on the camera every frame BEFORE C.setCam: pushes the camera out of every visible head/body and every registered solid,
//                           keeps it above the ground/water. (A camera inside a head or a wall is the #1 'mixing' mistake.)
//  2) addSolid(...)      -> register walls, pillars, carts, pedestals, trees... as boxes (world AABB). Camera never enters them; QA reports people inside them.
//  3) window.__qa()      -> per-frame report used by tools/qa_scene.cjs (run it BEFORE every long render; it must print 'QA: clean').
import * as THREE from 'three';
import { PEOPLE } from './toonkit.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const SOLIDS = [];   // {min:Vector3, max:Vector3, name, cam:true, people:true}
export function addSolid(name, x0, y0, z0, x1, y1, z1, o = {}) { SOLIDS.push({ name, min: V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), max: V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), cam: o.cam ?? true, people: o.people ?? true }); }
export function addSolidCentered(name, cx, cy, cz, w, h, d, o) { addSolid(name, cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, o); }
let GROUND = (x, z) => 0; export const setGround = (fn) => { GROUND = fn; };
const LAST = { pos: V(), look: V(), moved: 0 };
const inBox = (p, b, pad = 0) => p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad;
// cam: {pos:[x,y,z], look:[x,y,z]} (as returned by Cine.at). Mutates cam.pos.
export function guardCam(cam, o = {}) {
  const pos = V(...cam.pos), look = V(...cam.look); const before = pos.clone();
  for (let it = 0; it < 4; it++) {
    for (const P of PEOPLE) { if (!P.root.visible) continue; const hw = P.headWorld(), r = P.headR() * (o.headPad ?? 1.45) + 0.05; const d = pos.distanceTo(hw); if (d < r) pos.add(pos.clone().sub(hw).normalize().multiplyScalar(r - d + 0.01));
      const bc = P.torso.localToWorld(V(0, 0.3, 0)), rb = 0.32 * (P.height || 0.62) / 0.62; const db = pos.distanceTo(bc); if (db < rb) pos.add(pos.clone().sub(bc).normalize().multiplyScalar(rb - db + 0.01)); }
    for (const b of SOLIDS) { if (!b.cam || !inBox(pos, b, 0.08)) continue; let k = 0; while (inBox(pos, b, 0.08) && k++ < 80) pos.lerp(look, 0.05); if (inBox(pos, b, 0.08)) pos.y = b.max.y + 0.12; }   // walk towards the subject until outside the solid
    pos.y = Math.max(pos.y, GROUND(pos.x, pos.z) + (o.minHeight ?? 0.15)); }
  LAST.moved = before.distanceTo(pos); LAST.pos.copy(pos); LAST.look.copy(look); cam.pos = pos.toArray(); return cam;
}
// ---------------- QA report for the current frame ----------------
window.__qa = function () { const out = []; const vis = PEOPLE.filter((P) => P.root.visible);
  for (const P of vis) { const hw = P.headWorld(); const d = LAST.pos.distanceTo(hw); if (d < P.headR() * 1.2) out.push(`CAMERA_IN_HEAD ${P.castId || ''} d=${d.toFixed(2)}`);
    for (const s of ['L', 'R']) { const pw = P.palmWorld(s); if (pw.distanceTo(hw) < P.headR() * 1.05) out.push(`HAND_IN_FACE ${P.castId || ''} ${s}`); }
    for (const b of SOLIDS) if (b.people && inBox(P.root.position.clone().add(V(0, 0.5 * (P.height || 0.62), 0)), b, -0.04)) out.push(`PERSON_IN_SOLID ${P.castId || ''} in ${b.name}`); }
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const a = vis[i], b = vis[j]; const dh = a.headWorld().distanceTo(b.headWorld()); if (dh < (a.headR() + b.headR()) * 0.9) out.push(`HEADS_OVERLAP ${a.castId || i}/${b.castId || j}`);
    const dx = a.root.position.x - b.root.position.x, dz = a.root.position.z - b.root.position.z; if (Math.hypot(dx, dz) < 0.22 && Math.abs(a.root.position.y - b.root.position.y) < 0.5) out.push(`BODIES_OVERLAP ${a.castId || i}/${b.castId || j}`); }
  for (const b of SOLIDS) if (b.cam && inBox(LAST.pos, b, 0.02)) out.push(`CAMERA_IN_SOLID ${b.name}`);
  if (LAST.pos.y < GROUND(LAST.pos.x, LAST.pos.z) + 0.05) out.push('CAMERA_UNDER_GROUND');
  return out; };
