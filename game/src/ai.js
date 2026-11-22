// Marina's brain — and the two autopilots the screenshot scenes use.
// Every planner returns ONE next action (or null when it is done) and never
// changes the state, so the UI can apply actions one at a time with a pause
// between them while the headless scenes apply them instantly.
//
// Marina is readable and competent: she takes lethal when she sees it, trades
// up when a creature dies for free, mends when low, and draws when her hand
// runs dry. The 'dumb' autopilot plays the first card it can afford and only
// ever trades for free — it is how a loss (or a win) is staged honestly:
// a real game, played badly.
import { CARD_BY_ID } from './cards.js';
import { ENEMY, PLAYER, other, playBlockReason, readyAttackers, totalAttack } from './engine.js';

function handOf(state, player) {
  return state.players[player].hand;
}

function findInHand(state, player, defId) {
  return handOf(state, player).find((c) => c.defId === defId) ?? null;
}

function spellDamageInHand(state, player) {
  let total = 0;
  const side = state.players[player];
  for (const card of side.hand) {
    const def = CARD_BY_ID[card.defId];
    if (def.effect === 'burst' && side.mana >= def.cost) total += 3;
    if (def.effect === 'bolt' && side.mana >= def.cost) total += 4;
  }
  return total;
}

function creatureScore(def, state, player) {
  let score = def.attack + def.health;
  if (def.ranged) score += 1;
  if (def.draw) score += 2;
  if (def.mend && state.players[player].lantern <= 20) score += 1.5;
  if (def.mend) score += 0.5;
  return score;
}

/** The next card Marina should play, or null when she is done playing. */
export function planPlayAction(state, player, style = 'smart') {
  const side = state.players[player];
  const foe = state.players[other(player)];
  const affordable = (card) => CARD_BY_ID[card.defId].cost <= side.mana;

  if (style === 'dumb') {
    const first = side.hand.find((card) => {
      const def = CARD_BY_ID[card.defId];
      return def.kind === 'creature' && affordable(card) && !playBlockReason(state, player, card.uid);
    });
    return first ? { type: 'play', handUid: first.uid, target: null } : null;
  }

  // Mend when low: a lantern at 12 or less is one bad turn from dead.
  const mend = findInHand(state, player, 'grove-mend');
  if (mend && affordable(mend) && side.lantern <= 12) {
    return { type: 'play', handUid: mend.uid, target: null };
  }

  // Draw when the hand runs dry.
  const surge = findInHand(state, player, 'tide-surge');
  if (surge && affordable(surge) && side.hand.length <= 2) {
    return { type: 'play', handUid: surge.uid, target: null };
  }

  // Lethal in hand: burn spells at the lantern when attacks finish the job.
  const burn = side.hand.find((card) => {
    const def = CARD_BY_ID[card.defId];
    return (def.effect === 'burst' || def.effect === 'bolt') && affordable(card);
  });
  if (burn && totalAttack(state, player) + spellDamageInHand(state, player) >= foe.lantern) {
    return { type: 'play', handUid: burn.uid, target: { type: 'lantern', player: other(player) } };
  }

  // Removal: kill the most dangerous enemy creature a spell can finish.
  const threats = [...foe.board].sort((a, b) => b.attack - a.attack);
  for (const card of side.hand) {
    const def = CARD_BY_ID[card.defId];
    if (!affordable(card)) continue;
    if (def.effect === 'burst' || def.effect === 'bolt') {
      const damage = def.effect === 'burst' ? 3 : 4;
      const prey = threats.find((m) => m.attack >= 4 && m.health <= damage)
        ?? threats.find((m) => m.health <= damage && m.attack >= 3);
      if (prey) return { type: 'play', handUid: card.uid, target: { type: 'creature', player: other(player), uid: prey.uid } };
    }
    if (def.effect === 'flare' && foe.board.length >= 2) {
      const kills = foe.board.filter((m) => m.health <= 2).length;
      if (kills >= 1 || foe.board.length >= 3) {
        return { type: 'play', handUid: card.uid, target: null };
      }
    }
  }

  // Otherwise play the best creature the mana allows.
  let best = null;
  let bestScore = -1;
  for (const card of side.hand) {
    const def = CARD_BY_ID[card.defId];
    if (def.kind !== 'creature' || !affordable(card)) continue;
    if (playBlockReason(state, player, card.uid)) continue;
    const score = creatureScore(def, state, player);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best ? { type: 'play', handUid: best.uid, target: null } : null;
}

/** The next attack Marina should make, or null when she is done attacking. */
export function planAttackAction(state, player, style = 'smart') {
  const foe = other(player);
  const ready = readyAttackers(state, player);
  if (ready.length === 0) return null;
  const enemyBoard = state.players[foe].board;

  // Lethal: every ready creature goes to the lantern.
  if (style === 'smart' && totalAttack(state, player) >= state.players[foe].lantern) {
    return { type: 'attack', uid: ready[0].uid, target: { type: 'lantern', player: foe } };
  }

  // Trade up: kill the strongest enemy creature that dies for free.
  const byAttack = [...ready].sort((a, b) => b.attack - a.attack);
  for (const attacker of byAttack) {
    const prey = [...enemyBoard]
      .filter((defender) => defender.health <= attacker.attack)
      .filter((defender) => attacker.ranged || defender.attack < attacker.health)
      .sort((a, b) => b.attack - a.attack)[0];
    if (prey) {
      return { type: 'attack', uid: attacker.uid, target: { type: 'creature', player: foe, uid: prey.uid } };
    }
  }

  // Nothing trades well: go to the lantern — unless the pilot is dumb.
  if (style === 'smart') {
    return { type: 'attack', uid: byAttack[0].uid, target: { type: 'lantern', player: foe } };
  }
  return null;
}
