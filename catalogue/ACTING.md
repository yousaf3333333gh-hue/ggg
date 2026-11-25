# ACTING cheat-sheet (toonkit.js + perform.js)

Faces (Performer.beats): neutral calm happy joy laugh love worried nervous afraid terrified panic shock sad cry grief tired angry stern suspicious curious pensive relief hopeful proud shy disgust evil sneaky defeated sleepy determined (+ add smug grin gasp awe blank sob gentle as in the template).
Change the face every 0.5–1 s, ON the word that causes it (trans 0.06 for shocks, 0.12–0.18 otherwise).

Body hits `[time, kind, strength]`: `take` (head snaps back, shrug — surprise), `jolt` (impact forward — crash/stomp), `double` (look away, snap back — realisation), `shake` (head no-no).
Loops `[t0, t1, kind]`: `laugh`, `rage` (red face + tremble), `bob` (happy groove / bouncing), `sob`, `dizzy`, `nod`.
Marks `['!'|'x', t0, t1]`: red ! over the head (surprise), red X (anger).

Arms (local angles): celebrate `{f:120,o:-70,b:10}` · shrug `{f:40,o:-60,b:70}` · hands on hips `{f:-5,o:-55,b:115}` · point `{f:85,o:-20,b:5}` · panic both up `{f:140,o:-50,b:30}` · hold to chest `{f:55,o:5,b:105}`.
Never put a hand target closer than 1.3 × head radius to a head (the guard will move it, but plan it right).
