// Lantern Duel — the rules, with no DOM in sight. The browser UI and the
// Node test suite both drive the game through these functions, so a rule
// tested here is the rule the player meets.
//
// A duel: two lanterns, 30 life each. On your turn you gain a mana crystal
// (up to 10), refill your mana, draw a card, play creatures and spells, then
// attack. Creatures cannot attack the turn they are played. An empty deck
// burns you: fatigue 1, then 2, then 3, and so on. Reduce the enemy lantern
// to 0 to win.
import { CARD_BY_ID, DECKLIST } from './cards.js';
import { RULES } from './config.js';
import { createRandom, shuffled } from './random.js';

export const PLAYER = 0;
export const ENEMY = 1;

function newSide(name, isAI) {
  return {
    name,
    isAI,
    lantern: RULES.startLantern,
    manaCrystals: 0,
    mana: 0,
    deck: [],
    hand: [],
    board: [],
    fatigue: 0,
  };
}

/** A fresh game: decks shuffled from `seed`, opening hands drawn, player first. */
export function createGame(seed) {
  const random = createRandom(seed);
  const state = {
    seed,
    turn: 1,
    turnPlayer: PLAYER,
    phase: 'play',
    winner: null,
    winReason: '',
    nextUid: 1,
    log: [],
    players: [newSide('Lantern Keeper', false), newSide('Marina, Keeper of Tides', true)],
  };
  for (const side of state.players) {
    side.deck = shuffled(DECKLIST, random);
  }
  for (let i = 0; i < RULES.startHand; i += 1) {
    drawCard(state, PLAYER);
    drawCard(state, ENEMY);
  }
  beginTurn(state, PLAYER);
  say(state, 'The duel begins. Your lantern burns bright — Marina waits across the table.');
  return state;
}

export function other(player) {
  return player === PLAYER ? ENEMY : PLAYER;
}

export function isOver(state) {
  return state.phase === 'over';
}

function say(state, message) {
  state.log.push(message);
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}

function makeMinion(state, defId) {
  const def = CARD_BY_ID[defId];
  return {
    uid: state.nextUid++,
    defId,
    attack: def.attack,
    health: def.health,
    maxHealth: def.health,
    sick: true,
    ranged: Boolean(def.ranged),
    mend: def.mend ?? 0,
    draw: def.draw ?? 0,
  };
}

function healLantern(state, player, amount) {
  const side = state.players[player];
  const before = side.lantern;
  side.lantern = Math.min(RULES.maxLantern, side.lantern + amount);
  return side.lantern - before;
}

function damageLantern(state, player, amount) {
  const side = state.players[player];
  side.lantern -= amount;
  if (side.lantern <= 0) {
    side.lantern = 0;
    state.phase = 'over';
    state.winner = other(player);
    state.winReason = `${state.players[other(player)].name} shattered ${side.name}'s lantern.`;
    say(state, state.winReason);
  }
}

function damageMinion(state, player, uid, amount) {
  const side = state.players[player];
  const minion = side.board.find((m) => m.uid === uid);
  if (!minion) return false;
  minion.health -= amount;
  if (minion.health <= 0) {
    side.board = side.board.filter((m) => m.uid !== uid);
    say(state, `${CARD_BY_ID[minion.defId].name} is destroyed.`);
    return true;
  }
  return false;
}

/** Draw a card; an empty deck burns the side for escalating fatigue damage. */
export function drawCard(state, player) {
  const side = state.players[player];
  if (side.hand.length >= RULES.maxHand) {
    // A full hand burns the drawn card instead: the card is lost, no fatigue.
    if (side.deck.length > 0) side.deck.pop();
    return null;
  }
  if (side.deck.length === 0) {
    side.fatigue += 1;
    say(state, `${side.name}'s deck is empty — fatigue burns ${side.fatigue}.`);
    damageLantern(state, player, side.fatigue);
    return null;
  }
  const defId = side.deck.pop();
  const card = { uid: state.nextUid++, defId };
  side.hand.push(card);
  return card;
}

/** Start `player`'s turn: crystal, refill, draw, wake last turn's creatures. */
export function beginTurn(state, player) {
  const side = state.players[player];
  state.turnPlayer = player;
  side.manaCrystals = Math.min(RULES.maxManaCrystals, side.manaCrystals + 1);
  side.mana = side.manaCrystals;
  for (const minion of side.board) minion.sick = false;
  drawCard(state, player);
  if (!isOver(state)) {
    say(state, `${side.name}'s turn ${state.turn}: ${side.manaCrystals} mana crystals, ${side.hand.length} cards in hand.`);
  }
}

/** End the current turn and start the other side's. */
export function endTurn(state) {
  if (isOver(state)) return false;
  const next = other(state.turnPlayer);
  if (next === PLAYER) state.turn += 1;
  beginTurn(state, next);
  return true;
}

export function handCard(state, player, handUid) {
  return state.players[player].hand.find((c) => c.uid === handUid) ?? null;
}

/** Why a card cannot be played right now, or null when it can. */
export function playBlockReason(state, player, handUid) {
  if (isOver(state) || state.turnPlayer !== player) return 'It is not your turn.';
  const card = handCard(state, player, handUid);
  if (!card) return 'That card is not in your hand.';
  const def = CARD_BY_ID[card.defId];
  if (state.players[player].mana < def.cost) return `Needs ${def.cost} mana.`;
  if (def.kind === 'creature' && state.players[player].board.length >= RULES.maxBoard) {
    return 'Your side of the table is full.';
  }
  return null;
}

