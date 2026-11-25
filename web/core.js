// Core renderer: toon world pass (MRT colour+normal) -> ink pass -> card pass -> DOF -> grade.
// Everything is deterministic: window.renderFrame(f) draws exactly frame f.
import * as THREE from 'three';
THREE.ColorManagement.enabled = false;

export const Q = new URLSearchParams(location.search);
// ---- render quality tiers: ?q=draft|fast|good|final  (any explicit param like &s=0.6 still wins). 1-CPU software GL: final ~11 s/frame, fast ~1.9 s/frame at 540x960 ----
export const TIERS = {
  draft: { s: 0.35, msaa: 0, inkd: 6, inkr: 1, glowt: 4, sh: 512 },
  fast:  { s: 0.5,  msaa: 0, inkd: 8, inkr: 1, glowt: 6, sh: 1024 },
  good:  { s: 0.75, msaa: 0, inkd: 10, inkr: 1, glowt: 8, sh: 1024 },
  final: { s: 1, msaa: 4, inkd: 12, inkr: 2, glowt: 16, sh: 2048 },
};
const TIER = TIERS[Q.get('q') || 'final'] || TIERS.final;
export const qv = (k, d) => (Q.has(k) ? Q.get(k) : (TIER[k] !== undefined ? String(TIER[k]) : String(d)));
export const SCALE = parseFloat(qv('s', 1));
export const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
export const PX = H / 1920;
export const FPS = 30;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const sm5 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);
renderer.domElement.style.width = '540px';

// ---------- shared look uniforms ----------
export const shared = {
  uSun: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
  uLit: { value: new THREE.Color(1.12, 1.06, 0.96) },
  uShade: { value: new THREE.Color(0.55, 0.57, 0.76) },
  uFogC: { value: new THREE.Color(0.74, 0.84, 0.95) },
  uFog: { value: new THREE.Vector2(80, 600) },
  uFogAmt: { value: 1 },
  uSat: { value: 1.06 },
  // ---- v6 cinematic uniforms (all default OFF, so old scenes look identical) ----
  uShadowMap: { value: null }, uShadowMat: { value: new THREE.Matrix4() }, uShadowOn: { value: 0 },
  uShadowTexel: { value: 1 / 2048 }, uShadowBias: { value: 0.0015 }, uShadowNB: { value: 0.03 }, uShadowStr: { value: 1 },
  uAmbSky: { value: new THREE.Color(1, 1, 1) }, uAmbGnd: { value: new THREE.Color(1, 1, 1) },
  uRimCol: { value: new THREE.Color(0, 0, 0) }, uRimDir: { value: new THREE.Vector3(-0.5, 0.3, -0.8).normalize() }, uRimPow: { value: 2.5 },
  uPL: { value: [new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1)] },
  uPLc: { value: [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)] },
};
export const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

