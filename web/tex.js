// Hand-painted procedural textures (Canvas2D). Muted painterly strokes, dark seams.
import * as THREE from 'three';
import { rng } from './core.js';

const cache = new Map();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
const col = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
function shift(c, d) { return [c[0] + d, c[1] + d, c[2] + d]; }

function strokes(g, w, h, base, n, len, alpha, seed, spread = 22, wrap = true) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, a = (R() - 0.5) * 1.2 + (R() < 0.5 ? 0 : Math.PI / 2 * 0.0), l = len * (0.5 + R());
    const d = (R() - 0.5) * 2 * spread;
    g.strokeStyle = col(base[0] + d, base[1] + d * 0.9, base[2] + d * 0.8, alpha * (0.5 + R()));
    g.lineWidth = 1 + R() * (len / 14);
    g.lineCap = 'round';
    for (const ox of wrap ? [-w, 0, w] : [0]) for (const oy of wrap ? [-h, 0, h] : [0]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
}

export function painted(kind, o = {}) {
  const key = kind + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const S = o.size || 512; const c = canvas(S, S), g = c.getContext('2d'); const seed = o.seed || 7;
  const R = rng(seed);
  switch (kind) {
    case 'grass': {
      const b = o.base || [112, 178, 70];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 26; i++) { g.fillStyle = col(b[0] + (R() - .5) * 30, b[1] + (R() - .3) * 34, b[2] + (R() - .5) * 20, 0.28); g.beginPath(); g.ellipse(R() * S, R() * S, 30 + R() * 90, 20 + R() * 50, R() * 3, 0, 7); g.fill(); }
      strokes(g, S, S, [b[0] - 18, b[1] + 8, b[2] - 14], 700, 26, 0.35, seed + 1, 18);
      strokes(g, S, S, [b[0] + 26, b[1] + 22, b[2] + 6], 500, 22, 0.28, seed + 2, 12);
      break;
    }
    case 'asphalt': {
      const b = o.base || [86, 88, 100];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) { g.fillStyle = col(b[0] + (R() - .5) * 20, b[1] + (R() - .5) * 20, b[2] + (R() - .5) * 20, 0.35); g.beginPath(); g.ellipse(R() * S, R() * S, 40 + R() * 120, 30 + R() * 80, R() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 4000; i++) { const d = (R() - 0.5) * 50; g.fillStyle = col(b[0] + d, b[1] + d, b[2] + d * 1.1, 0.5); g.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
      g.strokeStyle = col(40, 40, 52, 0.55); g.lineWidth = 2;
      for (let i = 0; i < 3; i++) { g.beginPath(); let x = R() * S, y = R() * S; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - .5) * 90; y += (R() - .3) * 80; g.lineTo(x, y); } g.stroke(); }
      break;
    }
    case 'concrete': {
      const b = o.base || [188, 184, 176];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 18; i++) { g.fillStyle = col(b[0] + (R() - .5) * 22, b[1] + (R() - .5) * 22, b[2] + (R() - .5) * 22, 0.35); g.beginPath(); g.ellipse(R() * S, R() * S, 50 + R() * 110, 30 + R() * 80, R() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 2500; i++) { const d = (R() - 0.5) * 36; g.fillStyle = col(b[0] + d, b[1] + d, b[2] + d, 0.45); g.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
      g.strokeStyle = col(70, 68, 74, 0.8); g.lineWidth = 5; g.strokeRect(0, 0, S, S);
      break;
    }
    case 'wood': {
      const b = o.base || [214, 156, 82];
      const n = 6, ph = S / n;
      for (let i = 0; i < n; i++) {
        const d = (R() - 0.5) * 26; g.fillStyle = col(b[0] + d, b[1] + d * 0.9, b[2] + d * 0.7); g.fillRect(0, i * ph, S, ph);
        for (let k = 0; k < 22; k++) { g.strokeStyle = col(b[0] - 40 + R() * 20, b[1] - 50 + R() * 20, b[2] - 40, 0.28); g.lineWidth = 1 + R() * 2; g.beginPath(); const y = i * ph + R() * ph; g.moveTo(0, y); g.bezierCurveTo(S * .3, y + (R() - .5) * 8, S * .6, y + (R() - .5) * 8, S, y + (R() - .5) * 6); g.stroke(); }
        g.fillStyle = col(30, 18, 20, 0.9); g.fillRect(0, i * ph, S, 4);
        g.fillStyle = col(30, 18, 20, 0.7); g.fillRect(R() * S, i * ph, 4, ph);
      }
      break;
    }
    case 'plane': { // fuselage skin: warm white panels with faint seams + rivets
      const b = o.base || [248, 248, 252];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 14; i++) { g.fillStyle = col(b[0] - R() * 12, b[1] - R() * 12, b[2] - R() * 6, 0.35); g.beginPath(); g.ellipse(R() * S, R() * S, 40 + R() * 100, 20 + R() * 40, R() * 3, 0, 7); g.fill(); }
      g.strokeStyle = col(150, 156, 176, 0.7); g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * S) / 4); g.lineTo(S, (i * S) / 4); g.stroke(); }
      for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo((i * S) / 2 + 8, 0); g.lineTo((i * S) / 2 + 8, S); g.stroke(); }
      break;
    }
    case 'stucco': {
      const b = o.base || [238, 214, 170];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 20; i++) { g.fillStyle = col(b[0] + (R() - .5) * 24, b[1] + (R() - .5) * 24, b[2] + (R() - .5) * 24, 0.3); g.beginPath(); g.ellipse(R() * S, R() * S, 40 + R() * 110, 30 + R() * 80, R() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 2000; i++) { const d = (R() - 0.5) * 30; g.fillStyle = col(b[0] + d, b[1] + d, b[2] + d, 0.35); g.fillRect(R() * S, R() * S, 2, 2); }
      break;
    }
    case 'roof': {
      const b = o.base || [190, 84, 66];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      const rows = 8, cols = 8;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const d = (R() - 0.5) * 28; g.fillStyle = col(b[0] + d, b[1] + d * 0.8, b[2] + d * 0.7); g.fillRect(x * S / cols + (y % 2) * S / cols / 2 - S / cols / 2, y * S / rows, S / cols, S / rows);
        g.fillStyle = col(40, 20, 24, 0.7); g.fillRect(x * S / cols + (y % 2) * S / cols / 2 - S / cols / 2, y * S / rows, 3, S / rows);
      }
      for (let y = 0; y < rows; y++) { g.fillStyle = col(40, 20, 24, 0.85); g.fillRect(0, y * S / rows, S, 4); }
      break;
    }
    case 'water': {
      const b = o.base || [58, 140, 214];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 12; i++) { g.fillStyle = col(b[0] + (R() - .5) * 26, b[1] + (R() - .3) * 30, b[2] + (R() - .5) * 20, 0.3); g.beginPath(); g.ellipse(R() * S, R() * S, 60 + R() * 120, 12 + R() * 30, R() * 0.4, 0, 7); g.fill(); }
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) { g.strokeStyle = col(235, 246, 255, 0.28 + R() * 0.3); g.lineWidth = 2 + R() * 3; const x = R() * S, y = R() * S, l = 14 + R() * 40; for (const ox of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + l / 2, y - 5, x + ox + l, y); g.stroke(); } }
      break;
    }
    case 'sand': {
      const b = o.base || [222, 196, 140];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      strokes(g, S, S, b, 600, 20, 0.25, seed, 20);
      break;
    }
    case 'dirt': {
      const b = o.base || [176, 128, 84];
      g.fillStyle = col(...b); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 14; i++) { g.fillStyle = col(b[0] + (R() - .5) * 30, b[1] + (R() - .5) * 26, b[2] + (R() - .5) * 20, 0.3); g.beginPath(); g.ellipse(R() * S, R() * S, 40 + R() * 100, 30 + R() * 70, R() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 2500; i++) { const d = (R() - 0.5) * 40; g.fillStyle = col(b[0] + d, b[1] + d, b[2] + d, 0.4); g.fillRect(R() * S, R() * S, 1 + R() * 3, 1 + R() * 2); }
      break;
    }
    case 'checker': {
      const n = o.n || 8; const cs = S / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? (o.b || '#1a1420') : (o.a || '#ffffff'); g.fillRect(x * cs, y * cs, cs, cs); }
      break;
    }
    case 'stripes': {
      const n = o.n || 8; const cs = S / n;
      for (let x = 0; x < n; x++) { g.fillStyle = x % 2 ? (o.b || '#ffffff') : (o.a || '#e5453a'); g.fillRect(x * cs, 0, cs, S); }
      break;
    }
    case 'flat': { g.fillStyle = o.base ? col(...o.base) : '#fff'; g.fillRect(0, 0, S, S); strokes(g, S, S, o.base || [255, 255, 255], 300, 30, 0.18, seed, 10); break; }
  }
  const t = toTex(c); cache.set(key, t); return t;
}

// generic helpers to paint small signs / props onto canvases without letters
export function canvasTex(w, h, fn) { const c = canvas(w, h); const g = c.getContext('2d'); fn(g, w, h); return toTex(c, false); }
export const mkCanvas = canvas;
