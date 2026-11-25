// perform.js v6.1 : the ACTING layer. Turns "what the character feels" into face + whole-body performance with follow-through (no puppet stiffness).
//   const perf = new Performer(seed, {mood:'tense'});
//   perf.beats([{t:0, emo:'worried'}, {t:4.2, emo:'afraid', gaze:[-0.6,0.1]}, {t:9, emo:'relief', g:[['chin','R',0.4,1.2,0.5]]}]);
//   per frame:  P.update({ ...place.pose, ...perf.at(t, {walking:true}), t })           (walking:true keeps arms free for the walk swing)
// An emotion = expression + posture (lean, shoulders, head pose, arm rest, breathing) + mood (blink/gaze/tremble). Transitions take 0.3-0.4 s with spring overshoot.
import { clamp, lerp, sstep, EASE, hash, noise1 } from './motion.js';
import { Actor, MOODS, applyGest, applyTimeline } from './acting.js';

// ---- posture = whole-body attitude. lean(deg,+fwd) shrug(0..1) hp(head pitch,+down) hr(head roll) hy(head yaw bias) twist sway chest(0..1 puff) arms rest {f,o,b} per side ----
const AR = (f, o, b) => ({ f, o, b });
export const POSTURES = {
  relaxed:  { lean: 0,  shrug: 0,    hp: 0,   hr: 0,  hy: 0, twist: 0, sway: 0, breath: 1.0, rate: 1.4, arms: [AR(3, 9, 10), AR(3, 9, 10)] },
  proud:    { lean: -4, shrug: -0.3, hp: -5,  hr: 0,  hy: 0, twist: 0, sway: 0, breath: 1.3, rate: 1.3, arms: [AR(2, 14, 12), AR(2, 14, 12)] },
  tense:    { lean: 2,  shrug: 0.6,  hp: -2,  hr: 0,  hy: 0, twist: 0, sway: 0, breath: 1.2, rate: 2.2, arms: [AR(10, 5, 28), AR(10, 5, 28)] },
  cower:    { lean: 9,  shrug: 1.0,  hp: 8,   hr: 4,  hy: 0, twist: 4, sway: 0, breath: 2.0, rate: 3.6, arms: [AR(38, 12, 78), AR(34, 10, 82)] },
  sad:      { lean: 8,  shrug: -0.3, hp: 14,  hr: 5,  hy: 0, twist: 0, sway: 2, breath: 0.9, rate: 1.0, arms: [AR(-2, 4, 4), AR(-2, 4, 4)] },
  tired:    { lean: 7,  shrug: -0.4, hp: 10,  hr: 3,  hy: 0, twist: 0, sway: 3, breath: 1.1, rate: 1.0, arms: [AR(-3, 3, 5), AR(-3, 3, 5)] },
  angry:    { lean: 5,  shrug: 0.8,  hp: -6,  hr: 0,  hy: 0, twist: 0, sway: 0, breath: 1.6, rate: 2.6, arms: [AR(12, 6, 58), AR(12, 6, 58)] },
  shy:      { lean: 4,  shrug: 0.5,  hp: 8,   hr: 7,  hy: 0, twist: 6, sway: 0, breath: 1.0, rate: 1.6, arms: [AR(24, 8, 50), AR(24, 8, 50)] },
  curious:  { lean: 6,  shrug: 0.1,  hp: 2,   hr: 8,  hy: 0, twist: 3, sway: 0, breath: 1.1, rate: 1.7, arms: [AR(6, 8, 16), AR(6, 8, 16)] },
  disgust:  { lean: -7, shrug: 0.4,  hp: -4,  hr: -3, hy: 0, twist: -5, sway: 0, breath: 1.0, rate: 1.6, arms: [AR(14, 14, 30), AR(8, 8, 20)] },
  joy:      { lean: -2, shrug: -0.2, hp: -4,  hr: 3,  hy: 0, twist: 0, sway: 0, breath: 1.5, rate: 2.0, arms: [AR(8, 22, 24), AR(8, 22, 24)] },
  shock:    { lean: -9, shrug: 0.9,  hp: -3,  hr: 0,  hy: 0, twist: 0, sway: 0, breath: 2.2, rate: 3.0, arms: [AR(20, 18, 38), AR(20, 18, 38)] },
  defeated: { lean: 12, shrug: -0.6, hp: 18,  hr: 4,  hy: 0, twist: 0, sway: 3, breath: 0.8, rate: 0.9, arms: [AR(-4, 2, 2), AR(-4, 2, 2)] },
  sneaky:   { lean: 8,  shrug: 0.4,  hp: 4,   hr: 2,  hy: 0, twist: 6, sway: 0, breath: 0.8, rate: 1.2, arms: [AR(8, 5, 22), AR(8, 5, 22)] },
  alert:    { lean: 1,  shrug: 0.4,  hp: -1,  hr: 0,  hy: 0, twist: 0, sway: 0, breath: 1.3, rate: 2.0, arms: [AR(6, 6, 18), AR(6, 6, 18)] },
};
// ---- emotion -> expression + posture + mood + typical gestures (auto-gestures pick from these) ----
export const EMOTIONS = {
  neutral:   { expr: 'neutral',   post: 'relaxed',  mood: 'calm',  g: ['hips', 'open', 'cross'] },
  calm:      { expr: 'calm',      post: 'relaxed',  mood: 'calm',  g: ['hips', 'open', 'chin'] },
  happy:     { expr: 'smile',     post: 'joy',      mood: 'calm',  g: ['open', 'chest', 'hips'] },
  joy:       { expr: 'joy',       post: 'joy',      mood: 'calm',  g: ['open', 'chest', 'fist'] },
  laugh:     { expr: 'laugh',     post: 'joy',      mood: 'calm',  g: ['chest', 'open'] },
  love:      { expr: 'love',      post: 'shy',      mood: 'calm',  g: ['heart', 'clasp'] },
  worried:   { expr: 'worried',   post: 'tense',    mood: 'tense', g: ['chin', 'neckBack', 'clasp', 'mouth'] },
  nervous:   { expr: 'nervous',   post: 'tense',    mood: 'tense', g: ['neckBack', 'clasp', 'mouth', 'chin'] },
  afraid:    { expr: 'scared',    post: 'cower',    mood: 'afraid', g: ['chest', 'mouth', 'shield'] },
  terrified: { expr: 'terrified', post: 'cower',    mood: 'afraid', g: ['shield', 'mouth', 'chest'] },
  panic:     { expr: 'panic',     post: 'cower',    mood: 'afraid', g: ['shield', 'fist', 'mouth'] },
  shock:     { expr: 'shock',     post: 'shock',    mood: 'alert', g: ['mouth', 'chest', 'shield'] },
  sad:       { expr: 'sad',       post: 'sad',      mood: 'sad',   g: ['eyes', 'chest', 'brow'] },
  cry:       { expr: 'cry',       post: 'sad',      mood: 'sad',   g: ['eyes', 'mouth', 'chest'] },
  grief:     { expr: 'grief',     post: 'defeated', mood: 'sad',   g: ['eyes', 'heart', 'mouth'] },
  tired:     { expr: 'tired',     post: 'tired',    mood: 'tired', g: ['brow', 'eyes', 'neckBack'] },
  angry:     { expr: 'angry',     post: 'angry',    mood: 'angry', g: ['fist', 'point', 'hips'] },
  stern:     { expr: 'stern',     post: 'proud',    mood: 'alert', g: ['cross', 'hips', 'point'] },
  suspicious:{ expr: 'suspicious',post: 'alert',    mood: 'alert', g: ['chin', 'cross', 'mouth'] },
  curious:   { expr: 'curious',   post: 'curious',  mood: 'alert', g: ['chin', 'reach', 'point'] },
  pensive:   { expr: 'pensive',   post: 'curious',  mood: 'calm',  g: ['chin', 'mouth', 'brow'] },
  relief:    { expr: 'relief',    post: 'relaxed',  mood: 'calm',  g: ['brow', 'chest', 'open'] },
  hopeful:   { expr: 'hopeful',   post: 'curious',  mood: 'calm',  g: ['heart', 'clasp', 'open'] },
  proud:     { expr: 'proud',     post: 'proud',    mood: 'calm',  g: ['hips', 'chest', 'cross'] },
  shy:       { expr: 'embarrassed', post: 'shy',    mood: 'tense', g: ['neckBack', 'clasp', 'mouth'] },
  disgust:   { expr: 'disgust',   post: 'disgust',  mood: 'alert', g: ['mouth', 'shield'] },
  evil:      { expr: 'evil',      post: 'proud',    mood: 'sneaky', g: ['cross', 'chin', 'open'] },
  sneaky:    { expr: 'creep',     post: 'sneaky',   mood: 'sneaky', g: ['chin', 'mouth'] },
  defeated:  { expr: 'sad',       post: 'defeated', mood: 'sad',   g: ['brow', 'eyes'] },
  sleepy:    { expr: 'sleepy',    post: 'tired',    mood: 'tired', g: ['eyes', 'brow'] },
  determined:{ expr: 'determined',post: 'proud',    mood: 'alert', g: ['fist', 'hips'] },
};
// ---- spring dynamics: deterministic (simulated from t=0 and cached) so random-access stills match the video ----
class Dyn {
  constructor(n, freq = 4.5, zeta = 0.55) { this.n = n; this.w = 2 * Math.PI * freq; this.z = zeta; this.t = 0; this.x = new Array(n).fill(0); this.v = new Array(n).fill(0); this.cache = []; this.init = false; }
  get(t, target) {
    const dt = 1 / 60, N = Math.max(0, Math.round(t * 60));
    if (!this.init) { this.x = target(0).slice(); this.v = this.x.map(() => 0); this.cache = [this.x.slice()]; this.init = true; }
    while (this.cache.length - 1 < N) { const k = (this.cache.length) * dt, tg = target(k); for (let i = 0; i < this.n; i++) { const a = this.w * this.w * (tg[i] - this.x[i]) - 2 * this.z * this.w * this.v[i]; this.v[i] += a * dt; this.x[i] += this.v[i] * dt; } this.cache.push(this.x.slice()); }
    return this.cache[N];
  }
}
const PK = ['lean', 'shrug', 'hp', 'hr', 'hy', 'twist', 'sway', 'breath', 'rate'];
export class Performer {
  constructor(seed = 1, o = {}) { this.seed = seed; this.actor = new Actor(seed, { mood: o.mood || 'calm' }); this.list = [{ t: 0, emo: o.emo || 'neutral' }]; this.dyn = new Dyn(6, o.freq ?? 4.2, o.zeta ?? 0.5); this.trans = o.trans ?? 0.35; this.auto = o.auto ?? true; this.intensity = o.intensity ?? 1; this.gaze = null; this._moodName = null; }
  beats(list) { this.list = list.slice().sort((a, b) => a.t - b.t); this.dyn = new Dyn(6, this.dyn.w / (2 * Math.PI), this.dyn.z); return this; }
  _state(t) {                                              // current + previous emotion and blend 0..1
    const L = this.list; let i = 0; while (i < L.length - 1 && t >= L[i + 1].t) i++; const cur = L[i], nxt = L[i + 1]; let a = cur, b = cur, k = 0;
    if (nxt) { const tr = nxt.trans ?? this.trans, u = clamp((t - (nxt.t - tr)) / tr, 0, 1); if (u > 0) { a = cur; b = nxt; k = EASE.inOut(u); } }
    return { a, b, k, cur, i };
  }
  _post(name) { return POSTURES[(EMOTIONS[name] || EMOTIONS.neutral).post] || POSTURES.relaxed; }
  _targets(t) {                                            // pure function of t: values the springs chase
    const { a, b, k } = this._state(t), pa = this._post(a.emo), pb = this._post(b.emo), I = this.intensity * ((a.int ?? 1) * (1 - k) + (b.int ?? 1) * k);
    const g = (key) => lerp(pa[key], pb[key], k) * (key === 'breath' || key === 'rate' ? 1 : I);
    return [g('lean'), g('shrug'), g('hp'), g('hr'), g('hy'), g('twist')];
  }
  at(t, o = {}) {
    const { a, b, k, cur } = this._state(t), ea = EMOTIONS[a.emo] || EMOTIONS.neutral, eb = EMOTIONS[b.emo] || EMOTIONS.neutral, pa = this._post(a.emo), pb = this._post(b.emo);
    const mood = (k > 0.5 ? eb : ea).mood; if (mood !== this._moodName) { this.actor.setMood(mood); this._moodName = mood; }
    const sp = this.dyn.get(t, (tt) => this._targets(tt)); const life = this.actor.life(t, cur.gaze || (k > 0.5 ? b.gaze : a.gaze) || this.gaze);
    const pose = { expr: ea.expr, expr2: eb.expr, mix: k, t, look: life.look, blink: life.blink, fx: life.fx };
    pose.lean = sp[0] + life.lean; pose.shrug = sp[1] + life.shrug; pose.head = { pitch: sp[2] + life.head.pitch, roll: sp[3] + life.head.roll, yaw: sp[4] + life.head.yaw };
    pose.twist = sp[5] + life.twist; pose.sway = lerp(pa.sway, pb.sway, k) + life.sway; pose.breath = lerp(pa.breath, pb.breath, k); pose.breathRate = lerp(pa.rate, pb.rate, k) + (life.breathRate - 1.4);
    if (!o.walking) { pose.armL = lerpArm(pa.arms[0], pb.arms[0], k); pose.armR = lerpArm(pa.arms[1], pb.arms[1], k); }
    if (o.walking) { pose.lean = (pose.lean || 0) * 0.6; }
    // hands: manual gestures (beat.g = [[dt,name,hand,in,hold,out],...]) else automatic mood-driven ones. Skipped when handsFree === false (holding props, hands on table...)
    if (o.handsFree !== false && !o.walking) {
      const trem = (this.actor.mood.tremble || 0);
      if (cur.g) applyTimeline(pose, cur.g.map(([dt, n, h, di, ho, dout]) => [cur.t + dt, n, h, di, ho, dout]), t, trem);
      else if (this.auto) this._auto(pose, t, ea, trem);
      pose.gripL = pose.gripL || { curl: 0.3 + 0.1 * trem, thumb: 0.35, wiggle: trem * 0.8 }; pose.gripR = pose.gripR || { curl: 0.3 + 0.1 * trem, thumb: 0.35, wiggle: trem * 0.8 };
    }
    return pose;
  }
  // automatic gesture rhythm: every 2.4-5 s one hand does a mood-appropriate gesture (deterministic)
  _auto(pose, t, emo, trem) {
    const cyc = 3.4, n = Math.floor(t / cyc + this.seed * 0.37), t0 = (n - this.seed * 0.37) * cyc + hash(n * 1.7 + this.seed) * 0.8;
    const q = hash(n * 3.1 + this.seed); if (q < 0.18) return;                              // some beats: no gesture (stillness reads as thought)
    const list = emo.g || ['hips'], name = list[Math.floor(hash(n * 5.3 + this.seed) * list.length) % list.length], hand = hash(n * 2.9 + this.seed) < 0.5 ? 'L' : 'R';
    const din = 0.35, hold = 0.9 + hash(n * 9.1) * 1.2, dout = 0.5;
    applyTimeline(pose, [[t0, name, hand, din, hold, dout]], t, trem);
  }
}
const lerpArm = (a, b, k) => ({ f: lerp(a.f, b.f, k), o: lerp(a.o, b.o, k), b: lerp(a.b, b.b, k) });
