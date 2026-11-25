// cast.js : 56 ready, DIFFERENT stick characters (role, colours, size, head, accessories).
//   import { makeCast, CAST, CAST_IDS } from '../../web/cast.js';
//   const KING = makeCast(W, 'king', { hits, loops, marks });           // acting data is optional
// Every preset differs in at least two of: shirt colour, hat/hair, face accessory, body accessory, height/build.
// RULE: look at casting_log.json and never give the same MAIN cast to two videos in a row.
import * as THREE from 'three';
import * as C from './core.js';
import { box, cyl, sph } from './models.js';
import { makeStickPerson } from './toonkit.js';
const tm = (hex, o = {}) => C.toon({ color: new THREE.Color(hex), ...o });
const R = 0.235;   // toon head radius in head-group units (the head group is scaled 1.75 inside toonkit)

// ---------------- head accessories (added to P.toonHead.G, head-local units) ----------------
const HEAD = {
  crown: (G, c = 0xf0c020) => { const g = new THREE.Group(); g.position.y = R * 1.08; G.add(g); g.add(cyl(0.12, 0.12, 0.07, tm(c, { emis: 0.15 }), 0, 0.03, 0, 14)); for (let i = 0; i < 6; i++) g.add(cyl(0, 0.028, 0.08, tm(c, { emis: 0.15 }), Math.cos(i * 1.047) * 0.11, 0.1, Math.sin(i * 1.047) * 0.11, 5)); g.add(sph(0.022, tm(0xd82a2a), 0, 0.04, 0.12, 6, 4)); return g; },
  helmet: (G, c = 0x8a8a92) => { const g = new THREE.Group(); G.add(g); const d = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), tm(c)); d.rotation.x = -0.15; g.add(d); g.add(cyl(R * 1.12, R * 1.12, 0.02, tm(c), 0, R * 0.45, 0, 24)); return g; },
  knightHelm: (G, c = 0xb0b0b8) => { const g = HEAD.helmet(G, c); g.add(box(0.02, 0.2, 0.06, tm(0x2a2a2a), 0, R * 0.25, R * 1.02)); g.add(cyl(0.0, 0.05, 0.18, tm(0xd82a2a), 0, R * 1.25, -0.02, 6)); return g; },
  tophat: (G, c = 0x1a1a1e) => { const g = new THREE.Group(); g.position.y = R * 0.95; G.add(g); g.add(cyl(0.14, 0.15, 0.24, tm(c), 0, 0.14, 0, 18)); g.add(cyl(0.25, 0.25, 0.02, tm(c), 0, 0.02, 0, 24)); g.add(cyl(0.152, 0.152, 0.04, tm(0x8a1a2a), 0, 0.05, 0, 18)); return g; },
  chef: (G) => { const g = new THREE.Group(); g.position.y = R * 0.95; G.add(g); g.add(cyl(0.15, 0.15, 0.13, tm(0xffffff), 0, 0.07, 0, 18)); const p = sph(0.18, tm(0xffffff), 0, 0.2, 0, 14, 10); p.scale.y = 0.75; g.add(p); return g; },
  beanie: (G, c = 0x2a6ad8) => { const g = new THREE.Group(); G.add(g); const d = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), tm(c)); d.rotation.x = -0.25; g.add(d); g.add(sph(0.05, tm(0xffffff), 0, R * 1.12, -0.03, 8, 6)); return g; },
  cowboy: (G, c = 0x8a5a2a) => { const g = new THREE.Group(); g.position.y = R * 0.9; G.add(g); g.add(cyl(0.12, 0.15, 0.16, tm(c), 0, 0.09, 0, 16)); const b = cyl(0.3, 0.3, 0.02, tm(c), 0, 0.01, 0, 24); b.scale.z = 0.8; g.add(b); for (const s of [-1, 1]) { const e = box(0.08, 0.02, 0.4, tm(c), s * 0.27, 0.05, 0); e.rotation.z = s * 0.5; g.add(e); } return g; },
  wizard: (G, c = 0x3a2a8a) => { const g = new THREE.Group(); g.position.y = R * 0.9; G.add(g); const cn = cyl(0.0, 0.17, 0.5, tm(c), 0, 0.26, 0, 16); cn.rotation.z = 0.15; g.add(cn); g.add(cyl(0.3, 0.3, 0.02, tm(c), 0, 0.01, 0, 24)); for (let i = 0; i < 4; i++) g.add(sph(0.02, tm(0xf0e040, { unlit: 1 }), Math.cos(i * 1.6) * 0.1, 0.12 + i * 0.07, Math.sin(i * 1.6) * 0.1, 6, 4)); return g; },
  viking: (G, c = 0x9a9aa2) => { const g = HEAD.helmet(G, c); for (const s of [-1, 1]) { const h = cyl(0.0, 0.05, 0.22, tm(0xf0e8d0), s * R * 0.95, R * 0.75, 0, 8); h.rotation.z = -s * 0.9; g.add(h); } return g; },
  pirate: (G, c = 0x1a1a1e) => { const g = new THREE.Group(); g.position.y = R * 0.9; G.add(g); const b = cyl(0.27, 0.27, 0.05, tm(c), 0, 0.03, 0, 3); b.rotation.y = Math.PI / 6; g.add(b); g.add(cyl(0.13, 0.16, 0.13, tm(c), 0, 0.09, 0, 12)); g.add(sph(0.03, tm(0xf4f4f0), 0, 0.12, 0.15, 6, 4)); return g; },
  hardhat: (G, c = 0xf2c21c) => { const g = HEAD.helmet(G, c); g.add(box(0.03, 0.06, R * 2.0, tm(c), 0, R * 1.02, 0)); g.add(cyl(R * 1.28, R * 1.28, 0.02, tm(c), 0, R * 0.42, 0.04, 24)); return g; },
  fireHelm: (G) => { const g = HEAD.helmet(G, 0xd82a2a); g.add(cyl(R * 1.35, R * 1.25, 0.03, tm(0xd82a2a), 0, R * 0.4, -0.06, 24)); g.add(box(0.12, 0.12, 0.02, tm(0xf0c020), 0, R * 0.75, R * 1.0)); return g; },
  police: (G) => { const g = new THREE.Group(); g.position.y = R * 0.85; G.add(g); g.add(cyl(0.21, 0.17, 0.12, tm(0x1a2a5a), 0, 0.08, 0, 18)); const v = cyl(0.16, 0.16, 0.02, tm(0x111111), 0, 0.02, 0.12, 18); v.scale.z = 0.6; g.add(v); g.add(cyl(0.04, 0.04, 0.01, tm(0xf0c020), 0, 0.1, 0.205, 8).rotateX(Math.PI / 2)); return g; },
  sailor: (G) => { const g = new THREE.Group(); g.position.y = R * 0.85; G.add(g); g.add(cyl(0.2, 0.17, 0.1, tm(0xffffff), 0, 0.06, 0, 18)); g.add(cyl(0.205, 0.205, 0.03, tm(0x1a2a5a), 0, 0.02, 0, 18)); return g; },
  pilot: (G) => { const g = HEAD.helmet(G, 0x6a4a2a); for (const s of [-1, 1]) { const gg = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 14), tm(0x2a2a2a)); gg.position.set(s * 0.06, R * 0.9, R * 0.55); gg.rotation.x = -0.6; g.add(gg); } return g; },
  astronaut: (G) => { const g = new THREE.Group(); G.add(g); const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.18, 0.05, 10, 32), tm(0xf0f0f4)); ring.position.z = R * 0.2; g.add(ring); const back = new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 22, 14, Math.PI * 0.6, Math.PI * 0.8), tm(0xf0f0f4)); back.rotation.y = Math.PI; g.add(back); g.add(cyl(0.01, 0.01, 0.2, tm(0x9a9aa4), R * 0.7, R * 1.1, -0.05, 6)); g.add(sph(0.025, tm(0xd82a2a, { unlit: 1 }), R * 0.7, R * 1.2 + 0.1, -0.05, 6, 4)); return g; },
  headband: (G, c = 0xd82a2a) => { const t = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, 0.02, 6, 28), tm(c)); t.rotation.x = Math.PI / 2; t.position.y = R * 0.55; G.add(t); return t; },
  graduation: (G) => { const g = new THREE.Group(); g.position.y = R * 0.95; G.add(g); g.add(cyl(0.16, 0.16, 0.08, tm(0x1a1a1e), 0, 0.04, 0, 16)); g.add(box(0.38, 0.02, 0.38, tm(0x1a1a1e), 0, 0.09, 0)); g.add(box(0.01, 0.12, 0.01, tm(0xf0c020), 0.17, 0.03, 0.17)); return g; },
  turban: (G, c = 0xf08a2a) => { const g = new THREE.Group(); G.add(g); const d = sph(R * 1.12, tm(c), 0, R * 0.45, -0.02, 18, 12); d.scale.y = 0.6; g.add(d); return g; },
  roundGlasses: (G) => { for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.009, 6, 18), tm(0x1a1a1a)); r.position.set(s * 0.072, 0.035, 0.235); G.add(r); } G.add(box(0.05, 0.01, 0.01, tm(0x1a1a1a), 0, 0.045, 0.24)); },
  squareGlasses: (G) => { for (const s of [-1, 1]) { const f = box(0.13, 0.1, 0.012, tm(0x1a1a1a), s * 0.075, 0.035, 0.23); f.material = tm(0x1a1a1a); G.add(f); G.add(box(0.1, 0.07, 0.006, tm(0xdfefff, { unlit: 0.8, noInk: 1 }), s * 0.075, 0.035, 0.238)); } },
  sunglasses: (G) => { for (const s of [-1, 1]) G.add(box(0.12, 0.07, 0.015, tm(0x111111, { unlit: 0.3 }), s * 0.075, 0.04, 0.232)); G.add(box(0.05, 0.012, 0.012, tm(0x111111), 0, 0.055, 0.236)); },
  eyepatch: (G) => { G.add(box(0.1, 0.1, 0.015, tm(0x111111), 0.075, 0.035, 0.235)); const st = box(0.36, 0.015, 0.01, tm(0x111111), 0, 0.09, 0.2); st.rotation.z = -0.35; G.add(st); },
  beard: (G, c = 0x3a2a1a) => { const b = sph(0.17, tm(c), 0, -0.14, 0.11, 14, 10); b.scale.set(1.2, 0.8, 0.7); G.add(b); },
  whiteBeard: (G) => HEAD.beard(G, 0xe8e8e8),
  bowHair: (G, c = 0xe85a8a) => { for (const s of [-1, 1]) { const b = sph(0.05, tm(c), s * 0.05, R * 1.02, -0.02, 8, 6); b.scale.set(1.4, 1, 0.6); G.add(b); } },
  headphones: (G) => { const a = new THREE.Mesh(new THREE.TorusGeometry(R * 1.05, 0.02, 6, 24, Math.PI), tm(0x2a2a2a)); a.rotation.z = 0; G.add(a); for (const s of [-1, 1]) G.add(cyl(0.06, 0.06, 0.05, tm(0xd82a2a), s * R * 1.02, 0, 0, 12).rotateZ(Math.PI / 2)); },
};
// ---------------- body accessories (added to P.torso, torso-local units) ----------------
const BODY = {
  cape: (P, c = 0xd8302a) => P.torso.add(box(0.42, 0.6, 0.03, tm(c), 0, 0.27, -0.21)),
  bowtie: (P, c = 0xd82a2a) => { for (const s of [-1, 1]) { const b = box(0.06, 0.05, 0.02, tm(c), s * 0.035, 0.58, 0.16); b.rotation.z = s * 0.4; P.torso.add(b); } },
  tie: (P, c = 0x2a3a8a) => P.torso.add(box(0.04, 0.2, 0.015, tm(c), 0, 0.47, 0.165)),
  badge: (P, c = 0xe8b830) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 5), tm(c, { emis: 0.2 })); s.rotation.x = Math.PI / 2; s.position.set(0.08, 0.46, 0.165); P.torso.add(s); },
  scarf: (P, c = 0xd82a2a) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 6, 18), tm(c)); t.rotation.x = Math.PI / 2; t.position.y = 0.6; P.torso.add(t); P.torso.add(box(0.06, 0.18, 0.02, tm(c), 0.05, 0.5, 0.15)); },
  apron: (P, c = 0xf4f0e8) => P.torso.add(box(0.26, 0.42, 0.015, tm(c), 0, 0.22, 0.17)),
  backpack: (P, c = 0x3a8a5a) => P.torso.add(box(0.26, 0.3, 0.12, tm(c), 0, 0.33, -0.2)),
  sash: (P, c = 0xf0c020) => { const s = box(0.05, 0.62, 0.015, tm(c), 0, 0.32, 0.168); s.rotation.z = 0.6; P.torso.add(s); },
  vest: (P, c = 0x4a3a2a) => { for (const s of [-1, 1]) P.torso.add(box(0.1, 0.42, 0.015, tm(c), s * 0.08, 0.36, 0.165)); },
  labcoat: (P) => { for (const s of [-1, 1]) P.torso.add(box(0.11, 0.6, 0.02, tm(0xf8f8f8), s * 0.1, 0.27, 0.165)); },
  lifevest: (P) => P.torso.add(box(0.3, 0.36, 0.06, tm(0xf08a20), 0, 0.36, 0.13)),
  armor: (P) => { P.torso.add(box(0.32, 0.4, 0.05, tm(0xb0b0b8), 0, 0.38, 0.15)); for (const s of [-1, 1]) P.torso.add(sph(0.07, tm(0xb0b0b8), s * 0.2, 0.56, 0, 8, 6)); },
  stripes: (P, c = 0xffffff) => { for (let i = 0; i < 3; i++) P.torso.add(box(0.3, 0.03, 0.01, tm(c), 0, 0.2 + i * 0.12, 0.168)); },
  medal: (P) => { P.torso.add(cyl(0.035, 0.035, 0.01, tm(0xf0c020, { emis: 0.2 }), 0, 0.42, 0.17).rotateX(Math.PI / 2)); P.torso.add(box(0.03, 0.1, 0.01, tm(0x2a5ad8), 0, 0.5, 0.165)); },
  toolbelt: (P) => { P.torso.add(box(0.36, 0.05, 0.27, tm(0x6a4a2a), 0, 0.04, 0)); P.torso.add(box(0.06, 0.08, 0.03, tm(0x8a8a8a), 0.12, 0.0, 0.15)); },
};
const A = (h = [], b = []) => ({ h, b });
// ---------------- the 56 presets ----------------
// spec: Person spec override (top/height/build); head: toonkit head options; acc: { h: [[name, colour?]], b: [[name, colour?]] }
export const CAST = {
  king:        { role: 'king / ruler',            spec: { top: '#a8203a', height: 0.62, build: { w: 1.35 } }, head: { hair: '#d8d8d8', mustache: '#e8e8e8', brow: '#a0a0a0' }, acc: A([['crown']], [['cape'], ['sash']]) },
  prince:      { role: 'young prince',            spec: { top: '#3a5ad8', height: 0.58 }, head: { hair: '#c89a3a' }, acc: A([['crown', 0xd8d8e0]], [['cape', 0x2a3a8a]]) },
  knight:      { role: 'knight',                  spec: { top: '#8a8a92', height: 0.64 }, head: {}, acc: A([['knightHelm']], [['armor']]) },
  soldier:     { role: 'soldier (use many)',      spec: { top: '#9a3030', height: 0.6 }, head: { hat: 'cap', hatCol: 0x8a8a92, browMax: 0.135 }, acc: A([], []) },
  captain:     { role: 'army captain',            spec: { top: '#3a4a3a', height: 0.64 }, head: { mustache: '#2a1a12' }, acc: A([['helmet', 0x6a6a70]], [['medal'], ['sash', 0xd8b030]]) },
  guard:       { role: 'museum / palace guard',   spec: { top: '#2a3a6a', height: 0.64 }, head: { hat: 'cap', hatCol: 0x1a2a4a, browMax: 0.135 }, acc: A([], [['badge']]) },
  drummer:     { role: 'drummer / band',          spec: { top: '#2a6ad8', height: 0.58 }, head: { hat: 'cap', hatCol: 0xd82a2a, browMax: 0.135 }, acc: A([], [['sash', 0xffffff]]) },
  sheriff:     { role: 'sheriff',                 spec: { top: '#c8b07a', height: 0.62, build: { w: 1.25 } }, head: { mustache: '#2a1a12', hat: 'brim', hatCol: 0x6a4a2a }, acc: A([], [['badge']]) },
  cowboy:      { role: 'cowboy / rancher',        spec: { top: '#c86a3a', height: 0.62 }, head: { mustache: '#5a3a1a' }, acc: A([['cowboy']], [['vest', 0x5a3a2a]]) },
  farmer:      { role: 'farmer',                  spec: { top: '#5a8a3a', height: 0.6 }, head: { hat: 'brim', hatCol: 0xe8c870 }, acc: A([], [['vest', 0x3a5a8a]]) },
  baker:       { role: 'baker',                   spec: { top: '#f0e0c8', height: 0.6, build: { w: 1.3 } }, head: { mustache: '#3a2a1a' }, acc: A([['chef']], [['apron']]) },
  chef:        { role: 'chef / cook',             spec: { top: '#ffffff', height: 0.62 }, head: { hair: '#1a120e' }, acc: A([['chef']], [['scarf', 0xd82a2a]]) },
  fisherman:   { role: 'fisherman',               spec: { top: '#e8b020', height: 0.6 }, head: { }, acc: A([['beanie', 0x2a4a6a], ['beard', 0x6a4a2a]], [['vest', 0x3a5a3a]]) },
  sailor:      { role: 'sailor',                  spec: { top: '#f4f4f0', height: 0.6 }, head: { hair: '#1a120e' }, acc: A([['sailor']], [['stripes', 0x1a2a5a], ['scarf', 0x1a2a5a]]) },
  pirate:      { role: 'pirate captain',          spec: { top: '#8a1a2a', height: 0.62 }, head: { }, acc: A([['pirate'], ['eyepatch'], ['beard', 0x1a1a1a]], [['sash', 0xf0c020]]) },
  doctor:      { role: 'doctor',                  spec: { top: '#8ab8d8', height: 0.62 }, head: { hair: '#3a2a1a' }, acc: A([['roundGlasses']], [['labcoat']]) },
  scientist:   { role: 'scientist',               spec: { top: '#5a5a6a', height: 0.62 }, head: { hair: '#e8e8e8' }, acc: A([['squareGlasses']], [['labcoat'], ['bowtie', 0x2a5ad8]]) },
  inventor:    { role: 'inventor / tinkerer',     spec: { top: '#c87a2a', height: 0.6 }, head: { hair: '#8a5a2a' }, acc: A([['pilot']], [['toolbelt']]) },
  teacher:     { role: 'teacher',                 spec: { top: '#6a3a8a', height: 0.62 }, head: { hair: '#8a8a8a', mustache: '#3a2a1a' }, acc: A([['roundGlasses']], [['bowtie']]) },
  student:     { role: 'student',                 spec: { top: '#3aa86a', height: 0.56 }, head: { hair: '#1a120e' }, acc: A([], [['backpack', 0xd8402a]]) },
  kid:         { role: 'small kid',               spec: { top: '#f08a2a', height: 0.46 }, head: { hair: '#2a1a10' }, acc: A([], []) },
  kid2:        { role: 'small kid 2',             spec: { top: '#2ab8c8', height: 0.44 }, head: { hat: 'cap', hatCol: 0xe8c020, browMax: 0.135 }, acc: A([], [['backpack', 0x8a5ad8]]) },
  grandpa:     { role: 'grandpa / elder',         spec: { top: '#8a7a6a', height: 0.58, build: { w: 1.2 } }, head: { hair: '#e0e0e0', brow: '#b0b0b0' }, acc: A([['whiteBeard'], ['roundGlasses']], [['vest', 0x5a4a3a]]) },
  mayor:       { role: 'mayor / official',        spec: { top: '#2a2a3a', height: 0.62, build: { w: 1.3 } }, head: { hair: '#6a6a6a', mustache: '#3a3a3a' }, acc: A([['tophat']], [['sash', 0xd82a2a], ['tie', 0xd82a2a]]) },
  curator:     { role: 'museum curator',          spec: { top: '#6a3a8a', height: 0.62 }, head: { hair: '#8a8a8a', mustache: '#3a2a1a' }, acc: A([['roundGlasses']], [['bowtie']]) },
  shopkeeper:  { role: 'shopkeeper',              spec: { top: '#3a8a8a', height: 0.6, build: { w: 1.3 } }, head: { hair: '#2a2420', mustache: '#2a2420' }, acc: A([], [['apron', 0x8a5a3a]]) },
  mechanic:    { role: 'mechanic',                spec: { top: '#3a4a6a', height: 0.62 }, head: { hat: 'cap', hatCol: 0xd82a2a, browMax: 0.135 }, acc: A([], [['toolbelt']]) },
  engineer:    { role: 'engineer / builder',      spec: { top: '#f08a20', height: 0.62 }, head: { }, acc: A([['hardhat']], [['lifevest']]) },
  pilot:       { role: 'pilot',                   spec: { top: '#4a5a3a', height: 0.62 }, head: { mustache: '#3a2a1a' }, acc: A([['pilot']], [['scarf', 0xf4f4f0]]) },
  astronaut:   { role: 'astronaut',               spec: { top: '#f0f0f4', height: 0.62 }, head: { }, acc: A([['astronaut']], [['badge', 0x2a5ad8]]) },
  firefighter: { role: 'firefighter',             spec: { top: '#2a2a2a', height: 0.64 }, head: { }, acc: A([['fireHelm']], [['stripes', 0xf0e040]]) },
  police:      { role: 'police officer',          spec: { top: '#1a2a5a', height: 0.63 }, head: { }, acc: A([['police']], [['badge']]) },
  detective:   { role: 'detective',               spec: { top: '#8a7a5a', height: 0.62 }, head: { hat: 'brim', hatCol: 0x4a3a2a }, acc: A([], [['scarf', 0x5a3a2a]]) },
  mailman:     { role: 'mail carrier',            spec: { top: '#4a6aa8', height: 0.6 }, head: { hat: 'cap', hatCol: 0x2a3a6a, browMax: 0.135 }, acc: A([], [['backpack', 0x8a5a2a]]) },
  courier:     { role: 'delivery rider',          spec: { top: '#e8c020', height: 0.6 }, head: { hat: 'cap', hatCol: 0x1a1a1e, browMax: 0.135 }, acc: A([['sunglasses']], [['backpack', 0xe8c020]]) },
  gardener:    { role: 'gardener',                spec: { top: '#6aa84a', height: 0.58 }, head: { hat: 'brim', hatCol: 0xd8c080 }, acc: A([], [['apron', 0x3a6a2a]]) },
  painter:     { role: 'painter / artist',        spec: { top: '#e85a8a', height: 0.6 }, head: { hair: '#1a120e' }, acc: A([['beanie', 0xd82a2a]], [['apron', 0xe8e0d0]]) },
  musician:    { role: 'street musician',         spec: { top: '#8a5ad8', height: 0.6 }, head: { hair: '#2a1a10' }, acc: A([['headphones']], [['scarf', 0xf0c020]]) },
  athlete:     { role: 'athlete / runner',        spec: { top: '#d8402a', height: 0.62 }, head: { hair: '#1a120e' }, acc: A([['headband', 0xffffff]], [['stripes', 0xffffff]]) },
  coach:       { role: 'coach',                   spec: { top: '#2a8a5a', height: 0.62, build: { w: 1.3 } }, head: { hat: 'cap', hatCol: 0x2a8a5a, browMax: 0.135, mustache: '#3a2a1a' }, acc: A([], [['medal']]) },
  referee:     { role: 'referee',                 spec: { top: '#f4f4f4', height: 0.62 }, head: { hair: '#1a120e' }, acc: A([], [['stripes', 0x1a1a1a]]) },
  tourist:     { role: 'tourist',                 spec: { top: '#2ab8a0', height: 0.6 }, head: { hat: 'brim', hatCol: 0xf0e0a0 }, acc: A([['sunglasses']], [['backpack', 0xd84a3a]]) },
  photographer:{ role: 'photographer',            spec: { top: '#4a4a52', height: 0.6 }, head: { hair: '#3a2a1a' }, acc: A([['beanie', 0x3a3a42]], [['vest', 0x6a5a3a]]) },
  reporter:    { role: 'TV reporter',             spec: { top: '#2a3a8a', height: 0.62 }, head: { hair: '#1a120e' }, acc: A([], [['tie', 0xd82a2a]]) },
  businessman: { role: 'businessman / boss',      spec: { top: '#2a2a32', height: 0.63, build: { w: 1.3 } }, head: { hair: '#3a3a3a' }, acc: A([['sunglasses']], [['tie', 0x8a1a2a]]) },
  banker:      { role: 'banker / rich man',       spec: { top: '#1a3a2a', height: 0.6, build: { w: 1.4 } }, head: { mustache: '#2a2a2a' }, acc: A([['tophat'], ['roundGlasses']], [['vest', 0x8a6a2a], ['bowtie', 0x1a1a1a]]) },
  judge:       { role: 'judge',                   spec: { top: '#1a1a1e', height: 0.62 }, head: { hair: '#f0f0f0' }, acc: A([['squareGlasses']], [['bowtie', 0xf4f4f4]]) },
  monk:        { role: 'monk / sage',             spec: { top: '#d88a2a', height: 0.6 }, head: { }, acc: A([['whiteBeard']], [['sash', 0x8a3a1a]]) },
  wizard:      { role: 'wizard',                  spec: { top: '#3a2a8a', height: 0.62 }, head: { brow: '#c0c0c0' }, acc: A([['wizard'], ['whiteBeard']], [['cape', 0x2a1a6a]]) },
  viking:      { role: 'viking',                  spec: { top: '#8a5a2a', height: 0.64, build: { w: 1.35 } }, head: { }, acc: A([['viking'], ['beard', 0xc86a2a]], [['armor']]) },
  miner:       { role: 'miner',                   spec: { top: '#5a4a3a', height: 0.6 }, head: { }, acc: A([['hardhat', 0xf0d020]], [['toolbelt']]) },
  lifeguard:   { role: 'lifeguard',               spec: { top: '#d82a2a', height: 0.62 }, head: { hair: '#e8c060' }, acc: A([['sunglasses']], [['lifevest']]) },
  waiter:      { role: 'waiter',                  spec: { top: '#f4f4f0', height: 0.6 }, head: { hair: '#1a120e', mustache: '#1a120e' }, acc: A([], [['vest', 0x1a1a1e], ['bowtie', 0x1a1a1e]]) },
  janitor:     { role: 'janitor',                 spec: { top: '#6a7a8a', height: 0.6 }, head: { hat: 'cap', hatCol: 0x4a5a6a, browMax: 0.135 }, acc: A([], [['apron', 0x3a4a5a]]) },
  gamer:       { role: 'nerd / gamer',            spec: { top: '#2a2a2a', height: 0.58 }, head: { hair: '#3a2a1a' }, acc: A([['squareGlasses'], ['headphones']], []) },
  student2:    { role: 'graduate',                spec: { top: '#1a1a1e', height: 0.6 }, head: { }, acc: A([['graduation']], [['sash', 0xf0c020]]) },
  traveler:    { role: 'traveler / wanderer',     spec: { top: '#c8a06a', height: 0.62 }, head: { }, acc: A([['turban', 0x3a8ab8]], [['backpack', 0x6a4a2a], ['scarf', 0xd8a030]]) },
};
export const CAST_IDS = Object.keys(CAST);
// build one character from the catalogue. extra: { spec overrides, head overrides, act: {hits,loops,marks} }
export function makeCast(world, id, act = {}, extra = {}) {
  const c = CAST[id]; if (!c) throw new Error('unknown cast id ' + id);
  const P = makeStickPerson(world, { ...c.spec, seed: (extra.seed ?? CAST_IDS.indexOf(id) * 7 + 3), ...(extra.spec || {}) }, { ...c.head, ...(extra.head || {}) }, act);
  const G = P.toonHead.G; for (const [n, col] of c.acc.h) HEAD[n](G, col); for (const [n, col] of c.acc.b) BODY[n](P, col);
  P.castId = id; return P;
}
export { HEAD, BODY };
