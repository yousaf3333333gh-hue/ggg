// cast sheet: renderFrame(k) shows characters k*8 .. k*8+7 (front view, smiling) for checking the catalogue
import * as THREE from 'three';
import * as C from './core.js';
import { mkLook, applyLook } from '../../web/looks.js';
import { toonify, CAMPOS } from '../../web/toonkit.js';
import { makeCast, CAST_IDS, CAST } from '../../web/cast.js';
import { box } from '../../web/models.js';
import { toTex, mkCanvas } from '../../web/tex.js';
const { stage, dofU, PX } = C; const W = new THREE.Group(); stage.world.add(W); W.add(C.makeSky());
W.add(box(40, 0.1, 20, C.toon({ color: new THREE.Color(0x9ad06a) }), 0, -0.05, 0));
const PEOPLE = CAST_IDS.map((id, i) => { const P = makeCast(W, id); P.root.visible = false; return P; });
const labels = CAST_IDS.map((id) => { const c = mkCanvas(512, 96); const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#111'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText(id, 256, 66);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.14), C.toon({ color: new THREE.Color(0xffffff), map: toTex(c, false), unlit: 1, noInk: 1 })); m.visible = false; W.add(m); return m; });
const L = mkLook({ sun: [0.4, 0.8, 0.6], lit: '#ffffff', shade: '#b8c0e0', ambSky: '#ffffff', fog: '#e0f0ff', sky: ['#5aa0f0', '#bfe0ff', '#ffffff'], vig: 0.0, contrast: 1.03, sat: 1.15, exposure: 1.05 });
window.renderFrame = function (k) { PEOPLE.forEach((P) => (P.root.visible = false)); labels.forEach((l) => (l.visible = false));
  for (let j = 0; j < 8; j++) { const i = k * 8 + j; if (i >= PEOPLE.length) break; const P = PEOPLE[i]; const x = (j % 4 - 1.5) * 1.0, z = j < 4 ? -1.1 : 0.9; P.root.visible = true; P.root.position.set(x, 0, z); P.root.rotation.set(0, 0, 0);
    const p = toonify({ expr: j % 3 ? 'smile' : 'joy', t: 1, look: [0, 0], blink: 0 }, P, 1); P.update(p); labels[i].visible = true; labels[i].position.set(x, 0.06, z + 0.45); labels[i].rotation.x = -1.2; }
  applyLook(L, { shadowCenter: [0, 1, 0], shadowSize: 8 }); C.setCam({ pos: [0, 2.6, 7.2], look: [0, 0.75, -0.1], fov: 36 }); dofU.uAper.value = 0; dofU.uFade.value = 0; C.drawFrame(); return 'ok'; };
window.ready = true;
