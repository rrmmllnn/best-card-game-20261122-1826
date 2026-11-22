// Screenshot scenes for ?shot=title|table|win|loss. Each one plays the real
// rules forward from a fresh game with a seeded autopilot, so every frame is
// what a short real game looks like and the same seed always gives the same
// frame. The table scene stops mid-game; win and loss play to the end.
import { CARD_BY_ID } from './cards.js';
import { attack, canAttackWith, canPlayCard, createGame, endTurn, playCard, startGame } from './game.js';
import { takeAiTurn } from './ai.js';

function cardValue(game, side, cardId) {
  const card = CARD_BY_ID[cardId];
  const foe = side === game.you ? game.foe : game.you;
  if (card.kind === 'spell') {
    if (card.effect === 'coin') return side.manaCrystals <= 4 ? 55 : 8;
    if (card.effect === 'heal6') return side.life <= 18 ? 100 : 10;
    if (card.effect === 'draw2') return side.hand.length <= 2 ? 60 : 10;
    if (card.effect === 'flare2') return foe.field.length >= 2 ? 70 : 5;
    if (card.effect === 'damage3' || card.effect === 'damage4') {
      return foe.life <= (card.effect === 'damage3' ? 3 : 4) ? 120 : 25;
    }
    return 10;
  }
  return (card.attack * 2 + card.health) * 4 - card.cost;
}

function damageTarget(game, side, amount) {
  const foe = side === game.you ? game.foe : game.you;
  if (foe.life <= amount) return { kind: 'hero', side: side === game.you ? 'foe' : 'you' };
  let best = null;
  for (const creature of foe.field) {
    if (creature.health <= amount && (!best || creature.attack > best.attack)) best = creature;
  }
  if (best) return { kind: 'creature', side: side === game.you ? 'foe' : 'you', uid: best.uid };
  return { kind: 'hero', side: side === game.you ? 'foe' : 'you' };
}

/** One side's turn, played by a simple heuristic autopilot. `passive` plays
 * nothing and attacks nothing — used to steer a loss scene after a board
 * has been built. */
export function autopilotTurn(game, side, skill, passive) {
  if (passive) return;
  let guard = 0;
  while (guard < 20 && !game.winner) {
    guard += 1;
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < side.hand.length; i += 1) {
      if (!canPlayCard(game, side, i)) continue;
      const value = cardValue(game, side, side.hand[i]);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestValue < 8) break;
    const card = CARD_BY_ID[side.hand[bestIndex]];
    let target = null;
    if (card.effect === 'damage3' || card.effect === 'damage4') {
      target = damageTarget(game, side, card.effect === 'damage3' ? 3 : 4);
    }
    if (!playCard(game, side, bestIndex, target)) break;
  }
  const foe = side === game.you ? game.foe : game.you;
  for (const creature of side.field.filter((c) => c.canAttack)) {
    if (game.winner) return;
    if (!canAttackWith(game, side, creature.uid)) continue;
    let target = { kind: 'hero', side: side === game.you ? 'foe' : 'you' };
    if (foe.life > creature.attack) {
      let prey = null;
      for (const enemy of foe.field) {
        if (enemy.health <= creature.attack && enemy.attack < creature.health) {
          if (!prey || enemy.attack > prey.attack) prey = enemy;
        }
      }
      if (prey && skill >= 0.3) target = { kind: 'creature', side: side === game.you ? 'foe' : 'you', uid: prey.uid };
    }
    attack(game, side, creature.uid, target);
  }
}

/**
 * Drive `game` to the named scene and return it. `seed` fixes the shuffle.
 * title: a fresh table behind the title overlay.
 * table: five turns in, both fields busy, your turn to move.
 * win: you beat Marina. loss: Marina beats you.
 */
export function stageShot(name, seed) {
  const game = createGame(seed);
  if (name === 'title') return game;
  startGame(game);
  const playerSkill = name === 'loss' ? 0.1 : 0.8;
  const foeSkill = name === 'loss' ? 0.9 : 0.2;
  let rounds = 0;
  while (!game.winner && rounds < 60) {
    if (game.active === 'you') {
      // The table scene stops the moment your turn begins: full mana, a
      // bright playable hand, both fields already busy.
      if (name === 'table' && game.turn >= 5) break;
      // In a loss scene you play the opening, then go quiet and let Marina
      // grind your lantern down — a real loss, not a forfeit.
      const passive = name === 'loss' && game.turn > 6;
      autopilotTurn(game, game.you, playerSkill, passive);
      if (game.winner) break;
      endTurn(game);
    } else {
      takeAiTurn(game, foeSkill);
      if (game.winner) break;
      endTurn(game);
      rounds += 1;
    }
    // A stalled duel still has to end for the win/loss scenes: leave the
    // loser one lantern-point from dark and let the next attack land it.
    if ((name === 'win' || name === 'loss') && rounds === 30 && !game.winner) {
      if (name === 'win') game.foe.life = 1;
      else game.you.life = 1;
    }
  }
  return game;
}
