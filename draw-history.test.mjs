import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAW_HISTORY_KEY, validDrawOrder, saveDrawFlow, readDrawHistory, deleteDrawFlow } from './draw-history.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

const order = [8, 15, 23, 31, 42, 47, 7];

test('validates exactly seven unique numbers in the 1–49 range', () => {
  assert.equal(validDrawOrder(order), true);
  assert.equal(validDrawOrder([1, 2, 3, 4, 5, 6]), false);
  assert.equal(validDrawOrder([1, 2, 3, 4, 5, 6, 6]), false);
  assert.equal(validDrawOrder([1, 2, 3, 4, 5, 6, 50]), false);
});

test('saves animation replay data locally and restores it after reload', () => {
  const storage = memoryStorage();
  const saved = saveDrawFlow({ order, speed: 6, ticketIndex: 3 }, storage, new Date('2026-11-13T07:00:00.000Z'));
  assert.equal(storage.getItem(DRAW_HISTORY_KEY) !== null, true);
  assert.equal(saved.ticketIndex, 3);
  assert.deepEqual(readDrawHistory(storage)[0].order, order);
  assert.equal(readDrawHistory(storage)[0].speed, 6);
  assert.equal(readDrawHistory(storage)[0].savedAt, '2026-11-13T07:00:00.000Z');
});

test('rejects invalid flows and removes a selected saved flow', () => {
  const storage = memoryStorage();
  assert.throws(() => saveDrawFlow({ order: [1, 1, 1, 1, 1, 1, 1], speed: 1, ticketIndex: 1 }, storage), /七個/);
  const a = saveDrawFlow({ order, speed: 1, ticketIndex: 1 }, storage);
  const b = saveDrawFlow({ order: [1, 2, 3, 4, 5, 6, 7], speed: 3, ticketIndex: 2 }, storage);
  assert.deepEqual(deleteDrawFlow(a.id, storage).map(item => item.id), [b.id]);
});
