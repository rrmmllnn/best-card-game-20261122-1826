// Lantern Duel — the staged scenes behind ?shot=title|table|win|loss.
// Each one plays the real rules forward from a fresh game, so the frame is
// what a real game looks like, and the same seed always gives the same frame.
// The win scene is a smart Keeper against a careless Marina; the loss scene
// is the reverse — a real game, played badly on one side.
import { createGame, endTurn, isOver, playCard, attack, PLAYER, ENEMY } from './engine.js';
import { planPlayAction, planAttackAction } from './ai.js';

export function applyAction(state, player, action) {
  if (action.type === 'play') return playCard(state, player, action.handUid, action.target ?? null);
  return attack(state, player, action.uid, action.target);
}

/** Play one whole turn for `player`, instantly, with a guard against loops. */
export function runTurnInstant(state, player, style) {
  let guard = 0;
  let action = planPlayAction(state, player, style);
  while (action && !isOver(state) && guard < 40) {
    guard += 1;
    if (!applyAction(state, player, action)) break;
    action = planPlayAction(state, player, style);
  }
  guard = 0;
  let strike = planAttackAction(state, player, style);
  while (strike && !isOver(state) && guard < 20) {
    guard += 1;
    if (!applyAction(state, player, strike)) break;
    strike = planAttackAction(state, player, style);
  }
}

/** Play until the duel ends (fatigue always ends it) or the turn cap hits. */
export function playFullGame(state, playerStyle, foeStyle, maxTurns = 60) {
  while (!isOver(state) && state.turn <= maxTurns) {
    const player = state.turnPlayer;
    runTurnInstant(state, player, player === PLAYER ? playerStyle : foeStyle);
    if (isOver(state)) break;
    endTurn(state);
  }
  return state.winner;
}

/** Play `halfTurns` half-turns (one side's turn each), stopping early if over. */
function playHalfTurns(state, halfTurns, playerStyle, foeStyle) {
  for (let i = 0; i < halfTurns && !isOver(state); i += 1) {
    const player = state.turnPlayer;
    runTurnInstant(state, player, player === PLAYER ? playerStyle : foeStyle);
    if (isOver(state)) break;
    endTurn(state);
  }
}

/**
 * Stage the named scene and return the state plus the screen to draw over it.
 * Any other name stages the title.
 */
export function stageShot(name, seed) {
  if (name === 'table') {
    const state = createGame(seed);
    // A mid-game table: both sides have creatures, the Keeper holds cards,
    // and it is the Keeper's turn with mana to spend.
    let guard = 0;
    while (!isOver(state) && guard < 24) {
      guard += 1;
      playHalfTurns(state, 1, 'smart', 'smart');
      const you = state.players[PLAYER];
      const foe = state.players[ENEMY];
      if (
        state.turn >= 4
        && state.turnPlayer === PLAYER
        && you.board.length > 0
        && foe.board.length > 0
        && you.hand.length >= 3
      ) break;
    }
    return { state, screen: isOver(state) ? (state.winner === PLAYER ? 'win' : 'loss') : 'play' };
  }
  if (name === 'win') {
    const state = createGame(seed);
    playFullGame(state, 'smart', 'dumb');
    return { state, screen: state.winner === PLAYER ? 'win' : 'loss' };
  }
  if (name === 'loss') {
    const state = createGame(seed);
    playFullGame(state, 'dumb', 'smart');
    return { state, screen: state.winner === ENEMY ? 'loss' : 'win' };
  }
  const state = createGame(seed);
  return { state, screen: 'title' };
}