const VS = /* glsl */`
out vec3 vN; out vec3 vW; out vec2 vUv;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FS = /* glsl */`
precision highp float;
layout(location=0) out vec4 o0;
layout(location=1) out vec4 o1;
in vec3 vN; in vec3 vW; in vec2 vUv;
uniform vec3 uColor; uniform sampler2D uMap; uniform vec2 uRepeat; uniform float uUnlit; uniform float uEmis;
uniform vec3 uSun; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFogC; uniform vec2 uFog; uniform float uFogAmt; uniform float uSat;
uniform float uBand; uniform float uNoInk; uniform float uGround; uniform float uCut;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowOn; uniform float uShadowTexel; uniform float uShadowBias; uniform float uShadowNB; uniform float uShadowStr;
uniform vec3 uAmbSky; uniform vec3 uAmbGnd; uniform vec3 uRimCol; uniform vec3 uRimDir; uniform float uRimPow;
uniform vec4 uPL[4]; uniform vec3 uPLc[4];
float shadowAt(vec3 wp, vec3 n){
  vec4 sc = uShadowMat * vec4(wp + n * uShadowNB, 1.0);
  vec3 p = sc.xyz / sc.w;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float cur = p.z - uShadowBias;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture(uShadowMap, p.xy + vec2(float(i), float(j)) * uShadowTexel * 1.3).r;
    s += step(cur, d);
  }
  return s / 9.0;
}
void main(){
  vec3 n = normalize(vN);
  if(!gl_FrontFacing) n = -n;
  vec4 tx = texture(uMap, vUv * uRepeat); if (tx.a < uCut) discard;
  vec3 alb = uColor * tx.rgb;
  float nd = dot(n, uSun);
  float t = smoothstep(-0.10, 0.10 + uBand, nd);
  if (uShadowOn > 0.5 && uUnlit < 0.98) { float sh = shadowAt(vW, n); t = min(t, mix(1.0, smoothstep(0.25, 0.75, sh), uShadowStr)); }
  vec3 amb = mix(uAmbGnd, uAmbSky, n.y * 0.5 + 0.5);
  vec3 col = alb * mix(uShade * amb, uLit, t);
  // practical lights (lamps, candles, fire): soft banded falloff
  vec3 pl = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 Lv = uPL[i].xyz - vW; float dl = length(Lv); Lv /= max(dl, 1e-3);
    float att = clamp(1.0 - dl / max(uPL[i].w, 0.01), 0.0, 1.0); att *= att;
    pl += uPLc[i] * att * smoothstep(-0.10, 0.30, dot(n, Lv));
  }
  col += alb * pl;
  // rim / back light
  { vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), uRimPow); float rm = smoothstep(-0.15, 0.55, dot(n, normalize(uRimDir)));
    col += uRimCol * fr * rm * (0.35 + 0.65 * dot(alb, vec3(0.333))) * (1.0 - uUnlit); }
  // gentle sky/ground bounce: undersides a touch darker
  col *= 1.0 - 0.10 * clamp(-n.y, 0.0, 1.0);
  col = mix(col, alb, uUnlit);
  col += alb * uEmis;
  float luma = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(luma), col, uSat);
  float d = length(vW - cameraPosition);
  float f = smoothstep(uFog.x, uFog.y, d) * uFogAmt;
  col = mix(col, uFogC, f);
  o0 = vec4(col, 1.0);
  o1 = vec4(n * 0.5 + 0.5, clamp(f + uNoInk, 0.0, 1.0));
}`;

let _mc = 0;
export function toon(o = {}) {
  const u = {
    ...shared,
    uColor: { value: new THREE.Color(o.color ?? 0xffffff) },
    uMap: { value: o.map || WHITE },
    uRepeat: { value: new THREE.Vector2(...(o.repeat || [1, 1])) },
    uUnlit: { value: o.unlit ?? 0 },
    uEmis: { value: o.emis ?? 0 },
    uBand: { value: o.band ?? 0.06 },
    uNoInk: { value: o.noInk ?? 0 },
    uGround: { value: 0 }, uCut: { value: o.cut ?? 0 },
  };
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: VS, fragmentShader: FS,
    side: o.side ?? THREE.FrontSide, depthWrite: o.depthWrite ?? true,
    polygonOffset: !!o.offset, polygonOffsetFactor: o.offset ? -1 : 0, polygonOffsetUnits: o.offset ? -(o.offset) : 0,
  });
  m.name = 'toon' + (_mc++);
  return m;
}

// ---------- sky gradient dome ----------
export const skyU = {
  uTop: { value: new THREE.Color(0.24, 0.5, 0.86) }, uMid: { value: new THREE.Color(0.52, 0.74, 0.96) },
  uHor: { value: new THREE.Color(0.86, 0.93, 1.0) }, uSunDir: { value: new THREE.Vector3(0.4, 0.5, -0.7).normalize() },
  uSunCol: { value: new THREE.Color(1.0, 0.95, 0.8) }, uSunSize: { value: 0.012 }, uGlow: { value: 0.35 }, uBelow: { value: new THREE.Color(0.6, 0.78, 0.5) },
};
export function makeSky() {
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `out vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `precision highp float; layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; in vec3 vD;
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunSize; uniform float uGlow; uniform vec3 uBelow;
      void main(){
        vec3 d = normalize(vD);
        float h = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.30, h));
        c = mix(c, uTop, smoothstep(0.25, 0.9, h));
        c = mix(c, uBelow, smoothstep(0.0, -0.25, h));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        c += uSunCol * uGlow * pow(sd, 18.0) * 0.55;
        c += uSunCol * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.55, sd) * 2.2;
        o0 = vec4(c, 1.0); o1 = vec4(0.5, 0.5, 1.0, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), m);
  mesh.frustumCulled = false; mesh.renderOrder = -100; mesh.userData.noShadow = true;
  return mesh;
}

// ---------- render targets ----------
const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
export const MSAA = parseInt(qv('msaa', 4));  // 0 = off (fast tiers), 4 = final
const rtA = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, count: 2, samples: MSAA, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
rtA.textures.forEach(t => { t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; });
const rtB = new THREE.WebGLRenderTarget(W, H, { ...rtOpts });
const rtC = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, samples: MSAA, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
const rtD = new THREE.WebGLRenderTarget(W, H, { ...rtOpts });

// ---------- v6: real shadow map (directional key light) ----------
export const SHADOW_RES = parseInt(qv('sh', 2048));
const rtS = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthTexture: new THREE.DepthTexture(SHADOW_RES, SHADOW_RES, THREE.UnsignedIntType) });
rtS.depthTexture.minFilter = THREE.NearestFilter; rtS.depthTexture.magFilter = THREE.NearestFilter;
shared.uShadowMap.value = rtS.depthTexture; shared.uShadowTexel.value = 1 / SHADOW_RES;
// shadow.center = world point the shadow box is centred on (follow the subject), size = box width in metres, depth = box length along the light
export const shadow = { center: new THREE.Vector3(0, 1, 0), size: 16, depth: 80 };
const shadowCam = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
const depthMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false });
const _bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function updateShadowCam() {
  const d = shared.uSun.value.clone().normalize(), c = shadow.center, h = shadow.size / 2;
  shadowCam.left = -h; shadowCam.right = h; shadowCam.top = h; shadowCam.bottom = -h; shadowCam.near = 0.1; shadowCam.far = shadow.depth;
  shadowCam.position.copy(c).addScaledVector(d, shadow.depth * 0.5);
  shadowCam.up.set(Math.abs(d.y) > 0.95 ? 0 : 0, Math.abs(d.y) > 0.95 ? 0 : 1, Math.abs(d.y) > 0.95 ? 1 : 0);
  shadowCam.lookAt(c); shadowCam.updateProjectionMatrix(); shadowCam.updateMatrixWorld(true);
  shared.uShadowMat.value.copy(_bias).multiply(shadowCam.projectionMatrix).multiply(shadowCam.matrixWorldInverse);
  // bias scales with texel size so acne/peter-panning stay under control for any box size
  shared.uShadowBias.value = (shadow.size / SHADOW_RES) * 2.2 / shadow.depth + 0.0004;
  shared.uShadowNB.value = (shadow.size / SHADOW_RES) * 1.6;
}
function shadowPass() {
  const r = renderer, hid = [];
  stage.world.traverse(o => { if (o.userData && o.userData.noShadow && o.visible) { o.visible = false; hid.push(o); } });
  updateShadowCam();
  stage.world.overrideMaterial = depthMat;
  r.setRenderTarget(rtS); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(stage.world, shadowCam);
  stage.world.overrideMaterial = null; hid.forEach(o => (o.visible = true));
}

const quadGeo = new THREE.PlaneGeometry(2, 2);
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const QVS = `out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
function quad(frag, uniforms, extra = {}) {
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms, vertexShader: QVS, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra });
  const s = new THREE.Scene(); const mesh = new THREE.Mesh(quadGeo, m); mesh.frustumCulled = false; s.add(mesh);
  return { scene: s, mat: m };
}

