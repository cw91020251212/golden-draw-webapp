import test from 'node:test';
import assert from 'node:assert/strict';
import { lineupSlots, LINEUP_DROP, LINEUP_GAP } from './lineup.js';

test('the six sit flat, sorted, and the special is centred below', () => {
  const { row, extra } = lineupSlots([39, 1, 44, 49, 27, 6], 36, [0, -1.5, 2.2]);
  assert.deepEqual(row.map(b => b.n), [1, 6, 27, 39, 44, 49]);
  const ys = row.map(b => b.position[1]);
  const zs = row.map(b => b.position[2]);
  assert.equal(new Set(ys).size, 1);
  assert.equal(new Set(zs).size, 1);
  for (let i = 1; i < row.length; i++) {
    assert.ok(row[i].position[0] > row[i - 1].position[0]);
    assert.ok(Math.abs(row[i].position[0] - row[i - 1].position[0] - LINEUP_GAP) < 1e-9);
  }
  assert.equal(extra.n, 36);
  assert.equal(extra.position[0], 0);
  assert.equal(extra.position[1], ys[0] - LINEUP_DROP);
  assert.equal(extra.position[2], zs[0]);
});
