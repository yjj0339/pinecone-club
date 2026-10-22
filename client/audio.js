let ctx = null;
let muted = false;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, type = 'sine', gain = 0.06) {
  const unit = audio();
  if (!unit || muted) return;
  const osc = unit.createOscillator();
  const amp = unit.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, unit.currentTime + start);
  amp.gain.setValueAtTime(0.0001, unit.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, unit.currentTime + start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, unit.currentTime + start + duration);
  osc.connect(amp).connect(unit.destination);
  osc.start(unit.currentTime + start);
  osc.stop(unit.currentTime + start + duration + 0.03);
}

export const sound = {
  unlock() {
    audio();
  },
  setMuted(value) {
    muted = Boolean(value);
  },
  play(name) {
    if (muted) return;
    if (name === 'tap') {
      tone(680, 0, 0.08, 'triangle', 0.05);
    } else if (name === 'tick') {
      tone(920, 0, 0.06, 'sine', 0.04);
    } else if (name === 'win') {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, index * 0.1, 0.22, 'triangle', 0.07));
    } else if (name === 'lose') {
      [392, 330, 262].forEach((freq, index) => tone(freq, index * 0.12, 0.26, 'sine', 0.06));
    } else if (name === 'join') {
      tone(523, 0, 0.1, 'triangle', 0.05);
      tone(784, 0.09, 0.16, 'triangle', 0.05);
    } else if (name === 'ready') {
      tone(440, 0, 0.09, 'square', 0.035);
      tone(660, 0.08, 0.12, 'square', 0.035);
    }
  },
};