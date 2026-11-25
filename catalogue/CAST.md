# CAST CATALOGUE (56 characters) — `makeCast(W, '<id>', act)`

Pick NEW ids for every video (check `casting_log.json`). Picture: `catalogue/cast_sheet.jpg` (first 8 per row group).

| # | id | role | shirt | head / body accessories |
|---|---|---|---|---|
| 1 | `king` | king / ruler | #a8203a | crown, cape, sash |
| 2 | `prince` | young prince | #3a5ad8 | crown, cape |
| 3 | `knight` | knight | #8a8a92 | knightHelm, armor |
| 4 | `soldier` | soldier (use many) | #9a3030 |  |
| 5 | `captain` | army captain | #3a4a3a | helmet, medal, sash |
| 6 | `guard` | museum / palace guard | #2a3a6a | badge |
| 7 | `drummer` | drummer / band | #2a6ad8 | sash |
| 8 | `sheriff` | sheriff | #c8b07a | badge |
| 9 | `cowboy` | cowboy / rancher | #c86a3a | cowboy, vest |
| 10 | `farmer` | farmer | #5a8a3a | vest |
| 11 | `baker` | baker | #f0e0c8 | chef, apron |
| 12 | `chef` | chef / cook | #ffffff | chef, scarf |
| 13 | `fisherman` | fisherman | #e8b020 | beanie, vest |
| 14 | `sailor` | sailor | #f4f4f0 | sailor, stripes, scarf |
| 15 | `pirate` | pirate captain | #8a1a2a | pirate, beard, sash |
| 16 | `doctor` | doctor | #8ab8d8 | roundGlasses, labcoat |
| 17 | `scientist` | scientist | #5a5a6a | squareGlasses, labcoat, bowtie |
| 18 | `inventor` | inventor / tinkerer | #c87a2a | pilot, toolbelt |
| 19 | `teacher` | teacher | #6a3a8a | roundGlasses, bowtie |
| 20 | `student` | student | #3aa86a | backpack |
| 21 | `kid` | small kid | #f08a2a |  |
| 22 | `kid2` | small kid 2 | #2ab8c8 | backpack |
| 23 | `grandpa` | grandpa / elder | #8a7a6a | whiteBeard, vest |
| 24 | `mayor` | mayor / official | #2a2a3a | tophat, sash, tie |
| 25 | `curator` | museum curator | #6a3a8a | roundGlasses, bowtie |
| 26 | `shopkeeper` | shopkeeper | #3a8a8a | apron |
| 27 | `mechanic` | mechanic | #3a4a6a | toolbelt |
| 28 | `engineer` | engineer / builder | #f08a20 | hardhat, lifevest |
| 29 | `pilot` | pilot | #4a5a3a | pilot, scarf |
| 30 | `astronaut` | astronaut | #f0f0f4 | astronaut, badge |
| 31 | `firefighter` | firefighter | #2a2a2a | fireHelm, stripes |
| 32 | `police` | police officer | #1a2a5a | police, badge |
| 33 | `detective` | detective | #8a7a5a | scarf |
| 34 | `mailman` | mail carrier | #4a6aa8 | backpack |
| 35 | `courier` | delivery rider | #e8c020 | sunglasses, backpack |
| 36 | `gardener` | gardener | #6aa84a | apron |
| 37 | `painter` | painter / artist | #e85a8a | beanie, apron |
| 38 | `musician` | street musician | #8a5ad8 | headphones, scarf |
| 39 | `athlete` | athlete / runner | #d8402a | headband, stripes |
| 40 | `coach` | coach | #2a8a5a | medal |
| 41 | `referee` | referee | #f4f4f4 | stripes |
| 42 | `tourist` | tourist | #2ab8a0 | sunglasses, backpack |
| 43 | `reporter` | TV reporter | #2a3a8a | tie |
| 44 | `businessman` | businessman / boss | #2a2a32 | sunglasses, tie |
| 45 | `banker` | banker / rich man | #1a3a2a | tophat, vest, bowtie |
| 46 | `judge` | judge | #1a1a1e | squareGlasses, bowtie |
| 47 | `monk` | monk / sage | #d88a2a | whiteBeard, sash |
| 48 | `wizard` | wizard | #3a2a8a | wizard, cape |
| 49 | `viking` | viking | #8a5a2a | viking, armor |
| 50 | `miner` | miner | #5a4a3a | hardhat, toolbelt |
| 51 | `lifeguard` | lifeguard | #d82a2a | sunglasses, lifevest |
| 52 | `waiter` | waiter | #f4f4f0 | vest, bowtie |
| 53 | `janitor` | janitor | #6a7a8a | apron |
| 54 | `gamer` | nerd / gamer | #2a2a2a | squareGlasses |
| 55 | `student2` | graduate | #1a1a1e | graduation, sash |
| 56 | `traveler` | traveler / wanderer | #c8a06a | turban, backpack, scarf |

Override anything: `makeCast(W, 'soldier', act, { spec: { top: '#2a6ad8', height: 0.58 }, head: { hat: 'cap', hatCol: 0xffffff } })` — use this to make crowds of different soldiers/tourists.
Head accessories available: crown, helmet, knightHelm, tophat, chef, beanie, cowboy, wizard, viking, pirate, hardhat, fireHelm, police, sailor, pilot, astronaut, headband, graduation, turban, roundGlasses, squareGlasses, sunglasses, eyepatch, beard, whiteBeard, bowHair, headphones
Body accessories available: cape, bowtie, tie, badge, scarf, apron, backpack, sash, vest, labcoat, lifevest, armor, stripes, medal, toolbelt
