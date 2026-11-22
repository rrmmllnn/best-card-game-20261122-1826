// All sound in Lantern Duel is synthesised with WebAudio: short oscillator
// notes, no audio files and no network. The context starts on the first
// gesture (a click or a key), and the mute button silences everything.
let context = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (context) return context;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  return context;
}

export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

/** One note: a sine/triangle blip that slides from `from` Hz to `to` Hz. */
function note(from, to, seconds, type, volume, delay) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
  gain.gain.setValueAtTime(volume || 0.12, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

export function playClick() {
  note(660, 520, 0.06, 'triangle', 0.08, 0);
}

export function playCardSound() {
  note(392, 392, 0.09, 'triangle', 0.12, 0);
  note(523, 523, 0.1, 'triangle', 0.12, 0.07);
  note(659, 659, 0.14, 'triangle', 0.12, 0.14);
}

export function playAttackSound() {
  note(220, 90, 0.16, 'sawtooth', 0.1, 0);
}

export function playHurtSound() {
  note(160, 60, 0.25, 'sawtooth', 0.12, 0);
}

export function playWinSound() {
  const tune = [523, 659, 784, 1047];
  tune.forEach((freq, i) => note(freq, freq, 0.22, 'triangle', 0.14, i * 0.11));
  note(1319, 1319, 0.5, 'triangle', 0.1, 0.5);
}

export function playLoseSound() {
  const tune = [392, 330, 262, 196];
  tune.forEach((freq, i) => note(freq, freq * 0.94, 0.25, 'triangle', 0.12, i * 0.14));
}