export const inkU = {
  uInkDirs: { value: parseInt(qv('inkd', 12)) }, uInkRings: { value: parseInt(qv('inkr', 2)) },
  tCol: { value: rtA.textures[0] }, tNrm: { value: rtA.textures[1] }, tDepth: { value: rtA.depthTexture },
  uRes: { value: new THREE.Vector2(W, H) }, uNear: { value: 0.1 }, uFar: { value: 2000 }, uPx: { value: PX },
  uInk: { value: new THREE.Color(0.06, 0.04, 0.08) }, uWidth: { value: 1.0 }, uBlueFar: { value: new THREE.Color(0.7, 0.8, 0.95) },
};
const inkQ = quad(`precision highp float; layout(location=0) out vec4 outC; in vec2 vUv;
uniform sampler2D tCol; uniform sampler2D tNrm; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uPx; uniform vec3 uInk; uniform float uWidth; uniform vec3 uBlueFar; uniform float uInkDirs; uniform int uInkRings;
float lin(float z){ float zn = z * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - zn * (uFar - uNear)); }
void main(){
  vec4 c = texture(tCol, vUv);
  float z0 = texture(tDepth, vUv).r;
  vec4 n0 = texture(tNrm, vUv);
  float d0 = lin(z0);
  float far0 = z0 > 0.99999 ? 1.0 : 0.0;
  float rad = mix(2.6, 1.5, smoothstep(5.0, 120.0, d0)) * uPx * uWidth;
  if (far0 > 0.5) rad = 2.6 * uPx * uWidth;
  float edge = 0.0, crease = 0.0;
  vec2 px = 1.0 / uRes;
  for (int i = 0; i < 12; i++){
    if (float(i) >= uInkDirs) break;
    float a = float(i) * (6.2831853 / uInkDirs);
    for (int k = 1; k <= 2; k++){
      if (k > uInkRings) break;
      vec2 o = vec2(cos(a), sin(a)) * rad * (uInkRings > 1 ? float(k) * 0.5 : 0.75) * px;
      float z1 = texture(tDepth, vUv + o).r;
      float d1 = lin(z1);
      // nearer pixel owns the line: neighbour is meaningfully farther
      float jump = (d1 - d0) / max(d0, 0.5);
      float thr = 0.035 + 0.0006 * d0;
      if (z1 > 0.99999 && far0 < 0.5) jump = 1.0;
      if (jump > thr) edge = max(edge, smoothstep(thr, thr * 2.5, jump));
      vec4 n1 = texture(tNrm, vUv + o);
      float cr = 1.0 - dot(n0.xyz * 2.0 - 1.0, n1.xyz * 2.0 - 1.0);
      float contig = 1.0 - smoothstep(0.02, 0.06, abs(d1 - d0) / max(d0, 0.5));
      crease = max(crease, smoothstep(0.38, 0.62, cr) * contig * 0.85);
    }
  }
  float k = max(edge, crease);
  k *= 1.0 - 0.75 * smoothstep(0.35, 0.95, n0.a);  // fogged things get thin, faded lines
  vec3 ink = mix(uInk, uBlueFar, 0.0);
  outC = vec4(mix(c.rgb, ink, clamp(k, 0.0, 1.0)), 1.0);
}`, inkU);

