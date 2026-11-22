// Lantern Duel — engine tests. Run: node --test tests/
// The engine has no DOM, so the suite imports it directly and plays real
// games: rules, spells, fatigue, the AI's judgement, and full duels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID, CARDS, DECKLIST } from '../game/src/cards.js';
import {
  PLAYER, ENEMY, attack, attackBlockReason, beginTurn, createGame, drawCard,
  endTurn, isOver, playBlockReason, playCard, readyAttackers, summarize, totalAttack,
} from '../game/src/engine.js';
import { planAttackAction, planPlayAction } from '../game/src/ai.js';
import { playFullGame, stageShot } from '../game/src/shots.js';
import { RULES } from '../game/src/config.js';

function handDefId(state, player, defId) {
  const card = state.players[player].hand.find((c) => c.defId === defId);
  return card ? card.uid : null;
}

function giveCard(state, player, defId) {
  const card = { uid: state.nextUid++, defId };
  state.players[player].hand.push(card);
  return card.uid;
}

function putMinion(state, player, defId, attackValue, healthValue) {
  const def = CARD_BY_ID[defId];
  const minion = {
    uid: state.nextUid++, defId,
    attack: attackValue ?? def.attack, health: healthValue ?? def.health,
    maxHealth: healthValue ?? def.health, sick: false,
    ranged: Boolean(def.ranged), mend: def.mend ?? 0, draw: def.draw ?? 0,
  };
  state.players[player].board.push(minion);
  return minion.uid;
}

test('the set is 23 distinct cards: 18 creatures and the 5 named spells', () => {
  assert.equal(CARDS.length, 23);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 23);
  assert.equal(CARDS.filter((c) => c.kind === 'creature').length, 18);
  const spells = CARDS.filter((c) => c.kind === 'spell').map((c) => c.id).sort();
  assert.deepEqual(spells, ['ember-burst', 'grove-mend', 'lantern-flare', 'star-bolt', 'tide-surge']);
  for (const card of CARDS) assert.ok(CARD_BY_ID[card.id], card.id);
});

test('the decklist is 30 cards and every id exists', () => {
  assert.equal(DECKLIST.length, 30);
  for (const id of DECKLIST) assert.ok(CARD_BY_ID[id], id);
});

test('a fresh game: 30 life each, opening hands drawn, player first with 1 crystal', () => {
  const state = createGame(7);
  assert.equal(state.players[PLAYER].lantern, 30);
  assert.equal(state.players[ENEMY].lantern, 30);
  // 3 cards dealt, then the first turn draws a 4th for the Keeper.
  assert.equal(state.players[PLAYER].hand.length, 4);
  assert.equal(state.players[ENEMY].hand.length, 3);
  assert.equal(state.players[PLAYER].deck.length, 26);
  assert.equal(state.turnPlayer, PLAYER);
  assert.equal(state.players[PLAYER].manaCrystals, 1);
  assert.equal(state.players[PLAYER].mana, 1);
  assert.equal(isOver(state), false);
});

test('the same seed deals the same opening hands', () => {
  const a = createGame(42);
  const b = createGame(42);
  assert.deepEqual(
    a.players[PLAYER].hand.map((c) => c.defId),
    b.players[PLAYER].hand.map((c) => c.defId),
  );
  assert.deepEqual(
    a.players[ENEMY].deck.map((d) => d),
    b.players[ENEMY].deck.map((d) => d),
  );
});

test('mana crystals grow by 1 a turn and stop at 10', () => {
  const state = createGame(7);
  for (let i = 0; i < 22; i += 1) endTurn(state);
  assert.equal(state.players[PLAYER].manaCrystals, 10);
  assert.equal(state.players[ENEMY].manaCrystals, 10);
  assert.equal(state.players[PLAYER].mana, 10);
});

test('a creature costs mana, enters sick, and cannot attack that turn', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 5;
  const uid = giveCard(state, PLAYER, 'cinder-hound');
  assert.equal(playCard(state, PLAYER, uid, null), true);
  assert.equal(state.players[PLAYER].mana, 3);
  assert.equal(state.players[PLAYER].board.length, 1);
  assert.equal(state.players[PLAYER].board[0].sick, true);
  assert.ok(attackBlockReason(state, PLAYER, state.players[PLAYER].board[0].uid));
});

