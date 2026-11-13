export const MAX_REHEARSAL_ENTRIES = 100;

function isValidEntry(numbers) {
  return Array.isArray(numbers) && numbers.length === 6 &&
    numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 49) &&
    new Set(numbers).size === 6;
}

export function parseTicketEntries(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('請先輸入或辨識至少一注號碼。');
  if (lines.length > MAX_REHEARSAL_ENTRIES) throw new Error(`每次彩排最多 ${MAX_REHEARSAL_ENTRIES} 注，請分批輸入。`);
  return lines.map((line, index) => {
    const values = (line.match(/\d{1,2}/g) || []).map(Number);
    if (!isValidEntry(values)) throw new Error(`第 ${index + 1} 注必須有六個不同的 1–49 號碼。`);
    return values;
  });
}

export function extractTicketRowsFromOcr(text) {
  const rows = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const values = (line.match(/\d{1,2}/g) || []).map(Number);
    if (isValidEntry(values)) rows.push(values);
  }
  return rows;
}

export function buildRehearsalOrder(chosen, randomBelow) {
  if (!isValidEntry(chosen)) throw new TypeError('中獎彩排注必須包含六個不同的 1–49 號碼');
  if (typeof randomBelow !== 'function') throw new TypeError('需要提供亂數選擇函式');
  const main = [...chosen];
  for (let i = main.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new RangeError('亂數索引超出範圍');
    [main[i], main[j]] = [main[j], main[i]];
  }
  const remaining = Array.from({ length: 49 }, (_, i) => i + 1).filter(n => !chosen.includes(n));
  const specialIndex = randomBelow(remaining.length);
  if (!Number.isInteger(specialIndex) || specialIndex < 0 || specialIndex >= remaining.length) throw new RangeError('特別號亂數索引超出範圍');
  return [...main, remaining[specialIndex]];
}