/**
 * Play a card from hand. `target` is null, or { type: 'lantern', player } or
 * { type: 'creature', player, uid } — only the two damage spells need one.
 * Returns true when the card was played.
 */
export function playCard(state, player, handUid, target = null) {
  const blocked = playBlockReason(state, player, handUid);
  if (blocked) return false;
  const side = state.players[player];
  const index = side.hand.findIndex((c) => c.uid === handUid);
  const card = side.hand[index];
  const def = CARD_BY_ID[card.defId];
  if (def.kind === 'spell' && def.target === 'enemy' && !target) return false;
  if (def.kind === 'spell' && def.target === 'enemy' && target.type === 'creature') {
    const enemyBoard = state.players[target.player].board;
    if (!enemyBoard.some((m) => m.uid === target.uid)) return false;
  }

  side.hand.splice(index, 1);
  side.mana -= def.cost;
  say(state, `${side.name} plays ${def.name}.`);

  if (def.kind === 'creature') {
    const minion = makeMinion(state, def.id);
    side.board.push(minion);
    if (minion.mend > 0) {
      const healed = healLantern(state, player, minion.mend);
      if (healed > 0) say(state, `${def.name} mends ${side.name}'s lantern for ${healed}.`);
    }
    if (minion.draw > 0) {
      for (let i = 0; i < minion.draw; i += 1) drawCard(state, player);
      say(state, `${def.name} draws a card.`);
    }
    return true;
  }

  // Spells.
  const foe = other(player);
  if (def.effect === 'burst' || def.effect === 'bolt') {
    const damage = def.effect === 'burst' ? 3 : 4;
    if (target.type === 'lantern') {
      say(state, `${def.name} strikes ${state.players[target.player].name}'s lantern for ${damage}.`);
      damageLantern(state, target.player, damage);
    } else {
      const defender = state.players[target.player].board.find((m) => m.uid === target.uid);
      const defenderName = defender ? CARD_BY_ID[defender.defId].name : 'a creature';
      say(state, `${def.name} strikes ${defenderName} for ${damage}.`);
      damageMinion(state, target.player, target.uid, damage);
    }
  } else if (def.effect === 'surge') {
    drawCard(state, player);
    drawCard(state, player);
    say(state, `${side.name} rides the Tide Surge and draws 2 cards.`);
  } else if (def.effect === 'mend') {
    const healed = healLantern(state, player, 6);
    say(state, `${side.name} mends the lantern for ${healed}.`);
  } else if (def.effect === 'flare') {
    say(state, `${def.name} washes over every enemy creature for 2.`);
    for (const minion of [...state.players[foe].board]) {
      damageMinion(state, foe, minion.uid, 2);
    }
  }
  return true;
}

export function attackBlockReason(state, player, uid) {
  if (isOver(state) || state.turnPlayer !== player) return 'It is not your turn.';
  const minion = state.players[player].board.find((m) => m.uid === uid);
  if (!minion) return 'That creature is not yours.';
  if (minion.sick) return 'Summoning sickness — it cannot attack yet.';
  if (minion.attack <= 0) return 'It has no attack.';
  return null;
}

/**
 * Attack with a creature: `target` is { type: 'lantern', player } or
 * { type: 'creature', player, uid }. A ranged attacker takes no damage back.
 */
export function attack(state, player, uid, target) {
  if (attackBlockReason(state, player, uid)) return false;
  const side = state.players[player];
  const minion = side.board.find((m) => m.uid === uid);
  const def = CARD_BY_ID[minion.defId];
  minion.sick = true; // one attack per turn: it rests after striking.
  if (target.type === 'lantern') {
    say(state, `${def.name} strikes ${state.players[target.player].name}'s lantern for ${minion.attack}.`);
    damageLantern(state, target.player, minion.attack);
    return true;
  }
  const foe = state.players[target.player];
  const defender = foe.board.find((m) => m.uid === target.uid);
  if (!defender) return false;
  const defenderDef = CARD_BY_ID[defender.defId];
  const defenderAttack = defender.attack;
  say(state, `${def.name} attacks ${defenderDef.name} (${minion.attack} vs ${defenderAttack}).`);
  // Creatures trade blows at the same moment: both strike even if one falls.
  damageMinion(state, target.player, target.uid, minion.attack);
  if (!minion.ranged) {
    damageMinion(state, player, uid, defenderAttack);
  } else {
    say(state, `${def.name} strikes from afar and takes no damage back.`);
  }
  return true;
}

/** The creatures of `player` that may attack right now. */
export function readyAttackers(state, player) {
  return state.players[player].board.filter((m) => !m.sick && m.attack > 0);
}

export function totalAttack(state, player) {
  return readyAttackers(state, player).reduce((sum, m) => sum + m.attack, 0);
}

/** A one-line summary of the board, for the status line and the tests. */
export function summarize(state) {
  const [you, foe] = state.players;
  return `turn ${state.turn} · you ${you.lantern}❤ ${you.mana}/${you.manaCrystals}◆ hand ${you.hand.length} board ${you.board.length} deck ${you.deck.length} · Marina ${foe.lantern}❤ ${foe.mana}/${foe.manaCrystals}◆ hand ${foe.hand.length} board ${foe.board.length} deck ${foe.deck.length}${isOver(state) ? ` · ${state.players[state.winner].name} wins` : ''}`;
}
