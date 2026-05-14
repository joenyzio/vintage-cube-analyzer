/**
 * Sound effects utility for the draft simulator
 * Uses Web Audio API to generate synthesized sounds
 */

const STORAGE_KEY = 'draft-simulator-muted';

let audioContext: AudioContext | null = null;
let isMuted = false;

// Initialize muted state from localStorage
function initMutedState(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    isMuted = stored === 'true';
  }
}

// Lazy initialization of AudioContext (must be triggered by user interaction)
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  // Resume context if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Play a satisfying click/pop sound for card picking
 * Short percussive sound using an oscillator with quick decay
 */
export function playPickSound(): void {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Create oscillator for the click
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Short percussive pop - starts high, drops quickly
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

  // Quick attack and decay for a snappy click
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Play a subtle whoosh sound for pack rotation
 * Filtered noise sweep
 */
export function playWhooshSound(): void {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.15;

  // Create noise using a buffer
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Bandpass filter for the whoosh character
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  // Sweep the filter frequency for whoosh effect
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.3);
  filter.frequency.exponentialRampToValueAtTime(300, now + duration);

  const gainNode = ctx.createGain();
  // Envelope: quick fade in, sustain, fade out
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gainNode.gain.linearRampToValueAtTime(0.1, now + duration * 0.5);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + duration);
}

/**
 * Play a happy chime for optimal picks
 * Ascending 3-note arpeggio
 */
export function playCelebrationSound(): void {
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Three ascending notes (C5, E5, G5 - a major chord arpeggio)
  const frequencies = [523.25, 659.25, 783.99];
  const noteSpacing = 0.08;
  const noteDuration = 0.2;

  frequencies.forEach((freq, index) => {
    const startTime = now + index * noteSpacing;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Sine wave for clean chime sound
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Bell-like envelope: quick attack, longer decay
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    osc.start(startTime);
    osc.stop(startTime + noteDuration);
  });
}

/**
 * Toggle mute state for all sounds
 * Persists to localStorage
 */
export function setMuted(muted: boolean): void {
  isMuted = muted;

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, String(muted));
  }
}

/**
 * Get current mute state
 */
export function getMuted(): boolean {
  return isMuted;
}

/**
 * Toggle mute state and return new state
 */
export function toggleMuted(): boolean {
  setMuted(!isMuted);
  return isMuted;
}

// Initialize muted state on module load
initMutedState();
