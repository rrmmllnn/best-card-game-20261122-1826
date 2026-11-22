// Lantern Duel — boot and the one controller: input becomes engine calls,
// the engine answers, and the renderer paints what is there. Marina's turn
// runs the same planners the screenshot scenes use, one action at a time
// with a pause between them so the player can watch her think.
//
// ?seed=N fixes the shuffle. ?shot=title|table|win|loss stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. ?selftest=1 plays a whole duel headlessly and writes
// the result into the page, so a smoke test can read it back.
import { CARD_BY_ID } from './cards.js';
import { ENEMY, PLAYER, attack, attackBlockReason, createGame, endTurn, isOver, playBlockReason, playCard } from './engine.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { applyAction, playFullGame, stageShot } from './shots.js';
import { planAttackAction, planPlayAction } from './ai.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const uitest = params.get('uitest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const stage = document.getElementById('stage');
const renderer = createRenderer(stage);

let state = createGame(seed);
let ui = freshUi('title');
let busy = false;

function freshUi(screen) {
  return { screen, selectedHandUid: null, selectedAttackerUid: null, targeting: null, targetingDef: null };
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function refresh() {
  renderer.draw(state, ui);
}

function checkOver() {
  if (!isOver(state)) return;
  ui.screen = state.winner === PLAYER ? 'win' : 'loss';
  ui.selectedHandUid = null;
  ui.selectedAttackerUid = null;
  ui.targeting = null;
  refresh();
}

function cancelSelection() {
  ui.selectedHandUid = null;
  ui.selectedAttackerUid = null;
  ui.targeting = null;
  ui.targetingDef = null;
}

function onHandCard(handUid) {
  if (busy || isOver(state) || ui.screen !== 'play') return;
  const card = state.players[PLAYER].hand.find((c) => c.uid === handUid);
  if (!card) return;
  const def = CARD_BY_ID[card.defId];
  const blocked = playBlockReason(state, PLAYER, handUid);
  if (blocked) {
    renderer.toast(blocked);
    return;
  }
  if (def.kind === 'spell' && def.target === 'enemy') {
    ui.selectedHandUid = handUid;
    ui.targeting = { handUid };
    ui.targetingDef = def.id;
    ui.selectedAttackerUid = null;
    refresh();
    return;
  }
  cancelSelection();
  playCard(state, PLAYER, handUid, null);
  checkOver();
  refresh();
}

function onMyMinion(uid) {
  if (busy || isOver(state) || ui.screen !== 'play') return;
  if (ui.targeting) return; // spells never target your own side.
  const blocked = attackBlockReason(state, PLAYER, uid);
  if (blocked) {
    renderer.toast(blocked);
    return;
  }
  ui.selectedAttackerUid = ui.selectedAttackerUid === uid ? null : uid;
  ui.selectedHandUid = null;
  refresh();
}

function onFoeMinion(uid) {
  if (busy || isOver(state) || ui.screen !== 'play') return;
  if (ui.targeting) {
    const handUid = ui.targeting.handUid;
    cancelSelection();
    playCard(state, PLAYER, handUid, { type: 'creature', player: ENEMY, uid });
    checkOver();
    refresh();
    return;
  }
  if (ui.selectedAttackerUid === null) {
    renderer.toast('Choose one of your glowing creatures first, then its target.');
    return;
  }
  const attacker = ui.selectedAttackerUid;
  cancelSelection();
  attack(state, PLAYER, attacker, { type: 'creature', player: ENEMY, uid });
  checkOver();
  refresh();
}

function onFoeLantern() {
  if (busy || isOver(state) || ui.screen !== 'play') return;
  if (ui.targeting) {
    const handUid = ui.targeting.handUid;
    cancelSelection();
    playCard(state, PLAYER, handUid, { type: 'lantern', player: ENEMY });
    checkOver();
    refresh();
    return;
  }
  if (ui.selectedAttackerUid === null) {
    renderer.toast('Choose one of your glowing creatures first, then Marina’s lantern.');
    return;
  }
  const attacker = ui.selectedAttackerUid;
  cancelSelection();
  attack(state, PLAYER, attacker, { type: 'lantern', player: ENEMY });
  checkOver();
  refresh();
}

async function runAiTurn() {
  busy = true;
  refresh();
  await sleep(650);
  let action = planPlayAction(state, ENEMY, 'smart');
  while (action && !isOver(state)) {
    applyAction(state, ENEMY, action);
    refresh();
    await sleep(600);
    action = planPlayAction(state, ENEMY, 'smart');
  }
  let strike = planAttackAction(state, ENEMY, 'smart');
  while (strike && !isOver(state)) {
    applyAction(state, ENEMY, strike);
    refresh();
    await sleep(650);
    strike = planAttackAction(state, ENEMY, 'smart');
  }
  if (!isOver(state)) {
    endTurn(state);
    refresh();
  }
  busy = false;
  checkOver();
  refresh();
}

async function onEndTurn() {
  if (busy || isOver(state) || ui.screen !== 'play' || state.turnPlayer !== PLAYER) return;
  cancelSelection();
  endTurn(state);
  refresh();
  await runAiTurn();
}

function newDuel() {
  state = createGame(Math.floor(Math.random() * 4294967296));
  ui = freshUi('play');
  busy = false;
  refresh();
}

createInput(stage, {
  onHandCard,
  onMyMinion,
  onFoeMinion,
  onFoeLantern,
  onEndTurn,
  onBegin: () => {
    ui.screen = 'play';
    refresh();
  },
  onPlayAgain: () => newDuel(),
  onRestart: () => newDuel(),
  onHelp: () => {
    ui.screen = 'title';
    refresh();
  },
  onCancel: () => {
    cancelSelection();
    refresh();
  },
  onConfirm: () => {
    if (ui.screen === 'title') {
      ui.screen = 'play';
      refresh();
    } else if (ui.screen === 'win' || ui.screen === 'loss') {
      newDuel();
    } else {
      void onEndTurn();
    }
  },
  onHandNumber: (digit) => {
    const card = state.players[PLAYER].hand[digit - 1];
    if (card) onHandCard(card.uid);
  },
});

function runShot(name) {
  const staged = stageShot(name, seed);
  state = staged.state;
  ui = freshUi(staged.screen);
  refresh();
  let painted = 0;
  function paint() {
    renderer.draw(state, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runSelftest() {
  const result = document.getElementById('selftest');
  try {
    const testState = createGame(seed);
    const winner = playFullGame(testState, 'smart', 'smart');
    const text = `SELFTEST winner=${winner === PLAYER ? 'player' : 'marina'} turns=${testState.turn} ` +
      `playerLantern=${testState.players[PLAYER].lantern} marinaLantern=${testState.players[ENEMY].lantern} ` +
      `logLines=${testState.log.length} errors=0`;
    result.textContent = text;
    document.title = text;
  } catch (error) {
    const text = `SELFTEST errors=1 ${String(error && error.message ? error.message : error)}`;
    result.textContent = text;
    document.title = text;
  }
  window.__shotReady = true;
}

/**
 * Drive the real UI in the browser: click Begin, play every playable card,
 * attack with every ready creature, end the turn, and let Marina answer —
 * until the duel ends. It exercises the same delegated click handlers a
 * player uses, so a pass means a full game can be played to a win or a loss
 * without errors. Reports into #selftest and the page title.
 */
async function runUiTest() {
  const result = document.getElementById('selftest');
  try {
    refresh(); // paint the title screen, so its Begin button exists to click.
    document.getElementById('begin-btn').click();
    await sleep(100);
    let rounds = 0;
    while (!isOver(state) && rounds < 40) {
      rounds += 1;
      for (let i = 0; i < 12 && !isOver(state); i += 1) {
        const card = document.querySelector('#my-hand .card.playable');
        if (!card) break;
        card.click();
        await sleep(60);
        if (ui.targeting) {
          // A targeted spell: aim it at Marina's lantern.
          document.querySelector('[data-lantern="foe"]').click();
          await sleep(60);
        }
      }
      for (let i = 0; i < 10 && !isOver(state); i += 1) {
        const attacker = document.querySelector('#my-board .card.can-attack');
        if (!attacker) break;
        attacker.click();
        await sleep(60);
        document.querySelector('[data-lantern="foe"]').click();
        await sleep(60);
      }
      if (isOver(state)) break;
      const endTurnButton = document.getElementById('end-turn');
      if (endTurnButton && !endTurnButton.disabled) endTurnButton.click();
      for (let w = 0; w < 200 && busy; w += 1) await sleep(100);
      await sleep(100);
    }
    const text = `UITEST winner=${isOver(state) ? (state.winner === PLAYER ? 'player' : 'marina') : 'none'} ` +
      `rounds=${rounds} turns=${state.turn} ` +
      `playerLantern=${state.players[PLAYER].lantern} marinaLantern=${state.players[ENEMY].lantern} ` +
      `logLines=${state.log.length} errors=0`;
    result.textContent = text;
    document.title = text;
  } catch (error) {
    const text = `UITEST errors=1 ${String(error && error.message ? error.message : error)}`;
    result.textContent = text;
    document.title = text;
  }
  window.__shotReady = true;
}

if (selftest) {
  runSelftest();
} else if (uitest) {
  void runUiTest();
} else if (shot) {
  runShot(shot);
} else {
  refresh();
}
