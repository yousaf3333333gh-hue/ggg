# CAMERA cheat-sheet (web/cine.js)  —  one shot ≈ 1 s, every shot moves

`CINE.shot(t0, t1, { rig, at, size, az:[a0,a1], el:[e0,e1], fov, shake, ease, fovKick, cut })`
* `at`: target (Vector3 function): `() => P.headWorld()`, `P(x,y,z)`, `() => obj.position.clone()`
* `size`: metres of frame height (or 'cu' .42, 'mcu' .7, 'ms' 1.05, 'fs' 2.1, 'ws' 3.6). Array = zoom during the shot.
* `az`: camera angle around the target in degrees (0 = front +z). Move 40–120° per shot. `el`: height angle.
* `ease:'snap'` + `fovKick: 6..10` + `shake 0.6..1.2` on shock words. `cut:true` ONLY when the place changes.

| Moment | Rig | Typical values |
|---|---|---|
| Opening over the location | fly | path from 25 m away to 10 m, fov 44→36 |
| Reveal a character | crane | size fs→ms, el 40→6 |
| Shock / punchline word | push | size 2.4→1.4, ease snap, fovKick 8, shake 0.9 |
| Two people talking/arguing | orbit | size 2.0, az sweep 60°, el 8 |
| Marching / stomping | orbit low on the feet | at feet + 0.25 m, size 1.4, el 4 |
| Crowd / army | crane high | el 30→75 |
| Object of the story (button, drum, bulb) | push | size 1.0→0.55, el 20 |
| Ending | crane up and away | size 3→12, el 10→45 |

Always: `const cam = guardCam(CINE.at(t));` and never put the camera target inside a solid.
