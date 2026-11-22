// Lantern Duel's table: every pixel the player sees, drawn as DOM so the
// cards stay legible at thumbnail size. One render pass rebuilds the table
// from the game state; clicks are delegated from #app and answered in main.js.
import { CARD_BY_ID, FACTIONS } from './cards.js';

const GLYPH_SWORD = '⚔';
const GLYPH_HEART = '❤';
const GLYPH_MANA = '◆';

function factionClass(faction) {
  return `faction-${faction}`;
}

function manaPips(side) {
  let pips = '';
  for (let i = 0; i < 10; i += 1) {
    pips += `<span class="pip${i < side.mana ? ' full' : ''}${i < side.manaCrystals ? '' : ' empty'}">${GLYPH_MANA}</span>`;
  }
  return `<span class="mana" title="Mana ${side.mana}/${side.manaCrystals}">${pips}<b>${side.mana}/${side.manaCrystals}</b></span>`;
}

function heroHtml(game, which) {
  const side = which === 'you' ? game.you : game.foe;
  const isTarget = game.selectedAttacker >= 0 && which === 'foe';
  const isSpellTarget = game.selectedHand >= 0 && which === 'foe';
  const targetable = (isTarget || isSpellTarget) && game.phase === 'play' && game.active === 'you';
  const low = side.life <= 10 ? ' low' : '';
  return `<button class="hero${low}${targetable ? ' targetable' : ''}" data-hero="${which}" aria-label="${side.name} lantern, ${side.life} life">
    <span class="hero-face">${which === 'you' ? '🏮' : '🧜'}</span>
    <span class="hero-name">${side.name}</span>
    <span class="hero-title">${side.title}</span>
    <span class="hero-life">${GLYPH_HEART} ${side.life}</span>
  </button>`;
}

/** A card in the hand: full art, cost gem, glyph, name, rules text, stats. */
export function handCardHtml(game, cardId, index) {
  const card = CARD_BY_ID[cardId];
  const side = game.you;
  const playable = game.phase === 'play' && game.active === 'you' && card.cost <= side.mana
    && (card.kind === 'spell' || side.field.length < 6);
  const selected = game.selectedHand === index;
  const stats = card.kind === 'creature'
    ? `<span class="stat atk">${GLYPH_SWORD} ${card.attack}</span><span class="stat hp">${GLYPH_HEART} ${card.health}</span>`
    : `<span class="stat spell-tag">SPELL</span>`;
  return `<button class="card ${factionClass(card.faction)}${playable ? ' playable' : ' unplayable'}${selected ? ' selected' : ''}"
      data-hand="${index}" aria-label="${card.name}, cost ${card.cost}">
    <span class="cost">${card.cost}</span>
    <span class="glyph" style="color:${FACTIONS[card.faction].colour}">${FACTIONS[card.faction].glyph}</span>
    <span class="card-name">${card.name}</span>
    <span class="card-text">${card.text}</span>
    ${stats}
  </button>`;
}

/** A creature standing on the table: compact, with live attack and health. */
function fieldCardHtml(game, creature, owner) {
  const card = CARD_BY_ID[creature.cardId];
  const mine = owner === 'you';
  const myTurn = game.phase === 'play' && game.active === 'you';
  const ready = mine && myTurn && creature.canAttack;
  const selected = game.selectedAttacker === creature.uid;
  const hurt = creature.health < creature.maxHealth;
  const targetable = !mine && game.selectedAttacker >= 0 && myTurn;
  return `<button class="card field-card ${factionClass(card.faction)}${ready ? ' ready' : ''}${selected ? ' selected' : ''}${targetable ? ' targetable' : ''}${creature.canAttack ? '' : ' sleeping'}"
      data-field="${owner}:${creature.uid}" aria-label="${creature.name}, attack ${creature.attack}, health ${creature.health}">
    <span class="cost">${card.cost}</span>
    <span class="glyph" style="color:${FACTIONS[card.faction].colour}">${FACTIONS[card.faction].glyph}</span>
    <span class="card-name">${creature.name}</span>
    <span class="stat atk">${GLYPH_SWORD} ${creature.attack}</span>
    <span class="stat hp${hurt ? ' hurt' : ''}">${GLYPH_HEART} ${creature.health}</span>
  </button>`;
}

function cardBackHtml() {
  return `<div class="card card-back" aria-hidden="true"><span class="back-glyph">🏮</span><span class="back-text">LANTERN<br>DUEL</span></div>`;
}

function renderTitle(game) {
  return `<div class="overlay title-screen">
    <div class="title-panel">
      <div class="title-lanterns">🏮&nbsp;🔥&nbsp;🌊&nbsp;🌿&nbsp;✨</div>
      <h1>LANTERN<br>DUEL</h1>
      <p class="tagline">Four lanterns. One table. Outlast Marina, Keeper of Tides.</p>
      <div class="rules">
        <div><b>❤ 30 life</b> — reduce Marina's lantern to 0 to win.</div>
        <div><b>◆ Mana</b> — gain +1 crystal each turn; cards cost mana to play.</div>
        <div><b>⚔ Attack</b> — click your glowing creature, then an enemy creature or her lantern.</div>
        <div><b>🔥 🌊 🌿 ✨</b> — Ember hits hard, Tide holds steady, Grove mends, Star draws.</div>
        <div><b>Keys</b> — 1–7 play a hand card · Enter ends your turn · Esc cancels.</div>
        <div>Marina moves second, so she opens with an extra card and a Lantern Coin.</div>
      </div>
      <button class="big-button" id="play-button">Light the Lanterns — Play</button>
      <p class="fine">A complete card duel: 30-card decks, mana, creatures, spells, fatigue. No luck but the draw.</p>
    </div>
  </div>`;
}

