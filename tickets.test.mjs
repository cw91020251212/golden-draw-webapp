import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./tickets.css', import.meta.url), 'utf8');
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

test('each ticket result keeps six circular main balls and a distinct special ball', () => {
  assert.match(rule('.ticket-card'), /background:\s*#[\da-f]{3,8}/i);
  assert.match(rule('.ticket-ball-wrap'), /border-radius:\s*50%/);
  assert.match(rule('.ticket-ball'), /border-radius:\s*50%/);
  assert.match(rule('.ticket-ball'), /border:\s*\d+px\s+solid/);
  assert.match(rule('.ticket-ball-extra'), /background:\s*#[\da-f]{3,8}/i);
});
