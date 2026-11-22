// Lantern Duel — the 23 distinct cards, in four factions.
// A creature has attack/health and may carry keywords:
//   ranged — it takes no damage back when it attacks a creature.
//   mend N — your lantern heals N when the creature enters play.
//   draw N — you draw N cards when the creature enters play.
// A spell has an effect and, when it needs one, a target kind:
//   'enemy' (a creature or the enemy lantern), 'own-lantern', 'none'.
import { FACTIONS } from './config.js';

export const CARDS = [
  // ---- Ember: hits hard, dies fast ----
  { id: 'ember-imp', name: 'Ember Imp', faction: 'ember', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'Small, quick, and already on fire.' },
  { id: 'cinder-hound', name: 'Cinder Hound', faction: 'ember', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'It hunts the smell of smoke.' },
  { id: 'flame-wisp', name: 'Flame Wisp', faction: 'ember', kind: 'creature', cost: 2, attack: 4, health: 1, text: 'A spark that forgot to go out.' },
  { id: 'pyre-drake', name: 'Pyre Drake', faction: 'ember', kind: 'creature', cost: 4, attack: 5, health: 3, text: 'Its wings are banked coals.' },
  { id: 'inferno-giant', name: 'Inferno Giant', faction: 'ember', kind: 'creature', cost: 6, attack: 7, health: 4, text: 'Where it walks, the lanterns dim.' },
  // ---- Tide: steady and even-tempered ----
  { id: 'tide-sprite', name: 'Tide Sprite', faction: 'tide', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'Patient as the turning sea.' },
  { id: 'coral-guard', name: 'Coral Guard', faction: 'tide', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'It has never once hurried.' },
  { id: 'wave-rider', name: 'Wave Rider', faction: 'tide', kind: 'creature', cost: 3, attack: 3, health: 4, text: 'Rides the swell, never against it.' },
  { id: 'tidecaller', name: 'Tidecaller', faction: 'tide', kind: 'creature', cost: 3, attack: 2, health: 4, text: 'She asks the sea, and the sea answers.' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', faction: 'tide', kind: 'creature', cost: 5, attack: 5, health: 6, text: 'The tide itself, given teeth.' },
  // ---- Grove: tough, and it mends ----
  { id: 'sproutling', name: 'Sproutling', faction: 'grove', kind: 'creature', cost: 1, attack: 1, health: 3, mend: 1, text: 'Mend 1: your lantern heals 1.' },
  { id: 'thorn-bramble', name: 'Thorn Bramble', faction: 'grove', kind: 'creature', cost: 2, attack: 2, health: 4, mend: 1, text: 'Mend 1: your lantern heals 1.' },
  { id: 'moss-golem', name: 'Moss Golem', faction: 'grove', kind: 'creature', cost: 3, attack: 2, health: 6, mend: 2, text: 'Mend 2: your lantern heals 2.' },
  { id: 'bloom-warden', name: 'Bloom Warden', faction: 'grove', kind: 'creature', cost: 4, attack: 3, health: 5, mend: 2, text: 'Mend 2: your lantern heals 2.' },
  { id: 'ancient-treant', name: 'Ancient Treant', faction: 'grove', kind: 'creature', cost: 5, attack: 4, health: 7, mend: 2, text: 'Mend 2: your lantern heals 2.' },
  // ---- Star: draws cards, strikes from afar ----
  { id: 'star-moth', name: 'Star Moth', faction: 'star', kind: 'creature', cost: 1, attack: 1, health: 1, ranged: true, draw: 1, text: 'Ranged. Draw a card when played.' },
  { id: 'comet-archer', name: 'Comet Archer', faction: 'star', kind: 'creature', cost: 3, attack: 3, health: 2, ranged: true, text: 'Ranged: takes no damage back.' },
  { id: 'star-dragon', name: 'Star Dragon', faction: 'star', kind: 'creature', cost: 6, attack: 6, health: 5, ranged: true, draw: 1, text: 'Ranged. Draw a card when played.' },
  // ---- Spells, one of each ----
  { id: 'ember-burst', name: 'Ember Burst', faction: 'ember', kind: 'spell', cost: 2, effect: 'burst', target: 'enemy', text: 'Deal 3 damage to a creature or lantern.' },
  { id: 'star-bolt', name: 'Star Bolt', faction: 'star', kind: 'spell', cost: 3, effect: 'bolt', target: 'enemy', text: 'Deal 4 damage to a creature or lantern.' },
  { id: 'tide-surge', name: 'Tide Surge', faction: 'tide', kind: 'spell', cost: 2, effect: 'surge', target: 'none', text: 'Draw 2 cards.' },
  { id: 'grove-mend', name: 'Grove Mend', faction: 'grove', kind: 'spell', cost: 2, effect: 'mend', target: 'none', text: 'Heal your lantern for 6.' },
  { id: 'lantern-flare', name: 'Lantern Flare', faction: 'ember', kind: 'spell', cost: 4, effect: 'flare', target: 'none', text: 'Deal 2 damage to every enemy creature.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((card) => [card.id, card]));

/**
 * The 30-card deck both lanterns draw from: two copies of the workhorses,
 * one of the heavyweights, and the five spells. The same list is shuffled
 * separately for each side, so the duel is fair and the draw decides it.
 */
export const DECKLIST = [
  'ember-imp', 'ember-imp',
  'cinder-hound', 'cinder-hound',
  'flame-wisp',
  'pyre-drake',
  'inferno-giant',
  'tide-sprite', 'tide-sprite',
  'coral-guard', 'coral-guard',
  'wave-rider',
  'tidecaller',
  'deep-leviathan',
  'sproutling', 'sproutling',
  'thorn-bramble',
  'moss-golem',
  'bloom-warden',
  'ancient-treant',
  'star-moth',
  'comet-archer',
  'star-dragon',
  'ember-burst', 'ember-burst',
  'star-bolt', 'star-bolt',
  'tide-surge',
  'grove-mend',
  'lantern-flare',
];

export function factionOf(card) {
  return FACTIONS[card.faction];
}

export function describeCard(card) {
  const parts = [`${card.cost} mana`];
  if (card.kind === 'creature') parts.push(`${card.attack} attack, ${card.health} health`);
  if (card.ranged) parts.push('Ranged');
  if (card.mend) parts.push(`Mend ${card.mend}`);
  if (card.draw) parts.push(`Draw ${card.draw}`);
  parts.push(card.text);
  return parts.join(' — ');
}
