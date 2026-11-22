// Lantern Duel — every tuning number and colour in one place.
// The table is a fixed 1280x800 stage; the page never scales it, so no
// rule below depends on the window size.
export const STAGE = { width: 1280, height: 800 };

export const RULES = {
  startLantern: 30,
  maxLantern: 30,
  maxManaCrystals: 10,
  startHand: 3,
  maxHand: 10,
  maxBoard: 7,
  deckSize: 30,
};

/** The four factions. Colour AND glyph tell them apart, never colour alone. */
export const FACTIONS = {
  ember: { name: 'Ember', glyph: '🔥', colour: '#e0533d', dark: '#7e2417', text: 'Hits hard, dies fast.' },
  tide: { name: 'Tide', glyph: '💧', colour: '#3d8fe0', dark: '#174a7e', text: 'Steady and even-tempered.' },
  grove: { name: 'Grove', glyph: '🍃', colour: '#4da34d', dark: '#1f5c26', text: 'Tough, and it mends.' },
  star: { name: 'Star', glyph: '⭐', colour: '#d9a441', dark: '#7a5514', text: 'Draws cards, strikes from afar.' },
};

export const PALETTE = {
  felt: '#20242e',
  feltEdge: '#2c3140',
  panel: '#262b38',
  panelEdge: '#3a4152',
  gold: '#e8c15a',
  text: '#f2ead8',
  muted: '#a9aec0',
  playerGlow: '#e8c15a',
  enemyGlow: '#e0533d',
  mana: '#5aa9e6',
  health: '#e0533d',
  attack: '#f2c94c',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
