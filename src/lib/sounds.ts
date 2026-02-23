/**
 * Lightweight sound effects using Web Audio API.
 * No external files needed — all sounds are synthesized on-the-fly.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  detune = 0,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Short "click" for buttons & navigation */
export function playClick() {
  playTone(800, 0.06, "sine", 0.08);
}

/** Tab switch sound */
export function playTabSwitch() {
  playTone(600, 0.05, "sine", 0.06);
  setTimeout(() => playTone(900, 0.05, "sine", 0.06), 30);
}

/** Correct answer ding */
export function playCorrect() {
  playTone(523, 0.12, "sine", 0.15);
  setTimeout(() => playTone(659, 0.12, "sine", 0.15), 100);
  setTimeout(() => playTone(784, 0.18, "sine", 0.15), 200);
}

/** Wrong answer buzz */
export function playWrong() {
  playTone(200, 0.25, "sawtooth", 0.08);
  setTimeout(() => playTone(180, 0.25, "sawtooth", 0.08), 120);
}

/** XP gained chime */
export function playXP() {
  playTone(880, 0.08, "sine", 0.1);
  setTimeout(() => playTone(1100, 0.1, "sine", 0.1), 60);
  setTimeout(() => playTone(1320, 0.15, "sine", 0.12), 130);
}

/** Level up fanfare */
export function playLevelUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "sine", 0.12), i * 100);
  });
  // Harmony layer
  setTimeout(() => playTone(784, 0.4, "triangle", 0.08), 300);
}

/** Achievement unlocked — epic sound */
export function playAchievement() {
  // Rising arpeggio
  const arpeggio = [440, 554, 659, 880, 1047, 1319];
  arpeggio.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sine", 0.1 + i * 0.01), i * 70);
  });
  // Sparkle layer
  setTimeout(() => {
    playTone(1760, 0.4, "sine", 0.06);
    playTone(2093, 0.5, "triangle", 0.04);
  }, 450);
}

/** Navigation / page change */
export function playNavigate() {
  playTone(440, 0.06, "sine", 0.05);
  setTimeout(() => playTone(660, 0.06, "sine", 0.05), 40);
}
