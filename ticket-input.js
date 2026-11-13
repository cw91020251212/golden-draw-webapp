export const MAX_REHEARSAL_ENTRIES = 100;

function isValidEntry(numbers) {
  return Array.isArray(numbers) && numbers.length === 6 &&
    numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 49) &&
    new Set(numbers).size === 6;
}

export function parseTicketFields(rows) {
  if (!Array.isArray(rows)) throw new TypeError('注單欄位格式錯誤。');
  if (rows.length > MAX_REHEARSAL_ENTRIES) {
    throw new Error(`每次彩排最多 ${MAX_REHEARSAL_ENTRIES} 注，請分批輸入。`);
  }

  const entries = [];
  rows.forEach((row, index) => {
    if (!Array.isArray(row) || row.length !== 6) {
      throw new Error(`第 ${index + 1} 注需要六個號碼位置。`);
    }
    const cells = row.map(value => String(value ?? '').trim());
    if (cells.every(value => value === '')) return;
    if (cells.some(value => value === '')) {
      throw new Error(`第 ${index + 1} 注未填滿六個位置。`);
    }
    if (cells.some(value => !/^\d{2}$/.test(value))) {
      throw new Error(`第 ${index + 1} 注每格請輸入兩位數，例如 08。`);
    }

    const numbers = cells.map(Number);
    if (numbers.some(number => number < 1 || number > 49)) {
      throw new Error(`第 ${index + 1} 注號碼須為 01–49。`);
    }
    if (!isValidEntry(numbers)) {
      throw new Error(`第 ${index + 1} 注不可有重複號碼。`);
    }
    entries.push(numbers);
  });

  if (!entries.length) throw new Error('請先輸入至少一注號碼。');
  return entries;
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
  let plusSeparatedRows = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    const plusSeparated = (line.match(/\+/g) || []).length >= 5;
    const hasSlashPrefix = /^\s*\//.test(line);
    let normalizedLine = line.trim().replace(/^[\s/]+/, '');
    let values = (normalizedLine.match(/\d{1,2}/g) || []).map(Number);
    // HKJC ticket rows after the first start with `/`; OCR can mistake that slash for `1`.
    if (plusSeparated && plusSeparatedRows > 0 && !hasSlashPrefix && normalizedLine.startsWith('1')) {
      const withoutSlashArtifact = (normalizedLine.slice(1).match(/\d{1,2}/g) || []).map(Number);
      if (isValidEntry(withoutSlashArtifact)) values = withoutSlashArtifact;
    }
    if (isValidEntry(values)) {
      rows.push(values);
      if (plusSeparated) plusSeparatedRows += 1;
    }
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
