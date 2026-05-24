/**
 * Plays an AudioBuffer with a dynamic pitch adjustment.
 * @param {AudioBuffer} buffer - The decoded audio data to play
 * @param {number} pitch - Pitch modifier (1.0 = normal, 2.0 = double pitch/speed, 0.5 = half)
 * @returns {Promise<void>}
 */
async function playSoundWithPitch(buffer, pitch = 1.0) {
  if (!buffer) {
    return;
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(pitch, audioCtx.currentTime);
  source.connect(audioCtx.destination);
  source.start(0);
}

window.playSoundWithPitch = playSoundWithPitch;
