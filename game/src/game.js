// The rules engine of Lantern Duel: pure state, no DOM, so the same code runs
// in the browser and in a Node test. A game is two lanterns (you and Marina),
// each with life, mana, a deck, a hand and a field of creatures. Turns:
// gain a mana crystal (up to 10), refill mana, draw a card, play cards and
// attack, then end the turn. Reduce the enemy lantern to 0 to win.
import { CARD_BY_ID, buildDeck } from './cards.js';
import { makeRng, shuffle } from './rng.js';

export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 8;
export const MAX_FIELD = 6;
export const START_HAND = 3;

let nextCreatureId = 1;

/** A creature on the table: the card it came from, plus live attack/health. */
export function makeCreature(cardId) {
  const card = CARD_BY_ID[cardId];
  return {
    uid: nextCreatureId,
    cardId,
    name: card.name,
    faction: card.faction,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    canAttack: false,
  };
}

function makeSide(name, title, rng) {
  return {
    name,
    title,
    life: MAX_LIFE,
    mana: 0,
    manaCrystals: 0,
    deck: shuffle(buildDeck(rng), rng),
    hand: [],
    field: [],
    fatigue: 0,
  };
}

/** A fresh game. `seed` fixes every shuffle, so screenshots replay exactly. */
export function createGame(seed) {
  nextCreatureId = 1;
  const rng = makeRng(seed);
  const game = {
    seed,
    rng,
    you: makeSide('You', 'Lantern Keeper', rng),
    foe: makeSide('Marina', 'Keeper of Tides', rng),
    turn: 1,
    active: 'you',
    phase: 'title',
    winner: null,
    log: ['The lanterns are lit. Your move, Keeper.'],
    stats: { cardsPlayed: 0, damageDealt: 0, turnsPlayed: 0 },
    selectedHand: -1,
    selectedAttacker: -1,
    lastEvent: null,
  };
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(game, game.you);
    drawCard(game, game.foe);
  }
  // The second lantern moves second, so she opens with one extra card and a
  // Lantern Coin (a free mana for one turn) — the usual compensation for
  // giving up the first move.
  drawCard(game, game.foe);
  game.foe.hand.push('lantern-coin');
  return game;
}

export function activeSide(game) {
  return game.active === 'you' ? game.you : game.foe;
}

export function idleSide(game) {
  return game.active === 'you' ? game.foe : game.you;
}

function pushLog(game, text) {
  game.log.push(text);
  if (game.log.length > 5) game.log.shift();
}

/** Draw a card; an empty deck burns the lantern (fatigue 1, then 2, then 3...). */
export function drawCard(game, side) {
  if (side.deck.length === 0) {
    side.fatigue += 1;
    side.life -= side.fatigue;
    pushLog(game, `${side.name} draws from an empty deck and burns for ${side.fatigue}!`);
    game.lastEvent = { kind: 'fatigue', side: side === game.you ? 'you' : 'foe', amount: side.fatigue };
    checkEnd(game);
    return null;
  }
  const cardId = side.deck.pop();
  if (side.hand.length >= MAX_HAND) {
    pushLog(game, `${side.name}'s hand is full — ${CARD_BY_ID[cardId].name} burns away.`);
    return null;
  }
  side.hand.push(cardId);
  return cardId;
}

function healSide(side, amount) {
  side.life = Math.min(MAX_LIFE, side.life + amount);
}

function damageCreature(game, side, creature, amount, sourceName) {
  creature.health -= amount;
  if (sourceName === 'You') game.stats.damageDealt += amount;
  if (creature.health <= 0) {
    side.field = side.field.filter((c) => c.uid !== creature.uid);
    pushLog(game, `${creature.name} shatters.`);
    return true;
  }
  return false;
}

function damageHero(game, side, amount, sourceName) {
  side.life -= amount;
  if (sourceName === 'You') game.stats.damageDealt += amount;
  game.lastEvent = { kind: 'hero-hit', side: side === game.you ? 'you' : 'foe', amount };
  checkEnd(game);
}

function checkEnd(game) {
  if (game.winner) return;
  if (game.foe.life <= 0 && game.you.life <= 0) {
    game.winner = game.you.life >= game.foe.life ? 'you' : 'foe';
  } else if (game.foe.life <= 0) {
    game.winner = 'you';
  } else if (game.you.life <= 0) {
    game.winner = 'foe';
  }
  if (game.winner) {
    game.phase = 'over';
    pushLog(game, game.winner === 'you' ? 'Marina’s lantern goes dark. You win!' : 'Your lantern goes dark. Marina wins.');
  }
}

/** Start a turn for `side`: one more crystal, full mana, a fresh draw, creatures ready. */
export function startTurn(game, side) {
  side.manaCrystals = Math.min(MAX_MANA, side.manaCrystals + 1);
  side.mana = side.manaCrystals;
  for (const creature of side.field) creature.canAttack = true;
  drawCard(game, side);
  game.stats.turnsPlayed += 1;
}

/** Begin a real game from the title screen. */
export function startGame(game) {
  game.phase = 'play';
  game.active = 'you';
  startTurn(game, game.you);
  pushLog(game, 'Your turn — play a card, then attack!');
}

