import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTicketEntries, extractTicketRowsFromOcr, buildRehearsalOrder, MAX_REHEARSAL_ENTRIES } from './ticket-input.js';

test('parse multiple ticket lines and preserve each line', () => {
  assert.deepEqual(parseTicketEntries('08 15 23 31 42 47\n03, 11, 19, 26, 34, 49'), [
    [8, 15, 23, 31, 42, 47], [3, 11, 19, 26, 34, 49],
  ]);
});

test('rejects missing, duplicate, out-of-range, incomplete, and over-limit tickets', () => {
  for (const value of ['', '1 2 3 4 5', '1 2 3 4 5 5', '1 2 3 4 5 50']) {
    assert.throws(() => parseTicketEntries(value));
  }
  assert.equal(MAX_REHEARSAL_ENTRIES, 100);
  assert.throws(() => parseTicketEntries(Array.from({ length: 101 }, () => '1 2 3 4 5 6').join('\n')), /100/);
});

test('OCR extraction accepts only complete six-number rows and keeps repeated entries', () => {
  assert.deepEqual(extractTicketRowsFromOcr('Header 2026\n08 15 23 31 42 47\n1 2 3 4\n08 15 23 31 42 47\n01 02 03 04 05 50'), [
    [8, 15, 23, 31, 42, 47], [8, 15, 23, 31, 42, 47],
  ]);
});

test('rehearsal order randomizes the selected ticket, keeps its six numbers, and chooses a distinct extra', () => {
  const chosen = [8, 15, 23, 31, 42, 47];
  const alwaysFirst = n => 0;
  const alwaysLast = n => n - 1;
  const firstOrder = buildRehearsalOrder(chosen, alwaysFirst);
  const secondOrder = buildRehearsalOrder(chosen, alwaysLast);
  for (const order of [firstOrder, secondOrder]) {
    assert.equal(order.length, 7);
    assert.equal(new Set(order).size, 7);
    assert.deepEqual(order.slice(0, 6).slice().sort((a, b) => a - b), chosen);
    assert.ok(!chosen.includes(order[6]));
  }
  assert.notDeepEqual(firstOrder, secondOrder);
});

test('buildRehearsalOrder rejects invalid selections and random indices', () => {
  assert.throws(() => buildRehearsalOrder([1, 1, 2, 3, 4, 5], () => 0), /六個/);
  assert.throws(() => buildRehearsalOrder([1, 2, 3, 4, 5, 6], () => 999), /亂數/);
});