export const compU = { tCol: { value: rtB.texture }, tDepth: { value: rtA.depthTexture } };
const compQ = quad(`precision highp float; layout(location=0) out vec4 outC; in vec2 vUv; uniform sampler2D tCol; uniform sampler2D tDepth;
void main(){ outC = vec4(texture(tCol, vUv).rgb, 1.0); gl_FragDepth = texture(tDepth, vUv).r; }`, compU, { depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth });

export const dofU = {
  tCol: { value: rtC.texture }, tDepth: { value: rtC.depthTexture }, uRes: { value: new THREE.Vector2(W, H) },
  uNear: { value: 0.1 }, uFar: { value: 2000 }, uFocus: { value: 10 }, uAper: { value: 0 }, uMaxC: { value: 14 * PX },
  uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uVig: { value: 0.22 }, uTintLo: { value: new THREE.Color(0.97, 0.98, 1.04) }, uTintHi: { value: new THREE.Color(1.03, 1.0, 0.95) },
  uFade: { value: 0 }, uFadeCol: { value: new THREE.Color(0, 0, 0) }, uFlash: { value: 0 }, uExposure: { value: 1.0 }, uGlow: { value: 0.0 }, uTime: { value: 0 },
  uVigCol: { value: new THREE.Color(0.1, 0.07, 0.16) }, uDesat: { value: 0 }, uGrain: { value: 0 }, uGlowTaps: { value: parseInt(qv('glowt', 16)) },
};
const dofQ = quad(`precision highp float; layout(location=0) out vec4 outC; in vec2 vUv;
uniform sampler2D tCol; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uAper; uniform float uMaxC;
uniform float uSat; uniform float uContrast; uniform float uVig; uniform vec3 uTintLo; uniform vec3 uTintHi; uniform float uFade; uniform vec3 uFadeCol; uniform float uFlash; uniform float uExposure; uniform float uGlow; uniform float uTime; uniform vec3 uVigCol; uniform float uDesat; uniform float uGrain; uniform float uGlowTaps;
float lin(float z){ float zn = z * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - zn * (uFar - uNear)); }
float coc(vec2 uv){ float z = texture(tDepth, uv).r; float d = z > 0.99999 ? uFar : lin(z); return clamp(abs(1.0/uFocus - 1.0/d) * uAper, 0.0, uMaxC); }
void main(){
  vec2 px = 1.0 / uRes;
  float c0 = coc(vUv);
  vec3 acc = texture(tCol, vUv).rgb; float wsum = 1.0;
  if (uAper > 0.0 && c0 > 0.6) {
    acc = vec3(0.0); wsum = 0.0;
    for (int i = 0; i < 40; i++){
      float fi = float(i) + 0.5;
      float r = sqrt(fi / 40.0);
      float a = fi * 2.399963;
      vec2 o = vec2(cos(a), sin(a)) * r * c0;
      vec2 uv = vUv + o * px;
      float cs = coc(uv);
      float w = smoothstep(r * c0 - 1.0, r * c0 + 1.0, cs + 0.7);
      vec3 s = texture(tCol, uv).rgb;
      acc += s * w; wsum += w;
    }
    acc /= max(wsum, 1e-3);
  } else if (uAper > 0.0) {
    // sharp pixel: still gets bled over by near blurry foreground
    acc = texture(tCol, vUv).rgb;
  }
  vec3 col = acc * uExposure;
  // glow from HDR
  if (uGlow > 0.0) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 16; i++){ if (float(i) >= uGlowTaps) break; float a = float(i) * (6.2831853 / uGlowTaps); float r = 6.0 + float(i % 4) * 9.0; vec3 s = texture(tCol, vUv + vec2(cos(a), sin(a)) * r * px * 2.0).rgb; g += max(s - 1.0, 0.0); }
    col += g / uGlowTaps * uGlow;
  }
  col = col / (1.0 + max(col - 1.0, 0.0) * 0.55);  // soft shoulder, neutral tone map
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat * (1.0 - uDesat));
  col = mix(col * uTintLo, col * uTintHi, smoothstep(0.2, 0.8, l));
  col = (col - 0.5) * uContrast + 0.5;
  vec2 q = vUv - 0.5; float v = dot(q, q * vec2(1.0, 0.8));
  col = mix(col, col * uVigCol * 3.0 + col * 0.0, smoothstep(0.10, 0.34, v) * uVig);
  col += uFlash;
  col = mix(col, uFadeCol, uFade);
  { float g = fract(sin(dot(gl_FragCoord.xy + uTime * 1.7, vec2(91.7, 37.3))) * 24634.6345); col += (g - 0.5) * uGrain; }
  // 1/255 dither
  float n = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) / 255.0;
  outC = vec4(clamp(col, 0.0, 1.0), 1.0);
}`, dofU);

