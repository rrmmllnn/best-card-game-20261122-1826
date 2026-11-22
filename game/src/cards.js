// Every card in Lantern Duel: four lantern factions, each told apart by colour,
// glyph and play style. Ember hits hard and dies fast, Tide is steady, Grove
// endures and mends, Star draws and strikes from afar. No card copies another
// game: these names, numbers and effects are written for this game alone.
//
// A card is: { id, name, faction, kind: 'creature' | 'spell', cost,
//   attack, health (creatures), text, effect }.
// effect is one of: 'none', 'draw1', 'draw2', 'damage3', 'damage4',
// 'heal6', 'flare2' (2 damage to every enemy creature), 'heal4self'.

// The four factions: colour, glyph and flavour. The glyph is drawn big in the
// middle of every card, so a faction is readable by shape as well as colour.
export const FACTIONS = {
  ember: { name: 'Ember', glyph: '🔥', colour: '#e2482a', dark: '#7d1f10', glow: '#ff7a4d' },
  tide: { name: 'Tide', glyph: '🌊', colour: '#2a7de2', dark: '#123f7d', glow: '#5fb2ff' },
  grove: { name: 'Grove', glyph: '🌿', colour: '#3da53d', dark: '#14521f', glow: '#7ed67e' },
  star: { name: 'Star', glyph: '✨', colour: '#c99a1e', dark: '#6b4d05', glow: '#ffd94d' },
};

export const CARD_POOL = [
  // --- Ember creatures: cheap, fierce, fragile ---
  { id: 'ember-imp', name: 'Ember Imp', faction: 'ember', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'A spark with teeth.', effect: 'none' },
  { id: 'ember-hound', name: 'Ember Hound', faction: 'ember', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'It hunts in a pack of one.', effect: 'none' },
  { id: 'ember-drake', name: 'Ember Drake', faction: 'ember', kind: 'creature', cost: 3, attack: 4, health: 3, text: 'Small wings, large temper.', effect: 'none' },
  { id: 'ember-phoenix', name: 'Ember Phoenix', faction: 'ember', kind: 'creature', cost: 4, attack: 5, health: 4, text: 'It burns brightest at dusk.', effect: 'none' },
  { id: 'ember-ashlord', name: 'Ash Lord', faction: 'ember', kind: 'creature', cost: 6, attack: 7, health: 5, text: 'The bonfire answers to him.', effect: 'none' },
  // --- Tide creatures: steady, even-tempered ---
  { id: 'tide-sprite', name: 'Tide Sprite', faction: 'tide', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'It rides every wave in.', effect: 'none' },
  { id: 'tide-crab', name: 'Tide Crab', faction: 'tide', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'Hard shell, soft heart.', effect: 'none' },
  { id: 'tide-serpent', name: 'Tide Serpent', faction: 'tide', kind: 'creature', cost: 3, attack: 3, health: 4, text: 'It coils where the river bends.', effect: 'none' },
  { id: 'tide-leviathan', name: 'Tide Leviathan', faction: 'tide', kind: 'creature', cost: 5, attack: 6, health: 6, text: 'The deep keeps its ledger.', effect: 'none' },
  // --- Grove creatures: tough, and they mend ---
  { id: 'grove-sprout', name: 'Grove Sprout', faction: 'grove', kind: 'creature', cost: 1, attack: 1, health: 3, text: 'Given time, it becomes a forest.', effect: 'none' },
  { id: 'grove-badger', name: 'Grove Badger', faction: 'grove', kind: 'creature', cost: 2, attack: 2, health: 4, text: 'It guards the old roots.', effect: 'none' },
  { id: 'grove-treant', name: 'Grove Treant', faction: 'grove', kind: 'creature', cost: 3, attack: 2, health: 6, text: 'Slow to wake, slower to fall.', effect: 'none' },
  { id: 'grove-ancient', name: 'Grove Ancient', faction: 'grove', kind: 'creature', cost: 5, attack: 4, health: 8, text: 'On play: mend your lantern 4.', effect: 'heal4self' },
  // --- Star creatures: bright, clever, they draw cards ---
  { id: 'star-mote', name: 'Star Mote', faction: 'star', kind: 'creature', cost: 1, attack: 1, health: 1, text: 'On play: draw a card.', effect: 'draw1' },
  { id: 'star-wisp', name: 'Star Wisp', faction: 'star', kind: 'creature', cost: 2, attack: 2, health: 2, text: 'On play: draw a card.', effect: 'draw1' },
  { id: 'star-owl', name: 'Star Owl', faction: 'star', kind: 'creature', cost: 3, attack: 3, health: 3, text: 'On play: draw a card.', effect: 'draw1' },
  { id: 'star-dragon', name: 'Star Dragon', faction: 'star', kind: 'creature', cost: 6, attack: 7, health: 7, text: 'It counts the sky like coins.', effect: 'none' },
  // --- Spells: one-shot lantern tricks ---
  { id: 'ember-burst', name: 'Ember Burst', faction: 'ember', kind: 'spell', cost: 2, text: 'Deal 3 damage to any creature or lantern.', effect: 'damage3' },
  { id: 'star-bolt', name: 'Star Bolt', faction: 'star', kind: 'spell', cost: 3, text: 'Deal 4 damage to any creature or lantern.', effect: 'damage4' },
  { id: 'tide-surge', name: 'Tide Surge', faction: 'tide', kind: 'spell', cost: 2, text: 'Draw 2 cards.', effect: 'draw2' },
  { id: 'grove-mend', name: 'Grove Mend', faction: 'grove', kind: 'spell', cost: 2, text: 'Mend your lantern for 6.', effect: 'heal6' },
  { id: 'lantern-flare', name: 'Lantern Flare', faction: 'star', kind: 'spell', cost: 4, text: 'Deal 2 damage to every enemy creature.', effect: 'flare2' },
  // The coin is not drawn from the deck in the usual way: the lantern that
  // moves second opens with one, to make up for moving second.
  { id: 'lantern-coin', name: 'Lantern Coin', faction: 'star', kind: 'spell', cost: 0, text: 'Gain 1 mana this turn.', effect: 'coin' },
];

export const CARD_BY_ID = Object.fromEntries(CARD_POOL.map((card) => [card.id, card]));

/**
 * Build a 30-card deck: two copies of every pool card, shuffled with the
 * given rng. Both lanterns draw from the same pool, so every game is a
 * different draft of the same lanterns.
 */
export function buildDeck(rng) {
  const ids = [];
  for (const card of CARD_POOL) {
    ids.push(card.id, card.id);
  }
  // 23 cards in the pool x 2 copies = 46; trim to a 30-card deck by dealing
  // the shuffled pool down, so each deck holds a different mix.
  const deck = [];
  const shuffled = ids.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  for (let i = 0; i < 30; i += 1) deck.push(shuffled[i]);
  return deck;
}
