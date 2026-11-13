import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTicketEntries, parseTicketFields, extractTicketRowsFromOcr, buildRehearsalOrder, MAX_REHEARSAL_ENTRIES } from './ticket-input.js';

test('parses six adjacent two-digit fields and skips untouched rows', () => {
  assert.deepEqual(parseTicketFields([
    ['08', '15', '23', '31', '42', '47'],
    ['', '', '', '', '', ''],
    ['03', '11', '19', '26', '34', '49'],
  ]), [
    [8, 15, 23, 31, 42, 47],
    [3, 11, 19, 26, 34, 49],
  ]);
});

test('requires all six two-digit positions and rejects invalid or repeated numbers', () => {
  for (const fields of [
    [['08', '15', '23', '', '42', '47']],
    [['8', '15', '23', '31', '42', '47']],
    [['00', '15', '23', '31', '42', '47']],
    [['08', '15', '23', '31', '42', '50']],
    [['08', '15', '23', '31', '42', '42']],
  ]) assert.throws(() => parseTicketFields(fields));
});

test('requires at least one completed ticket and caps the grid at 100 rows', () => {
  assert.throws(() => parseTicketFields([['', '', '', '', '', '']]), /至少一注/);
  assert.equal(MAX_REHEARSAL_ENTRIES, 100);
  const row = ['01', '02', '03', '04', '05', '06'];
  assert.equal(parseTicketFields(Array.from({ length: 100 }, () => row)).length, 100);
  assert.throws(() => parseTicketFields(Array.from({ length: 101 }, () => row)), /100/);
});

test('legacy text parser still supports OCR line extraction and common delimiters', () => {
  assert.deepEqual(parseTicketEntries('08 15 23 31 42 47\n03, 11, 19, 26, 34, 49'), [
    [8, 15, 23, 31, 42, 47], [3, 11, 19, 26, 34, 49],
  ]);
});

test('OCR extraction accepts only complete six-number rows and keeps repeated entries', () => {
  assert.deepEqual(extractTicketRowsFromOcr('Header 2026\n08 15 23 31 42 47\n1 2 3 4\n08 15 23 31 42 47\n01 02 03 04 05 50'), [
    [8, 15, 23, 31, 42, 47], [8, 15, 23, 31, 42, 47],
  ]);
});

test('rehearsal order randomizes the selected ticket and chooses a distinct extra', () => {
  const chosen = [8, 15, 23, 31, 42, 47];
  const firstOrder = buildRehearsalOrder(chosen, () => 0);
  const secondOrder = buildRehearsalOrder(chosen, n => n - 1);
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