// ---------- cards (character billboards) ----------
export const cardU = { uTint: { value: new THREE.Color(1, 1, 1) }, uFogC: shared.uFogC, uFog: shared.uFog, uFogAmt: shared.uFogAmt };
export function cardMat(tex, o = {}) {
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: false, alphaToCoverage: true, depthWrite: true,
    uniforms: { ...cardU, tMap: { value: tex }, uShadeAmt: { value: o.shade ?? 0.0 }, uBright: { value: o.bright ?? 1.0 } },
    vertexShader: `out vec2 vUv; out vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; layout(location=0) out vec4 outC; in vec2 vUv; in vec3 vW;
      uniform sampler2D tMap; uniform vec3 uTint; uniform vec3 uFogC; uniform vec2 uFog; uniform float uFogAmt; uniform float uBright;
      void main(){ vec4 c = texture(tMap, vUv); if (c.a < 0.02) discard;
        vec3 col = c.rgb / max(c.a, 0.001) * uTint * uBright;
        float d = length(vW - cameraPosition); float f = smoothstep(uFog.x, uFog.y, d) * uFogAmt * 0.7;
        col = mix(col, uFogC, f);
        outC = vec4(col, c.a); }`,
  });
  return m;
}

// FX billboards: soft, blended
export function fxMat(tex, o = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    uniforms: { tMap: { value: tex }, uOpacity: { value: o.opacity ?? 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uAdd: { value: o.add ?? 0 } },
    vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }`,
    fragmentShader: `precision highp float; layout(location=0) out vec4 outC; in vec2 vUv; uniform sampler2D tMap; uniform float uOpacity; uniform vec3 uTint; uniform float uAdd;
      void main(){ vec4 c = texture(tMap, vUv); outC = vec4(c.rgb / max(c.a, 0.001) * uTint * (1.0 + uAdd), c.a * uOpacity); }`,
    blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// ---------- frame pipeline ----------
export const stage = { world: new THREE.Scene(), cards: new THREE.Scene(), cam: new THREE.PerspectiveCamera(50, W / H, 0.1, 2000) };
export function setCam({ pos, look, fov = 50, roll = 0, near = 0.1, far = 2000 }) {
  const c = stage.cam;
  c.position.set(pos[0], pos[1], pos[2]);
  c.up.set(0, 1, 0);
  c.lookAt(look[0], look[1], look[2]);
  if (roll) c.rotateZ(roll);
  c.fov = fov; c.near = near; c.far = far; c.aspect = W / H; c.updateProjectionMatrix(); c.updateMatrixWorld(true);
  inkU.uNear.value = near; inkU.uFar.value = far; dofU.uNear.value = near; dofU.uFar.value = far;
}

export function drawFrame() {
  const r = renderer, c = stage.cam;
  if (shared.uShadowOn.value > 0.5) shadowPass();
  r.setRenderTarget(rtA); r.setClearColor(0x000000, 1); r.clear(true, true, true);
  r.render(stage.world, c);
  r.setRenderTarget(rtB); r.clear(true, true, true); r.render(inkQ.scene, orthoCam);
  r.setRenderTarget(rtC); r.setClearColor(0x000000, 1); r.clear(true, true, true);
  r.render(compQ.scene, orthoCam);
  r.render(stage.cards, c);
  r.setRenderTarget(null); r.clear(true, true, true); r.render(dofQ.scene, orthoCam);
  r.getContext().finish();
}

export function grabJpeg(q = 0.93) {
  return new Promise((res) => renderer.domElement.toBlob(async (b) => {
    const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; const CH = 0x8000;
    for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
    res(btoa(s));
  }, 'image/jpeg', q));
}
