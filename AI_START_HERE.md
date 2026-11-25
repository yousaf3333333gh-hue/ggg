# AI: START HERE — Stick-Toon Shorts Studio v7

You are making a **vertical 9:16, 30 fps, ~45–65 s cartoon short** entirely from code (three.js in headless Chromium → ffmpeg). No AI image/video model is used. The user is Urdu/English speaking: **reply briefly in Roman Urdu**.

The user will give you some or all of: **topic idea, script, voice MP3 (made by the user), SFX/music zip or list of SFX names**.
**PHASE 1 — STORY (if the user did not give a script):** follow `STORY_WRITER.md`: pick a new topic (use `TOPIC_BANK.md` — 20 ready scripts — or invent one with the formula), send the user the script in a code block + the numbered SFX/music search list. Then wait ONLY for the user's voice MP3 and SFX zip.
**PHASE 2 — VIDEO:** when you have the voice MP3 + script, **start and do not stop until the finished MP4 is delivered.** Do not end a turn asking "should I continue?". Fix every error you can reproduce yourself.

---

## 0. Golden rules (the user rejected videos for breaking these — never break them)

1. **A NEW SHOT ABOUT EVERY 1 SECOND.** 45 s video ≈ 40–50 shots. Every shot MOVES (orbit 40–120°, push-in, crane up/down, track). No still tripod shots, no shot longer than ~2 s.
2. **Cuts only when the PLACE changes** (inside → outside, scene A → scene B). Inside one place, shots blend with the fast swoosh (`Cine({blend:0.32})`).
3. **Fast, exaggerated acting.** Face changes every 0.5–1 s on the words (`Performer.beats`, trans 0.06–0.14). Every important word gets a body reaction: `take` (shock), `jolt` (impact), `double` (double-take), `shake` (head shake), loops `laugh / rage / bob / sob / dizzy / nod`, marks `!` and `x` over heads.
4. **Nothing ever mixes into anything.** Hands never inside faces (celebration arms go OUT: `o: -70`), people never inside walls/carts/seats/each other, camera never inside heads/walls/water. Register every solid with `addSolidCentered()`, call `guardCam()` every frame, run QA (step 6).
5. **Lots of visuals.** Each scene needs 2–4 "life" elements (flags, birds, splashes, dust, signs that pop, counters, confetti, falling leaves, cash…). Never an empty frame.
6. **Never reuse the same main cast in two videos in a row.** Use `web/cast.js` (56 characters) + `casting_log.json`.
7. **Fiction only.** No real people, brands, places, or copied characters from other creators. Fictional names (e.g. *Grumbleton, Mr. Bumbleworth*). The science/history fact at the end may be real.
8. **SFX quieter than the voice** (automatic ducking in `tools/mix_audio.py`). Use ONLY the user's SFX files when given.
9. **Check pictures before rendering.** Render one still per shot (`stills.cjs`) and LOOK at them. Fix, re-check, then render.

---

## 1. Folder map

```
web/            engine (shared by every story)
  core.js         renderer, toon shader, shadows, quality tiers ?q=draft|fast|good|final
  person.js       base skeleton (IK arms/legs, sitting, walking)
  toonkit.js      STICK CHARACTER: big round head, flat cartoon eyes, thick brows, 10 mouth shapes,
                  tears/sweat/blush, thin black limbs, toonify() acting layer, ! / x marks,
                  HAND-IN-FACE GUARD (palms are pushed out of the head automatically)
  cast.js         56 ready characters: makeCast(W, 'pirate', act)  — see catalogue/CAST.md
  safety.js       addSolid / addSolidCentered, guardCam(cam), setGround(fn), window.__qa()
  perform.js      emotions → face/posture (31 emotions)          cine.js  shot rigs (fly/orbit/push/crane/track/low/high/pov)
  motion.js       Path, Terrain, EASE, sstep                       looks.js mkLook / mixLook / applyLook
  models.js tex.js props.js furniture.js vendor/three
template/       copy this for every new story (cp -r template <name>)
tree/ button/ bridge/ night/   finished example stories (read bridge/web/main.js: best reference for fast camera)
tools/          qa_scene.cjs · captions.py · mix_audio.py · clean_voice.sh · render_local.sh · stills.cjs · sheet.py
.github/workflows/  render.yml (8 machines × 4 CPUs) · transcribe.yml (word timestamps with Whisper)
catalogue/      CAST.md (all 56 people) · cast_sheet.jpg · CAMERA.md · ACTING.md
casting_log.json  which cast ids each finished video used
```

## 2. One-pass workflow (do ALL steps without stopping)