test('a creature wakes on its owner’s next turn and can attack', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 5;
  const uid = giveCard(state, PLAYER, 'cinder-hound');
  playCard(state, PLAYER, uid, null);
  endTurn(state); // Marina
  endTurn(state); // back to the Keeper
  const minion = state.players[PLAYER].board[0];
  assert.equal(minion.sick, false);
  assert.equal(attackBlockReason(state, PLAYER, minion.uid), null);
});

test('creatures trade blows; the attacker rests after one attack', () => {
  const state = createGame(7);
  const mine = putMinion(state, PLAYER, 'cinder-hound'); // 3/2
  putMinion(state, ENEMY, 'coral-guard'); // 2/3
  assert.equal(attack(state, PLAYER, mine, { type: 'creature', player: ENEMY, uid: state.players[ENEMY].board[0].uid }), true);
  assert.equal(state.players[ENEMY].board.length, 0, 'guard dies to 3 damage');
  assert.equal(state.players[PLAYER].board.length, 0, 'hound dies to 2 damage back');
});

test('a ranged attacker takes no damage back', () => {
  const state = createGame(7);
  const mine = putMinion(state, PLAYER, 'comet-archer'); // 3/2 ranged
  putMinion(state, ENEMY, 'coral-guard'); // 2/3
  attack(state, PLAYER, mine, { type: 'creature', player: ENEMY, uid: state.players[ENEMY].board[0].uid });
  assert.equal(state.players[ENEMY].board.length, 0);
  assert.equal(state.players[PLAYER].board[0].health, 2, 'archer untouched');
});

test('attacking the lantern damages it directly', () => {
  const state = createGame(7);
  const mine = putMinion(state, PLAYER, 'pyre-drake'); // 5/3
  attack(state, PLAYER, mine, { type: 'lantern', player: ENEMY });
  assert.equal(state.players[ENEMY].lantern, 25);
  assert.equal(state.players[PLAYER].board[0].health, 3, 'no damage back from a lantern');
});

test('Ember Burst deals 3 to a creature or a lantern', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 5;
  putMinion(state, ENEMY, 'wave-rider'); // 3/4
  const burst = giveCard(state, PLAYER, 'ember-burst');
  playCard(state, PLAYER, burst, { type: 'creature', player: ENEMY, uid: state.players[ENEMY].board[0].uid });
  assert.equal(state.players[ENEMY].board[0].health, 1);
  const burst2 = giveCard(state, PLAYER, 'ember-burst');
  playCard(state, PLAYER, burst2, { type: 'lantern', player: ENEMY });
  assert.equal(state.players[ENEMY].lantern, 27);
});

test('Star Bolt deals 4; Tide Surge draws 2; Grove Mend heals 6', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 10;
  state.players[PLAYER].lantern = 20;
  const handBefore = state.players[PLAYER].hand.length;
  const bolt = giveCard(state, PLAYER, 'star-bolt');
  playCard(state, PLAYER, bolt, { type: 'lantern', player: ENEMY });
  assert.equal(state.players[ENEMY].lantern, 26);
  const surge = giveCard(state, PLAYER, 'tide-surge');
  playCard(state, PLAYER, surge, null);
  assert.equal(state.players[PLAYER].hand.length, handBefore + 2, 'two cards given, two spent, two drawn');
  const mend = giveCard(state, PLAYER, 'grove-mend');
  playCard(state, PLAYER, mend, null);
  assert.equal(state.players[PLAYER].lantern, 26);
});

test('Grove Mend never heals past 30', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 10;
  state.players[PLAYER].lantern = 29;
  const mend = giveCard(state, PLAYER, 'grove-mend');
  playCard(state, PLAYER, mend, null);
  assert.equal(state.players[PLAYER].lantern, 30);
});