function renderEnd(game) {
  const won = game.winner === 'you';
  return `<div class="overlay end-screen ${won ? 'win' : 'loss'}">
    <div class="end-panel">
      <div class="end-glyph">${won ? '🏆' : '🌑'}</div>
      <h1>${won ? 'VICTORY!' : 'DEFEAT'}</h1>
      <p class="end-line">${won
    ? 'Marina’s lantern goes dark. The four lanterns are yours, Keeper.'
    : 'Your lantern goes dark. Marina keeps the tides — this time.'}</p>
      <div class="end-stats">
        <div><span>Turns</span><b>${game.stats.turnsPlayed}</b></div>
        <div><span>Cards played</span><b>${game.stats.cardsPlayed}</b></div>
        <div><span>Damage dealt</span><b>${game.stats.damageDealt}</b></div>
        <div><span>Your life</span><b>${game.you.life}</b></div>
        <div><span>Marina's life</span><b>${game.foe.life}</b></div>
      </div>
      <button class="big-button" id="again-button">Play Again</button>
      <p class="fine">Press R to shuffle a new game.</p>
    </div>
  </div>`;
}

/** Rebuild the whole table from `game`. Call after every move. */
export function render(game) {
  const app = document.getElementById('app');
  const foe = game.foe;
  const you = game.you;
  const myTurn = game.phase === 'play' && game.active === 'you';
  const pill = game.phase === 'title' ? 'Title'
    : game.phase === 'over' ? 'Game over'
    : `Turn ${game.turn} · ${myTurn ? 'Your turn' : 'Marina’s turn'}`;
  const prompt = game.winner
    ? (game.winner === 'you' ? 'Victory is yours!' : 'Marina takes this one.')
    : myTurn
      ? 'Your turn — play a card, attack, or end your turn.'
      : 'Marina is thinking…';
  const lastLog = game.log[game.log.length - 1] || '';

  let foeHand = '';
  for (let i = 0; i < foe.hand.length; i += 1) foeHand += cardBackHtml();

  let foeField = foe.field.map((c) => fieldCardHtml(game, c, 'foe')).join('');
  if (!foeField) foeField = '<div class="field-empty">Marina’s side of the table is empty.</div>';
  let youField = you.field.map((c) => fieldCardHtml(game, c, 'you')).join('');
  if (!youField) youField = '<div class="field-empty">Your creatures will stand here.</div>';

  app.innerHTML = `
  <header class="topbar">
    <div class="brand">🏮 LANTERN DUEL</div>
    <div class="turn-pill">${pill}</div>
    <div class="top-actions">
      <button id="mute-button" class="small-button" aria-label="Toggle sound">🔊 Sound</button>
      <button id="restart-button" class="small-button" aria-label="Restart game">↻ Restart</button>
    </div>
  </header>
  <section class="side foe-side">
    <div class="side-info">
      ${heroHtml(game, 'foe')}
      <div class="side-meta">${manaPips(foe)}<span class="deck">🂠 Deck ${foe.deck.length}</span></div>
    </div>
    <div class="side-table">
      <div class="hand foe-hand" aria-label="Marina's hand">${foeHand}</div>
      <div class="field foe-field">${foeField}</div>
    </div>
  </section>
  <div class="midbar">
    <span class="prompt">${prompt}</span>
    <span class="log-line">${lastLog}</span>
  </div>
  <section class="side you-side">
    <div class="side-table">
      <div class="field you-field">${youField}</div>
      <div class="hand you-hand" aria-label="Your hand">
        ${you.hand.map((cardId, i) => handCardHtml(game, cardId, i)).join('') || '<div class="field-empty">Your hand is empty — draw!</div>'}
      </div>
    </div>
    <div class="side-info">
      ${heroHtml(game, 'you')}
      <div class="side-meta">${manaPips(you)}<span class="deck">🂠 Deck ${you.deck.length}</span></div>
      <button id="end-turn" class="end-turn${myTurn ? '' : ' disabled'}" ${myTurn ? '' : 'disabled'}>End Turn ⏎</button>
    </div>
  </section>
  ${game.phase === 'title' ? renderTitle(game) : ''}
  ${game.phase === 'over' ? renderEnd(game) : ''}`;

  // A hero that just took a hit flashes once (skipped in screenshot mode).
  const event = game.lastEvent;
  if (event && event.kind === 'hero-hit' && !document.body.classList.contains('shot-mode')) {
    const hero = app.querySelector(`[data-hero="${event.side}"]`);
    if (hero) {
      hero.classList.add('hit-flash');
      window.setTimeout(() => hero.classList.remove('hit-flash'), 450);
    }
  }
}
