// Marina's brain: a readable opponent, not a random one. She plays her
// cheapest creatures first, spends removal on the biggest threat, mends when
// her lantern is low, draws when her hand runs dry — then attacks: she takes
// lethal when she sees it, trades up when a creature dies for free, and
// otherwise goes for the lantern. `skill` (0..1) blurs her choices so the
// screenshot games can be steered toward a win or a loss.
import { CARD_BY_ID } from './cards.js';
import { attack, canAttackWith, canPlayCard, playCard } from './game.js';

function handValue(game, side, cardId, skill) {
  const card = CARD_BY_ID[cardId];
  const foe = side === game.you ? game.foe : game.you;
  if (card.kind === 'spell') {
    if (card.effect === 'coin') return side.manaCrystals <= 4 ? 55 : 8;
    if (card.effect === 'heal6') return side.life <= 18 ? 100 : side.life <= 25 ? 40 : 5;
    if (card.effect === 'draw2') return side.hand.length <= 2 ? 60 : 10;
    if (card.effect === 'flare2') return foe.field.length >= 2 ? 70 : 5;
    if (card.effect === 'damage3' || card.effect === 'damage4') {
      return foe.life <= (card.effect === 'damage3' ? 3 : 4) ? 120 : 30;
    }
    return 10;
  }
  // Creatures: value grows with stats per mana, and a full field is worthless.
  return (card.attack * 2 + card.health) * 4 - card.cost + (skill >= 0.5 ? 0 : -20);
}

function bestDamageTarget(game, side, amount) {
  const foe = side === game.you ? game.foe : game.you;
  if (foe.life <= amount) return { kind: 'hero', side: side === game.you ? 'foe' : 'you' };
  let best = null;
  for (const creature of foe.field) {
    if (creature.health <= amount && (!best || creature.attack > best.attack)) best = creature;
  }
  if (best) {
    return { kind: 'creature', side: side === game.you ? 'foe' : 'you', uid: best.uid };
  }
  return { kind: 'hero', side: side === game.you ? 'foe' : 'you' };
}

/** Play Marina's cards, one at a time, until she can afford nothing useful. */
export function aiPlayCards(game, skill) {
  const side = game.foe;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < side.hand.length; i += 1) {
      if (!canPlayCard(game, side, i)) continue;
      const value = handValue(game, side, side.hand[i], skill);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestValue < 8) break;
    const card = CARD_BY_ID[side.hand[bestIndex]];
    let target = null;
    if (card.effect === 'damage3' || card.effect === 'damage4') {
      target = bestDamageTarget(game, side, card.effect === 'damage3' ? 3 : 4);
    }
    if (!playCard(game, side, bestIndex, target)) break;
    if (game.winner) return;
  }
}

/**
 * Attack with every ready creature: lethal first, then a trade where the
 * enemy dies and ours lives, then a trade where both die only if ours is
 * weaker, otherwise straight at the lantern. A low-skill Marina sometimes
 * just goes face instead of trading.
 */
export function aiAttack(game, skill) {
  const side = game.foe;
  const foe = game.you;
  const ready = side.field.filter((c) => c.canAttack);
  for (const creature of ready) {
    if (game.winner) return;
    if (!canAttackWith(game, side, creature.uid)) continue;
    const lethal = foe.life <= creature.attack;
    let target = { kind: 'hero', side: 'you' };
    if (!lethal) {
      let prey = null;
      for (const enemy of foe.field) {
        if (enemy.health <= creature.attack && enemy.attack < creature.health) {
          if (!prey || enemy.attack > prey.attack) prey = enemy;
        }
      }
      if (prey && skill >= 0.3) {
        target = { kind: 'creature', side: 'you', uid: prey.uid };
      } else if (prey && game.rng() < 0.5) {
        target = { kind: 'creature', side: 'you', uid: prey.uid };
      }
    }
    attack(game, side, creature.uid, target);
  }
}

/** One full Marina turn: play, then attack. The caller ends the turn after. */
export function takeAiTurn(game, skill) {
  aiPlayCards(game, skill);
  if (!game.winner) aiAttack(game, skill);
}