test('Lantern Flare deals 2 to every enemy creature and only them', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 10;
  putMinion(state, ENEMY, 'tide-sprite'); // 1/2 dies
  putMinion(state, ENEMY, 'wave-rider'); // 3/4 survives at 2
  const mine = putMinion(state, PLAYER, 'tide-sprite');
  const flare = giveCard(state, PLAYER, 'lantern-flare');
  playCard(state, PLAYER, flare, null);
  assert.equal(state.players[ENEMY].board.length, 1);
  assert.equal(state.players[ENEMY].board[0].health, 2);
  assert.equal(state.players[PLAYER].board[0].health, 2, 'own creatures untouched');
  assert.equal(state.players[PLAYER].board[0].uid, mine);
});

test('Grove creatures mend on entry; Star creatures draw on entry', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 10;
  state.players[PLAYER].lantern = 25;
  const handBefore = state.players[PLAYER].hand.length;
  const golem = giveCard(state, PLAYER, 'moss-golem'); // Mend 2
  playCard(state, PLAYER, golem, null);
  assert.equal(state.players[PLAYER].lantern, 27);
  const moth = giveCard(state, PLAYER, 'star-moth'); // Draw 1
  playCard(state, PLAYER, moth, null);
  assert.equal(state.players[PLAYER].hand.length, handBefore + 1, 'two cards given, two spent, one drawn');
});

test('an empty deck burns for escalating fatigue', () => {
  const state = createGame(7);
  state.players[PLAYER].deck = [];
  state.players[PLAYER].lantern = 30;
  drawCard(state, PLAYER);
  assert.equal(state.players[PLAYER].lantern, 29);
  drawCard(state, PLAYER);
  assert.equal(state.players[PLAYER].lantern, 27);
  drawCard(state, PLAYER);
  assert.equal(state.players[PLAYER].lantern, 24);
});

test('a full hand burns the drawn card instead of growing', () => {
  const state = createGame(7);
  while (state.players[PLAYER].hand.length < RULES.maxHand) {
    state.players[PLAYER].hand.push({ uid: state.nextUid++, defId: 'tide-sprite' });
  }
  const deckBefore = state.players[PLAYER].deck.length;
  drawCard(state, PLAYER);
  assert.equal(state.players[PLAYER].hand.length, RULES.maxHand);
  assert.equal(state.players[PLAYER].deck.length, deckBefore - 1);
});

test('the board holds at most 7 creatures', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 10;
  for (let i = 0; i < 7; i += 1) putMinion(state, PLAYER, 'tide-sprite');
  const extra = giveCard(state, PLAYER, 'ember-imp');
  assert.ok(playBlockReason(state, PLAYER, extra));
  assert.equal(playCard(state, PLAYER, extra, null), false);
});

test('a card that costs more than your mana cannot be played', () => {
  const state = createGame(7);
  state.players[PLAYER].mana = 1;
  const giant = giveCard(state, PLAYER, 'inferno-giant');
  assert.ok(playBlockReason(state, PLAYER, giant));
  assert.equal(playCard(state, PLAYER, giant, null), false);
  assert.equal(state.players[PLAYER].hand.some((c) => c.uid === giant), true);
});

test('reducing a lantern to 0 ends the duel with a winner', () => {
  const state = createGame(7);
  state.players[ENEMY].lantern = 3;
  const mine = putMinion(state, PLAYER, 'cinder-hound'); // 3 attack
  attack(state, PLAYER, mine, { type: 'lantern', player: ENEMY });
  assert.equal(isOver(state), true);
  assert.equal(state.winner, PLAYER);
  assert.match(state.winReason, /Lantern Keeper/);
});

test('Marina takes lethal: burn spell at the lantern when attacks finish it', () => {
  const state = createGame(7);
  // Marina's turn: give her a ready 3-attack creature and a burst in hand.
  state.turnPlayer = ENEMY;
  state.players[ENEMY].mana = 5;
  state.players[PLAYER].lantern = 6;
  putMinion(state, ENEMY, 'cinder-hound');
  giveCard(state, ENEMY, 'ember-burst');
  const action = planPlayAction(state, ENEMY, 'smart');
  assert.equal(action?.type, 'play');
  assert.equal(action?.target?.type, 'lantern', 'burn goes face for lethal');
  playCard(state, ENEMY, action.handUid, action.target);
  const strike = planAttackAction(state, ENEMY, 'smart');
  assert.equal(strike?.target?.type, 'lantern');
  attack(state, ENEMY, strike.uid, strike.target);
  assert.equal(isOver(state), true);
  assert.equal(state.winner, ENEMY);
});

