"use client";

// Audio context singleton
let audioContext: AudioContext | null = null;
let isAudioEnabled = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
      isAudioEnabled = true;
    } catch (e) {
      console.log('Web Audio API not supported');
      return null;
    }
  }
  
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
};

// Enable audio on first user interaction
export const enableAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  isAudioEnabled = true;
};

// Swoosh sound for navigation/scrolling - more prominent
export const playScrollSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Main swoosh - louder and more defined
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(2000, now);
    filter1.frequency.exponentialRampToValueAtTime(500, now + 0.2);
    filter1.Q.value = 5;

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain1.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // High frequency accent
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.15);

  } catch (e) {
    console.log('Sound error:', e);
  }
};

// Click/tap sound - crisp and clear
export const playClickSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sharp click
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);

    // Soft tail
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(600, now + 0.02);

    gain2.gain.setValueAtTime(0, now + 0.02);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.02);
    osc2.stop(now + 0.12);

  } catch (e) {
    console.log('Sound error:', e);
  }
};

// Hover sound - subtle but audible
export const playHoverSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);

  } catch (e) {
    console.log('Sound error:', e);
  }
};

// Section reveal sound - magical chime
export const playRevealSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Rising chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(500, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.12);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);

    // Sparkle overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.15);

    gain2.gain.setValueAtTime(0, now + 0.03);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.03);
    osc2.stop(now + 0.2);

    // Sub bass for depth
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(150, now);

    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc3.start(now);
    osc3.stop(now + 0.15);

  } catch (e) {
    console.log('Sound error:', e);
  }
};

// Intro boom sound - dramatic entrance
export const playIntroSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Deep boom
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);

    // Whoosh sweep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(200, now);
    filter2.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    filter2.frequency.exponentialRampToValueAtTime(200, now + 0.35);
    filter2.Q.value = 2;

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.4);

    // High shimmer
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1500, now + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(1000, now + 0.35);

    gain3.gain.setValueAtTime(0, now + 0.1);
    gain3.gain.linearRampToValueAtTime(0.1, now + 0.12);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc3.start(now + 0.1);
    osc3.stop(now + 0.4);

    // Impact hit
    const osc4 = ctx.createOscillator();
    const gain4 = ctx.createGain();

    osc4.type = 'square';
    osc4.frequency.setValueAtTime(200, now + 0.08);
    osc4.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain4.gain.setValueAtTime(0, now + 0.08);
    gain4.gain.linearRampToValueAtTime(0.25, now + 0.09);
    gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc4.connect(gain4);
    gain4.connect(ctx.destination);

    osc4.start(now + 0.08);
    osc4.stop(now + 0.25);

  } catch (e) {
    console.log('Sound error:', e);
  }
};
