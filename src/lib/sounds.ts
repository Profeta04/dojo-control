/**
 * Polished sound effects using Web Audio API.
 * All sounds are synthesized on-the-fly — no external files needed.
 * Improved v2: richer harmonics, better envelopes, distinct character per action.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  detune?: number;
  /** Attack time in seconds (fade-in) */
  attack?: number;
  /** Pan left/right (-1 to 1) */
  pan?: number;
}

function playTone(opts: ToneOptions) {
  const ctx = getCtx();
  const {
    frequency,
    duration,
    type = "sine",
    volume = 0.12,
    detune = 0,
    attack = 0.005,
    pan = 0,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;

  // Smooth attack → sustain → exponential decay
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  // Stereo panning
  if (pan !== 0 && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    osc.connect(gain);
    gain.connect(ctx.destination);
  }

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Helper: play a chord (multiple simultaneous tones) */
function playChord(frequencies: number[], duration: number, type: OscillatorType = "sine", volume = 0.06) {
  frequencies.forEach((freq, i) => {
    playTone({ frequency: freq, duration, type, volume, pan: (i - (frequencies.length - 1) / 2) * 0.3 });
  });
}

// ─── Public API ──────────────────────────────────────────────

/** Short tactile click — subtle pop for buttons */
export function playClick() {
  playTone({ frequency: 700, duration: 0.04, type: "sine", volume: 0.06 });
  playTone({ frequency: 1400, duration: 0.025, type: "sine", volume: 0.03, attack: 0.001 });
}

/** Tab switch — two-note swoosh */
export function playTabSwitch() {
  playTone({ frequency: 520, duration: 0.05, type: "sine", volume: 0.05, pan: -0.3 });
  setTimeout(() => playTone({ frequency: 780, duration: 0.06, type: "sine", volume: 0.05, pan: 0.3 }), 35);
}

/** Correct answer — bright ascending triad (C5-E5-G5) */
export function playCorrect() {
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.15, type: "sine", volume: 0.12, pan: (i - 1) * 0.2 });
      // Subtle octave shimmer
      playTone({ frequency: freq * 2, duration: 0.1, type: "sine", volume: 0.03 });
    }, i * 90);
  });
}

/** Wrong answer — dissonant low buzz */
export function playWrong() {
  playTone({ frequency: 185, duration: 0.22, type: "sawtooth", volume: 0.06 });
  setTimeout(() => playTone({ frequency: 165, duration: 0.2, type: "sawtooth", volume: 0.05, detune: -20 }), 100);
  // Harsh overtone
  setTimeout(() => playTone({ frequency: 240, duration: 0.12, type: "square", volume: 0.02 }), 50);
}

/** XP gained — bright sparkle chime (3 ascending notes) */
export function playXP() {
  const notes = [880, 1175, 1397];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.12, type: "sine", volume: 0.1 - i * 0.015, pan: (i - 1) * 0.25 });
    }, i * 55);
  });
  // Soft shimmer tail
  setTimeout(() => playTone({ frequency: 1760, duration: 0.2, type: "sine", volume: 0.025 }), 170);
}

/** Level up — triumphant fanfare (C5-E5-G5-C6 + harmony) */
export function playLevelUp() {
  const melody = [523, 659, 784, 1047];
  melody.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.22, type: "sine", volume: 0.12, pan: (i - 1.5) * 0.2 });
      // Perfect fifth harmony
      playTone({ frequency: freq * 1.5, duration: 0.18, type: "triangle", volume: 0.04 });
    }, i * 95);
  });
  // Grand sustain chord
  setTimeout(() => {
    playChord([784, 1047, 1319], 0.5, "sine", 0.05);
    playTone({ frequency: 1568, duration: 0.6, type: "triangle", volume: 0.03 });
  }, 400);
}

/** Achievement unlocked — epic rising arpeggio with sparkle */
export function playAchievement() {
  const arpeggio = [440, 554, 659, 880, 1047, 1319];
  arpeggio.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.22, type: "sine", volume: 0.08 + i * 0.008, pan: (i - 2.5) * 0.15 });
    }, i * 65);
  });
  // Sparkle cluster
  setTimeout(() => {
    playTone({ frequency: 1760, duration: 0.35, type: "sine", volume: 0.05, pan: -0.3 });
    playTone({ frequency: 2093, duration: 0.4, type: "triangle", volume: 0.035, pan: 0.3 });
    playTone({ frequency: 2637, duration: 0.5, type: "sine", volume: 0.02 });
  }, 420);
  // Deep bass anchor
  setTimeout(() => playTone({ frequency: 220, duration: 0.4, type: "triangle", volume: 0.04 }), 300);
}

/** Navigation / page change — soft whoosh */
export function playNavigate() {
  playTone({ frequency: 400, duration: 0.06, type: "sine", volume: 0.04, pan: -0.2 });
  setTimeout(() => playTone({ frequency: 600, duration: 0.06, type: "sine", volume: 0.04, pan: 0.2 }), 35);
}

/** Success — warm completion sound (for check-in, form submit, etc.) */
export function playSuccess() {
  playTone({ frequency: 440, duration: 0.1, type: "sine", volume: 0.08 });
  setTimeout(() => playTone({ frequency: 554, duration: 0.1, type: "sine", volume: 0.08 }), 80);
  setTimeout(() => {
    playChord([659, 880], 0.25, "sine", 0.07);
  }, 160);
}

/** Error / warning — soft descending tone */
export function playError() {
  playTone({ frequency: 440, duration: 0.12, type: "sine", volume: 0.07 });
  setTimeout(() => playTone({ frequency: 349, duration: 0.15, type: "sine", volume: 0.06 }), 100);
  setTimeout(() => playTone({ frequency: 294, duration: 0.2, type: "triangle", volume: 0.05 }), 200);
}

/** Check-in confirmation — crisp double-tap */
export function playCheckin() {
  playTone({ frequency: 660, duration: 0.06, type: "sine", volume: 0.1 });
  setTimeout(() => {
    playTone({ frequency: 880, duration: 0.08, type: "sine", volume: 0.1 });
    playTone({ frequency: 1320, duration: 0.12, type: "sine", volume: 0.04 });
  }, 70);
}

/** Notification bell — gentle bell ring */
export function playNotification() {
  playTone({ frequency: 1047, duration: 0.15, type: "sine", volume: 0.08 });
  setTimeout(() => playTone({ frequency: 1319, duration: 0.2, type: "sine", volume: 0.06, pan: 0.2 }), 100);
  // Bell resonance
  setTimeout(() => playTone({ frequency: 1047, duration: 0.3, type: "triangle", volume: 0.025 }), 200);
}
