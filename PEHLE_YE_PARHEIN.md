# Stick Toon Studio v7 — Urdu guide (aap ke liye)

## Ye kya hai?
Code se 3D stick-cartoon shorts (9:16, 30 fps, motion blur, captions, voice + SFX) banane ka poora system.
Koi AI video model nahi — har frame code se banta hai.

## Andar kya hai
- `web/` — engine: characters, chehre, acting, camera, safety (koi cheez kisi mein ghus nahi sakti)
- `web/cast.js` — **56 alag characters** (badshah, sipahi, pirate, doctor, chef, astronaut, viking …) — har video mein naye
- `template/` — nayi video yahin se copy hoti hai
- `tree/ button/ bridge/ night/` — mukammal misaalein
- `tools/` — QA checker, captions, audio mix, voice saafi, local render
- `.github/workflows/` — GitHub par **free** render (8 computer × 4 CPU, ~15–20 min) + voice se lafzon ka waqt
- `catalogue/` — characters ki list + tasveer, camera aur acting ki cheat-sheet
- `AI_START_HERE.md` — AI ke liye poora tareeqa (sab se zaroori file)

## Naye topic aur script
- `TOPIC_BANK.md` — **20 bilkul naye topics**: har ek ki poori script, SFX ke naam, music, characters, sets (sab fictional)
- `STORY_WRITER.md` — AI khud naye topic soche, script likhe, SFX list de: formula + checklist

## Kisi bhi AI (Claude Code) ko kaise dein
1. Zip ko apne GitHub repo mein daal dein (ya AI ke session mein upload karein).
2. `AI_KO_YE_BHEJEIN.txt` mein **Message 1** bhejein → AI topic + script + SFX list dega.
3. Script ElevenLabs mein record karein, SFX download karein → **Message 2** ke saath voice MP3 + SFX zip bhejein.
4. AI beech mein ruke baghair video bana kar dega.

## Speed
- GitHub par: ~15–20 min (free)
- 8 GB GPU wale computer par: ~10 min (`bash tools/render_local.sh <naam> good`)
- 2-core laptop par: ~2 ghante (sirf CPU)

## Imaandari se
Ye code-based stick toons hain: timing, camera aur acting tez aur saaf. Hollywood/Unreal jaisi hand-animation nahi.
