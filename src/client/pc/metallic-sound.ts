import { audioCtx } from './load-sound';

const metalAudioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();

/**
 * Synthesizes a bare-bones metallic impact sound using additive sine wave synthesis.
 * @param {number} baseFreq - The fundamental pitch frequency (e.g., 400 for a deep chime, 800 for a sharp ring)
 */
export function playMetalSound(baseFreq = 500, volume = 1.0): void {
  const now = metalAudioCtx.currentTime;
  const decay = 0.55; // Metallic rings linger longer than plastic

  // Non-harmonic frequency multipliers that create a cold, metallic, bell-like timbre
  const harmonics = [1, 2.7, 5.8, 8.1];
  const volumes = [0.25 * volume, 0.12 * volume, 0.07 * volume, 0.04 * volume];

  harmonics.forEach((harmonic, index) => {
    const osc = metalAudioCtx.createOscillator();
    const gainNode = metalAudioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * harmonic, now);

    // Exponential volume envelope (sharp strike, natural decay)
    gainNode.gain.setValueAtTime(volumes[index], now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay * (1 + index * 0.1));

    // Route and trigger
    osc.connect(gainNode);
    gainNode.connect(metalAudioCtx.destination);

    osc.start(now);
    osc.stop(now + decay * 2);
  });
}

(window as any).playMetalSound = playMetalSound;