/** Can `side` play the card at `handIndex` right now? */
export function canPlayCard(game, side, handIndex) {
  if (game.phase !== 'play' || game.winner) return false;
  if (handIndex < 0 || handIndex >= side.hand.length) return false;
  const card = CARD_BY_ID[side.hand[handIndex]];
  if (card.cost > side.mana) return false;
  if (card.kind === 'creature' && side.field.length >= MAX_FIELD) return false;
  return true;
}

/**
 * Play a card from `side`'s hand. Damage spells need `target`:
 * { kind: 'hero', side: 'you'|'foe' } or { kind: 'creature', uid }.
 * Returns true when the card was played.
 */
export function playCard(game, side, handIndex, target) {
  if (!canPlayCard(game, side, handIndex)) return false;
  const cardId = side.hand[handIndex];
  const card = CARD_BY_ID[cardId];
  if (card.kind === 'spell' && (card.effect === 'damage3' || card.effect === 'damage4') && !target) return false;
  side.hand.splice(handIndex, 1);
  side.mana -= card.cost;
  if (side === game.you) game.stats.cardsPlayed += 1;
  game.lastEvent = { kind: 'play', side: side === game.you ? 'you' : 'foe', cardId };
  pushLog(game, `${side.name} plays ${card.name}.`);

  if (card.kind === 'creature') {
    const creature = makeCreature(cardId);
    nextCreatureId += 1;
    side.field.push(creature);
    applyBattlecry(game, side, card);
    return true;
  }

  // Spells resolve at once.
  const foe = side === game.you ? game.foe : game.you;
  if (card.effect === 'draw2') {
    drawCard(game, side);
    drawCard(game, side);
  } else if (card.effect === 'coin') {
    side.mana += 1;
    pushLog(game, `${side.name} spends a Lantern Coin for 1 mana.`);
  } else if (card.effect === 'heal6') {
    healSide(side, 6);
    pushLog(game, `${side.name} mends their lantern for 6.`);
  } else if (card.effect === 'flare2') {
    for (const creature of foe.field.slice()) damageCreature(game, foe, creature, 2, side.name);
    pushLog(game, `Lantern Flare scorches every enemy creature for 2.`);
  } else if (card.effect === 'damage3' || card.effect === 'damage4') {
    const amount = card.effect === 'damage3' ? 3 : 4;
    if (target.kind === 'hero') {
      damageHero(game, target.side === 'you' ? game.you : game.foe, amount, side.name);
    } else {
      const holder = target.side === 'you' ? game.you : game.foe;
      const creature = holder.field.find((c) => c.uid === target.uid);
      if (creature) damageCreature(game, holder, creature, amount, side.name);
    }
  }
  checkEnd(game);
  return true;
}

function applyBattlecry(game, side, card) {
  if (card.effect === 'draw1') {
    drawCard(game, side);
    pushLog(game, `${card.name} draws a card.`);
  } else if (card.effect === 'heal4self') {
    healSide(side, 4);
    pushLog(game, `${card.name} mends its lantern for 4.`);
  }
}

/** Can `creature` (a uid on `side`'s field) attack right now? */
export function canAttackWith(game, side, uid) {
  if (game.phase !== 'play' || game.winner) return false;
  const creature = side.field.find((c) => c.uid === uid);
  return Boolean(creature && creature.canAttack);
}

/**
 * `attackerUid` (on `side`'s field) strikes `target`: a hero
 * { kind: 'hero', side } or a creature { kind: 'creature', side, uid }.
 * Creatures trade blows; a hero takes the damage straight.
 */
export function attack(game, side, attackerUid, target) {
  const attacker = side.field.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack || game.phase !== 'play' || game.winner) return false;
  attacker.canAttack = false;
  game.lastEvent = { kind: 'attack', side: side === game.you ? 'you' : 'foe', attackerUid, target };
  const foe = side === game.you ? game.foe : game.you;
  if (target.kind === 'hero') {
    pushLog(game, `${attacker.name} strikes ${foe.name}'s lantern for ${attacker.attack}!`);
    damageHero(game, foe, attacker.attack, side.name);
  } else {
    const defender = foe.field.find((c) => c.uid === target.uid);
    if (!defender) return false;
    pushLog(game, `${attacker.name} clashes with ${defender.name}!`);
    damageCreature(game, side, attacker, defender.attack, foe.name);
    damageCreature(game, foe, defender, attacker.attack, side.name);
  }
  checkEnd(game);
  return true;
}

/** End the active side's turn and hand over to the other lantern. */
export function endTurn(game) {
  if (game.phase !== 'play' || game.winner) return false;
  game.active = game.active === 'you' ? 'foe' : 'you';
  if (game.active === 'you') game.turn += 1;
  game.selectedHand = -1;
  game.selectedAttacker = -1;
  const side = activeSide(game);
  startTurn(game, side);
  pushLog(game, game.active === 'you' ? 'Your turn — play a card, then attack!' : 'Marina takes her turn…');
  checkEnd(game);
  return true;
}