test('Marina trades up: she kills a big threat for free instead of going face', () => {
  const state = createGame(7);
  state.turnPlayer = ENEMY;
  state.players[PLAYER].lantern = 30;
  putMinion(state, ENEMY, 'deep-leviathan'); // 5/6 — kills the hound and lives
  putMinion(state, PLAYER, 'cinder-hound'); // 3/2 — leviathan kills it, takes 3, survives at 3
  const strike = planAttackAction(state, ENEMY, 'smart');
  assert.equal(strike?.type, 'attack');
  assert.equal(strike?.target?.type, 'creature');
  attack(state, ENEMY, strike.uid, strike.target);
  assert.equal(state.players[PLAYER].board.length, 0);
  assert.equal(state.players[ENEMY].board[0].health, 3);
});

test('Marina mends when low and draws when her hand runs dry', () => {
  const state = createGame(7);
  state.turnPlayer = ENEMY;
  state.players[ENEMY].mana = 10;
  state.players[ENEMY].lantern = 10;
  state.players[ENEMY].hand = [];
  giveCard(state, ENEMY, 'grove-mend');
  giveCard(state, ENEMY, 'tide-surge');
  giveCard(state, ENEMY, 'ember-imp');
  const first = planPlayAction(state, ENEMY, 'smart');
  assert.equal(CARD_BY_ID[state.players[ENEMY].hand.find((c) => c.uid === first.handUid).defId].id, 'grove-mend');
  playCard(state, ENEMY, first.handUid, first.target);
  assert.equal(state.players[ENEMY].lantern, 16);
  const second = planPlayAction(state, ENEMY, 'smart');
  assert.equal(CARD_BY_ID[state.players[ENEMY].hand.find((c) => c.uid === second.handUid).defId].id, 'tide-surge');
});

test('twenty seeded smart-vs-smart duels all end with a winner', () => {
  let playerWins = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const state = createGame(seed);
    const winner = playFullGame(state, 'smart', 'smart');
    assert.ok(isOver(state), `seed ${seed} never ended`);
    assert.ok(winner === PLAYER || winner === ENEMY, `seed ${seed} has no winner`);
    assert.ok(state.turn <= 60, `seed ${seed} took ${state.turn} turns`);
    if (winner === PLAYER) playerWins += 1;
  }
  assert.ok(playerWins > 0 && playerWins < 20, `first-player edge should not sweep: ${playerWins}/20`);
});

test('a smart Keeper beats a careless Marina, and loses to a sharp one', () => {
  let smartWins = 0;
  let dumbWins = 0;
  for (let seed = 1; seed <= 10; seed += 1) {
    if (playFullGame(createGame(seed), 'smart', 'dumb') === PLAYER) smartWins += 1;
    if (playFullGame(createGame(seed), 'dumb', 'smart') === PLAYER) dumbWins += 1;
  }
  assert.ok(smartWins >= 8, `smart Keeper should usually win: ${smartWins}/10`);
  assert.ok(dumbWins <= 4, `careless Keeper should usually lose: ${dumbWins}/10`);
});

test('the staged scenes give a real table, win and loss', () => {
  const table = stageShot('table', 7);
  assert.equal(table.screen, 'play');
  assert.ok(table.state.players[PLAYER].board.length > 0, 'Keeper has creatures on the table');
  assert.ok(table.state.players[ENEMY].board.length > 0, 'Marina has creatures on the table');
  assert.ok(table.state.players[PLAYER].hand.length >= 3, 'Keeper holds cards');
  const win = stageShot('win', 11);
  assert.equal(win.screen, 'win');
  assert.equal(win.state.winner, PLAYER);
  const loss = stageShot('loss', 13);
  assert.equal(loss.screen, 'loss');
  assert.equal(loss.state.winner, ENEMY);
});

test('summarize reports the board in one line', () => {
  const state = createGame(7);
  assert.match(summarize(state), /turn 1 · you 30❤ 1\/1◆ hand 4 board 0 deck 26 · Marina 30❤/);
  assert.equal(readyAttackers(state, PLAYER).length, 0);
  assert.equal(totalAttack(state, PLAYER), 0);
});
