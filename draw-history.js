export const DRAW_HISTORY_KEY = 'golden-draw-saved-flows-v1';
export const ALLOWED_RATES = Object.freeze([1, 3, 6, 12]);

export function validDrawOrder(order) {
  return Array.isArray(order) && order.length === 7 &&
    order.every(n => Number.isInteger(n) && n >= 1 && n <= 49) &&
    new Set(order).size === 7;
}

function storageOrDefault(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

export function readDrawHistory(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(DRAW_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item.id === 'string' &&
      typeof item.savedAt === 'string' && Number.isFinite(Date.parse(item.savedAt)) && validDrawOrder(item.order) &&
      ALLOWED_RATES.includes(item.speed) && Number.isInteger(item.ticketIndex) && item.ticketIndex > 0)
      .slice(0, 100);
  } catch { return []; }
}

export function saveDrawFlow({ order, speed, ticketIndex }, storage, now = new Date()) {
  if (!validDrawOrder(order)) throw new TypeError('流程必須包含七個不重複的 1–49 號碼');
  if (!ALLOWED_RATES.includes(speed)) throw new TypeError('不支援的動畫速度');
  if (!Number.isInteger(ticketIndex) || ticketIndex < 1 || ticketIndex > 4) throw new TypeError('注數必須為 1–4');
  const target = storageOrDefault(storage);
  if (!target) throw new Error('此瀏覽器未能使用本機儲存空間');
  const row = {
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: now.toISOString(),
    ticketIndex,
    order: [...order],
    speed
  };
  const history = [row, ...readDrawHistory(target)].slice(0, 100);
  target.setItem(DRAW_HISTORY_KEY, JSON.stringify(history));
  return row;
}

export function deleteDrawFlow(id, storage) {
  const target = storageOrDefault(storage);
  if (!target) return [];
  const history = readDrawHistory(target).filter(item => item.id !== id);
  target.setItem(DRAW_HISTORY_KEY, JSON.stringify(history));
  return history;
}
