export const MUSIC_STORAGE_KEY = 'golden-draw-music';
export const DEFAULT_TRACK_URL = './playful-original.mp3';
export const DEFAULT_TRACK_NAME = '《Gilded Winter Gala》';
export const DEFAULT_VOLUME = 0.32;
export const MUSIC_LOOPS = true;

export function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, n));
}

export function readMusicPrefs(raw) {
  const fallback = { on: true, volume: DEFAULT_VOLUME };
  if (!raw) return fallback;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fallback;
    // Only an explicit pause is remembered. A missing choice, including the
    // old automatic "off" save, starts the bundled track.
    const on = data.userSet === true ? data.on === true : true;
    return { on, volume: clampVolume(data.volume) };
  } catch {
    return fallback;
  }
}

export function writeMusicPrefs(prefs) {
  return JSON.stringify({ on: prefs.on === true, volume: clampVolume(prefs.volume), userSet: true });
}

// The draw already has a button labelled 暫停. Music uses a different label.
export function musicControlState(playing) {
  return playing
    ? { playing: true, label: '暫停音樂', shortLabel: '音樂', ariaLabel: '暫停背景音樂' }
    : { playing: false, label: '▶ 音樂', shortLabel: '音樂', ariaLabel: '播放背景音樂' };
}
