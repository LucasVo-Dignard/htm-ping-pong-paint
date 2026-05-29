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

  const absoluteUrl = new URL(url, window.location.href).href;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(`Fetch failed for ${absoluteUrl}: ${msg}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch audio file from ${absoluteUrl}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return new Promise<AudioBuffer>((resolve, reject) => {
    try {
      const promise = audioCtx.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (err) => reject(err || new Error('decodeAudioData error callback triggered'))
      );
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// Bind to window for global access compatibility
(window as any).loadSound = loadSound;
(window as any).audioCtx = audioCtx;
