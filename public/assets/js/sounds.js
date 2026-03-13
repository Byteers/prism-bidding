/**
 * sounds.js — Web Audio API sound engine (no files needed)
 * Pure synthesized tones for: bid, timer-tick, timer-urgent, winner
 */
window.SOUNDS = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, type, duration, volume, delay = 0) {
    if (!enabled) return;
    try {
      const c   = getCtx();
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.connect(g);
      g.connect(c.destination);
      osc.type      = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + duration + 0.05);
    } catch(e) {}
  }

  return {
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },

    // Played when a new bid is placed
    bid() {
      tone(523, 'sine',     0.08, 0.15);       // C5
      tone(659, 'sine',     0.08, 0.12, 0.06); // E5
      tone(784, 'sine',     0.12, 0.10, 0.12); // G5
    },

    // Played every tick when timer ≤ 10
    urgent() {
      tone(880, 'square', 0.05, 0.04);
    },

    // Played when timer hits 0
    timerEnd() {
      tone(300, 'sawtooth', 0.2,  0.12);
      tone(200, 'sawtooth', 0.3,  0.10, 0.18);
    },

    // Played when item is awarded
    winner() {
      const notes = [523,659,784,1047];
      notes.forEach((f, i) => tone(f, 'sine', 0.25, 0.18, i * 0.1));
      tone(1047, 'sine', 0.5, 0.2, 0.45);
    },

    // Played when auction starts
    start() {
      tone(392, 'triangle', 0.1, 0.12);
      tone(523, 'triangle', 0.1, 0.12, 0.12);
    },

    // Short tick for normal timer
    tick() {
      tone(660, 'sine', 0.04, 0.04);
    },
  };
})();
