[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/rrmmllnn/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/rrmmllnn/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An entry for the [make.fun competition "Make the best card game"](https://make.fun/bounty/best-card-game-20261122-1826).

# Lantern Duel

A complete, original card duel for the make.fun **best-card-game-20261122-1826** bounty. Two lanterns, four factions, one table — played with mouse and keyboard in a desktop browser, fully offline.

## The game

You are the Lantern Keeper, duelling **Marina, Keeper of Tides**. Both lanterns start at **30 life**. Each turn you gain +1 mana crystal (up to 10), refill your mana, and draw a card from your 30-card deck. Play creatures onto your side of the table, cast spells, then attack: click a glowing creature, then an enemy creature or Marina's lantern. Creatures trade blows; a lantern takes damage straight. Reduce Marina's lantern to 0 to win. An empty deck burns you — fatigue 1, then 2, then 3…

Four factions, told apart by colour **and** glyph:

- 🔥 **Ember** (red) — hits hard, dies fast
- 🌊 **Tide** (blue) — steady and even-tempered
- 🌿 **Grove** (green) — tough, and it mends
- ✨ **Star** (gold) — draws cards, strikes from afar

Spells include Ember Burst (3 damage), Star Bolt (4 damage), Tide Surge (draw 2), Grove Mend (heal 6) and Lantern Flare (2 damage to every enemy creature). Marina is a readable opponent: she takes lethal when she sees it, trades up when a creature dies for free, mends when low, and draws when her hand runs dry.

## Controls

- **Click** a hand card to play it (damage spells ask you to pick a target)
- **Click** your glowing creature, then an enemy creature or Marina's lantern, to attack
- **1–7** play a hand card · **Enter** ends your turn · **Esc** cancels a selection · **R** restarts after a game ends · **M** mutes

## Files

- `game/index.html` — the page; `game/styles.css` — the table
- `game/src/cards.js` — the card pool and the four factions
- `game/src/game.js` — the rules engine (pure state, no DOM)
- `game/src/ai.js` — Marina's decisions
- `game/src/render.js` — the table, drawn as DOM
- `game/src/audio.js` — synthesised WebAudio sounds, no files
- `game/src/shots.js` — the `?shot=` screenshot scenes
- `game/src/rng.js` — seeded shuffle · `game/src/main.js` — clicks, keys, turns
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes `dossier.json`)

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

Screenshot scenes: `?shot=title|table|win|loss&seed=7` (see `shots.json`).

## License

MIT — see `LICENSE`.
