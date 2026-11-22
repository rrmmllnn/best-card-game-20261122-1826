[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/rrmmllnn/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/rrmmllnn/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

[Best card game — best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)

# Lantern Duel

A complete, original card duel in a desktop browser — fully offline, mouse + keyboard, no build step, no network.

Two lanterns, 30 life each. You are the **Lantern Keeper**, duelling the AI **Marina, Keeper of Tides**. Each turn you gain +1 mana crystal (up to 10), refill your mana and draw a card from your 30-card deck. Play creatures onto your side, cast spells, then attack: click a glowing creature, then an enemy creature or Marina's lantern. Creatures trade blows; a lantern takes damage directly. Reduce Marina's lantern to 0 to win. An empty deck burns you — fatigue 1, then 2, then 3… Creatures have summoning sickness and cannot attack the turn they are played.

## The four factions

Factions are told apart by colour **and** glyph, never colour alone:

- 🔥 **Ember** (red) — hits hard, dies fast.
- 💧 **Tide** (blue) — steady and even-tempered.
- 🍃 **Grove** (green) — tough, and it mends your lantern when played.
- ⭐ **Star** (gold) — draws cards, and its creatures strike from afar (Ranged: they take no damage back).

## The 23 cards

18 creatures across the four factions, plus all five spells:

- **Ember Burst** (2 mana) — deal 3 damage to a creature or lantern.
- **Star Bolt** (3 mana) — deal 4 damage to a creature or lantern.
- **Tide Surge** (2 mana) — draw 2 cards.
- **Grove Mend** (2 mana) — heal your lantern for 6.
- **Lantern Flare** (4 mana) — deal 2 damage to every enemy creature.

## Marina, the AI

She takes lethal when she sees it, trades up when a creature dies for free, mends when her lantern runs low, and draws when her hand runs dry.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Keys: `1–9` play a card from hand · `Enter` ends the turn · `Esc` cancels a selection. Mouse: click a card, then its target.

## Layout

- `main.ts` — the hand-in: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` (run with `MAKEFUN_OUTPUT_DIR=out node main.ts`).
- `game/index.html` + `game/src/` — the game itself: `config.js` (tuning), `random.js` (seeded RNG), `cards.js` (the 23 cards), `engine.js` (the rules, no DOM), `ai.js` (Marina), `render.js` (the table), `input.js` (mouse + keyboard), `shots.js` (staged screenshot scenes), `main.js` (boot + controller), `style.css` (the table).
- `screenshots/` — 4 real renders of the game in headless Chrome at 1280×800: title, table, win, loss.
- `tests/engine.test.mjs` — the engine test suite (`node --test tests/`).

## Screenshots

The game stages its own screenshot scenes deterministically: `?shot=title|table|win|loss&seed=N` plays the real rules forward from a seeded shuffle (see `shots.json`).

## License

MIT — see [LICENSE](LICENSE).
