// Lantern Duel — the table, painted as DOM. Every re-render rebuilds the
// dynamic regions from the engine state, so what the player sees is always
// exactly what the rules say. Clicks are handled by delegation in input.js,
// so rebuilding never drops a listener.
import { CARD_BY_ID } from './cards.js';
import { FACTIONS, RULES } from './config.js';
import { ENEMY, PLAYER, attackBlockReason, isOver, playBlockReason, readyAttackers } from './engine.js';

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function factionGlyph(def) {
  return FACTIONS[def.faction].glyph;
}

/** One card face: cost gem, faction banner, art glyph, rules text, stats. */
export function cardFace(def, opts = {}) {
  const faction = FACTIONS[def.faction];
  // NOTE: the size class must not be 'hand' or 'board' — those are the
  // container classes, and a card wearing one inherits the row's flex layout.
  const sizeClass = opts.size === 'board' ? 'size-board' : 'size-hand';
  const cls = [
    'card',
    `fac-${def.faction}`,
    sizeClass,
    opts.playable ? 'playable' : '',
    opts.selected ? 'selected' : '',
    opts.canAttack ? 'can-attack' : '',
    opts.sick ? 'sick' : '',
  ].filter(Boolean).join(' ');
  const stats = def.kind === 'creature'
    ? `<span class="stat atk" title="Attack">⚔️ ${opts.attack ?? def.attack}</span><span class="stat hp" title="Health">❤️ ${opts.health ?? def.health}</span>`
    : `<span class="stat spell-tag">SPELL</span>`;
  const keywords = [];
  if (def.ranged) keywords.push('Ranged');
  if (def.mend) keywords.push(`Mend ${def.mend}`);
  if (def.draw) keywords.push(`Draw ${def.draw}`);
  return `<div class="${cls}" data-uid="${opts.uid ?? ''}" data-def="${def.id}" title="${esc(def.name)} — ${esc(def.text)}">
    <span class="cost" title="Mana cost">◆ ${def.cost}</span>
    <span class="faction">${faction.glyph} ${faction.name}</span>
    <span class="art" aria-hidden="true">${faction.glyph}</span>
    <span class="name">${esc(def.name)}</span>
    <span class="rules">${keywords.length ? `<b>${keywords.join(' · ')}</b><br>` : ''}${esc(def.text)}</span>
    <span class="stats">${stats}</span>
  </div>`;
}

function cardBack(index) {
  return `<div class="card back" data-index="${index}" title="Marina's card"><span class="art">🏮</span><span class="name">Marina</span></div>`;
}

function manaPips(crystals, mana) {
  let pips = '';
  for (let i = 0; i < RULES.maxManaCrystals; i += 1) {
    if (i < mana) pips += '<span class="pip lit">◆</span>';
    else if (i < crystals) pips += '<span class="pip spent">◆</span>';
    else pips += '<span class="pip empty">◇</span>';
  }
  return `<span class="pips">${pips}</span><span class="mana-num">${mana}/${crystals} mana</span>`;
}

function lanternHtml(side, who) {
  const pct = Math.max(0, Math.round((side.lantern / RULES.maxLantern) * 100));
  return `<div class="lantern ${who}" data-lantern="${who}">
    <span class="lantern-icon" aria-hidden="true">🏮</span>
    <span class="lantern-life">${side.lantern}</span>
    <span class="lantern-bar"><span style="width:${pct}%"></span></span>
    <span class="lantern-name">${esc(side.name)}</span>
  </div>`;
}

