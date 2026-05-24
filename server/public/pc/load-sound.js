const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Loads a sound from a server-hosted URL and decodes it into an AudioBuffer.
 * @param {string} url - URL string for hosted audio
 * @returns {Promise<AudioBuffer>}
 */
async function loadSound(url) {
  if (typeof url !== 'string') {
    throw new TypeError('loadSound expects a URL string');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

window.loadSound = loadSound;
window.audioCtx = audioCtx;
