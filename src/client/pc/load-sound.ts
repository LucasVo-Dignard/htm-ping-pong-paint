const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
export const audioCtx = new audioContextClass();

/**
 * Loads a sound from a server-hosted URL and decodes it into an AudioBuffer.
 * @param {string} url - URL string for hosted audio
 * @returns {Promise<AudioBuffer>}
 */
export async function loadSound(url: string): Promise<AudioBuffer> {
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

// Bind to window for global access compatibility
(window as any).loadSound = loadSound;
(window as any).audioCtx = audioCtx;
