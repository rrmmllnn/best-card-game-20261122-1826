// Lantern Duel's wiring: clicks, keys, the animated Marina turn, and the
// ?shot= scenes for screenshots. All rules live in game.js; this file only
// translates gestures into moves and re-renders the table after each one.
import { CARD_BY_ID } from './cards.js';
import { aiAttack, aiPlayCards } from './ai.js';
import { attack, canAttackWith, canPlayCard, createGame, endTurn, playCard, startGame } from './game.js';
import { render } from './render.js';
import { playAttackSound, playCardSound, playClick, playHurtSound, playLoseSound, playWinSound, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

let game = createGame((Math.random() * 2147483647) | 0);
let aiBusy = false;

function isDamageSpell(cardId) {
  const card = CARD_BY_ID[cardId];
  return card && card.kind === 'spell' && (card.effect === 'damage3' || card.effect === 'damage4');
}

function clearSelection() {
  game.selectedHand = -1;
  game.selectedAttacker = -1;
}

function afterMove() {
  render(game);
  if (game.winner) {
    if (game.winner === 'you') playWinSound();
    else playLoseSound();
  }
}

/** Marina's turn, played out where the player can watch: cards, a beat, attacks. */
function runAiTurn() {
  if (aiBusy || game.phase !== 'play' || game.active !== 'foe' || game.winner) return;
  aiBusy = true;
  aiPlayCards(game, 0.8);
  playCardSound();
  render(game);
  window.setTimeout(() => {
    if (game.winner) {
      aiBusy = false;
      afterMove();
      return;
    }
    aiAttack(game, 0.8);
    if (game.lastEvent && game.lastEvent.kind === 'attack') playAttackSound();
    if (game.lastEvent && game.lastEvent.kind === 'hero-hit') playHurtSound();
    render(game);
    window.setTimeout(() => {
      aiBusy = false;
      if (!game.winner) endTurn(game);
      afterMove();
    }, 650);
  }, 750);
}

function endYourTurn() {
  if (game.phase !== 'play' || game.active !== 'you' || game.winner || aiBusy) return;
  clearSelection();
  playClick();
  endTurn(game);
  render(game);
  window.setTimeout(runAiTurn, 500);
}

function playHandCard(index) {
  if (game.phase !== 'play' || game.active !== 'you' || game.winner || aiBusy) return;
  if (!canPlayCard(game, game.you, index)) return;
  const cardId = game.you.hand[index];
  if (isDamageSpell(cardId)) {
    game.selectedHand = game.selectedHand === index ? -1 : index;
    game.selectedAttacker = -1;
    playClick();
    render(game);
    return;
  }
  clearSelection();
  if (playCard(game, game.you, index, null)) {
    playCardSound();
    afterMove();
  }
}

function clickField(owner, uid) {
  if (game.phase !== 'play' || game.active !== 'you' || game.winner || aiBusy) return;
  if (owner === 'you') {
    if (!canAttackWith(game, game.you, uid)) return;
    game.selectedAttacker = game.selectedAttacker === uid ? -1 : uid;
    game.selectedHand = -1;
    playClick();
    render(game);
    return;
  }
  // An enemy creature: the target of an attack or a damage spell.
  if (game.selectedAttacker >= 0) {
    const attacker = game.selectedAttacker;
    clearSelection();
    if (attack(game, game.you, attacker, { kind: 'creature', side: 'foe', uid })) {
      playAttackSound();
      afterMove();
    }
  } else if (game.selectedHand >= 0) {
    const index = game.selectedHand;
    clearSelection();
    if (playCard(game, game.you, index, { kind: 'creature', side: 'foe', uid })) {
      playCardSound();
      afterMove();
    }
  }
}

function clickHero(which) {
  if (game.phase !== 'play' || game.active !== 'you' || game.winner || aiBusy) return;
  if (which !== 'foe') {
    clearSelection();
    render(game);
    return;
  }
  if (game.selectedAttacker >= 0) {
    const attacker = game.selectedAttacker;
    clearSelection();
    if (attack(game, game.you, attacker, { kind: 'hero', side: 'foe' })) {
      playAttackSound();
      playHurtSound();
      afterMove();
    }
  } else if (game.selectedHand >= 0) {
    const index = game.selectedHand;
    clearSelection();
    if (playCard(game, game.you, index, { kind: 'hero', side: 'foe' })) {
      playCardSound();
      afterMove();
    }
  }
}

function newGame() {
  game = createGame((Math.random() * 2147483647) | 0);
  aiBusy = false;
  clearSelection();
  render(game);
}

function startPlaying() {
  unlockAudio();
  startGame(game);
  playCardSound();
  render(game);
}

function onClick(event) {
  const target = event.target.closest('[data-hand], [data-field], [data-hero], #play-button, #again-button, #end-turn, #mute-button, #restart-button');
  if (!target) return;
  if (target.id === 'play-button') {
    startPlaying();
    return;
  }
  if (target.id === 'again-button') {
    newGame();
    startPlaying();
    return;
  }
  if (target.id === 'restart-button') {
    newGame();
    return;
  }
  if (target.id === 'mute-button') {
    unlockAudio();
    const muted = toggleMute();
    target.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    return;
  }
  if (target.id === 'end-turn') {
    endYourTurn();
    return;
  }
  if (target.hasAttribute('data-hand')) {
    playHandCard(Number(target.getAttribute('data-hand')));
    return;
  }
  if (target.hasAttribute('data-field')) {
    const [owner, uid] = target.getAttribute('data-field').split(':');
    clickField(owner, Number(uid));
    return;
  }
  if (target.hasAttribute('data-hero')) {
    clickHero(target.getAttribute('data-hero'));
  }
}

function onKey(event) {
  if (event.key === 'Escape') {
    clearSelection();
    render(game);
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    if (game.phase === 'title') {
      startPlaying();
      return;
    }
    if (game.phase === 'over') {
      newGame();
      startPlaying();
      return;
    }
    endYourTurn();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    if (game.phase === 'over') {
      newGame();
      startPlaying();
    }
    return;
  }
  if (event.key === 'm' || event.key === 'M') {
    toggleMute();
    render(game);
    return;
  }
  const digit = Number(event.key);
  if (digit >= 1 && digit <= 7) playHandCard(digit - 1);
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    document.body.classList.add('shot-mode');
    const seed = Number(params.get('seed') || '7');
    game = stageShot(shot, Number.isFinite(seed) ? seed : 7);
    render(game);
    document.title = `Lantern Duel — ${shot}`;
    return;
  }
  document.getElementById('app').addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  render(game);
}

boot();