export function createRenderer(stage) {
  const foeBar = stage.querySelector('#foe-bar');
  const foeBoard = stage.querySelector('#foe-board');
  const midBar = stage.querySelector('#mid-bar');
  const myBoard = stage.querySelector('#my-board');
  const myHand = stage.querySelector('#my-hand');
  const myBar = stage.querySelector('#my-bar');
  const overlay = stage.querySelector('#overlay');

  function draw(state, ui) {
    const you = state.players[PLAYER];
    const foe = state.players[ENEMY];
    const yourTurn = state.turnPlayer === PLAYER && !isOver(state);

    // --- Opponent bar: lantern, mana, deck, face-down hand ---
    foeBar.innerHTML = `
      ${lanternHtml(foe, 'foe')}
      <div class="bar-mid">${manaPips(foe.manaCrystals, foe.mana)}</div>
      <div class="bar-right">
        <span class="deck" title="Cards left in Marina's deck">🂠 Deck ${foe.deck.length}</span>
        <span class="hand-count" title="Cards in Marina's hand">✋ ${foe.hand.length}</span>
        <span class="fatigue" title="Fatigue damage if Marina draws from an empty deck">${foe.fatigue > 0 ? `Fatigue ${foe.fatigue}` : ''}</span>
      </div>
      <div class="foe-hand">${foe.hand.map((_, i) => cardBack(i)).join('')}</div>`;

    // --- Opponent board ---
    foeBoard.innerHTML = foe.board.length === 0
      ? '<div class="board-empty">Marina has no creatures — her side of the table is bare.</div>'
      : foe.board.map((m) => {
        const def = CARD_BY_ID[m.defId];
        return cardFace(def, { size: 'board', uid: m.uid, attack: m.attack, health: m.health, sick: m.sick });
      }).join('');

    // --- Middle bar: turn banner, latest events, End Turn ---
    const banner = isOver(state)
      ? (state.winner === PLAYER ? '🏮 Your lantern still burns — you win!' : '🌊 Marina’s tide has drowned your flame.')
      : yourTurn
        ? (ui.targeting ? `Choose a target for ${esc(CARD_BY_ID[ui.targetingDef].name)} — click an enemy creature or lantern, or Esc to cancel.`
          : ui.selectedAttackerUid ? 'Choose a target — click an enemy creature or Marina’s lantern.'
          : 'Your turn — play cards, then attack. Click a glowing creature, then its target.')
        : 'Marina is thinking…';
    const logLines = state.log.slice(-3).map((line) => `<div>${esc(line)}</div>`).join('');
    midBar.innerHTML = `
      <div class="banner">${banner}</div>
      <div class="log">${logLines}</div>
      <button id="end-turn" ${yourTurn ? '' : 'disabled'}>End Turn ⏎</button>`;

    // --- Your board ---
    const ready = new Set(readyAttackers(state, PLAYER).map((m) => m.uid));
    myBoard.innerHTML = you.board.length === 0
      ? '<div class="board-empty">Your side of the table is bare — play a creature.</div>'
      : you.board.map((m) => {
        const def = CARD_BY_ID[m.defId];
        return cardFace(def, {
          size: 'board',
          uid: m.uid,
          attack: m.attack,
          health: m.health,
          sick: m.sick,
          canAttack: yourTurn && ready.has(m.uid),
          selected: ui.selectedAttackerUid === m.uid,
        });
      }).join('');

    // --- Your hand ---
    myHand.innerHTML = you.hand.map((card, index) => {
      const def = CARD_BY_ID[card.defId];
      const playable = yourTurn && !playBlockReason(state, PLAYER, card.uid);
      return cardFace(def, {
        size: 'hand',
        uid: card.uid,
        playable,
        selected: ui.selectedHandUid === card.uid,
      }).replace('data-uid=', `data-index="${index + 1}" data-uid=`);
    }).join('') || '<div class="board-empty">Your hand is empty — draw and endure.</div>';

    // --- Your bar: lantern, mana, deck, buttons ---
    myBar.innerHTML = `
      ${lanternHtml(you, 'me')}
      <div class="bar-mid">${manaPips(you.manaCrystals, you.mana)}</div>
      <div class="bar-right">
        <span class="deck" title="Cards left in your deck">🂠 Deck ${you.deck.length}</span>
        <span class="fatigue" title="Fatigue damage if you draw from an empty deck">${you.fatigue > 0 ? `Fatigue ${you.fatigue}` : ''}</span>
        <span class="turn-count">Turn ${state.turn}</span>
        <button id="help-btn" type="button">How to play</button>
        <button id="restart-btn" type="button">Restart</button>
      </div>`;

    drawOverlay(state, ui);
  }

  function drawOverlay(state, ui) {
    if (ui.screen === 'title') {
      overlay.innerHTML = `<div class="panel title-panel">
        <div class="title-glyph">🏮 🔥 💧 🍃 ⭐</div>
        <h1>Lantern Duel</h1>
        <p class="tagline">Two lanterns. Thirty lives. One keeper walks away.</p>
        <p>You are the <b>Lantern Keeper</b>, duelling <b>Marina, Keeper of Tides</b>.
        Each turn you gain a mana crystal, refill your mana and draw a card.
        Play creatures, cast spells, then attack — shatter her lantern before she shatters yours.
        An empty deck burns you: fatigue 1, then 2, then 3…</p>
        <div class="factions">
          ${Object.values(FACTIONS).map((f) => `<span><b>${f.glyph} ${f.name}</b> — ${f.text}</span>`).join('')}
        </div>
        <p class="keys">Mouse: click a card, then its target · Keys: 1–9 play a card · Enter ends the turn · Esc cancels</p>
        <button id="begin-btn" type="button">Begin the Duel</button>
        <p class="fine">23 cards · 4 factions · 5 spells · fully offline, no account, no network</p>
      </div>`;
      overlay.classList.add('show');
    } else if (ui.screen === 'win' || ui.screen === 'loss') {
      const won = ui.screen === 'win';
      overlay.innerHTML = `<div class="panel end-panel ${won ? 'won' : 'lost'}">
        <div class="end-glyph">${won ? '🏮' : '🌊'}</div>
        <h1>${won ? 'Victory!' : 'Defeat'}</h1>
        <p class="tagline">${won ? 'Your lantern still burns. Marina bows, and the tide goes out.' : 'Marina’s tide has drowned your flame. Her lantern burns on.'}</p>
        <p>${esc(state.winReason)} The duel lasted ${state.turn} turn${state.turn === 1 ? '' : 's'}.
        Your lantern stood at ${state.players[PLAYER].lantern} — Marina’s at ${state.players[ENEMY].lantern}.</p>
        <button id="again-btn" type="button">Duel Again</button>
      </div>`;
      overlay.classList.add('show');
    } else {
      overlay.innerHTML = '';
      overlay.classList.remove('show');
    }
  }

  function toast(message) {
    const node = stage.querySelector('#toast');
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove('show'), 2200);
  }

  return { draw, toast };
}
