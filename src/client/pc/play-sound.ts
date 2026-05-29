import { audioCtx } from './load-sound';

/**
 * Plays an AudioBuffer with a dynamic pitch adjustment.
 * @param {AudioBuffer} buffer - The decoded audio data to play
 * @param {number} pitch - Pitch modifier (1.0 = normal, 2.0 = double pitch/speed, 0.5 = half)
 * @returns {Promise<void>}
 */
export function playSoundWithPitch(buffer: AudioBuffer | null, pitch = 1.0, volume = 1.0): Promise<void> {
  if (!buffer) {
    return Promise.resolve();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e) => {
      console.warn('Failed to resume AudioContext inside playSoundWithPitch:', e);
    });
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(pitch, audioCtx.currentTime);

  if (volume !== 1.0) {
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  } else {
    source.connect(audioCtx.destination);
  }

  source.start(0);
  return Promise.resolve();
}

(window as any).playSoundWithPitch = playSoundWithPitch;