| # | Step | Command / action |
|---|---|---|
| 1 | New story folder | `cp -r template <app>; echo <app> > app.txt` |
| 2 | Voice | `bash tools/clean_voice.sh voice.mp3 <app>` (cuts a trailing TTS watermark only if it is the user's own voice/plan) |
| 3 | Script | save the exact script to `<app>/script.txt` |
| 4 | Word times | push `<app>/audio/voice_clean.mp3` → GitHub **transcribe** workflow writes `<app>_words.json` on branch `transcripts`; copy it to `<app>/words.json`. (Local alternative: `pip install faster-whisper` and run the same python as in transcribe.yml.) |
| 5 | Captions | `python3 tools/captions.py <app>` |
| 6 | Shot plan | write a table: for every line of the script → place, characters, action, visual life, camera move, SFX. ~1 shot per second. |
| 7 | Build the scene | edit `<app>/web/main.js`: set, `addSolidCentered` for every solid, cast (new ids!), `Performer` beats on the words, `hits/loops/marks`, shots (`CINE.shot`), `DURATION`; write `<app>/frames.txt` = round(DURATION×30) |
| 8 | Stills check | `APP=<app> node tools/stills.cjs 0.3 out/check <one frame per shot>` → `python3 tools/sheet.py out/check out/check.jpg 12 130` → LOOK. Fix anything: camera in a wall/head, dark/empty frame, hand in face, person in object, tiny unreadable subject. Repeat. |
| 9 | QA | `node tools/qa_scene.cjs <app> 3` must print **QA: clean** |
| 10 | Audio | unzip user SFX into `<app>/sfx/` and `<app>/music/`; write `<app>/cues.json` (every SFX on its word time); `python3 tools/mix_audio.py <app>` |
| 11 | Render | GitHub: commit + push `main` (renders `app.txt`) → video lands on branch `renders` in `videos/<app>_<time>.mp4` (~15–20 min). Local: `bash tools/render_local.sh <app> good` |
| 12 | Deliver | download the MP4, look at a contact sheet of it (1 frame/sec), send it, add the cast ids to `casting_log.json` |

When the user later complains about a part, change only that part and re-render (the whole render is cheap on GitHub).

## 3. Writing the scene (patterns that work)

```js
import { makeCast } from '../../web/cast.js';
import { addSolidCentered, guardCam, setGround } from '../../web/safety.js';
const HERO = makeCast(W, 'inventor', { hits: [[w('boom'), 'take', 1.2]], loops: [[w('laugh'), w('laugh') + 1.5, 'laugh']], marks: [['!', w('boom'), w('boom') + 0.8]] });
W.add(box(1.6, .75, .9, mat, 0, .375, -1.2)); addSolidCentered('table', 0, .375, -1.2, 1.6, .75, .9);   // every solid twice: mesh + solid
// per frame:
HERO.update(toonify({ ...perf.at(t, { handsFree: true }), t }, HERO, t));
const cam = guardCam(CINE.at(t));      // ALWAYS through guardCam
```
* Celebration: `p.armL = {f:120, o:-70, b:10}` (negative `o` = outward for these characters). Never `o:+70` (goes across the face).
* Hand to an object: `p.handR = { w: worldVector3, k: 1 }; p.reachAssist = false;`
* Sitting in a vehicle: build the cabin hollow (hood, trunk, side walls, floor) and use `p.sit = {h, k:1, footZ, front}`; check the knees are in front of the seat and feet on the floor.
* Many people (army, crowd): 8–12 bodies + camera low and close makes it look like hundreds.
* Explanations (science part): show it with a simple, funny visual metaphor (swing, playground, kitchen) + a big pop-up sign of the key word.

## 4. Camera recipes (see catalogue/CAMERA.md)
`fly` opening over the location · `crane` from high to face for a reveal · `push` + `ease:'snap'` + `fovKick` on shock words · `orbit` 60–120° around two characters during dialogue · `low` near feet for marching/stomps · close-ups of the object of the story (button, drum, bulb) · end shot: crane up and away.

## 5. Rendering

* **GitHub (free, fastest)**: repo needs `.github/workflows/render.yml`. It reads `app.txt`, splits `frames.txt` into 8×4 parts with motion blur, joins, adds `<app>/audio/mix.mp3` + `<app>/captions.ass`, saves to branch `renders`. Trigger: push to main, or `workflow_dispatch`. Add `[skip ci]` to commits that should NOT render.
* **Local**: `bash tools/render_local.sh <app> good` (uses all CPUs; uses the GPU automatically if the browser has one: 8 GB GPU ≈ 10 min for a 60 s video, 2-core laptop CPU ≈ 2 h).
* Tiers: `draft` for checks, `good` for delivery, `final` only if asked.

## 6. Honest limits (tell the user, never pretend)
This engine is code-built stick toons on CPU/WebGL: good timing, clean shapes, fast camera and acting. It is NOT a hand-animated Unreal/Blender production; extreme fluid motion, cloth, fluids and big crowds are approximations.
